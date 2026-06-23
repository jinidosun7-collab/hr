// Settlement.jsx
// '정산서/서식' 화면(관리자): 개인 연차 정산서 + 미사용연차 사용촉구서를 보여주고
// 브라우저 '인쇄' 기능으로 종이 출력 또는 PDF 저장한다. (window.print)

import { useState, useEffect } from 'react'
import { getEmployees, getLeaveStatus, getLeaveRecords, getLeaveTypes } from '../api.js'

const COMPANY = '지플랜' // 회사명 (필요시 한 곳만 수정)

export default function Settlement() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [status, setStatus] = useState(null)
  const [records, setRecords] = useState([])
  const [types, setTypes] = useState([])
  const [doc, setDoc] = useState('settlement') // settlement=정산서, notice=촉구서
  const [error, setError] = useState('')

  useEffect(() => {
    getEmployees().then((d) => { setEmployees(d); if (d.length) setEmployeeId(String(d[0].id)) }).catch((e) => setError(e.message))
    getLeaveTypes().then(setTypes).catch(() => {})
  }, [])

  useEffect(() => {
    if (employeeId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, year])

  async function load() {
    setError('')
    try {
      setStatus(await getLeaveStatus(employeeId, year))
      setRecords(await getLeaveRecords(employeeId, year))
    } catch (e) { setError('조회 오류: ' + e.message) }
  }

  const fmt = (n) => (n == null ? '-' : Number(n).toFixed(2))
  const label = (c) => types.find((t) => t.code === c)?.label || c
  const today = new Date().toISOString().slice(0, 10)

  return (
    <section>
      <div className="card search-bar no-print">
        <label>사원
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </label>
        <label>연도<input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: '100px' }} /></label>
        <label>문서
          <select value={doc} onChange={(e) => setDoc(e.target.value)}>
            <option value="settlement">연차 정산서</option>
            <option value="notice">미사용연차 사용촉구서</option>
          </select>
        </label>
        <button onClick={() => window.print()}>인쇄 / PDF 저장</button>
      </div>

      {error && <p className="error no-print">{error}</p>}

      {/* ── 연차 정산서 ── */}
      {status && doc === 'settlement' && (
        <div className="doc card">
          <h1 className="doc-title">{year}년 연차휴가 정산서</h1>
          <table className="doc-info">
            <tbody>
              <tr><th>성명</th><td>{status.name}</td><th>부서</th><td>{status.department || '-'}</td></tr>
              <tr><th>직위</th><td>{status.position || '-'}</td><th>입사일</th><td>{status.hire_date || '-'}</td></tr>
            </tbody>
          </table>
          <table className="doc-info">
            <tbody>
              <tr><th>발생 연차</th><td>{fmt(status.accrued_days)} 일</td><th>추가 지급</th><td>{fmt(status.added_days)} 일</td></tr>
              <tr><th>사용 일수</th><td>{fmt(status.used_days)} 일</td><th>추가 공제</th><td>{fmt(status.deducted_days)} 일</td></tr>
              <tr><th>수당 정산</th><td>{fmt(status.allowance_days)} 일</td><th>잔여 연차</th><td><strong>{fmt(status.remaining_days)} 일</strong></td></tr>
            </tbody>
          </table>
          <h3>사용 내역</h3>
          {records.length === 0 ? <p className="muted">사용 내역 없음</p> : (
            <table className="doc-table">
              <thead><tr><th>휴가구분</th><th>시작일</th><th>종료일</th><th>사용일수</th><th>사유</th></tr></thead>
              <tbody>{records.map((r) => (
                <tr key={r.id}><td>{label(r.leave_type_code)}</td><td>{r.start_date}</td><td>{r.end_date}</td><td>{fmt(r.used_days)}</td><td>{r.reason || '-'}</td></tr>
              ))}</tbody>
            </table>
          )}
          <p className="doc-foot">{today}<br />{COMPANY}</p>
        </div>
      )}

      {/* ── 미사용연차 사용촉구서 (서식1) ── */}
      {status && doc === 'notice' && (
        <div className="doc card">
          <h1 className="doc-title">미사용 연차휴가 사용촉구서</h1>
          <p>수신: <strong>{status.name}</strong> 귀하 ({status.department || ''} {status.position || ''})</p>
          <p style={{ lineHeight: 1.9, marginTop: 16 }}>
            귀하의 {year}년도 연차유급휴가 중 <strong>미사용 연차가 {fmt(status.remaining_days)}일</strong> 남아 있습니다.
            「근로기준법」 제61조(연차유급휴가의 사용 촉진)에 따라, 남은 연차휴가의 사용 시기를 정하여
            본 통보를 받은 날부터 <strong>10일 이내</strong>에 회사에 서면으로 통보하여 주시기 바랍니다.
            기한 내 통보하지 않을 경우 회사가 사용 시기를 지정하여 통보할 수 있습니다.
          </p>
          <table className="doc-info" style={{ marginTop: 16 }}>
            <tbody>
              <tr><th>발생 연차</th><td>{fmt(status.accrued_days)} 일</td><th>사용 연차</th><td>{fmt(status.used_days)} 일</td></tr>
              <tr><th>미사용 연차</th><td colSpan={3}><strong>{fmt(status.remaining_days)} 일</strong></td></tr>
            </tbody>
          </table>
          <p className="doc-foot">{today}<br />{COMPANY} (직인)</p>
        </div>
      )}
    </section>
  )
}
