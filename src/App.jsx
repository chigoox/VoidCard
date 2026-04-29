import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './Pages/Layout'
import HomePage from './Pages/HomePage'
import StorePageV2 from './Pages/StorePageV2'
import UserProfilePage from './Pages/UserProfilePage'
import SettingsPage from './Pages/SettingsPage'
import CardRedirectPage from './Pages/CardRedirectPage'
import AnalyticsPage from './Pages/AnalyticsPage'
import LoginLitePage from './Pages/LoginLitePage'
import ProtectedRoute from './Pages/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="store" element={<ProtectedRoute><StorePageV2 /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="u/:username" element={<UserProfilePage />} />
          <Route path="c/:cardId" element={<CardRedirectPage />} />
          <Route path="analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="login" element={<LoginLitePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
