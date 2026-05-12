import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import MasterEntry from './pages/MasterEntry';
import Insurance from './pages/Insurance';
import RTO from './pages/RTO';
import Network from './pages/Network';
import Commission from './pages/Commission';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Reminders from './pages/Reminders';
import DealerLedger from './pages/DealerLedger';

function App() {
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      if (window.api) {
        const auth = await window.api.verifyMachineId();
        setIsAuthorized(auth);
      } else {
        setIsAuthorized(true); // Development fallback
      }
    }
    checkAuth();
  }, []);

  if (isAuthorized === false) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: 'var(--honda-red)' }}>ACCESS DENIED</h1>
          <p>This machine is not authorized to run Badone RTO & Insurance ERP.</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === null) return null;

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="content-area">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/master" element={<MasterEntry />} />
              <Route path="/insurance" element={<Insurance />} />
              <Route path="/rto" element={<RTO />} />
              <Route path="/network" element={<Network />} />
              <Route path="/commission" element={<Commission />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/ledger" element={<DealerLedger />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
