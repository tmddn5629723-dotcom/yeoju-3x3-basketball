-- ============================================================================
-- 2026 여주시청소년스포츠대전 3x3 농구대회 참가신청 시스템
-- Supabase DB 초기 설정 스크립트
--
-- 사용 방법:
--   1. Supabase 대시보드 접속 > 해당 프로젝트 선택
--   2. 좌측 메뉴 [SQL Editor] 클릭
--   3. [New query] 클릭 후 이 파일 전체 내용을 붙여넣기
--   4. 우측 하단(또는 상단) [RUN] 버튼 클릭
--   5. "Success. No rows returned" 메시지가 뜨면 정상 완료
--
-- 이 스크립트는 기존 usage_logs 테이블 등 다른 테이블에는 영향을 주지 않습니다.
-- ============================================================================

-- 1. 확장 기능 (uuid 자동 생성을 위해 필요, Supabase는 기본 제공)
create extension if not exists "pgcrypto";

-- ============================================================================
-- 2. 접수번호 발급용 시퀀스
--    - "현재 행 개수 + 1" 방식이 아닌 DB 시퀀스를 사용하여
--      동시 신청/데이터 삭제 상황에서도 접수번호가 절대 중복되지 않도록 함
-- ============================================================================
create sequence if not exists bb2026_registration_seq
  as bigint
  start with 1
  increment by 1
  no cycle;

