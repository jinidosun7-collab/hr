// api.js
// ─────────────────────────────────────────────────────────────────────────────
// 백엔드(Supabase Edge Function 'hr')와 대화하는 함수 모음.
// 화면 컴포넌트들은 여기 함수만 부르면 되고, '어떻게 통신하는지'는 신경 안 써도 된다.
//
// 통신 방식:
//   - 주소: <oro-hr>/functions/v1/hr + 경로
//   - apikey: oro-hr 공개키 (게이트웨이 통과용)
//   - x-user-token: 로그인한 사람의 oro-mes 출입증 (함수가 이걸로 신원 확인)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient.js'

// oro-hr 프로젝트 주소와 공개키(anon). 공개키라 화면에 들어가도 안전.
const HR_URL =
  import.meta.env.VITE_HR_SUPABASE_URL || 'https://edbcjxgpyeqdxztenuyb.supabase.co'
const HR_ANON =
  import.meta.env.VITE_HR_ANON_KEY ||
  'sb_publishable_K1c3q_XncSyaAI5wGPfcAg_iHcA7AB5'

// Edge Function 의 기본 주소
const FN_BASE = `${HR_URL}/functions/v1/hr`

// 공통 요청 함수: 로그인 토큰을 실어 보내고, 실패하면 에러 메시지를 알기 쉽게 던진다.
async function request(path, options = {}) {
  // 현재 로그인된 사람의 oro-mes 출입증(토큰)을 꺼낸다
  const { data } = await supabase.auth.getSession()
  const userToken = data?.session?.access_token || ''

  const res = await fetch(`${FN_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      apikey: HR_ANON,                       // 게이트웨이 통과용 공개키
      Authorization: `Bearer ${HR_ANON}`,    // 게이트웨이 통과용
      'x-user-token': userToken,             // 함수가 신원 확인에 쓰는 진짜 토큰
    },
    ...options,
  })
  if (!res.ok) {
    let detail = `요청 실패 (${res.status})`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch (e) { /* 본문이 없을 수도 있음 */ }
    throw new Error(detail)
  }
  return res.json()
}

// ── 화면에서 쓰는 함수들 ─────────────────────────────────────────────────────
export function getEmployees() { return request('/employees') }
export function createEmployee(employee) {
  return request('/employees', { method: 'POST', body: JSON.stringify(employee) })
}
export function getLeaveTypes() { return request('/leave-types') }
export function getLeaveStatus(employeeId, year) {
  return request(`/employees/${employeeId}/leave-status?year=${year}`)
}
export function getMe() { return request('/me') }
export function getMyLeaveStatus(year) { return request(`/me/leave-status?year=${year}`) }
// 본인 연차 사용 내역(날짜별) 조회 — '내 연차' 화면 하단의 정산서용
export function getMyLeaveRecords(year) { return request(`/me/leave-records?year=${year}`) }

// ── 전자결재(휴가 신청·승인) ──────────────────────────────────────────────
// 직원: 휴가 신청 (대기 상태로 저장됨)
export function createMyLeaveRequest(body) {
  return request('/me/leave-requests', { method: 'POST', body: JSON.stringify(body) })
}
// 직원: 본인 신청 현황 조회 (대기/승인/반려)
export function getMyLeaveRequests(year) { return request(`/me/leave-requests?year=${year}`) }
// 관리자: 결재함 목록 (status 없으면 전체, 'pending'이면 대기만)
export function getLeaveRequests(status, year) {
  const q = status ? `&status=${status}` : ''
  return request(`/leave-requests?year=${year}${q}`)
}
// 관리자: 승인 (승인 시 실제 연차 기록이 만들어져 차감됨)
export function approveLeaveRequest(id) {
  return request(`/leave-requests/${id}/approve`, { method: 'POST', body: '{}' })
}
// 관리자: 반려 (사유 note 포함)
export function rejectLeaveRequest(id, note) {
  return request(`/leave-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) })
}

