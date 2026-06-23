// Settings.jsx — 설정(공휴일·휴가구분). '설정 변경' 권한(act:settings_edit) 없으면 조회 전용.
import { useState, useEffect } from 'react'
import { getHolidays, createHoliday, deleteHoliday, importHolidays, getLeaveTypes, updateLeaveType } from '../api.js'
import { can } from '../perms.js'

export default function Settings() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState([])
  const [types, setTypes] = useState([])
  const [error, setError] = useState('')
  const [hForm, setHForm] = useState({ holiday_date: '', name: '' })
  const editable = can('tab:settings') // 탭이 보이면 설정 변경 허용

  useEffect(() => { loadHolidays() /* eslint-disable-line */ }, [year])
  useEffect(() => { loadTypes() }, [])

  async function loadHolidays() { try { setHolidays(await getHolidays(year)) } catch (e) { setError('공휴일 조회 오류: ' + e.message) } }
  async function loadTypes() { try { setTypes(await getLeaveTypes()) } catch (e) { setError('휴가구분 조회 오류: ' + e.message) } }

  async function addHoliday(e) {
    e.preventDefault(); setError('')
    if (!hForm.holiday_date || !hForm.name) { setError('날짜와 이름을 입력하세요.'); return }
    try { await createHoliday(hForm); setHForm({ holiday_date: '', name: '' }); await loadHolidays() } catch (e) { setError('공휴일 추가 실패: ' + e.message) }
  }
  async function delHoliday(id) { if (!window.confirm('이 공휴일을 삭제할까요?')) return; try { await deleteHoliday(id); await loadHolidays() } catch (e) { setError('삭제 실패: ' + e.message) } }
  async function autoImport() {
    setError('')
    try { const res = await importHolidays(year); window.alert(`${year}년 공휴일 ${res.inserted}개를 새로 추가했습니다. (중복 제외)`); await loadHolidays() }
    catch (e) { setError('자동수집 실패: ' + e.message) }
  }
  async function toggleDeductible(t) { try { await updateLeaveType({ code: t.code, is_deductible: !t.is_deductible }); await loadTypes() } catch (e) { setError('수정 실패: ' + e.message) } }
  async function saveDeductDays(t, v) { const n = Number(v); if (Number.isNaN(n)) return; try { await updateLeaveType({ code: t.code, deduct_days: n }); await loadTypes() } catch (e) { setError('수정 실패: ' + e.message) } }

  return (
    <section>
      {error && <p className="error">{error}</p>}
      {!editable && <p className="muted">조회 전용입니다 (설정 변경 권한 없음).</p>}

      <h2>휴가구분 설정</h2>
      <p className="muted">'차감여부'를 끄면 그 휴가는 연차에서 빠지지 않습니다 (예: 병가·경조휴가).</p>
      <table className="card">
        <thead><tr><th>휴가구분</th><th>차감일수(1회)</th><th>차감여부</th></tr></thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.code}>
              <td>{t.label}</td>
              <td><input type="number" step="0.000001" defaultValue={t.deduct_days} style={{ width: '120px' }} disabled={!editable} onBlur={(e) => saveDeductDays(t, e.target.value)} /></td>
              <td><label className="checkbox-label" style={{ gridColumn: 'auto' }}><input type="checkbox" checked={!!t.is_deductible} disabled={!editable} onChange={() => toggleDeductible(t)} />{t.is_deductible ? '차감함' : '차감 안 함'}</label></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="dash-head">
        <h2>공휴일 설정</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>연도<input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: '90px' }} /></label>
          {editable && <button onClick={autoImport}>공휴일 자동수집</button>}
        </div>
      </div>
      <p className="muted">자동수집은 한국 공휴일을 불러옵니다. 누락·대체공휴일은 아래에서 직접 추가하세요.</p>
      {editable && (
        <form className="card search-bar" onSubmit={addHoliday}>
          <label>날짜<input type="date" value={hForm.holiday_date} onChange={(e) => setHForm({ ...hForm, holiday_date: e.target.value })} /></label>
          <label>이름<input value={hForm.name} onChange={(e) => setHForm({ ...hForm, name: e.target.value })} placeholder="예: 신정" /></label>
          <button type="submit">공휴일 추가</button>
        </form>
      )}
      {holidays.length === 0 ? <p className="muted">{year}년 공휴일이 없습니다.</p> : (
        <table className="card">
          <thead><tr><th>날짜</th><th>이름</th>{editable && <th>관리</th>}</tr></thead>
          <tbody>{holidays.map((h) => (<tr key={h.id}><td>{h.holiday_date}</td><td>{h.name}</td>{editable && <td><button className="btn-sm btn-danger" onClick={() => delHoliday(h.id)}>삭제</button></td>}</tr>))}</tbody>
        </table>
      )}
    </section>
  )
}
