// Dashboard.jsx
// '대시보드' 화면(관리자): 전 직원의 연차 현황을 한눈에 본다.
// 요약 카드(사원 수·평균 소진율 등) + 전 직원 표(발생·사용·잔여·소진율 막대) + 정렬.

import { useState, useEffect } from 'react'
import { getDashboard } from '../api.js'

export default function Dashboard() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // 정렬 상태: 어떤 열(key)을 오름/내림(dir) 정렬할지
  const [sort, setSort] = useState({ key: 'usage_rate', dir: 'desc' })

  useEffect(() => { load() /* eslint-disable-line */ }, [year])

  async function load() {
    setLoading(true); setError('')
    try {
      setRows(await getDashboard(year))
    } catch (e) {
      setError('대시보드 조회 실패: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => (n == null ? '-' : Number(n).toFixed(2))
  const pct = (n) => (n == null ? '-' : (Number(n) * 100).toFixed(0) + '%')

  // 요약 통계
  const activeCount = rows.filter((r) => r.status === '재직').length
  const totalUsed = rows.reduce((s, r) => s + Number(r.used_days || 0), 0)
  const totalRemaining = rows.reduce((s, r) => s + Number(r.remaining_days || 0), 0)
  const avgRate = rows.length ? rows.reduce((s, r) => s + Number(r.usage_rate || 0), 0) / rows.length : 0

  // 정렬 적용
  const sorted = [...rows].sort((a, b) => {
    const k = sort.key
    let av = a[k], bv = b[k]
    if (typeof av === 'string' || typeof bv === 'string') {
      av = av || ''; bv = bv || ''
      return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sort.dir === 'asc' ? (av - bv) : (bv - av)
  })
  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }
  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '')

  return (
    <section>
      <div className="dash-head">
        <h2>전 직원 연차 현황</h2>
        <label>연도 <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: '90px' }} /></label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="summary-cards">
        <div className="scard"><div className="snum">{rows.length}</div><div className="slabel">전체 사원</div></div>
        <div className="scard"><div className="snum">{activeCount}</div><div className="slabel">재직</div></div>
        <div className="scard"><div className="snum">{pct(avgRate)}</div><div className="slabel">평균 소진율</div></div>
        <div className="scard"><div className="snum">{fmt(totalUsed)}</div><div className="slabel">총 사용일수</div></div>
        <div className="scard"><div className="snum">{fmt(totalRemaining)}</div><div className="slabel">총 잔여</div></div>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="muted">등록된 사원이 없습니다. '사원 관리'에서 먼저 등록하세요.</p>
      ) : (
        <table className="card dash-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('name')}>성명{arrow('name')}</th>
              <th className="sortable" onClick={() => toggleSort('department')}>부서{arrow('department')}</th>
              <th>직위</th>
              <th>상태</th>
              <th className="sortable" onClick={() => toggleSort('accrued_days')}>발생{arrow('accrued_days')}</th>
              <th className="sortable" onClick={() => toggleSort('used_days')}>사용{arrow('used_days')}</th>
              <th className="sortable" onClick={() => toggleSort('remaining_days')}>잔여{arrow('remaining_days')}</th>
              <th className="sortable" onClick={() => toggleSort('usage_rate')}>소진율{arrow('usage_rate')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.employee_id} className={r.status !== '재직' ? 'row-inactive' : ''}>
                <td>{r.name}</td>
                <td>{r.department || '-'}</td>
                <td>{r.position || '-'}</td>
                <td>{r.status}</td>
                <td>{fmt(r.accrued_days)}</td>
                <td>{fmt(r.used_days)}</td>
                <td>{fmt(r.remaining_days)}</td>
                <td>
                  <div className="bar-wrap">
                    <div className="bar" style={{ width: Math.min(Number(r.usage_rate || 0) * 100, 100) + '%' }}></div>
                    <span>{pct(r.usage_rate)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
