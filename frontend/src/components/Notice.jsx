// Notice.jsx — '공지사항' (전체 조회).
// 모든 로그인 사용자가 공지를 볼 수 있고, 편집 권한(edit:notice)이 있는 관리자·매니저는 작성·삭제할 수 있다.

import { useState, useEffect } from 'react'
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../api.js'
import { canEdit as canEditPerm } from '../perms.js'

export default function Notice() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ title: '', body: '' })
  const [busy, setBusy] = useState(false)
  const canWrite = canEditPerm('notice')

  useEffect(() => { load() }, [])
  async function load() {
    setError('')
    try { setList(await getAnnouncements()) } catch (e) { setError('공지 조회 실패: ' + e.message) }
  }

  async function submit(e) {
    e.preventDefault(); setError(''); setMsg('')
    if (!form.title.trim()) { setError('제목을 입력하세요.'); return }
    setBusy(true)
    try { await createAnnouncement({ title: form.title.trim(), body: form.body }); setForm({ title: '', body: '' }); setMsg('공지를 등록했습니다.'); await load() }
    catch (e) { setError('등록 실패: ' + e.message) } finally { setBusy(false) }
  }
  async function del(a) {
    if (!window.confirm('이 공지를 삭제할까요?')) return
    try { await deleteAnnouncement(a.id); await load() } catch (e) { setError('삭제 실패: ' + e.message) }
  }

  const fmtDate = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '')

  return (
    <section>
      <h2>공지사항</h2>
      <p className="muted">전 직원이 함께 보는 공지 공간입니다.{canWrite ? ' 아래에서 새 공지를 작성할 수 있습니다.' : ''}</p>
      {error && <p className="error">{error}</p>}
      {msg && <p className="muted" style={{ color: '#1aa260' }}>{msg}</p>}

      {canWrite && (
        <form className="card form-grid" onSubmit={submit}>
          <label>제목<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="공지 제목" /></label>
          <label style={{ gridColumn: '1 / -1' }}>내용<textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} style={{ width: '100%' }} placeholder="공지 내용" /></label>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? '등록 중...' : '공지 등록'}</button></div>
        </form>
      )}

      {list.length === 0 ? <p className="muted">등록된 공지가 없습니다.</p> : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((a) => (
            <div className="card" key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <h3 style={{ margin: 0 }}>{a.title}</h3>
                {canWrite && <button className="btn-sm btn-danger" onClick={() => del(a)}>삭제</button>}
              </div>
              {a.body && <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 4px' }}>{a.body}</p>}
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>{fmtDate(a.created_at)}{a.created_by ? ` · ${a.created_by}` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
