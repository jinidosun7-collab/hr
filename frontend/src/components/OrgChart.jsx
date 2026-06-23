// OrgChart.jsx — '조직도'. 재직 사원을 부서별로 묶어 보여준다.
import { useState, useEffect } from 'react'
import { getEmployees } from '../api.js'

export default function OrgChart() {
  const [emps, setEmps] = useState([])
  const [error, setError] = useState('')
  useEffect(() => { getEmployees().then(setEmps).catch((e) => setError(e.message)) }, [])

  const active = emps.filter((e) => e.status !== '퇴사')
  const byDept = {}
  active.forEach((e) => { const d = e.department || '미지정'; (byDept[d] = byDept[d] || []).push(e) })
  const depts = Object.keys(byDept).sort()

  return (
    <section>
      <h2>조직도 <span className="muted" style={{ fontSize: 14 }}>(재직 {active.length}명)</span></h2>
      {error && <p className="error">{error}</p>}
      <div className="org-wrap">
        {depts.map((d) => (
          <div className="org-dept card" key={d}>
            <div className="org-dept-name">{d} <span className="muted">({byDept[d].length}명)</span></div>
            <div>
              {byDept[d].sort((a, b) => (a.position || '').localeCompare(b.position || '')).map((e) => (
                <div className="org-person" key={e.id}>
                  <strong>{e.name}</strong><span className="muted"> {e.position || ''}</span>
                  {e.status !== '재직' && <span className="org-badge">{e.status}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {depts.length === 0 && <p className="muted">등록된 사원이 없습니다.</p>}
    </section>
  )
}
