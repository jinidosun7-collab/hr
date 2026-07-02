// ActivityLog.jsx — '활동 로그' (Master 전용).
// 직원의 출퇴근 기록, 휴가 신청·사용 등록 등 주요 동작을 시간순으로 보여준다.

import { useState, useEffect } from 'react'
import { getActivityLog } from '../api.js'

// 동작별 색상 뱃지
const BADGE = {
  '출퇴근 기록': '#2563eb', '출퇴근 삭제': '#9ca3af',
  '휴가 신청': '#7c3aed', '휴가 사용 등록': '#0891b2', '휴가 승인': '#1aa260',
}
function fmtTime(s) { return s ? String(s).slice(0, 16).replace('T', ' ') : '' }
// 상세(JSON)를 사람이 읽기 좋은 한 줄로
function fmtDetail(action, d) {
  if (!d || typeof d !== 'object') return ''
  if (action.startsWith('출퇴근')) {
    const t = d.total_min != null ? ` (${Math.floor(d.total_min / 60)}시간 ${d.total_min % 60}분)` : ''
    return `${d.work_date || ''} ${d.clock_in || ''}${d.clock_out ? '~' + d.clock_out : ''}${t}`.trim()
  }
  if (action === '휴가 신청') return `${d.leave_type_code || ''} ${d.start_date || ''}${d.end_date && d.end_date !== d.start_date ? '~' + d.end_date : ''}`.trim()
  if (action === '휴가 사용 등록') return `사원#${d.employee_id ?? '?'} ${d.leave_type_code || ''} ${d.start_date || ''}${d.end_date && d.end_date !== d.start_date ? '~' + d.end_date : ''} (${d.used_days}일)`.trim()
  if (action === '휴가 승인') return `사원#${d.employee_id ?? '?'} 신청#${d.request_id ?? '?'} (${d.used_days}일)`
  return JSON.stringify(d)
}

export default function ActivityLog() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')   // 동작 필터

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true); setError('')
    try { setRows(await getActivityLog()) }
    catch (e) { setError('불러오기 실패: ' + e.message) }
    finally { setLoading(false) }
  }

  const types = [...new Set(rows.map((r) => r.action))]
  const filtered = rows.filter((r) => {
    if (type && r.action !== type) return false
    if (q) {
      const hay = `${r.actor_email || ''} ${r.actor_name || ''} ${r.action} ${JSON.stringify(r.detail || {})}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  return (
    <section>
      <h2>활동 로그 <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>(Master 전용)</span></h2>
      <p className="muted">직원의 <strong>출퇴근 기록</strong>, <strong>휴가 신청·사용 등록·승인</strong> 등 주요 동작이 시간순으로 기록됩니다. 최근 500건을 표시합니다.</p>
      {error && <p className="error">{error}</p>}

      <div className="card search-bar" style={{ alignItems: 'center' }}>
        <label>동작
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">전체</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>검색<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이메일·이름·내용" /></label>
        <button type="button" className="btn-ghost" onClick={load}>새로고침</button>
        <span style={{ marginLeft: 'auto' }} className="muted">{filtered.length}건</span>
      </div>

      {loading ? <p className="muted">불러오는 중...</p> : (
        <table className="card data" style={{ marginTop: 12 }}>
          <thead><tr><th>시각</th><th>사용자</th><th>동작</th><th>내용</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="muted" style={{ textAlign: 'center' }}>기록이 없습니다.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(r.created_at)}</td>
                <td>{r.actor_name ? `${r.actor_name} ` : ''}<span className="muted">{r.actor_email}</span></td>
                <td><span style={{ background: (BADGE[r.action] || '#6b7280') + '22', color: BADGE[r.action] || '#374151', padding: '2px 8px', borderRadius: 10, fontSize: 12, whiteSpace: 'nowrap' }}>{r.action}</span></td>
                <td>{fmtDetail(r.action, r.detail)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
