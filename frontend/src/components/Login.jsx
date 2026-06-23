// Login.jsx
// 로그인 화면: 이메일/비밀번호를 입력하면 oro-mes 로 로그인한다.
// 로그인에 성공하면 상위(App)가 자동으로 메인 화면으로 바꿔준다.

import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // [로그인] 버튼을 눌렀을 때
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // oro-mes 에 이메일/비번으로 로그인 시도
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        // 가장 흔한 실패: 이메일/비번 틀림
        setError('로그인 실패: 이메일 또는 비밀번호를 확인해주세요.')
      }
      // 성공하면 App 의 onAuthStateChange 가 알아서 화면을 바꿔준다.
    } catch (e) {
      setError('로그인 중 오류가 발생했습니다: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>ORO HR 연차관리</h1>
        <p className="muted">회사 계정(oro-mes)으로 로그인하세요.</p>

        <label>이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@orocorp.kr"
            autoComplete="username"
          />
        </label>
        <label>비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
