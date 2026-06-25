// Profile.jsx — '인사카드'(사원 상세 프로필).
// 사원을 고르면 연락처·비상연락·은행·계약 등 상세 정보와
// 학력/경력/자격증/가족 목록을 보고 편집한다. 권한: act:employee_edit.

import { useState, useEffect } from 'react'
import { getEmployees, getEmployeeDetail, updateEmployee, addProfileItem, deleteProfileItem } from '../api.js'
import { canEdit as canEditPerm } from '../perms.js'

// 편집 가능한 프로필 단일값 필드 [키, 라벨, 타입]
const FIELDS = [
  ['phone', '휴대폰', 'text'], ['personal_email', '개인 이메일', 'email'],
  ['address', '주소', 'text'], ['birth_date', '생년월일', 'date'], ['gender', '성별', 'text'],
  ['emergency_name', '비상연락 이름', 'text'], ['emergency_relation', '비상연락 관계', 'text'], ['emergency_phone', '비상연락 전화', 'text'],
  ['bank_name', '은행', 'text'], ['bank_account', '계좌번호', 'text'],
  ['contract_type', '계약형태', 'text'], ['contract_start', '계약시작', 'date'], ['contract_end', '계약종료', 'date'],
]
// 목록 카테고리
const CATS = [['education', '학력'], ['career', '경력'], ['license', '자격증'], ['family', '가족']]

export default function Profile() {
  const canEdit = canEditPerm('profile') // '편집' 권한이 있어야 작업 허용
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [emp, setEmp] = useState(null)
  const [items, setItems] = useState([])
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [itemForm, setItemForm] = useState({ category: 'education', title: '', detail: '', date_from: '', date_to: '' })

  useEffect(() => { getEmployees().then((d) => { setEmployees(d); if (d.length) setEmployeeId(String(d[0].id)) }).catch((e) => setError(e.message)) }, [])
  useEffect(() => { if (employeeId) loadDetail() /* eslint-disable-line */ }, [employeeId])

  async function loadDetail() {
    setError(''); setMsg('')
    try {
      const d = await getEmployeeDetail(employeeId)
      setEmp(d.employee); setItems(d.items)
      const f = {}; FIELDS.forEach(([k]) => { f[k] = d.employee[k] || '' }); setForm(f)
    } catch (e) { setError('조회 실패: ' + e.message) }
  }

  async function saveProfile(e) {
    e.preventDefault(); setError(''); setMsg('')
    // 빈 칸("")을 그대로 보내면 날짜 칸에서 DB 오류가 난다.
    // 그래서 빈 문자열은 null(값 없음)로 바꿔서 보낸다. (날짜·텍스트 모두 안전)
    const payload = {}
    for (const [key, value] of Object.entries(form)) {
      payload[key] = value === '' ? null : value
    }
    try { await updateEmployee(employeeId, payload); setMsg('저장되었습니다.'); await loadDetail() }
    catch (e) { setError('저장 실패: ' + e.message) }
  }

  async function addItem(e) {
    e.preventDefault(); setError('')
    if (!itemForm.title) { setError('제목을 입력하세요.'); return }
    try {
      await addProfileItem(employeeId, { ...itemForm, date_from: itemForm.date_from || null, date_to: itemForm.date_to || null })
      setItemForm({ ...itemForm, title: '', detail: '', date_from: '', date_to: '' })
      await loadDetail()
    } catch (e) { setError('항목 추가 실패: ' + e.message) }
  }
  async function delItem(id) { if (!window.confirm('삭제할까요?')) return; try { await deleteProfileItem(id); await loadDetail() } catch (e) { setError(e.message) } }

  const itemsOf = (cat) => items.filter((it) => it.category === cat)

  return (
    <section>
      <div className="card search-bar">
        <label>사원<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      </div>
      {error && <p className="error">{error}</p>}
      {msg && <p className="muted">{msg}</p>}

      {emp && (
        <>
          <h2>{emp.name} <span className="muted" style={{ fontSize: 14 }}>{emp.department || ''} {emp.position || ''} · {emp.status}</span></h2>

          <h3>기본 인적사항</h3>
          <form className="card form-grid" onSubmit={saveProfile}>
            {FIELDS.map(([k, label, type]) => (
              <label key={k}>{label}<input type={type} value={form[k] || ''} disabled={!canEdit} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
            ))}
            {canEdit && <div className="form-actions"><button type="submit">저장</button></div>}
          </form>

          {/* 학력 / 경력 / 자격증 / 가족 목록 */}
          {CATS.map(([cat, label]) => (
            <div key={cat}>
              <h3>{label}</h3>
              {itemsOf(cat).length === 0 ? <p className="muted">없음</p> : (
                <table className="card">
                  <thead><tr><th>제목</th><th>상세</th><th>시작</th><th>종료</th>{canEdit && <th>관리</th>}</tr></thead>
                  <tbody>{itemsOf(cat).map((it) => (
                    <tr key={it.id}><td>{it.title}</td><td>{it.detail || '-'}</td><td>{it.date_from || '-'}</td><td>{it.date_to || '-'}</td>
                      {canEdit && <td><button className="btn-sm btn-danger" onClick={() => delItem(it.id)}>삭제</button></td>}</tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          ))}

          {canEdit && (
            <>
              <h3>항목 추가</h3>
              <form className="card form-grid" onSubmit={addItem}>
                <label>구분<select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>{CATS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
                <label>제목<input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} placeholder="학교/회사/자격명/가족이름" /></label>
                <label>상세<input value={itemForm.detail} onChange={(e) => setItemForm({ ...itemForm, detail: e.target.value })} placeholder="전공/직위/등급/관계" /></label>
                <label>시작일<input type="date" value={itemForm.date_from} onChange={(e) => setItemForm({ ...itemForm, date_from: e.target.value })} /></label>
                <label>종료일<input type="date" value={itemForm.date_to} onChange={(e) => setItemForm({ ...itemForm, date_to: e.target.value })} /></label>
                <div className="form-actions"><button type="submit">추가</button></div>
              </form>
            </>
          )}
        </>
      )}
    </section>
  )
}
