// AdjustAllowance.jsx — 조정·수당 + 발생연차 요약. 권한: act:adjust_edit (입력/삭제).
import { useState, useEffect } from 'react'
import { getEmployees, getAdjustments, createAdjustment, deleteAdjustment, getAllowances, createAllowance, deleteAllowance, getLeaveStatus } from '../api.js'
import { canEdit as canEditPerm } from '../perms.js'

export default function AdjustAllowance() {
  const canEdit = canEditPerm('adjust') // '편집' 권한이 있어야 작업 허용
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [adjustments, setAdjustments] = useState([])
  const [allowances, setAllowances] = useState([])
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const emptyAdj = { add_days: 0, deduct_days: 0, reason: '' }
  const [adjForm, setAdjForm] = useState(emptyAdj)
  const emptyAllow = { deduct_days: 0, hourly_wage: '', paid_amount: '', paid_date: '', note: '' }
  const [allowForm, setAllowForm] = useState(emptyAllow)

  useEffect(() => { getEmployees().then((d) => { setEmployees(d); if (d.length) setEmployeeId(String(d[0].id)) }).catch((e) => setError(e.message)) }, [])
  useEffect(() => { if (employeeId) loadLists() /* eslint-disable-line */ }, [employeeId, year])
  async function loadLists() { try { setAdjustments(await getAdjustments(employeeId, year)); setAllowances(await getAllowances(employeeId, year)); setStatus(await getLeaveStatus(employeeId, year)) } catch (e) { setError('조회 오류: ' + e.message) } }
  async function submitAdj(e) { e.preventDefault(); setError(''); try { await createAdjustment({ employee_id: Number(employeeId), applied_year: year, add_days: Number(adjForm.add_days) || 0, deduct_days: Number(adjForm.deduct_days) || 0, reason: adjForm.reason }); setAdjForm(emptyAdj); await loadLists() } catch (e) { setError('추가공제 저장 실패: ' + e.message) } }
  async function submitAllow(e) { e.preventDefault(); setError(''); try { await createAllowance({ employee_id: Number(employeeId), applied_year: year, deduct_days: Number(allowForm.deduct_days) || 0, hourly_wage: allowForm.hourly_wage, paid_amount: allowForm.paid_amount, paid_date: allowForm.paid_date || null, note: allowForm.note }); setAllowForm(emptyAllow); await loadLists() } catch (e) { setError('연차수당 저장 실패: ' + e.message) } }
  async function delAdj(id) { if (!window.confirm('삭제할까요?')) return; try { await deleteAdjustment(id); await loadLists() } catch (e) { setError(e.message) } }
  async function delAllow(id) { if (!window.confirm('삭제할까요?')) return; try { await deleteAllowance(id); await loadLists() } catch (e) { setError(e.message) } }
  const fmt = (n) => (n == null ? '-' : Number(n).toFixed(2))
  const won = (n) => (n == null || n === '' ? '-' : Number(n).toLocaleString() + '원')

  return (
    <section>
      <div className="card search-bar">
        <label>사원<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></label>
        <label>연도<input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: '100px' }} /></label>
      </div>
      {error && <p className="error">{error}</p>}
      {status && (
        <div className="summary-cards">
          <div className="scard"><div className="snum">{fmt(status.accrued_days)}</div><div className="slabel">자동 발생연차</div></div>
          <div className="scard"><div className="snum">{fmt(Number(status.added_days) - Number(status.deducted_days))}</div><div className="slabel">조정연차 (+추가 −공제)</div></div>
          <div className="scard"><div className="snum">{fmt(Number(status.accrued_days) + Number(status.added_days) - Number(status.deducted_days))}</div><div className="slabel">최종 발생연차</div></div>
          <div className="scard"><div className="snum">{fmt(status.remaining_days)}</div><div className="slabel">잔여연차</div></div>
        </div>
      )}

      <h2>추가공제 (연차 수동 가감 = 조정연차)</h2>
      {canEdit && (
        <form className="card form-grid" onSubmit={submitAdj}>
          <label>추가일수<input type="number" step="0.01" value={adjForm.add_days} onChange={(e) => setAdjForm({ ...adjForm, add_days: e.target.value })} /></label>
          <label>공제일수<input type="number" step="0.01" value={adjForm.deduct_days} onChange={(e) => setAdjForm({ ...adjForm, deduct_days: e.target.value })} /></label>
          <label>사유<input value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} /></label>
          <div className="form-actions"><button type="submit">추가공제 등록</button></div>
        </form>
      )}
      {adjustments.length > 0 && (
        <table className="card"><thead><tr><th>추가일수</th><th>공제일수</th><th>사유</th>{canEdit && <th>관리</th>}</tr></thead>
          <tbody>{adjustments.map((a) => <tr key={a.id}><td>{fmt(a.add_days)}</td><td>{fmt(a.deduct_days)}</td><td>{a.reason || '-'}</td>{canEdit && <td><button className="btn-sm btn-danger" onClick={() => delAdj(a.id)}>삭제</button></td>}</tr>)}</tbody>
        </table>
      )}

      <h2>연차수당 (미사용 연차 정산)</h2>
      {canEdit && (
        <form className="card form-grid" onSubmit={submitAllow}>
          <label>차감일수<input type="number" step="0.01" value={allowForm.deduct_days} onChange={(e) => setAllowForm({ ...allowForm, deduct_days: e.target.value })} /></label>
          <label>통상시급<input type="number" value={allowForm.hourly_wage} onChange={(e) => setAllowForm({ ...allowForm, hourly_wage: e.target.value })} /></label>
          <label>지급액<input type="number" value={allowForm.paid_amount} onChange={(e) => setAllowForm({ ...allowForm, paid_amount: e.target.value })} /></label>
          <label>지급일자<input type="date" value={allowForm.paid_date} onChange={(e) => setAllowForm({ ...allowForm, paid_date: e.target.value })} /></label>
          <label>비고<input value={allowForm.note} onChange={(e) => setAllowForm({ ...allowForm, note: e.target.value })} /></label>
          <div className="form-actions"><button type="submit">연차수당 등록</button></div>
        </form>
      )}
      {allowances.length > 0 && (
        <table className="card"><thead><tr><th>차감일수</th><th>통상시급</th><th>지급액</th><th>지급일자</th><th>비고</th>{canEdit && <th>관리</th>}</tr></thead>
          <tbody>{allowances.map((a) => <tr key={a.id}><td>{fmt(a.deduct_days)}</td><td>{won(a.hourly_wage)}</td><td>{won(a.paid_amount)}</td><td>{a.paid_date || '-'}</td><td>{a.note || '-'}</td>{canEdit && <td><button className="btn-sm btn-danger" onClick={() => delAllow(a.id)}>삭제</button></td>}</tr>)}</tbody>
        </table>
      )}
    </section>
  )
}
