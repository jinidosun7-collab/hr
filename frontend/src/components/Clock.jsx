// Clock.jsx — '출퇴근' (직원 본인). 월별 근무 기록부.
// 직원이 해당 월의 날짜별로 출근/퇴근 시간을 직접 입력·저장한다. (출퇴근 버튼 방식 폐지)
// 근무시간은 서버가 (퇴근-출근)-식사시간으로 계산한다.

import { useState, useEffect } from 'react'
import { getMyAttendance, saveMyAttendance } from '../api.js'

const DOW = ['일', '월', '화', '수', '목', '금', '토']
function fmtMin(n) {
  if (n === null || n === undefined) return '-'
  const m = Number(n) || 0
  return `${Math.floor(m / 60)}시간 ${m % 60}분`
}

export default function Clock({ myName }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [edits, setEdits] = useState({})   // { 'YYYY-MM-DD': { clock_in, clock_out, total_min } }
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [savingDate, setSavingDate] = useState('')

  useEffect(() => { load() /* eslint-disable-line */ }, [year, month])
  async function load() {
    setError('')
    try {
      const rows = await getMyAttendance(year, month)
      const e = {}
      rows.forEach((r) => { e[r.work_date] = { clock_in: r.clock_in || '', clock_out: r.clock_out || '', total_min: r.total_min } })
      setEdits(e)
    } catch (e) { setError('조회 실패: ' + e.message) }
  }

  const pad = (n) => String(n).padStart(2, '0')
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${pad(month)}-${pad(d)}`
    const dow = new Date(year, month - 1, d).getDay()
    days.push({ date, d, dow })
  }

  function setField(date, key, val) {
    setEdits((p) => ({ ...p, [date]: { ...(p[date] || {}), [key]: val } }))
  }
  async function saveRow(date) {
    const row = edits[date] || {}
    setSavingDate(date); setError(''); setMsg('')
    try {
      const res = await saveMyAttendance(date, row.clock_in || '', row.clock_out || '')
      setMsg(`${date} 저장됨`)
      setEdits((p) => ({ ...p, [date]: { clock_in: res?.clock_in || '', clock_out: res?.clock_out || '', total_min: res?.total_min ?? null } }))
    } catch (e) { setError(`${date} 저장 실패: ` + e.message) }
    finally { setSavingDate('') }
  }
  function prevMonth() { if (month === 1) { setYear(year - 1); setMonth(12) } else setMonth(month - 1) }
  function nextMonth() { if (month === 12) { setYear(year + 1); setMonth(1) } else setMonth(month + 1) }

  const monthTotal = Object.values(edits).reduce((s, r) => s + (Number(r.total_min) || 0), 0)

  return (
    <section>
      <h2>출퇴근 기록부</h2>
      <p className="muted">{myName ? `${myName}님, ` : ''}해당 월의 날짜별로 <strong>출근·퇴근 시간을 직접 입력</strong>하고 저장하세요. 근무시간은 자동 계산됩니다.</p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="muted" style={{ color: '#1aa260' }}>{msg}</p>}

      <div className="card search-bar" style={{ alignItems: 'center' }}>
        <button type="button" className="btn-ghost" onClick={prevMonth}>◀ 이전</button>
        <strong>{year}년 {month}월</strong>
        <button type="button" className="btn-ghost" onClick={nextMonth}>다음 ▶</button>
        <span style={{ marginLeft: 'auto' }}>월 총 근무: <strong>{fmtMin(monthTotal)}</strong></span>
      </div>

      <table className="card data" style={{ marginTop: 12 }}>
        <thead><tr><th>날짜</th><th>요일</th><th>출근</th><th>퇴근</th><th style={{ textAlign: 'right' }}>근무시간</th><th>저장</th></tr></thead>
        <tbody>
          {days.map(({ date, d, dow }) => {
            const row = edits[date] || {}
            return (
              <tr key={date} className={dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''}>
                <td>{month}/{d}</td>
                <td className={dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''}>{DOW[dow]}</td>
                <td><input type="time" value={row.clock_in || ''} onChange={(e) => setField(date, 'clock_in', e.target.value)} /></td>
                <td><input type="time" value={row.clock_out || ''} onChange={(e) => setField(date, 'clock_out', e.target.value)} /></td>
                <td style={{ textAlign: 'right' }}>{row.total_min != null ? fmtMin(row.total_min) : '-'}</td>
                <td><button className="btn-sm" disabled={savingDate === date} onClick={() => saveRow(date)}>저장</button></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="muted">※ 출근/퇴근을 비우고 저장하면 그 날 기록이 삭제됩니다. 근무시간 = (퇴근 − 출근) − 식사시간(설정).</p>
    </section>
  )
}
