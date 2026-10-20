-- ============================================================================
-- 4차 마이그레이션: 관리자 페이지에서 대회 일정/안내문구/접수상태를 직접 관리
--
-- 이 마이그레이션이 하는 일 (실행 전 꼭 읽어주세요):
--
-- 1) event_settings 테이블에 아래 항목을 저장할 컬럼을 추가합니다. (기존 컬럼/데이터는 그대로 유지)
--    - 대회명, 대회 소개문구
--    - 모집기간(시작/종료일), 대회 개최일/시작시간, 대회 장소, 참가비 문구
--    - 공지사항, 참가 유의사항(안내 메시지), 공지사항 노출 여부
--    - 참가신청 접수 상태 ('접수중' / '접수마감') — 관리자가 날짜와 무관하게 직접 On/Off
--
-- 2) register_team() 함수에 "접수마감 상태면 신규 신청을 저장하지 않는다"는 검증을 추가합니다.
--    (기존의 부문별 정원 초과 차단 로직은 그대로 유지되고, 그 앞에 접수상태 체크가 추가됩니다)
--
-- 3) get_public_event_status() 함수가 위 1)에서 추가된 모든 항목을 함께 반환하도록 수정합니다.
--    (참가신청 페이지가 이 함수 하나만 호출하면 대회 정보/모집현황/홍보자료/접수상태를 모두 받을 수 있습니다)
--
-- 4) 이번에 요청하신 새 일정으로 초기값을 채워둡니다.
--    - 모집기간: 2026-10-20 ~ 2026-11-13
--    - 대회일시: 2026-11-21 13:00
--    - 접수상태: 접수중
--
-- 기존 teams/players 데이터, 기존 관리자 기능(참가팀 조회/수정/삭제/CSV), 홍보자료/정원 기능에는 영향이 없습니다.
-- 실행방법은 이전과 동일합니다: Supabase 대시보드 > SQL Editor > New query에 전체 붙여넣기 > RUN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) event_settings 컬럼 추가
-- ----------------------------------------------------------------------------
alter table public.event_settings
  add column if not exists tournament_title text not null default '2026 여주시청소년스포츠대전 3x3 농구대회',
  add column if not exists intro_text       text,
  add column if not exists recruitment_start date,
  add column if not exists recruitment_end   date,
  add column if not exists event_date        date,
  add column if not exists event_time        text,
  add column if not exists event_location    text not null default '여주시청소년수련관',
  add column if not exists fee_label         text not null default '무료',
  add column if not exists notice_text       text,
  add column if not exists guidance_text     text,
  add column if not exists show_notice       boolean not null default true,
  add column if not exists registration_status text not null default '접수중';

comment on column public.event_settings.registration_status is
  '참가신청 접수 상태. 관리자가 모집기간과 무관하게 직접 전환합니다. (접수중 | 접수마감)';

alter table public.event_settings drop constraint if exists event_settings_registration_status_check;
alter table public.event_settings add constraint event_settings_registration_status_check
  check (registration_status in ('접수중', '접수마감'));

-- 이번에 요청하신 새 일정으로 초기값 반영 (이미 값이 들어있으면 건드리지 않고, 비어있을 때만 채웁니다)
-- registration_status는 위 컬럼 추가 시 default '접수중'으로 이미 채워지므로 여기서는 건드리지 않습니다.
-- (이 마이그레이션을 실수로 다시 실행하더라도 관리자가 이미 바꿔둔 접수상태가 되돌아가지 않도록 하기 위함입니다)
update public.event_settings
set
  recruitment_start = coalesce(recruitment_start, date '2026-10-20'),
  recruitment_end    = coalesce(recruitment_end, date '2026-11-13'),
  event_date         = coalesce(event_date, date '2026-11-21'),
  event_time         = coalesce(event_time, '13:00')
where id = 1;

-- ----------------------------------------------------------------------------
-- 2) register_team(): 접수마감 상태 차단 로직 추가 (기존 정원차단 로직 앞에 추가)
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
  v_registration_status text;
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

  -- ---- 접수상태 + 정원 초과 차단 (동시 신청 안전 처리) ------------------------
  -- event_settings의 유일한 행을 잠가서(FOR UPDATE), 이 시점 이후의 모든 동시 신청 요청이
  -- 한 번에 하나씩만 접수상태/정원을 확인/차지하도록 강제합니다.
  perform 1 from public.event_settings where id = 1 for update;

  select registration_status,
         case when v_division = '중등부' then middle_max_teams else high_max_teams end
    into v_registration_status, v_max_teams
  from public.event_settings
  where id = 1;

  if v_registration_status is distinct from '접수중' then
    raise exception 'REGISTRATION_CLOSED';
  end if;

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
-- 3) get_public_event_status(): 대회정보/접수상태/안내문구까지 함께 반환하도록 확장
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
    'high', jsonb_build_object('count', v_high_count, 'max', v_settings.high_max_teams),
    'tournament_title', v_settings.tournament_title,
    'intro_text', v_settings.intro_text,
    'recruitment_start', v_settings.recruitment_start,
    'recruitment_end', v_settings.recruitment_end,
    'event_date', v_settings.event_date,
    'event_time', v_settings.event_time,
    'event_location', v_settings.event_location,
    'fee_label', v_settings.fee_label,
    'notice_text', v_settings.notice_text,
    'guidance_text', v_settings.guidance_text,
    'show_notice', v_settings.show_notice,
    'registration_status', v_settings.registration_status
  );
end;
$$;

comment on function public.get_public_event_status() is '참가신청 페이지에서 사용하는 공개 현황/대회정보 조회 함수 (개인정보 미포함, anon 실행 가능)';
grant execute on function public.get_public_event_status() to anon, authenticated;

-- 완료. 아래로 확인 가능합니다.
-- select * from public.event_settings;
