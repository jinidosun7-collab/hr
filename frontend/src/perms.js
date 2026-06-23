// perms.js
// 로그인한 사람의 권한을 앱 전체에서 쉽게 확인하는 작은 모듈.
// App 이 로그인 직후 setPerms(me)를 한 번 호출해 권한을 저장하고,
// 각 화면은 can('act:...') / tabVisible('employees') 로 표시 여부를 판단한다.
// Master 는 항상 전체 허용(true).

let P = { master: false, set: {} }

export function setPerms(me) {
  P = { master: !!(me && me.is_master), set: (me && me.permissions) || {} }
}
// 작업 허용 여부 (예: can('act:employee_delete'))
export function can(key) { return P.master || !!P.set[key] }
// 탭(메뉴) 표시 여부 (예: tabVisible('employees'))
export function tabVisible(tab) { return P.master || !!P.set['tab:' + tab] }
export function isMaster() { return P.master }
