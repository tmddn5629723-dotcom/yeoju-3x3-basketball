-- ============================================================================
-- 선수별 학교명 추가 마이그레이션
--
-- 배경: 기존에는 "팀 학교명"만 입력받았지만, 연합팀처럼 선수마다 소속 학교가
--       다를 수 있어 선수 개개인의 학교명도 별도로 입력/저장할 수 있도록 합니다.
--       팀 대표 학교명(teams.school_name)은 기존 그대로 유지됩니다(팀 목록/검색/CSV에 계속 사용).
--
-- 사용 방법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여넣고 RUN
-- 이미 0001_init.sql을 실행한 프로젝트에 이어서 실행하면 됩니다. (teams 테이블은 건드리지 않습니다)
-- ============================================================================

-- 1. players 테이블에 선수 개별 학교명 컬럼 추가
alter table public.players
  add column if not exists school_name text;

comment on column public.players.school_name is '선수 개인 소속 학교명 (연합팀 등 선수마다 학교가 다를 수 있어 팀 대표 학교명과 별도로 저장)';

-- 2. register_team() 함수 재정의: 선수별 school_name도 함께 저장하도록 수정
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

-- 함수를 재정의해도 기존 권한(GRANT)은 유지되지만, 혹시 몰라 다시 한번 명시합니다.
grant execute on function public.register_team(jsonb) to anon, authenticated;
