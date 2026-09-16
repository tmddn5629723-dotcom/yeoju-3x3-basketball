-- ============================================================================
-- 3차 마이그레이션: 부문별 모집정원 + 대회 홍보자료(포스터/PDF) + 팀단위 학교명 폐지
--
-- 이 마이그레이션이 하는 일 (실행 전 꼭 읽어주세요):
--
-- 1) teams.school_name 컬럼의 NOT NULL 제약을 해제합니다.
--    - 팀 단위 학교명은 더 이상 참가신청 폼에서 입력받지 않습니다 (선수별 학교명으로 대체).
--    - 컬럼 자체와 기존에 저장된 값은 삭제하지 않고 그대로 남겨둡니다(데이터 보존, 되돌리기 가능).
--      새로 등록되는 팀은 이 컬럼에 NULL이 저장됩니다.
--
-- 2) event_settings 테이블을 새로 만듭니다 (딱 1개 행만 존재하는 "설정값 저장용" 테이블).
--    - 중등부/고등부 모집정원, 홍보포스터·운영요강 PDF의 Storage 경로를 저장합니다.
--    - 참가신청 페이지와 관리자 대시보드가 이 표 하나를 공통으로 참조하므로 집계 기준이 항상 일치합니다.
--
-- 3) register_team() 함수에 "정원 초과 차단" 로직을 추가합니다.
--    - event_settings 행을 잠근 뒤(FOR UPDATE) 정원을 확인하므로, 여러 명이 동시에 신청해도
--      정원을 초과해서 저장되는 일이 없습니다.
--
-- 4) get_public_event_status() 라는 새 함수(RPC)를 만듭니다.
--    - 참가자용 페이지에서 "이름/연락처 같은 개인정보 없이" 현재 신청 현황(팀 수)과
--      홍보자료 경로만 안전하게 조회할 수 있도록 하는 공개 조회 함수입니다.
--
-- 5) basketball-assets 라는 Storage 버킷을 만들고, 포스터/PDF 파일에 대한 접근 정책을 설정합니다.
--    - 일반 참가자: 읽기(다운로드)만 가능
--    - 관리자(로그인 사용자): 업로드/교체/삭제 가능
--
-- 실행방법은 이전과 동일합니다: Supabase 대시보드 > SQL Editor > New query에 전체 붙여넣기 > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) teams.school_name: 필수값 해제 (컬럼/데이터는 보존)
-- ----------------------------------------------------------------------------
alter table public.teams alter column school_name drop not null;

comment on column public.teams.school_name is
  '(사용 중단) 과거에는 팀 단위 학교명을 저장했으나, 현재는 선수별 school_name(players 테이블)으로 대체되어 더 이상 입력받지 않습니다. 기존 데이터 보존을 위해 컬럼은 유지합니다.';

-- ----------------------------------------------------------------------------
-- 2) event_settings 테이블 (설정값 단일 행)
-- ----------------------------------------------------------------------------
create table if not exists public.event_settings (
  id                 integer primary key default 1,
  poster_path        text,
  guidelines_path    text,
  middle_max_teams   integer not null default 5,
  high_max_teams     integer not null default 5,
  updated_at         timestamptz not null default now(),
  constraint event_settings_singleton_id check (id = 1)
);

comment on table public.event_settings is '대회 운영 설정값 단일 행(부문별 모집정원, 홍보포스터/운영요강 PDF의 Storage 경로)';

insert into public.event_settings (id, middle_max_teams, high_max_teams)
values (1, 5, 5)
on conflict (id) do nothing;

drop trigger if exists trg_event_settings_updated_at on public.event_settings;
create trigger trg_event_settings_updated_at
  before update on public.event_settings
  for each row execute function public.set_updated_at();

alter table public.event_settings enable row level security;

drop policy if exists public_select_event_settings on public.event_settings;
create policy public_select_event_settings on public.event_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists admin_update_event_settings on public.event_settings;
create policy admin_update_event_settings on public.event_settings
  for update
  to authenticated
  using (true)
  with check (true);

grant select on public.event_settings to anon, authenticated;
grant update on public.event_settings to authenticated;

