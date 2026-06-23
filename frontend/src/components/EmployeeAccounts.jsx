// EmployeeAccounts.jsx — '직원 계정 연결' (권한 화면 안).
// 전 직원의 oro-mes 로그인 이메일을 한 곳에서 보고/입력한다.
// 이메일을 연결하면, 그 직원이 해당 계정으로 로그인할 때 '직원' 권한(본인 연차만)으로 인식된다.

import { useState, useEffect } from 'react'
import { getEmployees, updateEmployee } from '../api.js'

export default function EmployeeAccounts() {
  const [emps, setEmps] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])
  async function load() { try { setEmps(await getEmployees()) } catch (e) { setError('조회 실패: ' + e.message) } }

  async function save(emp, raw) {
    const v = (raw || '').trim().toLowerCase()
    if (v === (emp.login_email || '')) return // 변경 없으면 저장 안 함
    setMsg(''); setError('')
    try { await updateEmployee(emp.id, { login_email: v || null }); setMsg(`${emp.name} 계정 연결을 저장했습니다.`); await load() }
    catch (e) { setError('저장 실패: ' + e.message) }
  }

  const connected = emps.filter((e) => e.login_email).length

  return (
    <div>
      <h2>직원 계정 연결</h2>
      <p className="muted">
        직원이 본인 연차를 보려면, 그 직원의 <strong>로그인 이메일</strong>을 연결하세요.
        연결된 직원은 그 이메일로 로그인하면 '직원' 권한으로 <strong>본인 연차만</strong> 보게 됩니다.
        (관리자·매니저는 위 '관리자 관리'에서 별도 등록)
      </p>
      <p className="muted">연결 현황: 전체 {emps.length}명 중 {connected}명 연결됨</p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="muted">{msg}</p>}
      <table className="card">
        <thead><tr><th>성명</th><th>부서</th><th>직위</th><th>로그인 이메일</th><th>상태</th></tr></thead>
        <tbody>
          {emps.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td>{e.department || '-'}</td>
              <td>{e.position || '-'}</td>
              <td><input type="email" defaultValue={e.login_email || ''} placeholder="user@gplan.kr" style={{ width: '220px' }} onBlur={(ev) => save(e, ev.target.value)} /></td>
              <td>{e.login_email ? <span style={{ color: '#1aa260', fontWeight: 600 }}>연결됨</span> : <span className="muted">미연결</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">※ 입력 후 칸 밖을 클릭하면 저장됩니다. 사원 관리·인사카드에서도 같은 값을 수정할 수 있습니다.</p>
    </div>
  )
}
