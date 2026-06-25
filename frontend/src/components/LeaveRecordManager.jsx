// LeaveRecordManager.jsx — 휴가 입력. 권한: act:record_edit (입력/삭제).
import { useState, useEffect } from 'react'
import { getEmployees, getLeaveTypes, createLeaveRecord, getLeaveRecords, deleteLeaveRecord } from '../api.js'
import { canEdit as canEditPerm } from '../perms.js'

export default function LeaveRecordManager() {
  const canEdit = canEditPerm('records') // '편집' 권한이 있어야 작업 허용
  const [employees, setEmployees] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const emptyForm = { leave_type_code: 'annual_7h', start_date: '', end_date: '', exclude_holiday: true, reason: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    getEmployees().then((d) => { setEmployees(d); if (d.length) setEmployeeId(String(d[0].id)) }).catch((e) => setError(e.message))
    getLeaveTypes().then(setLeaveTypes).catch((e) => setError(e.message))
  }, [])
  useEffect(() => { if (employeeId) load() /* eslint-disable-line */ }, [employeeId, year])
  async function load() { try { setRecords(await getLeaveRecords(employeeId, year)) } catch (e) { setError(e.message) } }
  function ch(e) { const { name, value, type, checked } = e.target; setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value })) }
  async function submit(e) {
    e.preventDefault(); if (!employeeId) { setError('사원 선택'); return } if (!form.start_date) { setError('시작일 필수'); return }
    setSaving(true); setError('')
    try { await createLeaveRecord({ employee_id: Number(employeeId), leave_type_code: form.leave_type_code, start_date: form.start_date, end_date: form.end_date || form.start_date, exclude_holiday: form.exclude_holiday, reason: form.reason }); setForm(emptyForm); await load() }
    catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  async function del(r) { if (!window.confirm('이 휴가 기록을 삭제할까요?')) return; try { await deleteLeaveRecord(r.id); await load() } catch (e) { setError('삭제 실패: ' + e.message) } }
  const label = (c) => leaveTypes.find((t) => t.code === c)?.label || c
  const fmt = (n) => (n == null ? '-' : Number(n).toFixed(2))

  return (
    <section>
      <h2>휴가 입력</h2>
      <div className="card search-bar">
        <label>사원<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label>연도<input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></label>
      </div>
      {canEdit && (
        <form className="card form-grid" onSubmit={submit}>
          <label>휴가구분<select name="leave_type_code" value={form.leave_type_code} onChange={ch}>{leaveTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select></label>
          <label>시작일 *<input name="start_date" type="date" value={form.start_date} onChange={ch} /></label>
          <label>종료일<input name="end_date" type="date" value={form.end_date} onChange={ch} /></label>
          <label>사유<input name="reason" value={form.reason} onChange={ch} /></label>
          <label className="checkbox-label"><input name="exclude_holiday" type="checkbox" checked={form.exclude_holiday} onChange={ch} />공휴일 제외</label>
          <div className="form-actions"><button type="submit" disabled={saving}>{saving ? '저장 중...' : '기록 추가'}</button></div>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      <h2>{year}년 휴가 기록</h2>
      {records.length === 0 ? <p className="muted">기록 없음</p> : (
        <table className="card">
          <thead><tr><th>구분</th><th>시작</th><th>종료</th><th>사용일수</th><th>사유</th>{canEdit && <th>관리</th>}</tr></thead>
          <tbody>{records.map((r) => <tr key={r.id}><td>{label(r.leave_type_code)}</td><td>{r.start_date}</td><td>{r.end_date}</td><td>{fmt(r.used_days)}</td><td>{r.reason || '-'}</td>{canEdit && <td><button className="btn-sm btn-danger" onClick={() => del(r)}>삭제</button></td>}</tr>)}</tbody>
        </table>
      )}
    </section>
  )
}
