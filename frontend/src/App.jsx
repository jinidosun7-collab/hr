// App.jsx — 메뉴(그룹·항목)를 DB(menu_groups/menu_tabs)에서 읽어 사이드바로 구성.
// Master가 '권한 > 메뉴 구성'에서 바꾸면 즉시 반영된다. 권한(역할)에 따라 보이는 항목만 표시.
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import { getMe, getMenu } from './api.js'
import { setPerms, tabVisible, isMaster } from './perms.js'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import Calendar from './components/Calendar.jsx'
import EmployeeManager from './components/EmployeeManager.jsx'
import Profile from './components/Profile.jsx'
import LeaveStatus from './components/LeaveStatus.jsx'
import LeaveRecordManager from './components/LeaveRecordManager.jsx'
import AdjustAllowance from './components/AdjustAllowance.jsx'
import Settlement from './components/Settlement.jsx'
import Certificate from './components/Certificate.jsx'
import Settings from './components/Settings.jsx'
import Permissions from './components/Permissions.jsx'
import OrgChart from './components/OrgChart.jsx'
import Alerts from './components/Alerts.jsx'
import Training from './components/Training.jsx'
import MyLeave from './components/MyLeave.jsx'
import LeaveRequest from './components/LeaveRequest.jsx'
import Approvals from './components/Approvals.jsx'
import Attendance from './components/Attendance.jsx'
import Notice from './components/Notice.jsx'
import Clock from './components/Clock.jsx'
import ActivityLog from './components/ActivityLog.jsx'

