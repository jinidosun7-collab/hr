// main.jsx
// React 앱의 '시작점'. App 컴포넌트를 화면(#root)에 그려준다.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// #root 엘리먼트를 찾아 그 안에 <App/> 을 그린다.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
