// Permissions.jsx
// '권한' 화면 (Master 전용):
//  - 권한 매트릭스: 역할(관리자/매니저/직원) × 권한(탭 표시·작업 허용) 체크박스
//  - 관리자 관리: 이메일을 역할(관리자/매니저)로 추가/삭제
// Master 는 항상 전체 권한이라 매트릭스에 표시하지 않는다.

import { useState, useEffect } from 'react'
import { getPermissions, updatePermission, getAdmins, upsertAdmin, deleteAdmin } from '../api.js'
import MenuConfig from './MenuConfig.jsx'
import EmployeeAccounts from './EmployeeAccounts.jsx'

// 매트릭스에 보여줄 권한 키 목록
const TAB_KEYS = [
  ['tab:notice', '공지사항(전체)'],
  ['tab:myleave', '내 연차(직원 본인)'],
  ['tab:leave_request', '휴가 입력(결재·직원 신청)'],
  ['tab:approvals', '결재함(승인·관리자)'],
  ['tab:attendance', '근태 현황'],
  ['tab:dashboard', '대시보드'], ['tab:calendar', '캘린더'], ['tab:employees', '사원 관리'],
  ['tab:profile', '인사카드'], ['tab:records', '휴가 입력'], ['tab:adjust', '조정·수당'], ['tab:status', '연차 현황'],
  ['tab:settlement', '정산서'], ['tab:certificate', '증명서'], ['tab:org', '조직도'], ['tab:alerts', '알림센터'], ['tab:training', '교육·자격'], ['tab:settings', '설정'],
]
const ROLES = [['admin', '관리자'], ['manager', '매니저'], ['employee', '직원']]
// 편집(등록·수정·삭제)이 의미 있는 메뉴 (그 외는 조회 전용)
const EDITABLE = new Set(['notice', 'approvals', 'attendance', 'employees', 'profile', 'records', 'adjust', 'settings', 'training'])

export default function Permissions() {
  const [matrix, setMatrix] = useState({})   // { 'role|perm_key': true }
  const [admins, setAdmins] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', role: 'admin' })

  useEffect(() => { load() }, [])

  async function load() {
    setError('')
    try {
      const rows = await getPermissions()
      const m = {}
      rows.forEach((r) => { m[`${r.role}|${r.perm_key}`] = !!r.allowed })
      setMatrix(m)
      setAdmins(await getAdmins())
    } catch (e) { setError('불러오기 실패: ' + e.message) }
  }

  // 단일 권한 저장 (화면 먼저 반영 후 서버 저장)
  async function setPerm(role, permKey, val) {
    setMatrix((m) => ({ ...m, [`${role}|${permKey}`]: val }))
    try { await updatePermission(role, permKey, val) }
    catch (e) { setError('저장 실패: ' + e.message); load() }
  }
  // 조회(tab:) 토글 — 끄면 편집(edit:)도 같이 끔
  function toggleView(role, bare) {
    const next = !matrix[`${role}|tab:${bare}`]
    setPerm(role, `tab:${bare}`, next)
    if (!next && matrix[`${role}|edit:${bare}`]) setPerm(role, `edit:${bare}`, false)
  }
  // 편집(edit:) 토글 — 켜면 조회(tab:)도 같이 켬
  function toggleEdit(role, bare) {
    const next = !matrix[`${role}|edit:${bare}`]
    setPerm(role, `edit:${bare}`, next)
    if (next && !matrix[`${role}|tab:${bare}`]) setPerm(role, `tab:${bare}`, true)
  }

  async function addAdmin(e) {
    e.preventDefault(); setError('')
    if (!form.email) { setError('이메일을 입력하세요.'); return }
    try { await upsertAdmin(form.email, form.role); setForm({ email: '', role: 'admin' }); await load() }
    catch (e) { setError('추가 실패: ' + e.message) }
  }
  async function delAdmin(email) {
    if (!window.confirm(`${email} 을(를) 관리자에서 제거할까요?`)) return
    try { await deleteAdmin(email); await load() } catch (e) { setError('삭제 실패: ' + e.message) }
  }

  // 한 역할의 (조회/편집) 셀. 편집이 의미 있는 메뉴만 편집 체크박스 표시.
  const PCell = ({ role, bare }) => (
    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
      <label style={{ marginRight: 10 }}><input type="checkbox" checked={!!matrix[`${role}|tab:${bare}`]} onChange={() => toggleView(role, bare)} /> 조회</label>
      {EDITABLE.has(bare)
        ? <label><input type="checkbox" checked={!!matrix[`${role}|edit:${bare}`]} onChange={() => toggleEdit(role, bare)} /> 편집</label>
        : <span className="muted" style={{ opacity: 0.5 }}>—</span>}
    </td>
  )

  return (
    <section>
      {error && <p className="error">{error}</p>}

      <h2>권한 매트릭스</h2>
      <p className="muted">역할별로 메뉴의 <strong>조회</strong>와 <strong>편집</strong> 권한을 정합니다. 조회만 켜면 <strong>열람만</strong>, 편집까지 켜면 <strong>등록·수정·삭제</strong>가 가능합니다. (편집을 켜면 조회가 자동으로 켜지고, 조회를 끄면 편집도 꺼집니다.) '—'는 편집 개념이 없는 조회 전용 메뉴입니다. Master(대표)는 항상 전체 권한입니다.</p>

      <h3>메뉴 권한 (조회 / 편집)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="card">
          <thead><tr><th>메뉴</th>{ROLES.map(([r, l]) => <th key={r} style={{ textAlign: 'center' }}>{l}<br /><small className="muted">조회 / 편집</small></th>)}</tr></thead>
          <tbody>
            {TAB_KEYS.map(([k, label]) => { const bare = k.slice(4); return (
              <tr key={k}><td>{label}</td>{ROLES.map(([r]) => <PCell key={r} role={r} bare={bare} />)}</tr>
            ) })}
          </tbody>
        </table>
      </div>

      <h2>관리자 관리</h2>
      <p className="muted">관리자·매니저로 쓸 사람의 이메일(로그인 계정)을 등록합니다.</p>
      <form className="card search-bar" onSubmit={addAdmin}>
        <label>이메일<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@gplan.kr" /></label>
        <label>역할
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">관리자</option>
            <option value="manager">매니저</option>
          </select>
        </label>
        <button type="submit">추가</button>
      </form>
      <table className="card">
        <thead><tr><th>이메일</th><th>역할</th><th>관리</th></tr></thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.email}>
              <td>{a.email}</td>
              <td>{a.role === 'master' ? 'Master' : a.role === 'admin' ? '관리자' : a.role === 'manager' ? '매니저' : a.role}</td>
              <td>{a.role !== 'master' && <button className="btn-sm btn-danger" onClick={() => delAdmin(a.email)}>삭제</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr style={{ margin: '28px 0', border: 'none', borderTop: '1px solid #e3e6ea' }} />
      <EmployeeAccounts />
      <hr style={{ margin: '28px 0', border: 'none', borderTop: '1px solid #e3e6ea' }} />
      <MenuConfig />
    </section>
  )
}