// ── 근태(엑셀 업로드) ───────────────────────────────────────────────────────
// 관리자: 파싱한 엑셀 행들을 업로드 (rows: [{user_ext_id,name,work_date,...}])
export function importAttendance(rows) {
  return request('/attendance/import', { method: 'POST', body: JSON.stringify({ rows }) })
}
// 관리자: 근태 조회 (연/월, 특정 직원). month=0이면 그 해 전체
export function getAttendance(year, month, employeeId) {
  const e = employeeId ? `&employee_id=${employeeId}` : ''
  return request(`/attendance?year=${year}&month=${month}${e}`)
}
// 직원: 본인 근태 조회
export function getMyAttendance(year, month) {
  return request(`/me/attendance?year=${year}&month=${month}`)
}
// 직원: 출퇴근 (본인)
export function getMyAttendanceToday() { return request('/me/attendance/today') }
export function clockIn() { return request('/me/attendance/clock-in', { method: 'POST' }) }
export function clockOut() { return request('/me/attendance/clock-out', { method: 'POST' }) }
export function resetMyAttendanceToday() { return request('/me/attendance/reset', { method: 'POST' }) }
// 직원: 월별 근무 기록부 — 일자별 출근/퇴근 직접 저장 (빈 값이면 삭제)
export function saveMyAttendance(work_date, clock_in, clock_out) { return request('/me/attendance/save', { method: 'POST', body: JSON.stringify({ work_date, clock_in, clock_out }) }) }
// 관리자: 근태 월별 총합(직원별)
export function getAttendanceSummary(year, month) { return request(`/attendance/summary?year=${year}&month=${month}`) }

// 비밀번호 찾기(관리자 처리 방식)
export function requestPasswordReset(email) { return request('/auth/reset-request', { method: 'POST', body: JSON.stringify({ email }) }) }
export function getResetRequests() { return request('/auth/reset-requests') }
export function resolveResetRequest(id) { return request(`/auth/reset-requests/${id}/resolve`, { method: 'POST' }) }
export function adminSetPassword(email, password) { return request('/admin/set-password', { method: 'POST', body: JSON.stringify({ email, password }) }) }

// 휴가 사용내역 추가 (관리자)
export function createLeaveRecord(record) {
  return request('/leave-records', { method: 'POST', body: JSON.stringify(record) })
}
// 특정 사원의 그 해 휴가 사용내역 목록 (관리자)
export function getLeaveRecords(employeeId, year) {
  return request(`/employees/${employeeId}/leave-records?year=${year}`)
}

// 사원 수정 (관리자)
export function updateEmployee(id, fields) {
  return request(`/employees/${id}/update`, { method: 'POST', body: JSON.stringify(fields) })
}
// 사원 삭제 (관리자)
export function deleteEmployee(id) {
  return request(`/employees/${id}/delete`, { method: 'POST' })
}
// 직원 로그인 계정 생성/비밀번호 설정 (관리자) — 이메일+비밀번호로 실제 로그인 계정 발급 후 사원과 연결
export function setEmployeeAccount(id, email, password) {
  return request(`/employees/${id}/account`, { method: 'POST', body: JSON.stringify({ email, password }) })
}
// 휴가 기록 삭제 (관리자)
export function deleteLeaveRecord(id) {
  return request(`/leave-records/${id}/delete`, { method: 'POST' })
}

// 전 직원 연차 현황 대시보드 (관리자)
export function getDashboard(year) {
  return request(`/dashboard?year=${year}`)
}

// 추가공제 (관리자)
export function createAdjustment(a) { return request('/leave-adjustments', { method: 'POST', body: JSON.stringify(a) }) }
export function getAdjustments(id, y) { return request(`/employees/${id}/adjustments?year=${y}`) }
export function deleteAdjustment(id) { return request(`/leave-adjustments/${id}/delete`, { method: 'POST' }) }

// 연차수당 (관리자)
export function createAllowance(a) { return request('/leave-allowances', { method: 'POST', body: JSON.stringify(a) }) }
export function getAllowances(id, y) { return request(`/employees/${id}/allowances?year=${y}`) }
export function deleteAllowance(id) { return request(`/leave-allowances/${id}/delete`, { method: 'POST' }) }

