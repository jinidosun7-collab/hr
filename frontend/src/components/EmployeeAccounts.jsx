// EmployeeAccounts.jsx — '직원 계정 생성' (권한 화면 안).
// 직원별로 로그인 이메일 + 비밀번호를 입력해 실제 로그인 계정을 만든다.
// 계정이 만들어지면 그 직원은 해당 이메일/비밀번호로 로그인해 '직원' 권한(본인 연차만)으로 들어온다.
// 이미 계정이 있으면 같은 화면에서 비밀번호를 재설정할 수 있다.

import { useState, useEffect } from 'react'
import { getEmployees, setEmployeeAccount } from '../api.js'

export default function EmployeeAccounts() {
  const [emps, setEmps] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [forms, setForms] = useState({})   // { [empId]: { email, password } }
  const [busyId, setBusyId] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const list = await getEmployees()
      setEmps(list)
      // 각 행의 이메일 입력칸 기본값을 기존 login_email로 채움
      const f = {}
      list.forEach((e) => { f[e.id] = { email: e.login_email || '', password: '' } })
      setForms(f)
    } catch (e) { setError('조회 실패: ' + e.message) }
  }

  function setField(id, key, val) { setForms((p) => ({ ...p, [id]: { ...p[id], [key]: val } })) }

  async function submit(emp) {
    const f = forms[emp.id] || {}
    const email = (f.email || '').trim().toLowerCase()
    const password = f.password || ''
    if (!email || !email.includes('@')) { setError(`${emp.name}: 올바른 이메일을 입력하세요.`); return }
    if (password.length < 6) { setError(`${emp.name}: 비밀번호는 6자 이상이어야 합니다.`); return }
    setBusyId(emp.id); setError(''); setMsg('')
    try {
      const res = await setEmployeeAccount(emp.id, email, password)
      setMsg(`${emp.name} 계정 ${res.created ? '생성' : '비밀번호 변경'} 완료 (${email})`)
      setField(emp.id, 'password', '')
      await load()
    } catch (e) { setError(`${emp.name} 처리 실패: ` + e.message) }
    finally { setBusyId(null) }
  }

  const withAccount = emps.filter((e) => e.login_email).length

  return (
    <div>
      <h2>직원 계정 생성</h2>
      <p className="muted">
        직원별로 <strong>로그인 이메일과 비밀번호</strong>를 입력해 계정을 만듭니다.
        만들어진 계정으로 로그인하면 그 직원은 '직원' 권한으로 <strong>본인 연차만</strong> 보게 됩니다.
        이미 계정이 있으면 비밀번호를 다시 설정할 수 있습니다. (관리자·매니저는 위 '관리자 관리'에서 등록)
      </p>
      <p className="muted">계정 현황: 전체 {emps.length}명 중 {withAccount}명 생성됨</p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="muted" style={{ color: '#1aa260' }}>{msg}</p>}
      {emps.length === 0 ? <p className="muted">먼저 '사원 관리'에서 직원을 등록하세요.</p> : (
        <table className="card">
          <thead><tr><th>성명</th><th>부서</th><th>로그인 이메일</th><th>비밀번호</th><th>처리</th><th>상태</th></tr></thead>
          <tbody>
            {emps.map((e) => {
              const f = forms[e.id] || { email: '', password: '' }
              return (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.department || '-'}</td>
                  <td><input type="email" value={f.email} placeholder="user@gplan.kr" style={{ width: '200px' }} onChange={(ev) => setField(e.id, 'email', ev.target.value)} /></td>
                  <td><input type="text" value={f.password} placeholder="6자 이상" style={{ width: '130px' }} onChange={(ev) => setField(e.id, 'password', ev.target.value)} autoComplete="new-password" /></td>
                  <td><button className="btn-sm" disabled={busyId === e.id} onClick={() => submit(e)}>{e.login_email ? '비밀번호 변경' : '계정 생성'}</button></td>
                  <td>{e.login_email ? <span style={{ color: '#1aa260', fontWeight: 600 }}>생성됨</span> : <span className="muted">없음</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="muted">※ 비밀번호는 화면에 저장되지 않습니다. 직원에게 초기 비밀번호를 알려주고, 로그인 후 변경하도록 안내하세요.</p>
    </div>
  )
}
