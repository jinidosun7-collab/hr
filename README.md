# ORO HR 이식 패키지

다른 회사에 ORO HR을 복제 설치하기 위한 최소 구성입니다.

## 폴더 구성
- `docs/ORO_HR_타사이식_가이드.md` — **여기부터 읽으세요.** 단계별 설치 가이드.
- `db/schema.sql` — DB 표 생성 (Supabase SQL Editor에서 실행)
- `db/seed.sql` — 기본 데이터(휴가구분·메뉴·권한) + 대표관리자
- `supabase/functions/hr/index.ts` — 백엔드(Edge Function). 상단 상수만 새 회사 값으로 교체 후 배포.
- `frontend/` — 화면(React/Vite). `src/supabaseClient.js`, `src/api.js`, `src/App.jsx` 값 교체 후 Vercel 배포.

## 빠른 순서
1. Supabase 새 프로젝트 → `db/schema.sql` → `db/seed.sql` 실행
2. Authentication에서 Email 로그인 켜고 대표관리자 계정 생성 (seed의 이메일과 동일하게)
3. `supabase/functions/hr/index.ts` 상단 MES_URL/MES_ANON을 새 프로젝트 값으로 → 배포(verify_jwt=false)
4. `frontend/` 설정값 교체 → GitHub push → Vercel 배포(Root=frontend) → 도메인 연결

## 주의
- service_role(비밀) 키는 절대 코드/깃에 넣지 마세요. Edge Function 환경변수로만 사용.
- 프론트에는 공개키(anon/publishable)만 들어갑니다.

자세한 내용은 반드시 `docs/ORO_HR_타사이식_가이드.md` 를 참고하세요.
