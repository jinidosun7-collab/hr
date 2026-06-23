# ORO HR 타사(他社) 이식 가이드

> **이 문서의 목적**: 현재 ORO에서 운영 중인 HR 플랫폼(연차·근태·전자결재 등)을 **다른 회사에 그대로 복제**해서 새로 띄우는 방법을 처음부터 끝까지 단계별로 설명합니다.
> **대상 독자**: 개발 초보자도 따라 할 수 있도록, 무엇을·왜·어떻게 하는지 풀어서 적었습니다.
> **결과물**: `새회사.도메인` 으로 접속되는, ORO HR과 동일한 기능의 독립 HR 시스템.

---

## 0. 한눈에 보는 구조

```
[직원/관리자 브라우저]
        │  (로그인)
        ▼
[프론트엔드: React + Vite]  ──배포──▶  Vercel  ──▶  새회사 도메인(hr.새회사.com)
        │  fetch (x-user-token 첨부)
        ▼
[백엔드: Supabase Edge Function "hr" (Deno/TypeScript)]
        │  (service key로 DB 접근)
        ▼
[데이터베이스: Supabase PostgreSQL]  +  [Supabase Auth(로그인 계정)]
```

핵심 4덩어리:

| 덩어리 | 무엇 | 어디서 운영 |
|---|---|---|
| 프론트엔드 | 화면(React) | Vercel |
| 백엔드 | API(Edge Function `hr`) | Supabase |
| 데이터베이스 | 표(PostgreSQL) | Supabase |
| 인증 | 로그인 계정 | Supabase Auth |

> **중요한 설계 포인트**: 현재 ORO는 로그인(인증)을 별도 시스템(oro-mes)과 **공유**합니다. 새 회사는 그런 공유 대상이 없을 가능성이 높으므로, **이 가이드는 "Supabase 프로젝트 1개가 인증·DB·백엔드를 모두 담당하는 단독형(standalone)"을 기본으로 설명**합니다. (기존 시스템과 SSO가 필요하면 §9-B 참고)

---

## 1. 사전 준비물 (계정·도구)

새 회사에서 아래를 준비합니다. 대부분 무료로 시작할 수 있습니다.

