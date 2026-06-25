// Attendance.jsx — '근태 현황' (관리자·매니저용).
// 1) 매달 받는 근태 집계 엑셀(.xls/.xlsx)을 업로드하면 일별 근태가 저장된다.
// 2) 연/월·직원으로 골라 출근·퇴근·근무시간을 본다.
// 엑셀 컬럼: 사용자ID, 이름, 근무일자, 근무일명칭, 출근, 퇴근, 기본, 연장, 총합, 인정

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getEmployees, importAttendance, getAttendance } from '../api.js'
import { canEdit as canEditPerm } from '../perms.js'

// "09:00:00" 또는 "09:00" → 분(minute)으로. 빈 값/00:00 → 0
function hmsToMin(v) {
  if (!v) return 0
  const parts = String(v).split(':').map((x) => Number(x) || 0)
  const [h = 0, m = 0] = parts
  return h * 60 + m
}
// 분 → "H:MM" 표시 (없으면 '-')
function fmtMin(n) {
  if (n === null || n === undefined) return '-'
  if (n === 0) return '0:00'
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}
// 근무일자 셀을 'YYYY-MM-DD'로 정규화 (Date객체/"2026/05/01"/"2026-05-01" 모두 대응)
function normDate(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).trim().slice(0, 10).replace(/\//g, '-')
  return s
}

export default function Attendance() {
  const [employees, setEmployees] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1) // 1~12
  const [empId, setEmpId] = useState('')        // '' = 전체
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const canUpload = canEditPerm('attendance') // '편집' 권한이 있어야 엑셀 업로드 허용

  useEffect(() => {
    getEmployees().then(setEmployees).catch(() => {})
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 근태 조회 (연/월/직원)
  async function load() {
    setError('')
    try {
      const data = await getAttendance(year, month, empId || undefined)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('근태 조회 실패: ' + e.message)
    }
  }

  // 엑셀 파일 선택 → 파싱 → 업로드
  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setMsg(''); setBusy(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      // raw:false → 시간/날짜를 보이는 문자열 그대로 읽는다
      const json = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' })
      // 엑셀 한 줄 → 서버로 보낼 형태로 변환
      const parsed = json
        .map((r) => ({
          user_ext_id: r['사용자ID'] != null ? String(r['사용자ID']).trim() : '',
          name: (r['이름'] || '').toString().trim(),
          work_date: normDate(r['근무일자']),
          day_name: (r['근무일명칭'] || '').toString().trim(),
          clock_in: (r['출근'] || '').toString().trim() || null,
          clock_out: (r['퇴근'] || '').toString().trim() || null,
          basic_min: hmsToMin(r['기본']),
          overtime_min: hmsToMin(r['연장']),
          total_min: hmsToMin(r['총합']),
          recognized_min: hmsToMin(r['인정']),
        }))
        .filter((r) => r.work_date) // 근무일자 없는 줄은 제외
      if (parsed.length === 0) {
        setError('엑셀에서 근무일자가 있는 줄을 찾지 못했습니다. (컬럼명: 근무일자/이름/출근 등)')
        return
      }
      const res = await importAttendance(parsed)
      setMsg(`업로드 완료: 총 ${res.total}건 중 ${res.inserted}건 저장, ${res.matched}건 직원 매칭됨.`)
      await load()
    } catch (err) {
      setError('업로드 실패: ' + err.message)
    } finally {
      setBusy(false)
      e.target.value = '' // 같은 파일 다시 올릴 수 있게 초기화
    }
  }

  const showName = !empId // 전체 보기일 때만 이름 열 표시

  return (
    <section>
      <h2>근태 현황</h2>
      <p className="muted">매달 받는 근태 집계 엑셀(.xls/.xlsx)을 업로드하면 일별 출퇴근이 저장됩니다.</p>

      {error && <p className="error">{error}</p>}
      {msg && <p className="muted" style={{ color: '#1aa260' }}>{msg}</p>}

      {/* 업로드 (편집 권한 필요) */}
      {canUpload && (
        <div className="card" style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 600 }}>근태 엑셀 업로드&nbsp;
            <input type="file" accept=".xls,.xlsx,.csv" onChange={onFile} disabled={busy} />
          </label>
          {busy && <span className="muted"> 처리 중...</span>}
          <p className="muted" style={{ marginTop: 6 }}>
            ※ 사용자ID 또는 이름으로 직원과 자동 매칭됩니다. 매칭이 안 되면 사원 관리에서 ‘근태ID(사용자ID)’를 등록해주세요.
          </p>
        </div>
      )}

      {/* 조회 조건 */}
      <div className="card search-bar">
        <label>연도<input type="number" value={year} style={{ width: 90 }} onChange={(e) => setYear(Number(e.target.value))} /></label>
        <label>월
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            <option value={0}>전체</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
          </select>
        </label>
        <label>직원
          <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">전체</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </label>
        <button onClick={load}>조회</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        {rows.length === 0 ? (
          <p className="muted">표시할 근태 기록이 없습니다. 엑셀을 업로드해보세요.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                {showName && <th>이름</th>}
                <th>날짜</th><th>구분</th><th>출근</th><th>퇴근</th>
                <th style={{ textAlign: 'right' }}>기본</th>
                <th style={{ textAlign: 'right' }}>연장</th>
                <th style={{ textAlign: 'right' }}>총합</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {showName && <td>{r.employee_name}</td>}
                  <td>{r.work_date}</td>
                  <td>{r.day_name || '-'}</td>
                  <td>{r.clock_in || '-'}</td>
                  <td>{r.clock_out || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMin(r.basic_min)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMin(r.overtime_min)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMin(r.total_min)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
