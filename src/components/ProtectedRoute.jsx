import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { WifiOff, RefreshCcw } from 'lucide-react';

const ProtectedRoute = ({ children, isConnected }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        {!isConnected && (
          <div style={{ background: '#d32f2f', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1000 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <WifiOff size={18} />
              <span style={{ fontWeight: 500 }}>Network Connection Lost: Cannot reach shared database drive.</span>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              style={{ background: 'white', color: '#d32f2f', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
              <RefreshCcw size={14} /> Retry Connection
            </button>
          </div>
        )}
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;
