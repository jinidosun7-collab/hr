// MyLeave.jsx
// 일반 직원용 화면: 로그인한 '본인'의 연차 현황 + 사용 내역(정산서)을 보여준다.
// (관리자가 아닌 직원은 이 화면만 볼 수 있다)

import { useState, useEffect } from 'react'
import { getMyLeaveStatus, getMyLeaveRecords } from '../api.js'

export default function MyLeave({ myName }) {
  const [year, setYear] = useState(new Date().getFullYear()) // 조회 연도(기본: 올해)
  const [status, setStatus] = useState(null)   // 요약(발생/사용/잔여)
  const [records, setRecords] = useState([])   // 날짜별 사용 내역
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 화면이 열리면 올해 연차를 한 번 자동 조회
  useEffect(() => {
    load(year)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 요약 + 사용 내역을 함께 불러온다
  async function load(targetYear) {
    setLoading(true)
    setError('')
    setStatus(null)
    setRecords([])
    try {
      // 두 API를 동시에 호출(둘 다 본인 데이터만 반환)
      const [st, recs] = await Promise.all([
        getMyLeaveStatus(targetYear),
        getMyLeaveRecords(targetYear),
      ])
      setStatus(st)
      setRecords(Array.isArray(recs) ? recs : [])
    } catch (e) {
      setError('내 연차 조회 실패: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 소수점 일수를 보기 좋게 표시
  const fmt = (n) => (n === undefined || n === null ? '-' : Number(n).toFixed(2))
  // 시작일~종료일을 보기 좋게 (같은 날이면 하루만 표시)
  const range = (s, e) => (!e || s === e ? s : `${s} ~ ${e}`)

  return (
    <section>
      <h2>내 연차 현황{myName ? ` — ${myName}` : ''}</h2>

      <div className="card search-bar">
        <label>연도
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: '100px' }}
          />
        </label>
        <button onClick={() => load(year)} disabled={loading}>
          {loading ? '조회 중...' : '조회'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {status && (
        <div className="card status-result">
          <h3>{status.year}년 연차</h3>
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

      {/* ── 연차 사용 내역(정산서): 언제 어떤 휴가를 며칠 썼는지 ── */}
      {status && (
        <div className="card" style={{ marginTop: '14px' }}>
          <h3>연차 사용 내역</h3>
          {records.length === 0 ? (
            <p className="muted">{status.year}년에 사용한 연차 기록이 없습니다.</p>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>사용일</th>
                  <th>휴가 구분</th>
                  <th style={{ textAlign: 'right' }}>차감 일수</th>
                  <th>사유</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{range(r.start_date, r.end_date)}</td>
                    <td>{r.type_label}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(r.used_days)} 일</td>
                    <td>{r.reason || r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={2} style={{ textAlign: 'right' }}>합계</th>
                  {/* 모든 사용 내역의 차감 일수를 더해 사용 일수와 대조 가능 */}
                  <th style={{ textAlign: 'right' }}>
                    {fmt(records.reduce((sum, r) => sum + Number(r.used_days || 0), 0))} 일
                  </th>
                  <th></th>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </section>
  )
}
