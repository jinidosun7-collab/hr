// Login.jsx
// 로그인 화면: 이메일/비밀번호로 로그인. '비밀번호 찾기'는 관리자 처리 방식(요청 접수).
// 로그인 성공 시 상위(App)가 자동으로 메인 화면으로 전환한다.

import { useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { requestPasswordReset } from '../api.js'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('로그인 실패: 이메일 또는 비밀번호를 확인해주세요.')
    } catch (e) {
      setError('로그인 중 오류가 발생했습니다: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 비밀번호 찾기 — 아이디(이메일) 존재 확인 후 재설정 요청 접수
  async function handleReset(e) {
    e.preventDefault()
    setError(''); setMsg('')
    if (!email || !email.includes('@')) { setError('이메일을 입력하세요.'); return }
    setLoading(true)
    try {
      const res = await requestPasswordReset(email)
      if (res.exists) setMsg('요청이 접수되었습니다. 관리자가 비밀번호를 재설정한 뒤 알려드립니다.')
      else setError('등록된 아이디가 없습니다.')
    } catch (e) {
      setError('요청 실패: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) { setMode(m); setError(''); setMsg('') }

  if (mode === 'reset') {
    return (
      <div className="login-wrap">
        <form className="card login-card" onSubmit={handleReset}>
          <h1>비밀번호 찾기</h1>
          <p className="muted">가입된 이메일(아이디)을 입력하세요. 확인 후 관리자가 비밀번호를 재설정해 드립니다.</p>
          <label>이메일
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gplan.kr" autoComplete="username" />
          </label>
          {error && <p className="error">{error}</p>}
          {msg && <p className="muted" style={{ color: '#1aa260' }}>{msg}</p>}
          <button type="submit" disabled={loading}>{loading ? '확인 중...' : '확인'}</button>
          <p className="muted" style={{ marginTop: 10, textAlign: 'center' }}>
            <a href="#" onClick={(ev) => { ev.preventDefault(); switchMode('login') }}>← 로그인으로 돌아가기</a>
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>지플랜 HR 연차관리</h1>
        <p className="muted">회사 계정으로 로그인하세요.</p>

        <label>이메일
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gplan.kr" autoComplete="username" />
        </label>
        <label>비밀번호
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button>
        <p className="muted" style={{ marginTop: 10, textAlign: 'center' }}>
          <a href="#" onClick={(ev) => { ev.preventDefault(); switchMode('reset') }}>비밀번호 찾기</a>
        </p>
      </form>
    </div>
  )
}
