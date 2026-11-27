import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import ScanPage from './pages/ScanPage';
import VerifyPage from './pages/VerifyPage';
import IdentityPage from './pages/IdentityPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar no-print">
        <div className="brand">NCC Cadet Registration & Verification</div>
        <nav>
          <NavLink to="/register">Register</NavLink>
          <NavLink to="/scan">Scan</NavLink>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/identity/:id" element={<IdentityPage />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </main>
    </div>
  );
}
