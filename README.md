# 2026 여주시청소년스포츠대전 3x3 농구대회 참가신청 시스템

비개발자도 그대로 따라 할 수 있도록, "어떤 화면에서 어떤 버튼을 누르고 무엇을 입력하는지" 순서대로 정리했습니다.
전체 과정은 크게 4단계입니다.

1. Supabase 프로젝트 만들기 + DB 테이블 생성
2. Supabase에서 필요한 값(키) 확인하기
3. 관리자 로그인 계정 만들기
4. GitHub에 코드 올리기 + Vercel로 배포하기

---

## 0. 준비물

- Supabase 계정 (https://supabase.com , 무료로 시작 가능)
- GitHub 계정 (https://github.com , 무료)
- Vercel 계정 (https://vercel.com , GitHub 계정으로 바로 가입 가능)

---

## 1단계. Supabase 프로젝트 만들기

1. https://supabase.com 접속 후 로그인
2. 대시보드에서 **[New project]** 클릭
3. 아래 내용 입력
   - **Name**: `yeoju-3x3-basketball` (원하는 이름으로 가능)
   - **Database Password**: 임의의 강력한 비밀번호 입력 (꼭 별도 메모장에 저장해두세요)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국에서 가장 빠릅니다)
4. **[Create new project]** 클릭 후 1~2분 정도 대기

### 1-1. DB 테이블 생성 (SQL 실행)

1. 왼쪽 사이드바에서 **[SQL Editor]** 클릭
2. 우측 상단 **[New query]** 클릭
3. 이 프로젝트 폴더에 포함된 `supabase/migrations/0001_init.sql` 파일을 텍스트 에디터(메모장 등)로 열어서 **전체 내용을 복사**
4. Supabase SQL Editor 입력창에 붙여넣기
5. 우측 하단(또는 상단) **[RUN]** 버튼 클릭
6. 하단에 `Success. No rows returned` 메시지가 나오면 정상적으로 완료된 것입니다.

> 이 SQL 한 번 실행으로 `teams`, `players` 테이블, 접수번호 자동발급 규칙, 보안 정책(RLS)까지 모두 설정됩니다.
> 기존에 다른 용도로 만들어둔 `usage_logs` 등의 테이블에는 영향을 주지 않습니다.

7. 왼쪽 사이드바에서 **[Table Editor]** 클릭 → `teams`, `players` 두 테이블이 보이면 정상입니다.

---

## 2단계. Supabase 키(연결 정보) 확인하기

1. 왼쪽 사이드바 하단 **[Project Settings]** (톱니바퀴 아이콘) 클릭
2. **[Data API]** 또는 **[API]** 메뉴 클릭 (Supabase 화면 버전에 따라 이름이 조금 다를 수 있습니다)
3. 아래 3가지 값을 메모장에 복사해두세요.
   - **Project URL** → 예: `https://abcdefgh.supabase.co`
   - **anon public** 키 (API Keys 항목) → `NEXT_PUBLIC_SUPABASE_ANON_KEY` 로 사용
   - **service_role secret** 키 (API Keys 항목, "secret"이라고 표시됨) → `SUPABASE_SERVICE_ROLE_KEY` 로 사용
     - ⚠️ 이 키는 절대 다른 사람과 공유하거나 GitHub에 올리면 안 됩니다. Vercel 환경변수에만 등록합니다.

4. 임의의 긴 비밀문자열 하나를 더 준비합니다. (`SESSION_SECRET` 용도, 아래 방법 중 하나로 생성)
   - 검색창에 "랜덤 문자열 생성기" 또는 "uuid generator"를 검색해서 나온 긴 문자열을 사용해도 되고,
   - 아무 특별한 의미 없는 32자 이상의 영문+숫자 조합을 직접 만들어도 됩니다. (예: `k3f9x...` 형태로 40자 정도)

이제 총 4개의 값이 준비되었습니다.

| 이름 | 용도 | 공개 가능 여부 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 | 공개 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 일반 접근용 키 | 공개 가능 |
| `SUPABASE_SERVICE_ROLE_KEY` | 관리자 전용 서버 키 | **절대 비공개** |
| `SESSION_SECRET` | 신청완료 페이지 보안용 임의 문자열 | **절대 비공개** |

---

## 3단계. 관리자 로그인 계정 만들기

일반 이용자는 로그인 없이 참가신청만 하고, **관리자만** `/admin` 페이지를 사용할 수 있습니다.
관리자 계정은 아래처럼 Supabase 대시보드에서 직접 만듭니다. (회원가입 화면은 따로 만들지 않았습니다 - 보안상 의도된 설계입니다.)

1. Supabase 대시보드 왼쪽 사이드바 **[Authentication]** 클릭
2. 상단 **[Users]** 탭 클릭
3. **[Add user]** → **[Create new user]** 클릭
4. **Email**, **Password** 입력 (이 이메일/비밀번호로 `/admin/login`에 로그인합니다)
5. **"Auto Confirm User"** 옵션을 체크(활성화)한 뒤 생성 (이메일 인증 절차 없이 바로 로그인 가능하도록)

필요한 관리자 수만큼 이 과정을 반복하면 됩니다.

---

## 4단계. GitHub에 코드 올리기

1. https://github.com 에서 로그인 후 우측 상단 **[+]** → **[New repository]** 클릭
2. **Repository name**: `yeoju-3x3-basketball` 입력 → **Public** 또는 **Private** 선택 → **[Create repository]** 클릭
3. 저장소가 만들어지면 나오는 화면에서 **"uploading an existing file"** 링크를 클릭
   (또는 저장소 페이지 상단의 **[Add file]** → **[Upload files]**)
4. 전달받은 프로젝트 zip 파일의 압축을 컴퓨터에서 먼저 풀어주세요.
5. 압축을 푼 폴더 안의 **모든 파일과 폴더**를 GitHub 업로드 화면으로 끌어다 놓기(드래그 앤 드롭)
   - ⚠️ `.env.local` 파일은 없으므로 신경 쓰지 않아도 됩니다. (`.env.local.example`만 참고용으로 올라갑니다 - 실제 키가 없는 안전한 파일입니다)
6. 하단 **[Commit changes]** 클릭

---

## 5단계. Vercel로 배포하기

1. https://vercel.com 접속 → GitHub 계정으로 로그인
2. 대시보드에서 **[Add New...]** → **[Project]** 클릭
3. 방금 만든 `yeoju-3x3-basketball` 저장소를 찾아 **[Import]** 클릭
4. **Configure Project** 화면에서 **[Environment Variables]** 영역을 펼치고, 아래 4개를 하나씩 입력 후 **[Add]**

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | 2단계에서 복사한 Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 2단계에서 복사한 anon public 키 |
   | `SUPABASE_SERVICE_ROLE_KEY` | 2단계에서 복사한 service_role secret 키 |
   | `SESSION_SECRET` | 2단계에서 준비한 임의의 긴 문자열 |

5. **[Deploy]** 클릭 → 1~3분 정도 빌드가 진행됩니다.
6. 빌드가 끝나면 **"Congratulations!"** 화면과 함께 사이트 주소(예: `https://yeoju-3x3-basketball.vercel.app`)가 발급됩니다.

### 배포 후 환경변수를 나중에 수정/추가하고 싶다면

- Vercel 프로젝트 화면 → 상단 **[Settings]** 탭 → 좌측 **[Environment Variables]** 메뉴에서 언제든 값 수정 가능
- 값을 수정한 뒤에는 **[Deployments]** 탭 → 가장 최근 배포 옆 **[⋯]** → **[Redeploy]** 를 해줘야 새 값이 적용됩니다.

---

## 6단계. 실제 동작 점검 체크리스트

배포된 주소로 접속해서 아래를 하나씩 확인해보세요.

- [ ] `/` 접속 시 대회 정보와 참가신청 폼이 보인다
- [ ] 선수를 3명 미만으로 두고 제출하면 오류가 뜬다 (최소 3명 제한)
- [ ] "+ 선수 추가"로 4, 5번째 선수까지 추가할 수 있고 5명이 되면 버튼이 비활성화된다
- [ ] 필수 항목을 비워두고 제출하면 빨간 오류 메시지와 함께 해당 위치로 화면이 이동한다
- [ ] 정상적으로 제출하면 확인 모달이 뜨고, "참가신청 완료"를 누르면 `/complete`로 이동하며 접수번호(`BB2026-001` 형식)가 보인다
- [ ] Supabase [Table Editor] → `teams`, `players` 테이블에 데이터가 정상적으로 들어갔는지 확인
- [ ] `/complete`를 새로고침해도 같은 내용이 보이지만, 다른 브라우저(시크릿 모드)로 `/complete`에 접속하면 "조회 가능한 신청내역이 없습니다"가 뜬다 (개인정보 보호 확인)
- [ ] `/admin` 접속 시 로그인하지 않았다면 `/admin/login`으로 자동 이동한다
- [ ] 3단계에서 만든 계정으로 로그인이 된다
- [ ] `/admin` 대시보드에 전체 신청팀/선수 수, 부문별/상태별 집계, 학교별 집계가 보인다
- [ ] `/admin/teams`에서 최신 접수순으로 목록이 보이고, 검색/필터가 동시에 동작한다
- [ ] 목록에는 대표자 이름까지만 보이고 연락처는 보이지 않는다 (상세보기에서만 확인)
- [ ] 상세보기에서 신청상태를 변경하면 즉시 저장되고 대시보드 통계에도 반영된다
- [ ] 수정하기에서 선수 추가/삭제, 정보 수정이 되고 최소 3명 미만으로는 삭제가 안 된다
- [ ] 삭제 버튼 클릭 시 확인창이 뜨고, 삭제 후에는 목록/통계에서 제외된다
- [ ] "참가현황 CSV 다운로드" 클릭 시 한글이 깨지지 않는 CSV 파일이 다운로드된다 (엑셀로 열어서 확인)
- [ ] 휴대폰 화면 크기에서도 입력과 버튼 조작이 불편하지 않다

---

## 참고: 대회 정보/신청기간 수정 방법

`config/tournament.ts` 파일의 값만 수정하면 사이트 전체에 반영됩니다. (개발 지식 없이도 숫자/글자만 바꾸면 됩니다)

- `dateLabel`, `locationLabel`, `feeLabel` : 화면에 보이는 대회일시/장소/참가비 문구
- `applicationPeriod.start` / `applicationPeriod.end` : 참가신청 가능 기간 (이 기간이 아니면 신청 폼이 숨겨지고 안내 문구만 보입니다)
- `logoImagePath` / `posterImagePath` : `public/images/` 폴더에 이미지를 넣고 경로(`/images/파일명.png`)를 넣으면 상단에 로고/포스터가 표시됩니다.

수정 후에는 GitHub에 변경된 파일을 다시 업로드(Commit)하면 Vercel이 자동으로 재배포합니다.

---

## 프로젝트 구조 설명

```
app/
  page.tsx                    참가신청 페이지 (/)
  complete/page.tsx           신청완료 페이지 (/complete)
  api/register/route.ts       참가신청 저장 API (서버 전용 처리)
  admin/
    login/page.tsx            관리자 로그인 (/admin/login)
    (protected)/              로그인해야 접근 가능한 영역 (URL에는 영향 없음)
      layout.tsx               관리자 공통 상단 메뉴
      page.tsx                 관리자 대시보드 (/admin)
      teams/page.tsx           참가팀 관리 목록 (/admin/teams)
      teams/[id]/page.tsx      참가팀 상세/수정 (/admin/teams/:id)
components/                    화면 구성 요소 (참가신청용 / 관리자용 구분)
config/tournament.ts           대회 기본정보 (날짜/장소/참가비/신청기간 등)
lib/supabase/                  Supabase 연결 설정 (브라우저용 / 서버용 / 관리자용 분리)
lib/validation.ts               입력값 검증 규칙 (참가신청 폼 공통 사용)
types/database.ts               테이블/폼 데이터 타입 정의
supabase/migrations/0001_init.sql  DB 테이블 및 보안정책 생성 스크립트
middleware.ts                   /admin 접근 시 로그인 여부 확인
```

**왜 이 구조를 사용했나요?**
Next.js의 최신 버전(App Router)에서 권장하는 구조를 따르면서, "로그인 필요 없음(참가자)"과
"로그인 필요(관리자)" 영역을 폴더로 명확히 분리했습니다. 관리자 영역은 `(protected)`라는
특수 폴더(괄호로 감싼 폴더는 실제 URL 주소에는 나타나지 않습니다)로 한 번 더 묶어서, 로그인
화면(`/admin/login`)에는 관리자 메뉴가 보이지 않고, 나머지 관리자 화면에는 공통 메뉴가 자동으로
적용되도록 했습니다.

---

## 보안 설계 요약

- 참가자(anon key)는 DB 테이블에 직접 접근할 수 없고, `register_team`이라는 안전한 DB 함수(RPC)를
  통해서만 "본인이 입력한 신청 1건"을 저장할 수 있습니다. teams/players 저장은 이 함수 안에서
  하나의 트랜잭션으로 처리되어, 팀 정보만 저장되고 선수 정보가 빠지는 일이 없습니다.
- 접수번호는 DB 시퀀스(순번 발급기)로 생성되어 동시 신청 상황에서도 중복되지 않습니다.
- 신청 완료 후 `/complete` 페이지는 서명된 보안 쿠키로만 본인의 신청 내용을 확인할 수 있고,
  다른 사람이 URL을 직접 입력해도 타인의 정보를 볼 수 없습니다.
- 관리자 기능(조회/수정/상태변경/삭제)은 Supabase Auth로 로그인한 사용자만 가능하도록
  Row Level Security(RLS)로 제한되어 있습니다.
- `service_role` 키와 `SESSION_SECRET`은 서버 코드에서만 사용되며 브라우저로 전송되지 않습니다.

---

## 자체 점검에서 확인하지 못한 부분 (꼭 확인해주세요)

이 코드는 실제 Supabase 프로젝트와 연결되지 않은 상태에서 작성되었기 때문에, 아래 항목은
**Vercel에 배포한 뒤 반드시 직접 확인**해주셔야 합니다. 만약 Vercel 배포 화면에서 빌드 오류(에러)가
발생하면, 오류 메시지 화면을 캡처해서 다시 알려주시면 바로 수정해드릴 수 있습니다.

- 실제 Supabase 키를 입력한 뒤 참가신청 → 저장 → 신청완료까지 전체 흐름이 정상 동작하는지
- 관리자 로그인 후 목록/수정/삭제/CSV 다운로드가 실제 데이터로 정상 동작하는지  .