// 탭키 -> 컴포넌트
const COMPONENTS = {
  dashboard: Dashboard, calendar: Calendar, employees: EmployeeManager, profile: Profile, certificate: Certificate,
  records: LeaveRecordManager, adjust: AdjustAllowance, status: LeaveStatus, settlement: Settlement,
  settings: Settings, permissions: Permissions, org: OrgChart, alerts: Alerts, training: Training,
  myleave: MyLeave, // 직원 본인 연차 화면 (이제 권한 매트릭스로 제어되는 정식 메뉴)
  leave_request: LeaveRequest, // 직원: 휴가 신청(전자결재)
  approvals: Approvals,        // 관리자: 결재함(승인/반려)
  attendance: Attendance,      // 관리자: 근태 현황(엑셀 업로드)
  notice: Notice,              // 전체: 공지사항(조회), 관리자: 작성·삭제
  clock: Clock,                // 직원: 출퇴근 기록(본인)
  log: ActivityLog,            // Master: 활동 로그(출퇴근·휴가 기록)
}
// 라벨 기본값(메뉴 설정이 비었을 때 대비)
const DEF_LABEL = { myleave: '내 연차', leave_request: '휴가 입력(결재)', approvals: '결재함', attendance: '근태 현황', dashboard: '대시보드', calendar: '캘린더', employees: '사원 관리', profile: '인사카드', certificate: '증명서', records: '휴가 입력', adjust: '조정·수당', status: '연차 현황', settlement: '정산서', settings: '설정', permissions: '권한', org: '조직도', alerts: '알림센터', training: '교육·자격', notice: '공지사항', clock: '출퇴근', log: '활동 로그' }
// 메뉴 아이콘 (MES와 동일한 통일감)
const ICONS = { myleave: '🌴', leave_request: '✍️', approvals: '✅', attendance: '⏰', dashboard: '📊', calendar: '📅', alerts: '🔔', employees: '👥', profile: '📇', certificate: '📄', org: '🏢', training: '🎓', records: '📝', adjust: '⚖️', status: '📈', settlement: '🧾', settings: '⚙️', permissions: '🔐', notice: '📢', clock: '🕘', log: '📋' }
const SITE_NAME = '지플랜 HR'
// DB 메뉴가 없을 때 폴백 구조 (개인 그룹은 직원 본인용)
const FALLBACK = [['개인', ['clock', 'myleave', 'leave_request']], ['현황', ['notice', 'dashboard', 'calendar']], ['근태', ['attendance']], ['인사', ['employees', 'profile', 'certificate']], ['연차', ['records', 'adjust', 'status', 'settlement', 'approvals']], ['설정', ['settings', 'permissions', 'log']]]

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [me, setMe] = useState(null)
  const [meError, setMeError] = useState('')
  const [menu, setMenu] = useState({ groups: [], tabs: [] })
  const [tab, setTab] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setMe(null); setMeError('') })
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) return
    getMe().then((m) => { setPerms(m); setMe(m) }).catch((e) => setMeError(e.message))
    getMenu().then(setMenu).catch(() => { /* 실패 시 폴백 사용 */ })
  }, [session])
  async function logout() { await supabase.auth.signOut() }

  if (checking) return <div className="container">불러오는 중...</div>
  if (!session) return <Login />
  const bar = (<div className="header-top"><h1>{SITE_NAME}</h1><div className="user-box"><span className="muted">{session.user?.email}</span><button className="logout" onClick={logout}>로그아웃</button></div></div>)
  if (!me && !meError) return <div className="container">{bar}권한 확인 중...</div>
  if (meError) return <div className="container">{bar}<p className="error">{meError}</p></div>
  if (me.role === 'none') return <div className="container">{bar}<p className="error">등록된 사원이 아닙니다.</p></div>

  // 직원도 더 이상 고정 화면이 아니라, 권한 매트릭스(직원 칸)에 체크된 메뉴만 보게 된다.
  // 기본값은 '내 연차'(myleave)만 켜져 있다. (DB role_permissions: employee tab:myleave=true)
  const canSee = (k) => {
    if (k === 'permissions') return isMaster()           // 권한 화면은 Master만
    if (k === 'log') return isMaster()                   // 활동 로그는 Master만
    // '내 연차'는 권한(직원 칸 체크) + 본인 사원기록 연결이 둘 다 있어야 표시.
    // 이렇게 해야 (1)직원 체크가 실제로 동작하고 (2)사원기록 없는 Master/관리자에게 빈 화면이 안 뜬다.
    if (k === 'myleave') return tabVisible('myleave') && !!me.employee_id
    // 휴가 신청도 본인 사원기록이 있어야(=실제 직원) 의미가 있다
    if (k === 'leave_request') return tabVisible('leave_request') && !!me.employee_id
    if (k === 'clock') return tabVisible('clock') && !!me.employee_id   // 출퇴근은 본인 사원기록 필요
    return tabVisible(k)                                  // 그 외는 매트릭스 권한대로
  }

  // 렌더용 그룹 목록 만들기 [{name, items:[[key,label]...]}]
  let renderGroups
  if (menu.groups.length) {
    const gs = [...menu.groups].sort((a, b) => a.sort_order - b.sort_order)
    const inGroup = (gid) => menu.tabs.filter((t) => t.group_id === gid && COMPONENTS[t.tab_key] && canSee(t.tab_key)).sort((a, b) => a.sort_order - b.sort_order).map((t) => [t.tab_key, t.label || DEF_LABEL[t.tab_key]])
    renderGroups = gs.map((g) => ({ name: g.name, items: inGroup(g.id) }))
    const ung = menu.tabs.filter((t) => !t.group_id && COMPONENTS[t.tab_key] && canSee(t.tab_key)).map((t) => [t.tab_key, t.label || DEF_LABEL[t.tab_key]])
    if (ung.length) renderGroups.push({ name: '미분류', items: ung })
  } else {
    renderGroups = FALLBACK.map(([name, keys]) => ({ name, items: keys.filter(canSee).map((k) => [k, DEF_LABEL[k]]) }))
  }
  renderGroups = renderGroups.filter((g) => g.items.length)

  const visibleKeys = renderGroups.flatMap((g) => g.items.map(([k]) => k))
  const effective = visibleKeys.includes(tab) ? tab : (visibleKeys[0] || 'dashboard')
  const Current = COMPONENTS[effective] || (() => <p className="muted">표시할 화면이 없습니다.</p>)
  const curLabel = (renderGroups.flatMap((g) => g.items).find(([k]) => k === effective) || [null, '메뉴'])[1]
  function pick(k) { setTab(k); setMenuOpen(false) }

  return (
    <div className="container wide">
      <header className="app-header">
        {bar}
        <button className="menu-toggle" onClick={() => setMenuOpen((o) => !o)}>☰ {curLabel}</button>
      </header>
      <div className="app-shell">
        <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
          <nav className="menu">
            {renderGroups.map((g) => (
              <div className="menu-group" key={g.name}>
                <div className="group-title">{g.name}</div>
                {g.items.map(([k, label]) => (
                  <button key={k} className={effective === k ? 'menu-item active' : 'menu-item'} onClick={() => pick(k)}><span className="ic">{ICONS[k] || '•'}</span>{label}</button>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="content"><Current myName={me.name} /></main>
      </div>
    </div>
  )
}
