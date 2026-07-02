// Clock.jsx — '출퇴근' (직원 본인).
// 출근/퇴근 버튼으로 오늘 근무시간을 기록하고, 이번 달 본인 근무시간 총합·내역을 본다.

import { useState, useEffect } from 'react'
import { getMyAttendanceToday, clockIn, clockOut, resetMyAttendanceToday, getMyAttendance } from '../api.js'

function fmtMin(n) {
  if (n === null || n === undefined) return '-'
  const m = Number(n) || 0
  return `${Math.floor(m / 60)}시간 ${m % 60}분`
}

export default function Clock({ myName }) {
  const now = new Date()
  const [year] = useState(now.getFullYear())
  const [month] = useState(now.getMonth() + 1)
  const [today, setToday] = useState({ work_date: '', record: null })
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setError('')
    try {
      setToday(await getMyAttendanceToday())
      setRows(await getMyAttendance(year, month))
    } catch (e) { setError('조회 실패: ' + e.message) }
  }

  async function doClockIn() {
    if (!window.confirm('지금 시각으로 출근을 기록할까요?')) return
    setBusy(true); setError(''); setMsg('')
    try { const r = await clockIn(); setMsg(`출근 기록 완료 (${r.clock_in})`); await load() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function doClockOut() {
    if (!window.confirm('지금 시각으로 퇴근을 기록할까요?')) return
    setBusy(true); setError(''); setMsg('')
    try { const r = await clockOut(); setMsg(`퇴근 기록 완료 (${r.clock_out}, 근무 ${fmtMin(r.total_min)})`); await load() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function doReset() {
    if (!window.confirm('오늘 출퇴근 기록을 취소하고 다시 입력하시겠어요?\n(실수로 누른 경우 사용하세요.)')) return
    setBusy(true); setError(''); setMsg('')
    try { await resetMyAttendanceToday(); setMsg('오늘 기록을 취소했습니다. 다시 출근을 눌러주세요.'); await load() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const rec = today.record
  const monthTotal = rows.reduce((s, r) => s + (Number(r.total_min) || 0), 0)

  return (
    <section>
      <h2>출퇴근</h2>
      <p className="muted">{myName ? `${myName}님, ` : ''}오늘({today.work_date}) 출근/퇴근을 기록하세요. 시간은 한국 시간 기준입니다.</p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="muted" style={{ color: '#1aa260' }}>{msg}</p>}

      <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
          <div><div className="muted">출근</div><div style={{ fontSize: 24, fontWeight: 700 }}>{rec?.clock_in || '--:--'}</div></div>
          <div><div className="muted">퇴근</div><div style={{ fontSize: 24, fontWeight: 700 }}>{rec?.clock_out || '--:--'}</div></div>
          <div><div className="muted">오늘 근무</div><div style={{ fontSize: 24, fontWeight: 700 }}>{rec?.total_min != null ? fmtMin(rec.total_min) : '-'}</div></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={doClockIn} disabled={busy || !!rec?.clock_in} style={{ fontSize: 18, padding: '12px 32px' }}>출근</button>
          <button onClick={doClockOut} disabled={busy || !rec?.clock_in || !!rec?.clock_out} className="btn-danger" style={{ fontSize: 18, padding: '12px 32px' }}>퇴근</button>
        </div>
        {rec?.clock_in && !rec?.clock_out && <p className="muted" style={{ marginTop: 10 }}>출근 완료 — 퇴근 시 '퇴근'을 눌러주세요.</p>}
        {rec?.clock_out && <p className="muted" style={{ marginTop: 10 }}>오늘 근무 기록이 완료되었습니다.</p>}
        {rec?.clock_in && (
          <div style={{ marginTop: 12 }}>
            <button className="btn-sm btn-ghost" onClick={doReset} disabled={busy}>오늘 기록 취소(재설정)</button>
            <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>실수로 눌렀다면 취소 후 다시 입력하세요.</span>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="dash-head"><h3 style={{ margin: 0 }}>{month}월 내 근무</h3><strong>총 {fmtMin(monthTotal)}</strong></div>
        {rows.length === 0 ? <p className="muted">이번 달 기록이 없습니다.</p> : (
          <table className="data">
            <thead><tr><th>날짜</th><th>요일</th><th>출근</th><th>퇴근</th><th style={{ textAlign: 'right' }}>근무시간</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.work_date}</td><td>{r.day_name || '-'}</td>
                  <td>{r.clock_in || '-'}</td><td>{r.clock_out || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{r.total_min != null ? fmtMin(r.total_min) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
