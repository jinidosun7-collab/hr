// MenuConfig.jsx — '메뉴 구성' 편집 (Master 전용, 권한 화면 안에 표시).
// 상위 그룹(폴더)의 이름·순서를 바꾸고, 각 메뉴 항목을 어느 그룹에 둘지·이름·순서를 정한다.

import { useState, useEffect } from 'react'
import { getMenu, upsertMenuGroup, deleteMenuGroup, updateMenuTab } from '../api.js'

export default function MenuConfig() {
  const [groups, setGroups] = useState([])
  const [tabs, setTabs] = useState([])
  const [error, setError] = useState('')
  const [newGroup, setNewGroup] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setError('')
    try { const d = await getMenu(); setGroups(d.groups); setTabs(d.tabs) } catch (e) { setError('불러오기 실패: ' + e.message) }
  }

  // 그룹 이름/순서 저장
  async function saveGroup(g, patch) {
    try { await upsertMenuGroup({ id: g.id, name: patch.name ?? g.name, sort_order: patch.sort_order ?? g.sort_order }); await load() }
    catch (e) { setError('그룹 저장 실패: ' + e.message) }
  }
  async function addGroup(e) {
    e.preventDefault(); if (!newGroup) return
    try { await upsertMenuGroup({ name: newGroup, sort_order: (groups.length + 1) }); setNewGroup(''); await load() }
    catch (e) { setError('그룹 추가 실패: ' + e.message) }
  }
  async function delGroup(g) {
    if (!window.confirm(`'${g.name}' 그룹을 삭제할까요? (속한 메뉴는 '미분류'로 이동)`)) return
    try { await deleteMenuGroup(g.id); await load() } catch (e) { setError('삭제 실패: ' + e.message) }
  }
  // 탭 그룹/이름/순서 저장
  async function saveTab(t, patch) {
    try { await updateMenuTab({ tab_key: t.tab_key, group_id: patch.group_id ?? t.group_id, label: patch.label ?? t.label, sort_order: patch.sort_order ?? t.sort_order }); await load() }
    catch (e) { setError('메뉴 저장 실패: ' + e.message) }
  }

  return (
    <div>
      <h2>메뉴 구성</h2>
      <p className="muted">상위 그룹(폴더)과 메뉴 항목의 이름·순서·소속을 바꿀 수 있습니다.</p>
      {error && <p className="error">{error}</p>}

      <h3>그룹 (상위 폴더)</h3>
      <table className="card">
        <thead><tr><th>그룹명</th><th>순서</th><th>관리</th></tr></thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id}>
              <td><input defaultValue={g.name} onBlur={(e) => e.target.value !== g.name && saveGroup(g, { name: e.target.value })} /></td>
              <td><input type="number" defaultValue={g.sort_order} style={{ width: 70 }} onBlur={(e) => Number(e.target.value) !== g.sort_order && saveGroup(g, { sort_order: Number(e.target.value) })} /></td>
              <td><button className="btn-sm btn-danger" onClick={() => delGroup(g)}>삭제</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="search-bar" onSubmit={addGroup} style={{ marginBottom: 16 }}>
        <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="새 그룹 이름 (예: 근태)" />
        <button type="submit">그룹 추가</button>
      </form>

      <h3>메뉴 항목 배치</h3>
      <table className="card">
        <thead><tr><th>메뉴명</th><th>소속 그룹</th><th>순서</th></tr></thead>
        <tbody>
          {tabs.map((t) => (
            <tr key={t.tab_key}>
              <td><input defaultValue={t.label || t.tab_key} onBlur={(e) => e.target.value !== t.label && saveTab(t, { label: e.target.value })} /></td>
              <td>
                <select value={t.group_id || ''} onChange={(e) => saveTab(t, { group_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">(미분류)</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </td>
              <td><input type="number" defaultValue={t.sort_order} style={{ width: 70 }} onBlur={(e) => Number(e.target.value) !== t.sort_order && saveTab(t, { sort_order: Number(e.target.value) })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
