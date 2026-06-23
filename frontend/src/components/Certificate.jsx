// Certificate.jsx — '증명서' 발급.
// 사원 데이터로 재직증명서·경력증명서·근로계약서를 자동 작성하고 인쇄/PDF로 출력한다.
// 회사 정보(회사명·대표·사업자번호·주소)는 이 브라우저에 저장(localStorage)되어 다음에도 유지된다.

import { useState, useEffect } from 'react'
import { getEmployees, getEmployeeDetail } from '../api.js'

const DOC_TYPES = [['employment', '재직증명서'], ['career', '경력증명서'], ['contract', '근로계약서']]

// 회사 정보 기본값 (대표님이 화면에서 한 번 채우면 저장됨)
const DEFAULT_COMPANY = { name: '지플랜', ceo: '', bizno: '', address: '' }
function loadCompany() { try { return { ...DEFAULT_COMPANY, ...JSON.parse(localStorage.getItem('oro_company') || '{}') } } catch (e) { return DEFAULT_COMPANY } }

export default function Certificate() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [emp, setEmp] = useState(null)
  const [items, setItems] = useState([])
  const [doc, setDoc] = useState('employment')
  const [purpose, setPurpose] = useState('제출용')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [company, setCompany] = useState(loadCompany())
  const [error, setError] = useState('')

  useEffect(() => { getEmployees().then((d) => { setEmployees(d); if (d.length) setEmployeeId(String(d[0].id)) }).catch((e) => setError(e.message)) }, [])
  useEffect(() => { if (employeeId) load() /* eslint-disable-line */ }, [employeeId])
  async function load() { setError(''); try { const d = await getEmployeeDetail(employeeId); setEmp(d.employee); setItems(d.items) } catch (e) { setError('조회 실패: ' + e.message) } }

  function saveCompany(c) { setCompany(c); try { localStorage.setItem('oro_company', JSON.stringify(c)) } catch (e) { /* 무시 */ } }
  const won = (n) => (n == null || n === '' ? '' : Number(n).toLocaleString() + '원')
  const careerItems = items.filter((it) => it.category === 'career')

  // 회사 서명 블록 (문서 하단 공통)
  const sign = (
    <div className="doc-foot">
      {issueDate}<br /><br />
      {company.name} {company.bizno && `(사업자등록번호: ${company.bizno})`}<br />
      {company.address && <>{company.address}<br /></>}
      대표이사 {company.ceo} (직인)
    </div>
  )

  return (
    <section>
      <div className="card no-print">
        <div className="search-bar">
          <label>사원<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label>문서<select value={doc} onChange={(e) => setDoc(e.target.value)}>{DOC_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label>발급일<input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
          {doc === 'employment' && <label>용도<input value={purpose} onChange={(e) => setPurpose(e.target.value)} /></label>}
          <button onClick={() => window.print()}>인쇄 / PDF</button>
        </div>
        {/* 회사 정보 (한 번 채우면 저장됨) */}
        <details>
          <summary>회사 정보 설정</summary>
          <div className="form-grid" style={{ marginTop: 8 }}>
            <label>회사명<input value={company.name} onChange={(e) => saveCompany({ ...company, name: e.target.value })} /></label>
            <label>대표자<input value={company.ceo} onChange={(e) => saveCompany({ ...company, ceo: e.target.value })} /></label>
            <label>사업자등록번호<input value={company.bizno} onChange={(e) => saveCompany({ ...company, bizno: e.target.value })} /></label>
            <label>회사 주소<input value={company.address} onChange={(e) => saveCompany({ ...company, address: e.target.value })} /></label>
          </div>
        </details>
      </div>
      {error && <p className="error no-print">{error}</p>}

      {emp && doc === 'employment' && (
        <div className="doc card">
          <h1 className="doc-title">재 직 증 명 서</h1>
          <table className="doc-info"><tbody>
            <tr><th>성명</th><td>{emp.name}</td><th>생년월일</th><td>{emp.birth_date || '-'}</td></tr>
            <tr><th>부서</th><td>{emp.department || '-'}</td><th>직위</th><td>{emp.position || '-'}</td></tr>
            <tr><th>주소</th><td colSpan={3}>{emp.address || '-'}</td></tr>
            <tr><th>입사일</th><td>{emp.hire_date}</td><th>재직상태</th><td>{emp.status}</td></tr>
          </tbody></table>
          <p style={{ marginTop: 20, lineHeight: 2 }}>위 사람은 현재 당사에 <strong>재직 중</strong>임을 증명합니다.</p>
          <p>용도: {purpose}</p>
          {sign}
        </div>
      )}

      {emp && doc === 'career' && (
        <div className="doc card">
          <h1 className="doc-title">경 력 증 명 서</h1>
          <table className="doc-info"><tbody>
            <tr><th>성명</th><td>{emp.name}</td><th>생년월일</th><td>{emp.birth_date || '-'}</td></tr>
            <tr><th>근무기간</th><td colSpan={3}>{emp.hire_date} ~ {emp.resign_date || '현재'}</td></tr>
            <tr><th>부서/직위</th><td colSpan={3}>{emp.department || '-'} / {emp.position || '-'}</td></tr>
          </tbody></table>
          {careerItems.length > 0 && (
            <table className="doc-table" style={{ marginTop: 12 }}>
              <thead><tr><th>회사/부서</th><th>직위/업무</th><th>시작</th><th>종료</th></tr></thead>
              <tbody>{careerItems.map((it) => <tr key={it.id}><td>{it.title}</td><td>{it.detail || '-'}</td><td>{it.date_from || '-'}</td><td>{it.date_to || '-'}</td></tr>)}</tbody>
            </table>
          )}
          <p style={{ marginTop: 20, lineHeight: 2 }}>위 사람은 상기와 같이 당사에 근무하였음을 증명합니다.</p>
          {sign}
        </div>
      )}

      {emp && doc === 'contract' && (
        <div className="doc card">
          <h1 className="doc-title">근 로 계 약 서</h1>
          <p><strong>사용자(갑)</strong>: {company.name} / 대표 {company.ceo} {company.address && `/ ${company.address}`}</p>
          <p><strong>근로자(을)</strong>: {emp.name} (생년월일 {emp.birth_date || '____'}) / {emp.address || '주소 ____'}</p>
          <p>아래와 같이 근로계약을 체결한다.</p>
          <ol style={{ lineHeight: 2 }}>
            <li>계약기간: {emp.contract_start || emp.hire_date} ~ {emp.contract_end || '기간의 정함이 없음'}</li>
            <li>근무장소: 회사가 정하는 장소</li>
            <li>업무내용: {emp.position || '회사가 정하는 업무'}</li>
            <li>소정근로시간: 09:00 ~ 18:00 (휴게시간 12:00~13:00)</li>
            <li>근무일/휴일: 주 5일 근무, 주휴일은 일요일</li>
            <li>임금: 월 {won(emp.monthly_wage) || '____'} (매월 지급)</li>
            <li>연차유급휴가: 근로기준법이 정하는 바에 따름</li>
            <li>기타: 본 계약에 정함이 없는 사항은 근로기준법 및 회사 취업규칙에 따름</li>
          </ol>
          <p className="doc-foot">{issueDate}<br /><br />
            (갑) {company.name} 대표 {company.ceo} (인)<br /><br />
            (을) {emp.name} (서명)
          </p>
        </div>
      )}
    </section>
  )
}
