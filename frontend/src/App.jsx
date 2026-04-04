import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import QRPage from './pages/QRPage';
import Emergency from './pages/Emergency';

const ProtectedRoute = ({ children }) => {
  if (!localStorage.getItem('medqr_token')) {
    return <Navigate to="/auth" />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/qr" element={
          <ProtectedRoute>
            <QRPage />
          </ProtectedRoute>
        } />
        <Route path="/emergency/:id" element={<Emergency />} />
      </Routes>
    </BrowserRouter>
  );
}
