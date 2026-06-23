// LeaveRequest.jsx — '휴가 입력(결재)' 화면 (직원 본인용).
// 직원이 휴가를 '신청'하면 대기 상태로 저장되고, 관리자가 결재함에서 승인/반려한다.
// 승인되어야 실제 연차가 차감된다(여기서는 신청만).

import { useState, useEffect } from 'react'
import { getLeaveTypes, createMyLeaveRequest, getMyLeaveRequests } from '../api.js'

// 상태값을 한글 배지로 보여주기 위한 표
const STATUS_LABEL = {
  pending: { text: '대기중', color: '#b45309', bg: '#fef3c7' },
  approved: { text: '승인됨', color: '#1aa260', bg: '#dcfce7' },
  rejected: { text: '반려됨', color: '#c0392b', bg: '#fee2e2' },
}

export default function LeaveRequest({ myName }) {
  const [types, setTypes] = useState([])          // 휴가 구분 목록
  const [year, setYear] = useState(new Date().getFullYear())
  const [requests, setRequests] = useState([])    // 내 신청 현황
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // 신청 폼 입력값
  const [form, setForm] = useState({
    leave_type_code: '',
    start_date: '',
    end_date: '',
    exclude_holiday: true,
    reason: '',
  })

  useEffect(() => {
    // 휴가 구분 목록을 한 번 불러와 드롭다운 기본값을 정한다
    getLeaveTypes()
      .then((ts) => {
        setTypes(ts || [])
        if (ts && ts.length) setForm((f) => ({ ...f, leave_type_code: ts[0].code }))
      })
      .catch((e) => setError('휴가 구분 조회 실패: ' + e.message))
    loadRequests(year)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 내 신청 현황 불러오기
  async function loadRequests(targetYear) {
    try {
      const rows = await getMyLeaveRequests(targetYear)
      setRequests(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setError('신청 현황 조회 실패: ' + e.message)
    }
  }

  // [신청] 버튼
  async function submit(e) {
    e.preventDefault()
    setError(''); setMsg('')
    // 주의: 필수값(휴가구분/시작일)을 안 채우면 서버로 보내지 않는다
    if (!form.leave_type_code) { setError('휴가 구분을 선택하세요.'); return }
    if (!form.start_date) { setError('시작일을 선택하세요.'); return }
    setSaving(true)
    try {
      await createMyLeaveRequest({
        leave_type_code: form.leave_type_code,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date, // 종료일 비우면 하루로 처리
        exclude_holiday: form.exclude_holiday,
        reason: form.reason,
      })
      setMsg('휴가를 신청했습니다. 관리자 승인을 기다려주세요.')
      // 폼의 날짜·사유만 비우고, 다시 현황을 불러온다
      setForm((f) => ({ ...f, start_date: '', end_date: '', reason: '' }))
      await loadRequests(year)
    } catch (e) {
      setError('신청 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // 시작~종료를 보기 좋게 (같은 날이면 하루만)
  const range = (s, e) => (!e || s === e ? s : `${s} ~ ${e}`)

  return (
    <section>
      <h2>휴가 입력(결재){myName ? ` — ${myName}` : ''}</h2>
      <p className="muted">휴가를 신청하면 관리자 승인 후 연차가 차감됩니다.</p>

      {error && <p className="error">{error}</p>}
      {msg && <p className="muted" style={{ color: '#1aa260' }}>{msg}</p>}

      {/* ── 신청 폼 ── */}
      <form className="card form-grid" onSubmit={submit}>
        <label>휴가 구분
          <select
            value={form.leave_type_code}
            onChange={(e) => setForm({ ...form, leave_type_code: e.target.value })}
          >
            {types.map((t) => (
              <option key={t.code} value={t.code}>{t.label || t.code}</option>
            ))}
          </select>
        </label>
        <label>시작일
          <input type="date" value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </label>
        <label>종료일 (하루면 비워두세요)
          <input type="date" value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={form.exclude_holiday}
            onChange={(e) => setForm({ ...form, exclude_holiday: e.target.checked })} />
          공휴일·주말 제외하고 계산
        </label>
        <label style={{ gridColumn: '1 / -1' }}>사유
          <input type="text" value={form.reason} placeholder="예) 개인 사정, 병원 방문 등"
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </label>
        <button type="submit" disabled={saving} style={{ gridColumn: '1 / -1' }}>
          {saving ? '신청 중...' : '휴가 신청'}
        </button>
      </form>

      {/* ── 내 신청 현황 ── */}
      <div className="card" style={{ marginTop: '14px' }}>
        <div className="search-bar" style={{ marginBottom: '8px' }}>
          <label>연도
            <input type="number" value={year} style={{ width: '100px' }}
              onChange={(e) => { const y = Number(e.target.value); setYear(y); loadRequests(y) }} />
          </label>
        </div>
        <h3>내 신청 현황</h3>
        {requests.length === 0 ? (
          <p className="muted">{year}년 신청 내역이 없습니다.</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>신청일자</th><th>휴가 구분</th><th>기간</th><th>사유</th><th>상태</th><th>처리 메모</th></tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const st = STATUS_LABEL[r.status] || { text: r.status, color: '#374151', bg: '#eee' }
                return (
                  <tr key={r.id}>
                    <td>{(r.created_at || '').slice(0, 10)}</td>
                    <td>{r.type_label}</td>
                    <td>{range(r.start_date, r.end_date)}</td>
                    <td>{r.reason || '-'}</td>
                    <td><span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>{st.text}</span></td>
                    <td>{r.decision_note || '-'}</td>
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