// 사원 일괄 등록 (관리자) — employees: 배열
export function bulkCreateEmployees(employees) { return request('/employees/bulk', { method: 'POST', body: JSON.stringify({ employees }) }) }

// 공휴일 설정 (관리자)
export function getHolidays(year) { return request(`/holidays?year=${year}`) }
export function createHoliday(h) { return request('/holidays', { method: 'POST', body: JSON.stringify(h) }) }
export function deleteHoliday(id) { return request(`/holidays/${id}/delete`, { method: 'POST' }) }

// 휴가구분 수정 (차감일수·차감여부) (관리자)
export function updateLeaveType(payload) { return request('/leave-types/update', { method: 'POST', body: JSON.stringify(payload) }) }
// 휴가구분 추가 (관리자) — { label, deduct_days, is_deductible, code? }
export function createLeaveType(payload) { return request('/leave-types/create', { method: 'POST', body: JSON.stringify(payload) }) }
// 휴가구분 삭제 (관리자) — 자동관리 항목(연차·시간연차)은 불가
export function deleteLeaveType(code) { return request(`/leave-types/${code}/delete`, { method: 'POST' }) }

// 근무시간 설정 (소정근로시간·근무요일) — 조회는 staff, 변경은 tab:settings
export function getSettings() { return request('/settings') }
export function updateSettings(payload) { return request('/settings/update', { method: 'POST', body: JSON.stringify(payload) }) }

// 공휴일 자동수집 (한국 공휴일 API) (관리자)
export function importHolidays(year) { return request(`/holidays/import?year=${year}`, { method: 'POST' }) }

// 휴가 캘린더 (월간) — tab:calendar 권한이 있으면 직원도 조회 가능
export function getCalendar(year, month) { return request(`/calendar?year=${year}&month=${month}`) }

// 공지사항 — 조회는 tab:notice, 작성·삭제는 edit:notice
export function getAnnouncements() { return request('/announcements') }
export function createAnnouncement(payload) { return request('/announcements', { method: 'POST', body: JSON.stringify(payload) }) }
export function deleteAnnouncement(id) { return request(`/announcements/${id}/delete`, { method: 'POST' }) }

// 권한 매트릭스 (master 전용)
export function getPermissions() { return request('/permissions') }
export function updatePermission(role, perm_key, allowed) { return request('/permissions/update', { method: 'POST', body: JSON.stringify({ role, perm_key, allowed }) }) }
// 관리자(역할) 관리 (master 전용)
export function getAdmins() { return request('/admins') }
export function upsertAdmin(email, role, note) { return request('/admins/upsert', { method: 'POST', body: JSON.stringify({ email, role, note }) }) }
export function deleteAdmin(email) { return request('/admins/delete', { method: 'POST', body: JSON.stringify({ email }) }) }

// 인사카드 (사원 상세 프로필)
// 메뉴 구성 (조회는 staff, 수정은 master)
export function getMenu() { return request('/menu') }
export function upsertMenuGroup(g) { return request('/menu/group/upsert', { method: 'POST', body: JSON.stringify(g) }) }
export function deleteMenuGroup(id) { return request('/menu/group/delete', { method: 'POST', body: JSON.stringify({ id }) }) }
export function updateMenuTab(t) { return request('/menu/tab/update', { method: 'POST', body: JSON.stringify(t) }) }

// 알림센터 (생일·입사기념일·계약/자격 만료)
export function getAlerts() { return request('/alerts') }
// 교육·자격 전 직원 조회
export function getTrainingOverview() { return request('/training-overview') }

export function getEmployeeDetail(id) { return request(`/employees/${id}/detail`) }
export function addProfileItem(id, item) { return request(`/employees/${id}/profile-items`, { method: 'POST', body: JSON.stringify(item) }) }
export function deleteProfileItem(id) { return request(`/profile-items/${id}/delete`, { method: 'POST' }) }
