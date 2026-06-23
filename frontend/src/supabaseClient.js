// supabaseClient.js
// ─────────────────────────────────────────────────────────────────────────────
// 로그인 담당(oro-mes)에 접속하는 'supabase 클라이언트'를 만든다.
// 화면에서 이 client 로 로그인(signInWithPassword)하고, 로그인 상태(세션)를 관리한다.
//
// 여기 쓰는 키는 oro-mes 의 '공개키(anon)'다. 공개키라 화면 코드에 들어가도 안전하다.
// (진짜 비밀은 비밀번호이고, 그건 사용자가 입력하며 저장하지 않는다)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

// .env 값이 있으면 그걸 쓰고, 없으면 oro-mes 기본값을 쓴다(바로 동작하도록).
const url =
  import.meta.env.VITE_MES_SUPABASE_URL || 'https://edbcjxgpyeqdxztenuyb.supabase.co'
const anonKey =
  import.meta.env.VITE_MES_ANON_KEY || 'sb_publishable_K1c3q_XncSyaAI5wGPfcAg_iHcA7AB5'

// 로그인 상태를 브라우저에 기억(persistSession)해서, 새로고침해도 유지되게 한다.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
