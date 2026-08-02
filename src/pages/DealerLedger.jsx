import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, FileText, 
  ArrowUpRight, ArrowDownLeft, Wallet, Building2, 
  Calendar, ChevronRight, History, Receipt, ArrowRight,
  TrendingUp, Activity, CheckCircle, Clock, Phone, Shield, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../utils/api';

const DealerLedger = () => {
  const [ledgers, setLedgers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState({});
  const [stats, setStats] = useState({});
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [selectedDept, setSelectedDept] = useState('Insurance');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);
  
  const [filters, setFilters] = useState({
    dealerType: '',
    search: ''
  });

  const [newPayment, setNewPayment] = useState({
    dealer_id: '',
    department_type: 'Insurance',
    amount: '',
    payment_mode: 'PhonePe',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const filteredLedgers = React.useMemo(() => {
    return ledgers.filter(l => 
      l.dealer_name.toLowerCase().includes(filters.search.toLowerCase()) &&
      (filters.dealerType === '' || l.dealer_type.includes(filters.dealerType))
    );
  }, [ledgers, filters.search, filters.dealerType]);

  useEffect(() => {
    fetchInitialData();
    // Multi-PC Live Auto-Refresh (Poll every 5s)
    const interval = setInterval(fetchInitialData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dealers');
      setDealers(data || []);
      await fetchLedgers();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchLedgers = async () => {
    try {
      const { data } = await api.get('/ledgers/dealers');
      setLedgers(data || []);
    } catch (err) {}
  };

  // Stats are calculated dynamically from ledgers
  const calculateStats = React.useCallback(() => {
    let totalReceivable = 0;
    let totalReceived = 0;
    ledgers.forEach(l => {
      totalReceivable += (parseFloat(l.total_debit) || 0);
      totalReceived += (parseFloat(l.total_credit) || 0);
    });
    setStats({ totalReceivable, totalReceived });
  }, [ledgers]);

  useEffect(() => {
    calculateStats();
  }, [ledgers, calculateStats]);

  const fetchTransactions = async (dealer, dept) => {
    try {
      const { data } = await api.get(`/ledgers/transactions?dealerId=${dealer.id || dealer.dealer_id}&departmentType=${dept}`);
      setTransactions(data?.transactions || []);
      setLedgerSummary(data?.summary || {});
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLedger = async (dealer, dept = 'Insurance') => {
    setSelectedDealer(dealer);
    setSelectedDept(dept);
    await fetchTransactions(dealer, dept);
    setShowLedgerModal(true);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newPayment.dealer_id) { setFormError('Please select a dealer.'); return; }
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) { setFormError('Please enter a valid amount greater than 0.'); return; }
    
    setSubmitting(true);
    try {
      console.log('Attempting to save payment...', newPayment);
      const { data } = await api.post('/payments/dealer', newPayment);
      if (data.success || data.message) {
        setShowPaymentModal(false);
        setNewPayment({
          dealer_id: '',
          department_type: 'Insurance',
          amount: '',
          payment_mode: 'PhonePe',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        showToast('Payment saved successfully! Ledger updated.');
        fetchInitialData();
      } else {
        setFormError(data.error || 'An unknown error occurred. Please try again.');
      }
    } catch (err) {
      setFormError('Failed to save payment: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      await new Promise(r => setTimeout(r, 100));
      
      const data = transactions.map(t => ({
        'Date': t.created_at?.split('T')[0],
        'Type': t.transaction_type,
        'Details': t.notes,
        'Debit (Work)': t.debit,
        'Credit (Payment)': t.credit,
        'Balance': t.formatted_balance || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ledger");
      XLSX.writeFile(wb, `${selectedDealer.dealer_name}_${selectedDept}_Ledger.xlsx`);
      showToast('Export successful!');
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction? Ledger balances will be recalculated automatically.')) {
      try {
        const { data } = await api.delete(`/payments/dealer/${id}`);
        
        if (data.success || data.message) {
          showToast('Transaction deleted and ledger recalculated!');
          await fetchInitialData();
          await fetchTransactions(selectedDealer, selectedDept);
        } else {
          showToast('Failed to delete: ' + data.error, 'error');
        }
      } catch (err) {
        showToast('Error: ' + (err.response?.data?.error || err.message), 'error');
      }
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 100px)', paddingBottom: '40px' }}>
      {isExporting && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #F1F5F9', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '18px' }}>Generating Export...</p>
        </div>
      )}
      
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '16px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', animation: 'slideDown 0.3s ease-out', background: toast.type === 'success' ? '#16A34A' : '#DC2626', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />} {toast.message}
        </div>
      )}

      {/* ─── Header & Stats ─── */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#EEF2FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid #E0E7FF' }}>
              <Wallet size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Network Payments Overview</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Manage agent ledgers and financial transactions</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Receive Payment
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--border-color)', flex: 1, minWidth: '200px' }}>
            <div style={{ background: '#EEF2FF', color: 'var(--primary)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><History size={20} /></div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Dispatched Value</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>₹{stats.totalReceivable?.toLocaleString('en-IN') || 0}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--border-color)', flex: 1, minWidth: '200px' }}>
            <div style={{ background: '#F0FDF4', color: 'var(--success)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={20} /></div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Received</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>₹{stats.totalReceived?.toLocaleString('en-IN') || 0}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--border-color)', flex: 1, minWidth: '200px' }}>
            <div style={{ background: '#FFF7ED', color: 'var(--warning)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={20} /></div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Outstanding</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>₹{((stats.totalReceivable || 0) - (stats.totalReceived || 0)).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
          <input 
            type="text" 
            className="form-control"
            placeholder="Search Dealer Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%', borderRadius: '10px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', background: '#F8FAFC', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          {['', 'Main Dealer', 'ASC', 'FO'].map(type => (
            <button 
              key={type}
              className="btn" 
              style={{ 
                padding: '8px 16px', fontSize: '13px', borderRadius: '8px', fontWeight: 600, border: 'none',
                background: filters.dealerType === type ? '#fff' : 'transparent', 
                color: filters.dealerType === type ? 'var(--text-primary)' : 'var(--text-secondary)', 
                boxShadow: filters.dealerType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }} 
              onClick={() => setFilters({...filters, dealerType: type})}
            >
              {type === '' ? 'All Dealers' : type === 'FO' ? 'FO Points' : type}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Grid ─── */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#94A3B8' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #F1F5F9', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
            <p>Loading Financial Data...</p>
          </div>
        ) : filteredLedgers.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
            {filteredLedgers.map((dealer, idx) => (
              <div key={idx} style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                <div style={{ height: '4px', width: '100%', background: dealer.total_outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}></div>
                
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{dealer.dealer_name}</h3>
                    <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{dealer.dealer_type || 'General'}</span>
                  </div>
                  {dealer.mobile && <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {dealer.mobile}</div>}
                </div>

                <div style={{ padding: '0 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, marginBottom: '4px' }}>Opening</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: dealer.opening_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{Math.abs(dealer.opening_balance || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, marginBottom: '4px' }}>Dispatched</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>₹{(dealer.total_debit || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, marginBottom: '4px' }}>Payments</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>₹{(dealer.total_credit || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div style={{ background: dealer.total_outstanding > 0 ? '#FFF7ED' : '#F0FDF4', borderRadius: '12px', padding: '16px', border: `1px solid ${dealer.total_outstanding > 0 ? '#FFEDD5' : '#BBF7D0'}` }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Net Outstanding</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: dealer.total_outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>
                        ₹{Math.abs(dealer.total_outstanding || 0).toLocaleString('en-IN')}
                      </span>
                      {(dealer.is_dr || dealer.is_cr) && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: dealer.is_dr ? '#FFE4E6' : '#DCFCE7', color: dealer.is_dr ? '#E11D48' : '#16A34A' }}>
                          {dealer.is_dr ? 'DR' : 'CR'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px 20px', background: '#F8FAFC', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Last: {dealer.last_payment_date || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #E2E8F0', color: 'var(--primary)' }} onClick={() => handleOpenLedger(dealer, 'Insurance')}>
                      <Shield size={14} /> Insurance
                    </button>
                    <button className="btn" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #E2E8F0', color: 'var(--warning)' }} onClick={() => handleOpenLedger(dealer, 'RTO')}>
                      <FileText size={14} /> RTO
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '100px', background: 'var(--card-bg)', borderRadius: '16px', border: '2px dashed var(--border-color)', color: '#94A3B8' }}>
            <Wallet size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ margin: 0 }}>No dealers found matching your search.</p>
          </div>
        )}
      </div>

      {/* ─── Ledger Modal ─── */}
      {showLedgerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '1000px', height: '85vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ padding: '24px 32px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', background: '#F1F5F9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedDealer?.dealer_name}</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedDept} Ledger Statement</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="btn" style={{ padding: '8px 16px', borderRadius: '8px', background: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={exportToExcel}>
                  <Download size={16} /> Export Excel
                </button>
                <button className="btn" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }} onClick={() => setShowLedgerModal(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', background: '#F8FAFC', padding: '20px 32px', borderBottom: '1px solid #E2E8F0', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, marginBottom: '6px' }}>Work Done (Dr)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger)' }}>₹{transactions.reduce((acc, t) => acc + (parseFloat(t.debit) || 0), 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, marginBottom: '6px' }}>Payments (Cr)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>₹{transactions.reduce((acc, t) => acc + (parseFloat(t.credit) || 0), 0).toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: 'white', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, marginBottom: '4px' }}>Closing Balance</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: ledgerSummary?.is_dr ? 'var(--danger)' : ledgerSummary?.is_cr ? 'var(--success)' : 'var(--text-primary)' }}>
                    ₹{Math.abs(ledgerSummary?.closingBalance || 0).toLocaleString('en-IN')}
                  </span>
                  {(ledgerSummary?.is_dr || ledgerSummary?.is_cr) && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, background: ledgerSummary?.is_dr ? '#FFE4E6' : '#DCFCE7', color: ledgerSummary?.is_dr ? '#E11D48' : '#16A34A' }}>
                      {ledgerSummary.is_dr ? 'DR' : 'CR'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="table table-saas" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th>DATE</th>
                    <th>TYPE</th>
                    <th>DESCRIPTION</th>
                    <th style={{ textAlign: 'right' }}>DEBIT (DR)</th>
                    <th style={{ textAlign: 'right' }}>CREDIT (CR)</th>
                    <th style={{ textAlign: 'right' }}>BALANCE</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? transactions.map(t => (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{t.created_at?.split('T')[0]}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: t.transaction_type === 'Receivable' ? '#FEF2F2' : '#F0FDF4', color: t.transaction_type === 'Receivable' ? 'var(--danger)' : 'var(--success)' }}>
                          {t.transaction_type === 'Receivable' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {t.transaction_type}
                        </span>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.notes}</div>
                        {t.invoice_no && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>Inv: {t.invoice_no}</div>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{t.debit > 0 ? `₹${t.debit.toLocaleString('en-IN')}` : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{t.credit > 0 ? `₹${t.credit.toLocaleString('en-IN')}` : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        <span style={{ color: t.is_dr ? 'var(--danger)' : t.is_cr ? 'var(--success)' : 'var(--text-primary)' }}>
                          ₹{Math.abs(t.calculated_balance || 0).toLocaleString('en-IN')}
                        </span>
                        {(t.is_dr || t.is_cr) && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: t.is_dr ? '#FFE4E6' : '#DCFCE7', color: t.is_dr ? '#E11D48' : '#16A34A', marginLeft: '8px' }}>
                            {t.is_dr ? 'DR' : 'CR'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn" style={{ padding: '6px', borderRadius: '6px', background: '#FEF2F2', color: 'var(--danger)', border: 'none' }} title="Delete Entry" onClick={() => handleDeleteTransaction(t.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>No transactions found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Modal ─── */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', width: '500px', borderRadius: '24px', overflow: 'hidden', animation: 'slideUp 0.3s ease-out', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '24px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wallet size={20} color="var(--primary)" /> Receive Dealer Payment
              </h3>
              <button className="btn" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }} onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAddPayment} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }} className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Select Dealer</label>
                  <select required className="form-control" style={{ width: '100%', borderRadius: '8px', padding: '12px' }} value={newPayment.dealer_id} onChange={(e) => setNewPayment({...newPayment, dealer_id: e.target.value})}>
                    <option value="">Choose a Dealer...</option>
                    {dealers.filter(d => d.dealer_type && (d.dealer_type.includes('ASC') || d.dealer_type.includes('FO') || d.dealer_type.includes('Main Dealer'))).map(d => (
                      <option key={d.id} value={d.id}>{d.dealer_name} ({d.dealer_type})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Department</label>
                  <select className="form-control" style={{ width: '100%', borderRadius: '8px', padding: '12px' }} value={newPayment.department_type} onChange={(e) => setNewPayment({...newPayment, department_type: e.target.value})}>
                    <option value="Insurance">Insurance</option>
                    <option value="RTO">RTO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Payment Mode</label>
                  <select className="form-control" style={{ width: '100%', borderRadius: '8px', padding: '12px' }} value={newPayment.payment_mode} onChange={(e) => setNewPayment({...newPayment, payment_mode: e.target.value})}>
                    <option value="PhonePe">PhonePe</option>
                    <option value="GPay">GPay</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Amount (₹)</label>
                  <input type="number" step="0.01" required autoFocus placeholder="0.00" className="form-control" style={{ width: '100%', borderRadius: '8px', padding: '12px', fontSize: '18px', fontWeight: 700 }} value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Payment Date</label>
                  <input type="date" required className="form-control" style={{ width: '100%', borderRadius: '8px', padding: '12px' }} value={newPayment.date} onChange={(e) => setNewPayment({...newPayment, date: e.target.value})} />
                </div>
                <div style={{ gridColumn: 'span 2' }} className="form-group">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Additional Notes</label>
                  <textarea rows="2" placeholder="Transaction ID, Cheque No, etc." className="form-control" style={{ width: '100%', borderRadius: '8px', padding: '12px' }} value={newPayment.notes} onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}></textarea>
                </div>
              </div>
              
              <div style={{ marginTop: '32px' }}>
                {formError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--danger)', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginBottom: '16px' }}>{formError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <button type="button" className="btn" style={{ padding: '12px', borderRadius: '10px', background: '#F1F5F9', color: '#475569', fontWeight: 600, border: 'none' }} onClick={() => { setShowPaymentModal(false); setFormError(''); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '12px', borderRadius: '10px', fontWeight: 600 }} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Payment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default DealerLedger;