-- ----------------------------------------------------------------------------
-- 3) register_team() 재정의: 팀단위 school_name 제거 + 정원초과 차단
-- ----------------------------------------------------------------------------
create or replace function public.register_team(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id             uuid;
  v_registration_number text;
  v_client_request_id   uuid;
  v_players             jsonb;
  v_player              jsonb;
  v_player_count        int;
  v_existing_team_id    uuid;
  v_existing_reg_no     text;
  v_division            text;
  v_max_teams           int;
  v_current_count       int;
begin
  v_client_request_id := (payload->>'client_request_id')::uuid;

  if v_client_request_id is null then
    raise exception 'CLIENT_REQUEST_ID_REQUIRED';
  end if;

  -- 중복 제출(재시도) 시 새로 만들지 않고 기존 접수번호를 그대로 반환
  select id, registration_number into v_existing_team_id, v_existing_reg_no
  from public.teams
  where client_request_id = v_client_request_id;

  if v_existing_team_id is not null then
    return jsonb_build_object(
      'team_id', v_existing_team_id,
      'registration_number', v_existing_reg_no,
      'duplicate', true
    );
  end if;

  v_division := payload->>'division';

  if v_division not in ('중등부', '고등부') then
    raise exception 'INVALID_DIVISION';
  end if;

  if coalesce(payload->>'team_name', '') = '' then
    raise exception 'TEAM_NAME_REQUIRED';
  end if;

  v_players := payload->'players';

  if v_players is null or jsonb_typeof(v_players) <> 'array' then
    raise exception 'PLAYERS_REQUIRED';
  end if;

  v_player_count := jsonb_array_length(v_players);

  if v_player_count < 3 or v_player_count > 5 then
    raise exception 'PLAYER_COUNT_OUT_OF_RANGE';
  end if;

  if (payload->>'privacy_agreed')::boolean is not true
     or (payload->>'rules_agreed')::boolean is not true
     or (payload->>'representative_agreed')::boolean is not true then
    raise exception 'AGREEMENTS_REQUIRED';
  end if;

  -- ---- 정원 초과 차단 (동시 신청 안전 처리) ----------------------------------
  -- event_settings의 유일한 행을 잠가서(FOR UPDATE), 이 시점 이후의 모든 동시 신청 요청이
  -- 한 번에 하나씩만 정원을 확인/차지하도록 강제합니다. (경쟁 상태로 인한 정원 초과 방지)
  perform 1 from public.event_settings where id = 1 for update;

  select case when v_division = '중등부' then middle_max_teams else high_max_teams end
    into v_max_teams
  from public.event_settings
  where id = 1;

  select count(*) into v_current_count
  from public.teams
  where division = v_division
    and deleted_at is null
    and status <> '참가취소';

  if v_current_count >= v_max_teams then
    raise exception 'DIVISION_FULL';
  end if;
  -- ---------------------------------------------------------------------------

  v_registration_number := 'BB2026-' || lpad(nextval('bb2026_registration_seq')::text, 3, '0');

  insert into public.teams (
    registration_number, client_request_id, division, school_name, team_name,
    player_count, representative_name, representative_phone,
    privacy_agreed, rules_agreed, representative_agreed, media_agreed, status
  ) values (
    v_registration_number,
    v_client_request_id,
    v_division,
    null, -- 팀단위 school_name은 더 이상 사용하지 않음
    payload->>'team_name',
    v_player_count,
    payload->>'representative_name',
    payload->>'representative_phone',
    true, true, true,
    coalesce((payload->>'media_agreed')::boolean, false),
    '접수'
  )
  returning id into v_team_id;

  for v_player in select * from jsonb_array_elements(v_players)
  loop
    if coalesce(v_player->>'player_name', '') = ''
       or coalesce(v_player->>'grade', '') = ''
       or coalesce(v_player->>'phone', '') = ''
       or coalesce(v_player->>'school_name', '') = '' then
      raise exception 'PLAYER_FIELDS_REQUIRED';
    end if;

    insert into public.players (
      team_id, player_order, player_name, grade, phone, school_name, is_representative
    ) values (
      v_team_id,
      (v_player->>'player_order')::smallint,
      v_player->>'player_name',
      (v_player->>'grade')::smallint,
      v_player->>'phone',
      v_player->>'school_name',
      coalesce((v_player->>'is_representative')::boolean, false)
    );
  end loop;

  return jsonb_build_object(
    'team_id', v_team_id,
    'registration_number', v_registration_number,
    'duplicate', false
  );
end;
$$;

grant execute on function public.register_team(jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) get_public_event_status(): 참가자 페이지용 공개 현황 조회 (개인정보 없음)
-- ----------------------------------------------------------------------------
create or replace function public.get_public_event_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_middle_count int;
  v_high_count   int;
begin
  select * into v_settings from public.event_settings where id = 1;

  select count(*) into v_middle_count
  from public.teams
  where division = '중등부' and deleted_at is null and status <> '참가취소';

  select count(*) into v_high_count
  from public.teams
  where division = '고등부' and deleted_at is null and status <> '참가취소';

  return jsonb_build_object(
    'poster_path', v_settings.poster_path,
    'guidelines_path', v_settings.guidelines_path,
    'middle', jsonb_build_object('count', v_middle_count, 'max', v_settings.middle_max_teams),
    'high', jsonb_build_object('count', v_high_count, 'max', v_settings.high_max_teams)
  );
end;
$$;

comment on function public.get_public_event_status() is '참가신청 페이지에서 사용하는 공개 현황 조회 함수 (개인정보 미포함, anon 실행 가능)';

grant execute on function public.get_public_event_status() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5) Storage 버킷 + 접근 정책 (홍보포스터 / 운영요강 PDF)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('basketball-assets', 'basketball-assets', true)
on conflict (id) do nothing;

drop policy if exists admin_manage_basketball_assets on storage.objects;
create policy admin_manage_basketball_assets on storage.objects
  for all
  to authenticated
  using (bucket_id = 'basketball-assets')
  with check (bucket_id = 'basketball-assets');

drop policy if exists public_read_basketball_assets on storage.objects;
create policy public_read_basketball_assets on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'basketball-assets');

-- 완료. 아래로 확인 가능합니다.
-- select * from public.event_settings;
