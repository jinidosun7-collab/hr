// Training.jsx — '교육·자격' 관리. 전 직원의 자격증/교육 이수를 한 곳에서 등록·조회하고 만료를 추적.
import { useState, useEffect } from 'react'
import { getEmployees, getTrainingOverview, addProfileItem, deleteProfileItem } from '../api.js'
import { can } from '../perms.js'

const CATS = [['license', '자격증'], ['training', '교육']]

export default function Training() {
  const canEdit = can('tab:training') // 탭이 보이면 작업도 허용
  const [employees, setEmployees] = useState([])
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ employee_id: '', category: 'license', title: '', detail: '', date_from: '', date_to: '' })

  useEffect(() => {
    getEmployees().then((d) => { setEmployees(d); if (d.length) setForm((f) => ({ ...f, employee_id: String(d[0].id) })) }).catch((e) => setError(e.message))
    load()
  }, [])
  async function load() { try { setRows(await getTrainingOverview()) } catch (e) { setError('조회 실패: ' + e.message) } }

  async function add(e) {
    e.preventDefault(); setError('')
    if (!form.employee_id || !form.title) { setError('사원과 항목명을 입력하세요.'); return }
    try {
      await addProfileItem(Number(form.employee_id), { category: form.category, title: form.title, detail: form.detail, date_from: form.date_from || null, date_to: form.date_to || null })
      setForm({ ...form, title: '', detail: '', date_from: '', date_to: '' })
      await load()
    } catch (e) { setError('저장 실패: ' + e.message) }
  }
  async function del(id) { if (!window.confirm('삭제할까요?')) return; try { await deleteProfileItem(id); await load() } catch (e) { setError(e.message) } }

  // 만료 상태 계산
  const today = new Date()
  function expiry(dateTo) {
    if (!dateTo) return { label: '-', cls: '' }
    const d = Math.round((new Date(dateTo + 'T00:00:00Z') - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
    if (d < 0) return { label: `만료 (${-d}일 지남)`, cls: 'exp-over' }
    if (d <= 30) return { label: `D-${d}`, cls: 'exp-soon' }
    return { label: `D-${d}`, cls: '' }
  }
  const catLabel = (c) => (c === 'training' ? '교육' : '자격증')

  return (
    <section>
      <h2>교육·자격 관리</h2>
      {error && <p className="error">{error}</p>}

      {canEdit && (
        <form className="card form-grid" onSubmit={add}>
          <label>사원<select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>{employees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label>구분<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
          <label>항목명<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 산업안전교육 / 지게차운전기능사" /></label>
          <label>상세<input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="등급/기관 등" /></label>
          <label>취득·이수일<input type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} /></label>
          <label>만료일<input type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} /></label>
          <div className="form-actions"><button type="submit">등록</button></div>
        </form>
      )}

      <h3>전체 현황 (만료일 순)</h3>
      {rows.length === 0 ? <p className="muted">등록된 항목이 없습니다.</p> : (
        <table className="card">
          <thead><tr><th>구분</th><th>대상</th><th>부서</th><th>항목</th><th>상세</th><th>취득일</th><th>만료일</th><th>상태</th>{canEdit && <th>관리</th>}</tr></thead>
          <tbody>
            {rows.map((r) => {
              const ex = expiry(r.date_to)
              return (
                <tr key={r.id}>
                  <td>{catLabel(r.category)}</td>
                  <td>{r.employee_name}</td>
                  <td>{r.department || '-'}</td>
                  <td>{r.title}</td>
                  <td>{r.detail || '-'}</td>
                  <td>{r.date_from || '-'}</td>
                  <td>{r.date_to || '-'}</td>
                  <td className={ex.cls}>{ex.label}</td>
                  {canEdit && <td><button className="btn-sm btn-danger" onClick={() => del(r.id)}>삭제</button></td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
