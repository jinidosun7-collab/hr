// EmployeeManager.jsx — 사원 관리. 권한: act:employee_edit(등록/수정/CSV), act:employee_delete(삭제).
import { useState, useEffect } from 'react'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, bulkCreateEmployees } from '../api.js'
import { can } from '../perms.js'

export default function EmployeeManager() {
  const canEdit = can('tab:employees') // 탭이 보이면 등록·수정 허용
  const canDel = can('tab:employees')  // 탭이 보이면 삭제도 허용
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const emptyForm = { name: '', department: '', position: '', employee_no: '', monthly_wage: 0, hire_date: '', resign_date: '', accrual_basis: 'hire', login_email: '', status: '재직' }
  const [form, setForm] = useState(emptyForm)
  const [csv, setCsv] = useState('')
  const [importMsg, setImportMsg] = useState('')

  useEffect(() => { loadEmployees() }, [])
  async function loadEmployees() { setLoading(true); setError(''); try { setEmployees(await getEmployees()) } catch (e) { setError(e.message) } finally { setLoading(false) } }
  function ch(e) { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value })) }
  function startEdit(emp) { setEditingId(emp.id); setForm({ name: emp.name || '', department: emp.department || '', position: emp.position || '', employee_no: emp.employee_no || '', monthly_wage: emp.monthly_wage || 0, hire_date: emp.hire_date || '', resign_date: emp.resign_date || '', accrual_basis: emp.accrual_basis || 'hire', login_email: emp.login_email || '', status: emp.status || '재직' }); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function cancelEdit() { setEditingId(null); setForm(emptyForm); setError('') }
  async function submit(e) {
    e.preventDefault(); if (!form.name || !form.hire_date) { setError('성명과 입사일은 필수입니다.'); return }
    setSaving(true); setError('')
    try { const p = { ...form, monthly_wage: Number(form.monthly_wage) || 0, resign_date: form.resign_date || null }; if (editingId) await updateEmployee(editingId, p); else await createEmployee(p); cancelEdit(); await loadEmployees() }
    catch (e) { setError((editingId ? '수정 실패: ' : '등록 실패: ') + e.message) } finally { setSaving(false) }
  }
  async function del(emp) { if (!window.confirm(`'${emp.name}' 사원을 삭제할까요? 휴가 기록도 함께 삭제됩니다.`)) return; try { await deleteEmployee(emp.id); if (editingId === emp.id) cancelEdit(); await loadEmployees() } catch (e) { setError('삭제 실패: ' + e.message) } }
  async function handleImport() {
    setImportMsg(''); const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim()); if (lines.length < 2) { setImportMsg('머리글 + 최소 1줄 필요'); return }
    const headers = lines[0].split(',').map((h) => h.trim()); const rows = lines.slice(1).map((line) => { const c = line.split(','); const o = {}; headers.forEach((h, i) => { o[h] = (c[i] || '').trim() }); return o })
    const emps = rows.filter((r) => r.name && r.hire_date).map((r) => ({ name: r.name, department: r.department || null, position: r.position || null, employee_no: r.employee_no || null, hire_date: r.hire_date, login_email: r.login_email || null, accrual_basis: r.accrual_basis || 'hire', monthly_wage: r.monthly_wage ? Number(r.monthly_wage) : 0 }))
    if (!emps.length) { setImportMsg('등록할 행 없음 (name, hire_date 필수)'); return }
    try { const res = await bulkCreateEmployees(emps); setImportMsg(`${res.inserted}명 등록 완료`); setCsv(''); await loadEmployees() } catch (e) { setImportMsg('일괄 등록 실패: ' + e.message) }
  }

  return (
    <section>
      {canEdit && (
        <>
          <h2>{editingId ? '사원 수정' : '사원 등록'}</h2>
          <form className="card form-grid" onSubmit={submit}>
            <label>성명 *<input name="name" value={form.name} onChange={ch} /></label>
            <label>부서명<input name="department" value={form.department} onChange={ch} /></label>
            <label>직위<input name="position" value={form.position} onChange={ch} /></label>
            <label>사원번호<input name="employee_no" value={form.employee_no} onChange={ch} /></label>
            <label>통상임금(월)<input name="monthly_wage" type="number" value={form.monthly_wage} onChange={ch} /></label>
            <label>입사일 *<input name="hire_date" type="date" value={form.hire_date} onChange={ch} /></label>
            <label>퇴사일<input name="resign_date" type="date" value={form.resign_date} onChange={ch} /></label>
            <label>산정기준<select name="accrual_basis" value={form.accrual_basis} onChange={ch}><option value="hire">입사일 기준</option><option value="fiscal">회계연도 기준</option></select></label>
            <label>상태<select name="status" value={form.status} onChange={ch}><option value="재직">재직</option><option value="퇴사">퇴사</option><option value="정지">정지(사용정지)</option></select></label>
            <label>로그인 이메일<input name="login_email" type="email" value={form.login_email} onChange={ch} /></label>
            <div className="form-actions"><button type="submit" disabled={saving}>{saving ? '저장 중...' : (editingId ? '수정 저장' : '사원 등록')}</button>{editingId && <button type="button" className="btn-ghost" onClick={cancelEdit}>취소</button>}</div>
          </form>
          {error && <p className="error">{error}</p>}
          <details className="card"><summary>CSV 일괄 등록</summary>
            <p className="muted">머리글 예: name,department,position,employee_no,hire_date,login_email (name·hire_date 필수)</p>
            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} style={{ width: '100%', fontFamily: 'monospace' }} />
            <button onClick={handleImport}>CSV 등록</button>{importMsg && <p className="muted">{importMsg}</p>}
          </details>
        </>
      )}
      {!canEdit && error && <p className="error">{error}</p>}

      <h2>사원 목록</h2>
      {loading ? <p>불러오는 중...</p> : employees.length === 0 ? <p className="muted">아직 등록된 사원이 없습니다.</p> : (
        <table className="card">
          <thead><tr><th>성명</th><th>부서</th><th>직위</th><th>사번</th><th>입사일</th><th>상태</th>{(canEdit || canDel) && <th>관리</th>}</tr></thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className={emp.status !== '재직' ? 'row-inactive' : ''}>
                <td>{emp.name}</td><td>{emp.department || '-'}</td><td>{emp.position || '-'}</td><td>{emp.employee_no || '-'}</td><td>{emp.hire_date}</td><td>{emp.status || '재직'}</td>
                {(canEdit || canDel) && <td className="row-actions">{canEdit && <button className="btn-sm" onClick={() => startEdit(emp)}>수정</button>}{canDel && <button className="btn-sm btn-danger" onClick={() => del(emp)}>삭제</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
