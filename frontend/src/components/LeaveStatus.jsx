// LeaveStatus.jsx
// '연차 현황' 화면: 사원과 연도를 고르면 그 해 발생·사용·잔여 연차를 표로 보여준다.

import { useState, useEffect } from 'react'
import { getEmployees, getLeaveStatus } from '../api.js'

export default function LeaveStatus() {
  const [employees, setEmployees] = useState([])         // 사원 선택용 목록
  const [employeeId, setEmployeeId] = useState('')       // 선택한 사원 id
  const [year, setYear] = useState(new Date().getFullYear()) // 조회 연도(기본: 올해)
  const [status, setStatus] = useState(null)             // 조회 결과
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 화면이 열릴 때 사원 목록을 불러와 선택 박스에 채운다.
  useEffect(() => {
    getEmployees()
      .then((data) => {
        setEmployees(data)
        if (data.length > 0) setEmployeeId(String(data[0].id)) // 첫 사원을 기본 선택
      })
      .catch((e) => setError('사원 목록을 불러오지 못했습니다: ' + e.message))
  }, [])

  // [조회] 버튼: 선택한 사원/연도로 연차 현황을 가져온다.
  async function handleSearch() {
    if (!employeeId) {
      setError('사원을 선택해주세요.')
      return
    }
    setLoading(true)
    setError('')
    setStatus(null)
    try {
      const data = await getLeaveStatus(employeeId, year)
      setStatus(data)
    } catch (e) {
      setError('연차 현황 조회 실패: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 소수점 일수를 보기 좋게(최대 2자리) 표시하는 도우미
  const fmt = (n) => (n === undefined || n === null ? '-' : Number(n).toFixed(2))

  return (
    <section>
      <h2>연차 현황 조회</h2>

      <div className="card search-bar">
        <label>사원
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {employees.length === 0 && <option value="">(등록된 사원 없음)</option>}
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.department || '부서없음'})
              </option>
            ))}
          </select>
        </label>
        <label>연도
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: '100px' }}
          />
        </label>
        <button onClick={handleSearch} disabled={loading}>
          {loading ? '조회 중...' : '조회'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {/* 조회 결과가 있으면 표로 보여준다 */}
      {status && (
        <div className="card status-result">
          <h3>{status.name} — {status.year}년 연차 현황</h3>
          <p className="muted">
            산정기준: {status.accrual_basis === 'fiscal' ? '회계연도' : '입사일'}
          </p>
          <table>
            <tbody>
              <tr><th>발생 연차</th><td>{fmt(status.accrued_days)} 일</td></tr>
              <tr><th>사용 일수</th><td>{fmt(status.used_days)} 일</td></tr>
              <tr><th>추가 지급</th><td>{fmt(status.added_days)} 일</td></tr>
              <tr><th>추가 공제</th><td>{fmt(status.deducted_days)} 일</td></tr>
              <tr><th>수당 정산</th><td>{fmt(status.allowance_days)} 일</td></tr>
              <tr className="highlight">
                <th>잔여 연차</th><td><strong>{fmt(status.remaining_days)} 일</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