- **Supabase 계정** — DB + 백엔드 + 인증 (https://supabase.com)
- **Vercel 계정** — 프론트 배포 (https://vercel.com)
- **GitHub 계정 + 새 저장소(repository)** — 코드 보관 & 자동배포 연결
- **도메인** — 예: `hr.새회사.com` (가비아/Cloudflare 등에서 보유)
- **로컬 PC 도구**
  - Git (https://git-scm.com)
  - Node.js LTS 버전 (https://nodejs.org) — `node -v`로 확인
  - (선택) Supabase CLI — Edge Function 배포용 (https://supabase.com/docs/guides/cli)

---

## 2. 회사별로 반드시 바꿔야 하는 값 (체크리스트)

이식할 때 "ORO 전용 값"을 "새 회사 값"으로 바꿔야 합니다. 아래가 전부입니다.

| 구분 | 항목 | 위치(파일) | 예시 |
|---|---|---|---|
| 인증/DB | Supabase 프로젝트 URL | `frontend/src/supabaseClient.js`, `frontend/src/api.js`, Edge Function 상단 | `https://xxxx.supabase.co` |
| 인증/DB | Supabase 공개키(anon/publishable) | 동일 | `sb_publishable_...` |
| 백엔드 | 인증 검증 대상(MES_URL/MES_ANON) | Edge Function `index.ts` 상단 | 단독형이면 **자기 프로젝트로** 설정 |
| 화면 | 시스템 이름 ("ORO HR") | `frontend/src/App.jsx` | "새회사 HR" |
| 화면 | 상호이동 링크(MES ↗) | `frontend/src/App.jsx` `MES_URL` | 불필요하면 제거 |
| 연차규칙 | 1일 기준시간/발생식/상한 | Edge Function 상단 상수 | §7 참고 |
| 증명서 | 회사명·대표자·직인 문구 | `frontend/src/components/Certificate.jsx` | 새 회사 정보 |
| 공휴일 | 국가 코드 | Edge Function `/holidays/import` | 기본 `KR` |

> **비밀키 주의**: Supabase의 **service_role key**는 절대 프론트 코드·깃에 올리지 않습니다. 이 키는 Edge Function의 **환경변수(자동 주입)** 로만 씁니다. 프론트에는 **공개키(anon/publishable)만** 들어갑니다(공개돼도 안전).

---

## 3. 이식 단계 (Phase 1 → 7)

### Phase 1. Supabase 새 프로젝트 만들기

1. Supabase 로그인 → **New project** 생성 (회사명으로, 예: `newco-hr`).
2. 리전(Region)은 가까운 곳(예: Seoul/Tokyo) 선택.
3. 생성 후 **Project Settings → API** 에서 아래 3가지를 메모:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon/publishable key** (공개키 — 프론트에 사용)
   - **service_role key** (비밀키 — Edge Function 환경변수, 절대 노출 금지)

### Phase 2. 데이터베이스 표 만들기 (스키마)

Supabase 대시보드 → **SQL Editor** → 새 쿼리에 §6의 **`schema.sql` 전체**를 붙여넣고 실행합니다.
그다음 §6의 **`seed.sql`(기본 데이터: 휴가구분·메뉴·권한)** 도 실행합니다.

> 표가 모두 만들어졌는지 **Table Editor**에서 확인하세요. (employees, leave_records, …, attendance_days 등)

### Phase 3. 인증(로그인) 설정

단독형 기준:

1. Supabase 대시보드 → **Authentication → Providers → Email** 활성화 (이메일+비밀번호 로그인).
2. **Authentication → Users → Add user** 로 **대표 관리자 계정**을 1개 만듭니다. (예: `owner@newco.com`)
3. 그 이메일을 `app_admins`에 **master**로 등록 (SQL Editor):
   ```sql
   INSERT INTO public.app_admins (email, role) VALUES ('owner@newco.com', 'master');
   ```
   → master는 항상 전체 권한입니다.

### Phase 4. 백엔드(Edge Function `hr`) 배포

1. 기존 ORO 저장소의 `supabase/functions/hr/index.ts` 를 새 저장소로 복사합니다.
2. **파일 상단 상수를 새 회사 값으로 수정** (§5 참고). 단독형이면 `MES_URL`·`MES_ANON`을 **새 프로젝트 URL/공개키로** 설정합니다.
3. 배포 (둘 중 하나):
   - **Supabase CLI**: `supabase functions deploy hr --no-verify-jwt --project-ref <새프로젝트ref>`
   - **대시보드**: Edge Functions → Deploy 로 코드 업로드 (`verify_jwt = false`)
4. `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` 환경변수는 Supabase가 **자동 주입**하므로 따로 안 넣어도 됩니다.

> `verify_jwt = false` 가 중요합니다. 이 함수는 **자체적으로** `x-user-token`을 검증하기 때문입니다.

### Phase 5. 프론트엔드 배포 (GitHub + Vercel)

1. 기존 `frontend/` 폴더를 새 저장소로 복사.
2. §2 표대로 `supabaseClient.js`, `api.js`, `App.jsx`의 값을 새 회사 값으로 수정.
3. GitHub 새 저장소에 push.
4. Vercel → **New Project** → 그 저장소 연결 → **Root Directory를 `frontend`** 로 지정 → Deploy.
   - 프레임워크는 Vite 자동 감지. 별도 `vercel.json` 불필요.
   - (선택) 환경변수로 빼고 싶으면 Vercel에 `VITE_HR_SUPABASE_URL`, `VITE_HR_ANON_KEY` 등록. (코드에 기본값이 있으면 생략 가능)

### Phase 6. 도메인 연결

1. Vercel → 프로젝트 → **Settings → Domains** → `hr.새회사.com` 추가.
2. 안내되는 **CNAME(또는 A) 레코드**를 도메인 DNS에 등록.
3. 몇 분~수십 분 후 HTTPS 자동 발급되면 접속 확인.

### Phase 7. 초기 데이터 입력

1. master 계정으로 로그인.
2. **사원 관리**에서 직원 등록 (또는 CSV 일괄등록).
3. **권한 → 직원 계정 연결**에서 직원별 로그인 이메일 연결(직원 자가조회용).
4. **권한 → 관리자 관리**에서 관리자·매니저 이메일 등록.
5. **설정**에서 공휴일 자동수집(해당 연도), 휴가구분 확인.
6. (근태 쓰면) **근태 현황**에서 월별 근태 엑셀 업로드.

---

## 4. 권한·역할 모델 (그대로 이식됨)

| 역할 | 정의 | 무엇을 보나 |
|---|---|---|
| **master** | `app_admins.role='master'` | 항상 전체. 권한·메뉴 구성 편집 가능 |
| **admin / manager** | `app_admins` 등록 | 권한 매트릭스에서 켠 메뉴만 |
| **employee** | `employees.login_email` 로 매칭 | 기본 "내 연차", "휴가 입력(결재)" |
| **none** | 어디에도 없음 | 접근 불가 |

- **메뉴가 보이면 그 메뉴의 작업(등록·수정·삭제)도 자동 허용**됩니다. (별도 작업권한 표 없음)
- 메뉴 표시는 `role_permissions(role, perm_key='tab:키', allowed)` 로 제어합니다.

---

## 5. 백엔드 상수 (Edge Function `index.ts` 상단)

```ts
// === 새 회사 값으로 바꿀 것 ===
const MES_URL  = "https://xxxx.supabase.co";        // 단독형: 새 프로젝트 URL
const MES_ANON = "sb_publishable_xxxxx";            // 단독형: 새 프로젝트 공개키

// === 연차 규칙 (회사 정책에 맞게) ===
const BASE_LEAVE = 15;       // 1년 이상 근속 기본 연차일수
const MAX_LEAVE  = 25;       // 연차 상한
const FIRST_YEAR_MAX = 11;   // 1년 미만(월차) 최대 11일
// 1일 = 7시간 기준은 leave_types의 시간단위 deduct_days(예: 1시간=0.142857)에 반영돼 있음
```

> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 는 환경변수 자동 주입(수정 불필요).

**연차 발생 공식(현재 ORO 규칙):**
- 1년 미만: `MIN(근속개월수, 11)` 일
- 1년 이상: `MIN( INT((근속연수-1)/2) + 15, 25 )` 일
- 미사용 연차는 **이월 없음(연도별 리셋)**, 1일 = 7시간 기준.

회사 정책이 다르면 위 상수와 `accrued()` 함수만 고치면 됩니다.

---

## 6. 데이터베이스 스키마 & 기본 데이터

### 6-1. `schema.sql` (표 생성 — SQL Editor에 그대로 실행)

```sql
-- ===== 직원 =====
CREATE TABLE public.employees (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  department text, position text,
  employee_no text,
  monthly_wage numeric DEFAULT 0,
  hire_date date NOT NULL,
  resign_date date,
  accrual_basis text NOT NULL DEFAULT 'hire',   -- 'hire'(입사일 기준) | 'fiscal'(회계연도)
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  login_email text,                              -- 직원 로그인 이메일(자가조회 매칭)
  status text NOT NULL DEFAULT '재직',           -- 재직/퇴사/정지
  phone text, personal_email text, address text,
  birth_date date, gender text,
  emergency_name text, emergency_relation text, emergency_phone text,
  bank_name text, bank_account text,
  contract_type text, contract_start date, contract_end date,
  card_no text,                                  -- (근태 자동연동용) 카드번호
  attendance_uid text                            -- (근태 엑셀) 사용자ID 매칭
);

-- ===== 휴가 구분 =====
CREATE TABLE public.leave_types (
  code text PRIMARY KEY,
  label text NOT NULL,
  deduct_days numeric NOT NULL,                  -- 1건당 차감 일수(예: 1시간=0.142857)
  is_deductible boolean NOT NULL DEFAULT true    -- false면 연차 차감 안 함(경조/병가 등)
);

-- ===== 휴가 사용 기록 =====
CREATE TABLE public.leave_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  applied_year int NOT NULL,
  leave_type_code text NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  exclude_holiday boolean NOT NULL DEFAULT true,
  used_days numeric NOT NULL,
  reason text, note text,
  created_at timestamptz DEFAULT now()
);

-- ===== 연차 조정(추가지급/추가공제) =====
CREATE TABLE public.leave_adjustments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  applied_year int NOT NULL,
  add_days numeric NOT NULL DEFAULT 0,
  deduct_days numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- ===== 연차수당 정산 =====
CREATE TABLE public.leave_allowances (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  applied_year int NOT NULL,
  hourly_wage numeric,
  deduct_days numeric NOT NULL DEFAULT 0,
  paid_amount numeric, paid_date date, note text,
  created_at timestamptz DEFAULT now()
);

-- ===== 공휴일 (year는 자동계산) =====
CREATE TABLE public.holidays (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  holiday_date date NOT NULL,
  name text NOT NULL,
  year int GENERATED ALWAYS AS (EXTRACT(YEAR FROM holiday_date)) STORED
);

-- ===== 관리자(역할) =====
CREATE TABLE public.app_admins (
  email text PRIMARY KEY,
  role text NOT NULL DEFAULT 'admin',            -- master/admin/manager
  note text,
  created_at timestamptz DEFAULT now()
);

-- ===== 역할별 권한 =====
CREATE TABLE public.role_permissions (
  role text NOT NULL,
  perm_key text NOT NULL,                         -- 예: 'tab:dashboard'
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (role, perm_key)
);

-- ===== 메뉴 구성 =====
CREATE TABLE public.menu_groups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE TABLE public.menu_tabs (
  tab_key text PRIMARY KEY,
  group_id bigint REFERENCES public.menu_groups(id) ON DELETE SET NULL,
  label text,
  sort_order int NOT NULL DEFAULT 0
);

-- ===== 인사카드 항목(학력/경력/자격/가족/교육) =====
CREATE TABLE public.employee_profile_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category text NOT NULL,                         -- education/career/license/family/training
  title text, detail text,
  date_from date, date_to date, note text,
  created_at timestamptz DEFAULT now()
);

-- ===== 전자결재(휴가 신청·승인) =====
CREATE TABLE public.leave_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  applied_year int NOT NULL,
  leave_type_code text NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  exclude_holiday boolean DEFAULT true,
  reason text,
  status text NOT NULL DEFAULT 'pending',         -- pending/approved/rejected
  decided_by text, decided_at timestamptz, decision_note text,
  leave_record_id bigint,
  created_at timestamptz DEFAULT now()
);

-- ===== 근태(엑셀 업로드: 일별 집계) =====
CREATE TABLE public.attendance_days (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint REFERENCES public.employees(id) ON DELETE SET NULL,
  user_ext_id text, name_raw text,
  work_date date NOT NULL, day_name text,
  clock_in text, clock_out text,
  basic_min int, overtime_min int, total_min int, recognized_min int,
  source text NOT NULL DEFAULT 'excel',
  dedup_key text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- ===== 근태(자동연동용 카드 원본 - 선택) =====
CREATE TABLE public.attendance_punches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id bigint REFERENCES public.employees(id) ON DELETE SET NULL,
  card_no text,
  punch_time timestamptz NOT NULL, punch_type text,
  source text NOT NULL DEFAULT 'adt_caps',
  raw jsonb, dedup_key text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- ===== 외부연동 토큰(자동연동용 - 선택) =====
CREATE TABLE public.integration_tokens (
  name text PRIMARY KEY,
  token text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_attendance_days_emp ON public.attendance_days(employee_id, work_date);
CREATE INDEX idx_attendance_days_date ON public.attendance_days(work_date);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status, applied_year);

-- 모든 표 RLS 잠금 (접근은 Edge Function의 service key로만)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profile_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;
```

> **RLS 정책을 따로 안 만드는 이유**: 모든 데이터 접근은 Edge Function이 **service_role key**(RLS 우회)로 수행하고, 권한 검사는 함수 안에서 합니다. 따라서 표에 정책이 없어도(=anon은 아무것도 못 읽음) 정상이며 오히려 안전합니다.

### 6-2. `seed.sql` (기본 데이터)

```sql
-- 휴가 구분
INSERT INTO public.leave_types (code,label,deduct_days,is_deductible) VALUES
 ('annual_7h','연차(7시간)',1,true),
 ('event','경조휴가',1,false),
 ('sick','병가',1,false),
 ('reserve','예비군 훈련',1,false),
 ('h6','6시간',0.857143,true),
 ('h5','5시간',0.714286,true),
 ('h4','4시간',0.571429,true),
 ('h3','3시간',0.428571,true),
 ('h2','2시간',0.285714,true),
 ('h1','1시간',0.142857,true);

-- 메뉴 그룹
INSERT INTO public.menu_groups (name,sort_order) VALUES
 ('개인',0),('현황',1),('인사',2),('연차',3),('설정',4),('근태',5);

-- 메뉴 항목 (그룹 이름으로 연결)
INSERT INTO public.menu_tabs (tab_key,label,sort_order,group_id)
SELECT v.tab_key, v.label, v.sort_order, g.id
FROM (VALUES
 ('myleave','내 연차',1,'개인'),
 ('leave_request','휴가 입력(결재)',2,'개인'),
 ('dashboard','대시보드',1,'현황'),
 ('calendar','캘린더',2,'현황'),
 ('alerts','알림센터',3,'현황'),
 ('employees','사원 관리',1,'인사'),
 ('profile','인사카드',2,'인사'),
 ('certificate','증명서',3,'인사'),
 ('org','조직도',4,'인사'),
 ('training','교육·자격',5,'인사'),
 ('records','휴가 입력',1,'연차'),
 ('adjust','조정·수당',2,'연차'),
 ('status','연차 현황',3,'연차'),
 ('settlement','정산서',4,'연차'),
 ('approvals','결재함',9,'연차'),
 ('settings','설정',1,'설정'),
 ('permissions','권한',2,'설정'),
 ('attendance','근태 현황',1,'근태')
) AS v(tab_key,label,sort_order,gname)
JOIN public.menu_groups g ON g.name = v.gname;

-- 기본 권한(메뉴 표시). master는 코드에서 항상 전체라 시드 불필요.
INSERT INTO public.role_permissions (role,perm_key,allowed) VALUES
 -- 직원: 본인용만
 ('employee','tab:myleave',true),
 ('employee','tab:leave_request',true),
 -- 매니저
 ('manager','tab:dashboard',true),('manager','tab:calendar',true),
 ('manager','tab:alerts',true),('manager','tab:status',true),
 ('manager','tab:org',true),('manager','tab:training',true),
 ('manager','tab:settlement',true),('manager','tab:approvals',true),
 ('manager','tab:attendance',true),
 -- 관리자(매니저 + 인사/설정/사원관리)
 ('admin','tab:dashboard',true),('admin','tab:calendar',true),
 ('admin','tab:alerts',true),('admin','tab:status',true),
 ('admin','tab:org',true),('admin','tab:training',true),
 ('admin','tab:settlement',true),('admin','tab:approvals',true),
 ('admin','tab:attendance',true),('admin','tab:employees',true),
 ('admin','tab:profile',true),('admin','tab:certificate',true),
 ('admin','tab:records',true),('admin','tab:adjust',true),
 ('admin','tab:settings',true);

-- 대표 관리자(master) — 새 회사 이메일로 변경
INSERT INTO public.app_admins (email,role) VALUES ('owner@newco.com','master');
```

---

## 7. 회사별 커스터마이징 포인트

- **시스템 이름**: `App.jsx`의 `<h1>ORO HR</h1>` → 새 회사명. 코드 전체에서 `ORO`를 검색해 바꾸면 됩니다.
- **상호이동 링크**: `App.jsx` `MES_URL` — 다른 사내 시스템이 없으면 헤더의 `MES ↗` 링크 부분 삭제.
- **연차 규칙**: §5의 상수/`accrued()`.
- **휴가 구분**: 화면 **설정**에서 추가/수정하거나 `leave_types` 시드 변경.
- **공휴일**: 설정 화면의 "공휴일 자동수집"(국가코드 `KR`) 또는 수동 입력.
- **증명서 양식**: `Certificate.jsx`의 회사명·대표자·문구.

---

## 8. 백엔드 API 요약 (참고)

모든 경로는 `/<프로젝트>/functions/v1/hr` 뒤에 붙습니다. 헤더에 `apikey`(공개키)와 `x-user-token`(로그인 토큰)을 실어 호출합니다.

| 분류 | 예시 경로 | 설명 |
|---|---|---|
| 본인 | `/me`, `/me/leave-status`, `/me/leave-records`, `/me/leave-requests`, `/me/attendance` | 로그인 직원 본인 데이터 |
| 공통 | `/menu`, `/leave-types` | 메뉴·휴가구분 |
| 현황 | `/dashboard`, `/calendar`, `/alerts`, `/training-overview` | 집계·알림 |
| 직원 | `/employees`(+`/bulk`,`/{id}/update`,`/delete`,`/detail`,`/profile-items`) | 사원·인사카드 |
| 연차 | `/leave-records`, `/leave-adjustments`, `/leave-allowances` | 입력·조정·수당 |
| 결재 | `/leave-requests`, `/leave-requests/{id}/approve|reject` | 전자결재 |
| 근태 | `/attendance`, `/attendance/import` | 조회·엑셀 업로드 |
| 설정 | `/holidays`(+`/import`), `/leave-types/update` | 공휴일·휴가구분 |
| 관리 | `/permissions`, `/admins`, `/menu/*` | 권한·관리자·메뉴(=master) |

권한 규칙: `/me/*`·`/menu`·`/leave-types`는 로그인만 하면 OK. 그 외는 staff(master/admin/manager)만. 쓰기 작업은 해당 **탭 권한**(`tab:...`)으로 통제. `permissions/admins/menu`는 **master 전용**.

---

## 9. 인증 방식 선택

### 9-A. 단독형(권장, 이 가이드 기본)
- Supabase 1개가 인증·DB·백엔드 모두 담당.
- 프론트는 그 프로젝트의 Supabase Auth로 로그인 → 받은 토큰을 `x-user-token`으로 백엔드에 전달.
- Edge Function `MES_URL/MES_ANON`을 **자기 프로젝트**로 설정.

### 9-B. 기존 시스템과 SSO(고급)
- 회사에 이미 Supabase 기반 통합 로그인이 있으면, ORO처럼 그 시스템을 인증원으로 쓰고 데이터는 HR 프로젝트에 둘 수 있음.
- `MES_URL/MES_ANON`을 그 인증 시스템 값으로 설정.
- 두 프로젝트가 계정을 공유하므로, HR은 토큰만 검증하면 됨.

---

## 10. 운영·유지보수

- **백업**: Supabase 대시보드 → Database → Backups (유료 플랜은 자동). 중요 시점엔 SQL 덤프 권장.
- **비밀키 관리**: service_role key는 Edge Function 환경변수에만. 깃/프론트 금지. 노출 시 즉시 키 회전.
- **업데이트 방법**: 코드 수정 → GitHub push → Vercel 자동 재배포(프론트), Edge Function은 재배포 필요(백엔드).
- **여러 회사 운영**: 회사마다 **별도 Supabase 프로젝트 + 별도 Vercel 프로젝트 + 별도 도메인**을 두는 것이 가장 깔끔하고 데이터가 안전하게 분리됩니다.

---

## 11. 트러블슈팅 (자주 나는 문제)

| 증상 | 원인 | 해결 |
|---|---|---|
| 메뉴가 안 보임 | 브라우저 캐시(옛 화면) | `Ctrl+Shift+R` 강력 새로고침 / 시크릿창 |
| "권한이 없습니다" (직원) | 직원이 staff 전용 API 호출 | 해당 데이터는 `/me/*` 경로로 제공해야 함 |
| 날짜 저장 시 `invalid input syntax for type date: ""` | 빈 날짜를 ""로 전송 | 백엔드 `nz()`가 ""→null 변환(이미 적용). 프론트도 빈값 null 처리 |
| 로그인은 되는데 "등록된 사원이 아닙니다" | 이메일이 app_admins/employees에 없음 | 관리자 등록 또는 직원 login_email 연결 |
| 근태 직원 매칭 실패 | 동명이인/사용자ID 불일치 | 사원에 `attendance_uid` 등록 |

---

## 12. 이식 완료 체크리스트

- [ ] Supabase 새 프로젝트 생성, URL·키 확보
- [ ] `schema.sql` 실행 (표 15개 생성)
- [ ] `seed.sql` 실행 (휴가구분·메뉴·권한)
- [ ] master 관리자 이메일 등록 + Auth 사용자 생성
- [ ] Edge Function `hr` 상수 수정 후 배포(`verify_jwt=false`)
- [ ] 프론트 `supabaseClient.js`·`api.js`·`App.jsx` 값 교체
- [ ] GitHub push → Vercel 배포(Root=`frontend`)
- [ ] 도메인 연결 + HTTPS 확인
- [ ] master 로그인 → 직원/공휴일/휴가구분 초기 입력
- [ ] 직원 계정 1개로 자가조회·휴가신청 동작 확인

---

*이 문서는 현재 ORO HR(연차·근태·전자결재·인사카드·증명서·조직도·교육자격 포함)의 실제 DB 스키마와 배포 구조를 기준으로 작성되었습니다. 기능이 추가되면 이 문서도 함께 갱신하세요.*