-- ============================================================================
-- 3. teams 테이블 (참가팀 정보)
-- ============================================================================
create table if not exists public.teams (
  id                        uuid primary key default gen_random_uuid(),
  registration_number       text not null unique,
  client_request_id         uuid not null unique, -- 중복 제출 방지용 (프론트에서 1회 생성)
  division                  text not null check (division in ('중등부', '고등부')),
  school_name               text not null,
  team_name                 text not null,
  player_count              smallint not null check (player_count between 3 and 5),
  representative_name       text not null,
  representative_phone      text not null,
  privacy_agreed            boolean not null default false,
  rules_agreed              boolean not null default false,
  representative_agreed     boolean not null default false,
  -- 향후 "사진/영상 촬영 및 홍보 활용 동의"를 추가할 수 있도록 미리 컬럼을 마련해둠 (현재는 미사용)
  media_agreed              boolean not null default false,
  status                    text not null default '접수' check (status in ('접수', '참가확정', '대기', '참가취소')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz
);

comment on table public.teams is '3x3 농구대회 참가팀 신청 정보';

create index if not exists idx_teams_created_at on public.teams (created_at desc);
create index if not exists idx_teams_status on public.teams (status);
create index if not exists idx_teams_division on public.teams (division);
create index if not exists idx_teams_deleted_at on public.teams (deleted_at);

-- ============================================================================
-- 4. players 테이블 (선수 명단, teams.id 와 관계형으로 연결)
-- ============================================================================
create table if not exists public.players (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams (id) on delete cascade,
  player_order    smallint not null check (player_order between 1 and 5),
  player_name     text not null,
  grade           smallint not null check (grade between 1 and 3),
  phone           text not null,
  is_representative boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (team_id, player_order)
);

comment on table public.players is '3x3 농구대회 참가팀 소속 선수 명단';

create index if not exists idx_players_team_id on public.players (team_id);

-- ============================================================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. 참가신청 저장 함수 (register_team)
--    - teams + players 저장을 하나의 함수(=하나의 트랜잭션)로 묶어서
--      teams는 저장되고 players가 실패하는 등 "반쪼가리 데이터"가 남지 않도록 함
--    - SECURITY DEFINER 로 생성되어, 일반 사용자(anon)는 테이블에 직접 INSERT 권한이
--      없어도 이 함수를 통해서만 안전하게 신청 데이터를 저장할 수 있음
--    - client_request_id 로 동일 요청의 중복 저장(중복 클릭 등)을 서버에서도 방지
-- ============================================================================
create or replace function public.register_team(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id            uuid;
  v_registration_number text;
  v_client_request_id  uuid;
  v_players            jsonb;
  v_player             jsonb;
  v_player_count       int;
  v_existing_team_id   uuid;
  v_existing_reg_no    text;
begin
  v_client_request_id := (payload->>'client_request_id')::uuid;

  if v_client_request_id is null then
    raise exception 'CLIENT_REQUEST_ID_REQUIRED';
  end if;

  -- 이미 동일한 client_request_id 로 저장된 신청이 있다면 (중복 클릭/재시도)
  -- 새로 만들지 않고 기존 접수번호를 그대로 반환한다.
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

  v_players := payload->'players';

  if v_players is null or jsonb_typeof(v_players) <> 'array' then
    raise exception 'PLAYERS_REQUIRED';
  end if;

  v_player_count := jsonb_array_length(v_players);

  if v_player_count < 3 or v_player_count > 5 then
    raise exception 'PLAYER_COUNT_OUT_OF_RANGE';
  end if;

  if (payload->>'division') not in ('중등부', '고등부') then
    raise exception 'INVALID_DIVISION';
  end if;

  if coalesce(payload->>'school_name', '') = '' then
    raise exception 'SCHOOL_NAME_REQUIRED';
  end if;

  if coalesce(payload->>'team_name', '') = '' then
    raise exception 'TEAM_NAME_REQUIRED';
  end if;

  if (payload->>'privacy_agreed')::boolean is not true
     or (payload->>'rules_agreed')::boolean is not true
     or (payload->>'representative_agreed')::boolean is not true then
    raise exception 'AGREEMENTS_REQUIRED';
  end if;

  -- 접수번호 발급: BB2026-001 형식, 시퀀스로 중복 없이 발급
  v_registration_number := 'BB2026-' || lpad(nextval('bb2026_registration_seq')::text, 3, '0');

  insert into public.teams (
    registration_number, client_request_id, division, school_name, team_name,
    player_count, representative_name, representative_phone,
    privacy_agreed, rules_agreed, representative_agreed, media_agreed, status
  ) values (
    v_registration_number,
    v_client_request_id,
    payload->>'division',
    payload->>'school_name',
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
       or coalesce(v_player->>'phone', '') = '' then
      raise exception 'PLAYER_FIELDS_REQUIRED';
    end if;

    insert into public.players (
      team_id, player_order, player_name, grade, phone, is_representative
    ) values (
      v_team_id,
      (v_player->>'player_order')::smallint,
      v_player->>'player_name',
      (v_player->>'grade')::smallint,
      v_player->>'phone',
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

comment on function public.register_team(jsonb) is '참가신청 원자적 저장(teams+players) - anon 역할이 유일하게 실행 가능한 쓰기 경로';

-- ============================================================================
-- 7. Row Level Security (RLS) 설정
--    - 일반 참가자(anon): 테이블 직접 접근 전면 차단. register_team() 함수로만 등록 가능
--    - 관리자(authenticated, Supabase Auth 로그인 사용자): 조회/수정/상태변경/삭제(soft) 가능
-- ============================================================================
alter table public.teams enable row level security;
alter table public.players enable row level security;

-- 기존 정책이 있다면 정리 후 재생성 (재실행 시 오류 방지)
drop policy if exists admin_select_teams on public.teams;
drop policy if exists admin_update_teams on public.teams;
drop policy if exists admin_select_players on public.players;
drop policy if exists admin_insert_players on public.players;
drop policy if exists admin_update_players on public.players;
drop policy if exists admin_delete_players on public.players;

-- 관리자(로그인 사용자)만 팀 목록/상세 조회 가능
create policy admin_select_teams on public.teams
  for select
  to authenticated
  using (true);

-- 관리자(로그인 사용자)만 팀 정보 수정(상태변경, soft delete 포함) 가능
create policy admin_update_teams on public.teams
  for update
  to authenticated
  using (true)
  with check (true);

-- 관리자만 선수 명단 조회 가능
create policy admin_select_players on public.players
  for select
  to authenticated
  using (true);

-- 관리자만 선수 추가 가능 (수정 화면에서 선수 추가)
create policy admin_insert_players on public.players
  for insert
  to authenticated
  with check (true);

-- 관리자만 선수 정보 수정 가능
create policy admin_update_players on public.players
  for update
  to authenticated
  using (true)
  with check (true);

-- 관리자만 선수 삭제 가능 (수정 화면에서 선수 삭제, 최소 3명 유지는 애플리케이션에서 검증)
create policy admin_delete_players on public.players
  for delete
  to authenticated
  using (true);

-- anon(참가자) 역할에는 테이블 직접 권한을 전혀 부여하지 않는다.
-- (참가자는 register_team() 함수를 통해서만 데이터를 생성할 수 있음)
revoke all on public.teams from anon;
revoke all on public.players from anon;
revoke all on public.teams from authenticated;
revoke all on public.players from authenticated;

grant select, update on public.teams to authenticated;
grant select, insert, update, delete on public.players to authenticated;

-- register_team() 함수는 anon(참가자), authenticated(관리자 테스트용) 모두 실행 가능
grant execute on function public.register_team(jsonb) to anon, authenticated;

-- 시퀀스는 register_team() 함수(SECURITY DEFINER 소유자 권한)만 사용하므로
-- anon에게 직접 권한을 줄 필요가 없다.
revoke all on sequence bb2026_registration_seq from anon, authenticated;

-- ============================================================================
-- 완료. 아래 SELECT 로 테이블이 잘 생성되었는지 확인할 수 있습니다.
-- ============================================================================
-- select * from public.teams;
-- select * from public.players;
