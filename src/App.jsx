import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { WifiOff, RefreshCcw } from 'lucide-react';
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
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import api from './utils/api';

function App() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const healthInterval = setInterval(async () => {
      try {
        const response = await api.get('/health');
        setIsConnected(response.status === 200);
      } catch (err) {
        setIsConnected(false);
      }
    }, 5000);

    return () => clearInterval(healthInterval);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected ERP Routes */}
          <Route path="/*" element={
            <ProtectedRoute isConnected={isConnected}>
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
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}


export default App;
