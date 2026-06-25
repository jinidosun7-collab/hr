// Settings.jsx — 설정(근무시간·공휴일·휴가구분). '설정 변경' 권한 없으면 조회 전용.
import { useState, useEffect } from 'react'
import { getHolidays, createHoliday, deleteHoliday, importHolidays, getLeaveTypes, updateLeaveType, createLeaveType, deleteLeaveType, getSettings, updateSettings } from '../api.js'
import { canEdit as canEditPerm } from '../perms.js'

// 근무요일 표시 매핑 (getUTCDay 규약: 0=일..6=토)
const WEEKDAYS = [['월', 1], ['화', 2], ['수', 3], ['목', 4], ['금', 5], ['토', 6], ['일', 0]]

export default function Settings() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState([])
  const [types, setTypes] = useState([])
  const [error, setError] = useState('')
  const [hForm, setHForm] = useState({ holiday_date: '', name: '' })
  const [settings, setSettings] = useState({ daily_work_hours: 8, working_weekdays: [1, 2, 3, 4, 5] })
  const [ltForm, setLtForm] = useState({ label: '', deduct_days: 1, is_deductible: true })
  const editable = canEditPerm('settings') // '편집' 권한이 있어야 설정 변경 허용

  useEffect(() => { loadHolidays() /* eslint-disable-line */ }, [year])
  useEffect(() => { loadTypes(); loadSettings() }, [])

  async function loadHolidays() { try { setHolidays(await getHolidays(year)) } catch (e) { setError('공휴일 조회 오류: ' + e.message) } }
  async function loadTypes() { try { setTypes(await getLeaveTypes()) } catch (e) { setError('휴가구분 조회 오류: ' + e.message) } }
  async function loadSettings() { try { setSettings(await getSettings()) } catch (e) { setError('근무시간 설정 조회 오류: ' + e.message) } }

  // 시간단위 휴가(h1, h2…)는 소정근로시간에서 자동 계산되므로 차감일수 직접수정 불가
  const isAutoType = (t) => /^h\d+$/.test(t.code)

  async function saveDailyHours(v) {
    const n = Math.round(Number(v)); if (!(n >= 1 && n <= 24)) { setError('소정근로시간은 1~24 사이로 입력하세요.'); return }
    if (n === Number(settings.daily_work_hours)) return
    if (!window.confirm(`소정근로시간을 ${n}시간으로 변경하면 시간단위 휴가의 차감일수가 자동 재계산됩니다.\n(이미 기록된 휴가는 변경되지 않습니다.)\n진행할까요?`)) { loadSettings(); return }
    setError('')
    try { await updateSettings({ daily_work_hours: n }); await loadSettings(); await loadTypes() }
    catch (e) { setError('저장 실패: ' + e.message) }
  }
  async function saveWeekdays(arr) {
    if (!arr.length) { setError('근무 요일을 1개 이상 선택하세요.'); return }
    setError('')
    try { await updateSettings({ working_weekdays: arr }); await loadSettings() }
    catch (e) { setError('저장 실패: ' + e.message) }
  }
  function toggleWeekday(w) {
    if (!editable) return
    const set = new Set(settings.working_weekdays)
    set.has(w) ? set.delete(w) : set.add(w)
    saveWeekdays([...set].sort((a, b) => a - b))
  }
  function applyPreset(arr) { if (editable) saveWeekdays(arr) }

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
  async function addLeaveType(e) {
    e.preventDefault(); setError('')
    if (!ltForm.label.trim()) { setError('휴가구분 이름을 입력하세요.'); return }
    const dd = Number(ltForm.deduct_days); if (!isFinite(dd) || dd < 0) { setError('차감일수를 올바르게 입력하세요.'); return }
    try { await createLeaveType({ label: ltForm.label.trim(), deduct_days: dd, is_deductible: ltForm.is_deductible }); setLtForm({ label: '', deduct_days: 1, is_deductible: true }); await loadTypes() }
    catch (e) { setError('추가 실패: ' + e.message) }
  }
  async function delLeaveType(t) {
    if (!window.confirm(`'${t.label}' 휴가구분을 삭제할까요?\n(이미 사용된 기록은 그대로 남습니다.)`)) return
    try { await deleteLeaveType(t.code); await loadTypes() } catch (e) { setError('삭제 실패: ' + e.message) }
  }

  return (
    <section>
      {error && <p className="error">{error}</p>}
      {!editable && <p className="muted">조회 전용입니다 (설정 변경 권한 없음).</p>}

      <h2>근무시간 설정</h2>
      <p className="muted">회사의 소정근로시간(1일 근무시간)과 근무 요일을 정합니다. 소정근로시간을 바꾸면 시간단위 휴가의 차감일수가 자동 계산됩니다.</p>
      <div className="card">
        <div className="search-bar" style={{ alignItems: 'center' }}>
          <label>1일 소정근로시간
            <input type="number" min="1" max="24" step="1" defaultValue={settings.daily_work_hours} key={'dh-' + settings.daily_work_hours}
              style={{ width: '90px' }} disabled={!editable} onBlur={(e) => saveDailyHours(e.target.value)} /> 시간
          </label>
          {editable && (
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn-sm" onClick={() => applyPreset([1, 2, 3, 4, 5])}>주5일</button>
              <button type="button" className="btn-sm" onClick={() => applyPreset([1, 2, 3, 4])}>주4일</button>
            </span>
          )}
        </div>
        <div style={{ marginTop: 8 }}>
          <span className="muted" style={{ marginRight: 8 }}>근무 요일</span>
          {WEEKDAYS.map(([label, w]) => (
            <label key={w} className="checkbox-label" style={{ gridColumn: 'auto', display: 'inline-flex', marginRight: 12 }}>
              <input type="checkbox" checked={settings.working_weekdays.includes(w)} disabled={!editable} onChange={() => toggleWeekday(w)} />{label}
            </label>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>· 선택한 요일만 종일 휴가의 사용일수로 계산됩니다(공휴일은 별도 제외). · 현재 1일 = {settings.daily_work_hours}시간 기준.</p>
      </div>

      <h2>휴가구분 설정</h2>
      <p className="muted">'차감여부'를 끄면 그 휴가는 연차에서 빠지지 않습니다 (예: 병가·경조휴가). 시간단위 휴가(시간연차)의 차감일수는 위 소정근로시간에서 <strong>자동 계산</strong>됩니다.</p>
      <table className="card">
        <thead><tr><th>휴가구분</th><th>차감일수(1회)</th><th>차감여부</th>{editable && <th>관리</th>}</tr></thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.code}>
              <td>{t.label}</td>
              <td>
                {isAutoType(t)
                  ? <span title="소정근로시간에서 자동 계산됩니다" className="muted">{Number(t.deduct_days).toFixed(6)} <small>(자동)</small></span>
                  : <input type="number" step="0.000001" defaultValue={t.deduct_days} style={{ width: '120px' }} disabled={!editable} onBlur={(e) => saveDeductDays(t, e.target.value)} />}
              </td>
              <td><label className="checkbox-label" style={{ gridColumn: 'auto' }}><input type="checkbox" checked={!!t.is_deductible} disabled={!editable} onChange={() => toggleDeductible(t)} />{t.is_deductible ? '차감함' : '차감 안 함'}</label></td>
              {editable && <td>{(isAutoType(t) || t.code === 'annual_7h') ? <span className="muted"><small>자동</small></span> : <button className="btn-sm btn-danger" onClick={() => delLeaveType(t)}>삭제</button>}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <form className="card search-bar" onSubmit={addLeaveType}>
          <label>이름<input value={ltForm.label} onChange={(e) => setLtForm({ ...ltForm, label: e.target.value })} placeholder="예: 반차, 공가" /></label>
          <label>차감일수<input type="number" step="0.000001" min="0" value={ltForm.deduct_days} onChange={(e) => setLtForm({ ...ltForm, deduct_days: e.target.value })} style={{ width: '110px' }} /></label>
          <label className="checkbox-label" style={{ gridColumn: 'auto' }}><input type="checkbox" checked={ltForm.is_deductible} onChange={(e) => setLtForm({ ...ltForm, is_deductible: e.target.checked })} />연차에서 차감</label>
          <button type="submit">휴가구분 추가</button>
        </form>
      )}
      <p className="muted">· 종일 휴가는 차감일수 1, 반일은 0.5처럼 입력합니다. '연차에서 차감'을 끄면 병가·경조처럼 연차를 깎지 않습니다.</p>

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
