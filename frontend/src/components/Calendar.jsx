// Calendar.jsx
// '캘린더' 화면(관리자): 월간 달력에 전 직원 휴가와 공휴일을 표시한다.
// 누가 언제 쉬는지 한눈에 볼 수 있다.

import { useState, useEffect } from 'react'
import { getCalendar } from '../api.js'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1~12
  const [data, setData] = useState({ records: [], holidays: [] })
  const [error, setError] = useState('')

  useEffect(() => { load() /* eslint-disable-line */ }, [year, month])

  async function load() {
    setError('')
    try { setData(await getCalendar(year, month)) } catch (e) { setError('캘린더 조회 실패: ' + e.message) }
  }

  // 이전/다음 달
  function prev() { if (month === 1) { setYear(year - 1); setMonth(12) } else setMonth(month - 1) }
  function next() { if (month === 12) { setYear(year + 1); setMonth(1) } else setMonth(month + 1) }

  // 달력 칸 만들기
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=일요일
  const pad = (n) => String(n).padStart(2, '0')

  // 공휴일 맵: 'YYYY-MM-DD' → 이름
  const holMap = {}
  data.holidays.forEach((h) => { holMap[String(h.holiday_date).slice(0, 10)] = h.name })
  // 특정 날짜에 휴가 중인 사람들
  const leavesOn = (ds) => data.records.filter((r) => r.start_date <= ds && ds <= r.end_date)

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`)

  return (
    <section>
      <div className="cal-head">
        <button className="btn-ghost" onClick={prev}>◀ 이전</button>
        <h2>{year}년 {month}월</h2>
        <button className="btn-ghost" onClick={next}>다음 ▶</button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="cal-grid card">
        {DOW.map((w, i) => (
          <div key={w} className={'cal-dow' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>{w}</div>
        ))}
        {cells.map((ds, i) => {
          if (ds === null) return <div key={'e' + i} className="cal-cell empty"></div>
          const dow = (firstDow + (Number(ds.slice(8)) - 1)) % 7
          const isHol = !!holMap[ds]
          return (
            <div key={ds} className={'cal-cell' + (isHol ? ' holiday' : '') + (dow === 0 ? ' sun' : dow === 6 ? ' sat' : '')}>
              <div className="cal-date">
                {Number(ds.slice(8))}
                {isHol && <span className="cal-hol">{holMap[ds]}</span>}
              </div>
              {leavesOn(ds).map((r) => (
                <div key={r.id} className="cal-leave" title={`${r.employee_name} (${r.department || ''})`}>{r.employee_name}</div>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
