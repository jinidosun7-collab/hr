// Approvals.jsx — '결재함' 화면 (관리자·매니저용).
// 직원들이 올린 휴가 신청을 보고 승인/반려한다.
// 승인하면 실제 연차 기록이 만들어져 그 직원의 잔여 연차가 차감된다.

import { useState, useEffect } from 'react'
import { getLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from '../api.js'
import { canEdit as canEditPerm } from '../perms.js'

const STATUS_LABEL = {
  pending: { text: '대기중', color: '#b45309', bg: '#fef3c7' },
  approved: { text: '승인됨', color: '#1aa260', bg: '#dcfce7' },
  rejected: { text: '반려됨', color: '#c0392b', bg: '#fee2e2' },
}

export default function Approvals() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [filter, setFilter] = useState('pending') // 'pending' | '' (전체)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busyId, setBusyId] = useState(null)       // 처리 중인 신청 id
  const canApprove = canEditPerm('approvals')      // '편집' 권한이 있어야 승인/반려 가능

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, filter])

  async function load() {
    setError('')
    try {
      const data = await getLeaveRequests(filter, year)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('결재함 조회 실패: ' + e.message)
    }
  }

  // 승인
  async function approve(r) {
    if (!window.confirm(`${r.employee_name}님의 휴가를 승인할까요?\n승인하면 연차가 차감됩니다.`)) return
    setBusyId(r.id); setError(''); setMsg('')
    try {
      const res = await approveLeaveRequest(r.id)
      setMsg(`${r.employee_name}님 휴가 승인 완료 (${Number(res.used_days).toFixed(2)}일 차감)`)
      await load()
    } catch (e) {
      setError('승인 실패: ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  // 반려 (사유 입력)
  async function reject(r) {
    const note = window.prompt(`${r.employee_name}님의 휴가를 반려합니다. 사유를 입력하세요.`, '')
    if (note === null) return // 취소
    setBusyId(r.id); setError(''); setMsg('')
    try {
      await rejectLeaveRequest(r.id, note)
      setMsg(`${r.employee_name}님 휴가 반려 처리됨`)
      await load()
    } catch (e) {
      setError('반려 실패: ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  const range = (s, e) => (!e || s === e ? s : `${s} ~ ${e}`)
  const pendingCount = rows.filter((r) => r.status === 'pending').length

  return (
    <section>
      <h2>결재함</h2>
      <p className="muted">직원이 올린 휴가 신청을 승인하거나 반려합니다. 승인 시 연차가 차감됩니다.</p>

      {error && <p className="error">{error}</p>}
      {msg && <p className="muted" style={{ color: '#1aa260' }}>{msg}</p>}

      <div className="card search-bar">
        <label>연도
          <input type="number" value={year} style={{ width: '100px' }}
            onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label>보기
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">대기중만</option>
            <option value="">전체</option>
          </select>
        </label>
        <span className="muted">대기중 {pendingCount}건</span>
      </div>

      <div className="card" style={{ marginTop: '12px' }}>
        {rows.length === 0 ? (
          <p className="muted">표시할 신청이 없습니다.</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>신청자</th><th>부서</th><th>휴가 구분</th><th>기간</th><th>사유</th><th>상태</th><th>처리</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = STATUS_LABEL[r.status] || { text: r.status, color: '#374151', bg: '#eee' }
                return (
                  <tr key={r.id}>
                    <td>{r.employee_name}</td>
                    <td>{r.department || '-'}</td>
                    <td>{r.type_label}</td>
                    <td>{range(r.start_date, r.end_date)}</td>
                    <td>{r.reason || '-'}</td>
                    <td><span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>{st.text}</span></td>
                    <td>
                      {r.status === 'pending' ? (
                        canApprove ? (
                          <div className="row-actions">
                            <button className="btn-sm" disabled={busyId === r.id} onClick={() => approve(r)}>승인</button>
                            <button className="btn-sm btn-danger" disabled={busyId === r.id} onClick={() => reject(r)}>반려</button>
                          </div>
                        ) : (
                          <span className="muted">대기중 (조회 전용)</span>
                        )
                      ) : (
                        <span className="muted">{r.decision_note || '처리됨'}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
