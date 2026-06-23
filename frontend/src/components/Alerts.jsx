// Alerts.jsx — '알림센터'. 다가오는 생일·입사기념일·계약/자격 만료를 모아 보여준다.
import { useState, useEffect } from 'react'
import { getAlerts } from '../api.js'

const COLORS = { '생일': '#fde68a', '입사기념일': '#bbf7d0', '계약만료': '#fecaca', '자격만료': '#fbcfe8' }

export default function Alerts() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { getAlerts().then((d) => { setRows(d); setLoading(false) }).catch((e) => { setError(e.message); setLoading(false) }) }, [])

  const dlabel = (n) => (n === 0 ? '오늘' : n > 0 ? `D-${n}` : `${-n}일 지남`)

  return (
    <section>
      <h2>알림센터</h2>
      <p className="muted">앞으로 30일 내의 생일·입사기념일·계약 만료·자격 만료를 모아 보여줍니다.</p>
      {error && <p className="error">{error}</p>}
      {loading ? <p>불러오는 중...</p> : rows.length === 0 ? <p className="muted">예정된 알림이 없습니다.</p> : (
        <table className="card">
          <thead><tr><th>구분</th><th>대상</th><th>부서</th><th>날짜</th><th>D-day</th><th>비고</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><span className="alert-badge" style={{ background: COLORS[r.type] || '#e5e7eb' }}>{r.type}</span></td>
                <td>{r.name}</td><td>{r.department || '-'}</td><td>{r.date}</td>
                <td>{dlabel(r.days_left)}</td><td>{r.detail || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
