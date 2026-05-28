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
      await fetchStats();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchLedgers = async () => {
    try {
      const { data } = await api.get('/ledgers');
      setLedgers(data || []);
    } catch (err) {}
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/dashboard');
      // For now fallback to dashboard stats, ledgers stat should be there.
      // Wait, dashboard stats returns `dealers` object. Let's use ledgers stats.
      setStats(data?.dealers || {});
    } catch (err) {}
  };

  const fetchTransactions = async (dealer, dept) => {
    try {
      const { data } = await api.get(`/ledgers/${dealer.id || dealer.dealer_id}?departmentType=${dept}`);
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
      setFormError('Failed to communicate with the backend: ' + err.message);
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
    <div className="dealer-ledger-container">
      {isExporting && (
        <div className="export-overlay">
          <div className="loader-spinner"></div>
          <p>Generating Large Export... Please Wait</p>
        </div>
      )}
      
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
      <div className="ledger-overview-header">
        <div className="overview-title-row">
          <h1 className="main-title">Network Payments Overview</h1>
          <button className="btn-receive-payment" onClick={() => setShowPaymentModal(true)}>
            <Plus size={18} /> Receive Payment
          </button>
        </div>

        <div className="overview-stats-grid">
          <div className="overview-card red-theme">
            <div className="icon-box"><History size={24} /></div>
            <div className="stats">
              <span className="label">Total Dispatched Value</span>
              <span className="value">₹{stats.totalReceivable?.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="overview-card green-theme">
            <div className="icon-box"><Wallet size={24} /></div>
            <div className="stats">
              <span className="label">Total Received</span>
              <span className="value">₹{stats.totalReceived?.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="overview-card orange-theme">
            <div className="icon-box"><Clock size={24} /></div>
            <div className="stats">
              <span className="label">Total Outstanding</span>
              <span className="value">₹{(stats.totalReceivable - stats.totalReceived)?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search Dealer Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          <button className={`chip ${filters.dealerType === '' ? 'active' : ''}`} onClick={() => setFilters({...filters, dealerType: ''})}>All Dealers</button>
          <button className={`chip ${filters.dealerType === 'Main Dealer' ? 'active' : ''}`} onClick={() => setFilters({...filters, dealerType: 'Main Dealer'})}>Main Dealers</button>
          <button className={`chip ${filters.dealerType === 'ASC' ? 'active' : ''}`} onClick={() => setFilters({...filters, dealerType: 'ASC'})}>ASC Dealers</button>
          <button className={`chip ${filters.dealerType === 'FO' ? 'active' : ''}`} onClick={() => setFilters({...filters, dealerType: 'FO'})}>FO Points</button>
        </div>
      </div>

      <div className="dealer-grid">
        {loading ? (
          <div className="loading-state">
            <div className="loader-spinner"></div>
            <p>Loading Financial Data...</p>
          </div>
        ) : filteredLedgers.length > 0 ? filteredLedgers.map((dealer, idx) => (
          <div className={`dealer-card premium-card ${dealer.total_outstanding > 0 ? 'outstanding' : 'cleared'}`} key={idx}>
            <div className="card-accent-bar"></div>
            
            <div className="card-header">
              <div className="dealer-main-info">
                <h3 className="dealer-name">{dealer.dealer_name}</h3>
                <span className="dealer-type-badge">{dealer.dealer_type || 'General'}</span>
              </div>
              <div className="dealer-meta">
                {dealer.mobile && <span className="contact-info"><Phone size={11} /> {dealer.mobile}</span>}
              </div>
            </div>

            <div className="card-financials">
              <div className="fin-grid">
                <div className="fin-box">
                  <span className="fin-label">Opening</span>
                  <span className={`fin-value ${dealer.opening_balance > 0 ? 'text-red' : 'text-green'}`}>
                    ₹{Math.abs(dealer.opening_balance).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="fin-box">
                  <span className="fin-label">Dispatched</span>
                  <span className="fin-value">₹{dealer.total_debit?.toLocaleString('en-IN')}</span>
                </div>
                <div className="fin-box">
                  <span className="fin-label">Payments</span>
                  <span className="fin-value text-green">₹{dealer.total_credit?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="outstanding-display">
                <div className="out-content">
                  <span className="out-title">Net Outstanding</span>
                  <div className="out-main-value">
                    <span className={`amount ${dealer.is_dr ? 'text-red' : dealer.is_cr ? 'text-green' : ''}`}>
                      ₹{Math.abs(dealer.total_outstanding || 0).toLocaleString('en-IN')}
                    </span>
                    {(dealer.is_dr || dealer.is_cr) && (
                      <span className={`status-tag ${dealer.is_dr ? 'dr' : 'cr'}`}>
                        {dealer.is_dr ? 'DR' : 'CR'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-actions-row">
              <div className="last-seen">
                <Clock size={11} /> Last: {dealer.last_payment_date}
              </div>
              <div className="action-buttons-group">
                <button className="btn-ledger insurance" onClick={() => handleOpenLedger(dealer, 'Insurance')}>
                  <Shield size={13} /> Insurance
                </button>
                <button className="btn-ledger rto" onClick={() => handleOpenLedger(dealer, 'RTO')}>
                  <FileText size={13} /> RTO
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="empty-state-container">
            <p>No dealers found matching your search.</p>
          </div>
        )}
      </div>

      {showLedgerModal && (
        <div className="modal-overlay">
          <div className="ledger-modal">
            <div className="modal-header premium">
              <div className="header-info">
                <div className="brand-logo-circle">
                  <Building2 size={24} color="white" />
                </div>
                <div>
                  <h2>{selectedDealer.dealer_name}</h2>
                  <p className="subtitle">{selectedDept} Ledger Statement • Overall Status</p>
                </div>
              </div>
              <div className="header-actions">
                <button className="btn-export-excel" onClick={exportToExcel}>
                  <Download size={16} /> Export Excel
                </button>
                <button className="btn-close-circle" onClick={() => setShowLedgerModal(false)}>&times;</button>
              </div>
            </div>

            <div className="modal-summary-bar">
              <div className="sum-item">
                <span className="sum-label">Work Done (Dr)</span>
                <span className="sum-value text-red">₹{transactions.reduce((acc, t) => acc + t.debit, 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="sum-item">
                <span className="sum-label">Payments (Cr)</span>
                <span className="sum-value text-green">₹{transactions.reduce((acc, t) => acc + t.credit, 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="sum-item highlighted">
                <span className="sum-label">Closing Balance</span>
                <span className={`sum-value ${ledgerSummary?.is_dr ? 'text-red' : ledgerSummary?.is_cr ? 'text-green' : ''}`}>
                  ₹{Math.abs(ledgerSummary?.closingBalance || 0).toLocaleString('en-IN')}
                  {(ledgerSummary?.is_dr || ledgerSummary?.is_cr) && (
                    <span className={`status-tag ${ledgerSummary.is_dr ? 'dr' : 'cr'}`} style={{marginLeft: '8px', verticalAlign: 'middle'}}>
                      {ledgerSummary.is_dr ? 'DR' : 'CR'}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="modal-body">
              <table className="premium-ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ref / Type</th>
                    <th>Description</th>
                    <th className="text-right">Debit (Dr)</th>
                    <th className="text-right">Credit (Cr)</th>
                    <th className="text-right">Running Balance</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? transactions.map(t => (
                    <tr key={t.id}>
                      <td className="date-cell">{t.created_at?.split('T')[0]}</td>
                      <td>
                        <div className={`tx-type-badge ${t.transaction_type.toLowerCase()}`}>
                          {t.transaction_type === 'Receivable' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {t.transaction_type}
                        </div>
                      </td>
                      <td className="desc-cell">
                        {t.notes}
                        {t.invoice_no && <span className="invoice-tag">Inv: {t.invoice_no}</span>}
                      </td>
                      <td className="text-right text-red font-semibold">
                        {t.debit > 0 ? `₹${t.debit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="text-right text-green font-semibold">
                        {t.credit > 0 ? `₹${t.credit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="text-right balance-cell">
                        <span className={t.is_dr ? 'text-red' : t.is_cr ? 'text-green' : ''}>
                          ₹{Math.abs(t.calculated_balance || 0).toLocaleString('en-IN')}
                        </span>
                        {(t.is_dr || t.is_cr) && (
                          <span className={`status-tag ${t.is_dr ? 'dr' : 'cr'}`} style={{marginLeft: '5px'}}>
                            {t.is_dr ? 'DR' : 'CR'}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <button className="btn-delete-tx" title="Delete Entry" onClick={() => handleDeleteTransaction(t.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="empty-table-msg">No transactions found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <h3><Wallet size={20} /> Receive Dealer Payment</h3>
              <button className="btn-close" onClick={() => setShowPaymentModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddPayment} className="payment-form">
              <div className="form-grid">
                <div className="form-group full">
                  <label>Select Dealer</label>
                  <select 
                    required
                    value={newPayment.dealer_id}
                    onChange={(e) => setNewPayment({...newPayment, dealer_id: e.target.value})}
                  >
                    <option value="">Choose a Dealer...</option>
                    {dealers.filter(d => d.dealer_type.includes('ASC') || d.dealer_type.includes('FO') || d.dealer_type.includes('Main Dealer')).map(d => (
                      <option key={d.id} value={d.id}>{d.dealer_name} ({d.dealer_type})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select 
                    value={newPayment.department_type}
                    onChange={(e) => setNewPayment({...newPayment, department_type: e.target.value})}
                  >
                    <option value="Insurance">Insurance</option>
                    <option value="RTO">RTO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Mode</label>
                  <select 
                    value={newPayment.payment_mode}
                    onChange={(e) => setNewPayment({...newPayment, payment_mode: e.target.value})}
                  >
                    <option value="PhonePe">PhonePe</option>
                    <option value="GPay">GPay</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    autoFocus
                    placeholder="0.00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    className="amount-input"
                  />
                </div>
                <div className="form-group">
                  <label>Payment Date</label>
                  <input 
                    type="date" 
                    required 
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                  />
                </div>
                <div className="form-group full">
                  <label>Additional Notes</label>
                  <textarea 
                    rows="2"
                    placeholder="Transaction ID, Cheque No, etc."
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>
              <div className="modal-actions">
                {formError && (
                  <div className="form-error-banner">{formError}</div>
                )}
                <div className="action-buttons">
                  <button type="button" className="btn-cancel" onClick={() => { setShowPaymentModal(false); setFormError(''); }}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={submitting}>
                    {submitting ? '⏳ Saving...' : '💾 Save Payment & Update Ledger'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .dealer-ledger-container {
          padding: 20px;
          background: #f8f9fa;
          min-height: 100vh;
        }
        .ledger-overview-header { margin-bottom: 30px; }
        .overview-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .main-title { font-size: 24px; font-weight: 700; color: #2c3e50; }
        .btn-receive-payment { background: var(--honda-red); color: white; border: none; padding: 10px 20px; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(211, 47, 47, 0.2); }
        .overview-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .export-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(5px); }
        .export-overlay p { margin-top: 15px; font-weight: 700; color: #2c3e50; }
        .overview-card { background: white; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 5px solid #ddd; }
        .overview-card.red-theme { border-left-color: #d32f2f; }
        .overview-card.green-theme { border-left-color: #388e3c; }
        .overview-card.orange-theme { border-left-color: #f57c00; }
        .icon-box { width: 50px; height: 50px; background: #f8f9fa; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #555; }
        .red-theme .icon-box { color: #d32f2f; background: rgba(211, 47, 47, 0.1); }
        .green-theme .icon-box { color: #388e3c; background: rgba(56, 142, 60, 0.1); }
        .orange-theme .icon-box { color: #f57c00; background: rgba(245, 124, 0, 0.1); }
        .stats .label { font-size: 13px; color: #7f8c8d; display: block; }
        .stats .value { font-size: 22px; font-weight: 800; color: #2c3e50; }
        .filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
        .search-input { display: flex; align-items: center; gap: 10px; background: #f1f3f4; padding: 8px 15px; border-radius: 8px; width: 300px; }
        .search-input input { border: none; background: transparent; outline: none; width: 100%; font-size: 14px; }
        .filter-chips { display: flex; gap: 10px; }
        .chip { border: 1px solid #ddd; background: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .chip.active { background: var(--honda-red); color: white; border-color: var(--honda-red); }
        .dealer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .dealer-card.premium-card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); transition: all 0.3s ease; border: 1px solid #f0f0f0; position: relative; display: flex; flex-direction: column; }
        .dealer-card.premium-card:hover { transform: translateY(-8px); box-shadow: 0 15px 35px rgba(0,0,0,0.1); border-color: #e0e0e0; }
        .card-accent-bar { height: 4px; width: 100%; background: #eee; }
        .outstanding .card-accent-bar { background: linear-gradient(90deg, #d32f2f, #ff5252); }
        .cleared .card-accent-bar { background: linear-gradient(90deg, #388e3c, #66bb6a); }
        .card-header { padding: 20px 20px 15px; display: flex; justify-content: space-between; align-items: flex-start; }
        .dealer-name { font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 0; line-height: 1.2; }
        .dealer-type-badge { font-size: 10px; background: #f1f3f4; padding: 2px 8px; border-radius: 4px; color: #5f6368; font-weight: 700; text-transform: uppercase; margin-top: 4px; display: inline-block; }
        .contact-info { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
        .card-financials { padding: 0 20px 20px; flex: 1; }
        .fin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; background: #fcfcfc; padding: 12px; border-radius: 12px; border: 1px solid #f5f5f5; }
        .fin-box { display: flex; flex-direction: column; gap: 2px; }
        .fin-label { font-size: 10px; text-transform: uppercase; color: #999; font-weight: 600; }
        .fin-value { font-size: 13px; font-weight: 700; color: #2c3e50; }
        .outstanding-display { background: #fff; border-radius: 12px; padding: 15px; border: 1px solid #f0f0f0; position: relative; overflow: hidden; }
        .outstanding .outstanding-display { background: rgba(211, 47, 47, 0.02); border-color: rgba(211, 47, 47, 0.1); }
        .cleared .outstanding-display { background: rgba(56, 142, 60, 0.02); border-color: rgba(56, 142, 60, 0.1); }
        .out-title { font-size: 11px; font-weight: 600; color: #888; margin-bottom: 5px; display: block; }
        .out-main-value { display: flex; align-items: baseline; gap: 8px; }
        .out-main-value .amount { font-size: 22px; font-weight: 800; }
        .status-tag { font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 800; }
        .status-tag.dr { background: #ffe9e9; color: #d32f2f; }
        .status-tag.cr { background: #e9f7ef; color: #27ae60; }
        .card-actions-row { padding: 15px 20px; background: #fcfcfc; border-top: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; }
        .last-seen { font-size: 11px; color: #aaa; display: flex; align-items: center; gap: 4px; }
        .action-buttons-group { display: flex; gap: 8px; }
        .btn-ledger { padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .btn-ledger.insurance { background: white; border: 1.5px solid #1a73e8; color: #1a73e8; }
        .btn-ledger.rto { background: white; border: 1.5px solid #f57c00; color: #f57c00; }
        .btn-ledger.insurance:hover { background: #1a73e8; color: white; }
        .btn-ledger.rto:hover { background: #f57c00; color: white; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .payment-modal { background: white; width: 500px; border-radius: 20px; overflow: hidden; animation: slideUp 0.3s ease-out; }
        .ledger-modal { background: white; width: 90%; max-width: 1000px; height: 80vh; border-radius: 20px; display: flex; flex-direction: column; animation: slideUp 0.3s ease-out; }
        .modal-header.premium { padding: 25px; background: linear-gradient(135deg, #1a2a6c, #b21f1f); color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: none; }
        .brand-logo-circle { width: 45px; height: 45px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .header-info h2 { font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
        .header-info .subtitle { margin: 0; opacity: 0.8; font-size: 13px; font-weight: 500; }
        .btn-export-excel { background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: transform 0.2s; }
        .btn-export-excel:hover { transform: scale(1.05); }
        .btn-close-circle { background: rgba(255,255,255,0.2); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; }
        .modal-summary-bar { display: grid; grid-template-columns: 1fr 1fr 1.2fr; background: #f8f9fa; padding: 15px 25px; border-bottom: 1px solid #eee; gap: 20px; }
        .sum-item { display: flex; flex-direction: column; }
        .sum-label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 700; margin-bottom: 4px; }
        .sum-value { font-size: 18px; font-weight: 700; color: #2c3e50; }
        .sum-item.highlighted { background: white; padding: 10px 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #eee; }
        .sum-item.highlighted .sum-value { color: #b21f1f; }
        .premium-ledger-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .premium-ledger-table thead th { position: sticky; top: 0; background: #fff; z-index: 10; padding: 15px; text-align: left; font-size: 12px; text-transform: uppercase; color: #999; font-weight: 700; border-bottom: 2px solid #f1f1f1; }
        .premium-ledger-table tbody td { padding: 14px 15px; border-bottom: 1px solid #f8f9fa; font-size: 14px; color: #444; vertical-align: middle; }
        .premium-ledger-table tbody tr:hover { background: #fcfcfc; }
        .date-cell { font-weight: 500; color: #666; font-size: 13px; }
        .tx-type-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .tx-type-badge.receivable { background: #ffe9e9; color: #d32f2f; }
        .tx-type-badge.payment { background: #e9f7ef; color: #27ae60; }
        .desc-cell { color: #555; }
        .invoice-tag { display: block; font-size: 11px; color: #999; margin-top: 2px; font-family: monospace; }
        .balance-cell { font-weight: 700; color: #2c3e50; }
        .btn-delete-tx { background: #fff5f5; color: #d32f2f; border: 1px solid #ffebee; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .btn-delete-tx:hover { background: #d32f2f; color: white; transform: scale(1.1); }
        .empty-table-msg { padding: 50px !important; text-align: center; color: #999; font-style: italic; }
        .payment-form { padding: 25px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group.full { grid-column: span 2; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; font-size: 14px; background: #fcfcfc; transition: border-color 0.2s; }
        .form-group input:focus { border-color: var(--honda-red); outline: none; }
        .amount-input { font-size: 18px !important; font-weight: 700; color: #2c3e50; }
        .modal-body { flex: 1; overflow-y: auto; padding: 20px; }
        .btn-cancel { padding: 12px; border-radius: 10px; border: 1px solid #ddd; background: #eee; cursor: pointer; font-weight: 600; }
        .btn-submit { padding: 12px; border-radius: 10px; border: none; background: var(--honda-red); color: white; cursor: pointer; font-weight: 700; }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge.receivable { background: rgba(211, 47, 47, 0.1); color: #d32f2f; }
        .badge.payment { background: rgba(56, 142, 60, 0.1); color: #388e3c; }
        .modal-actions { margin-top: 25px; }
        .action-buttons { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-top: 10px; }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-error-banner { background: rgba(211, 47, 47, 0.08); border: 1px solid rgba(211, 47, 47, 0.3); color: #d32f2f; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 5px; }
        .toast-notification { position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 14px 22px; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: 0 8px 30px rgba(0,0,0,0.15); animation: slideDown 0.3s ease-out; }
        .toast-notification.success { background: #388e3c; color: white; }
        .toast-notification.error { background: #d32f2f; color: white; }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .loading-state { grid-column: 1 / -1; text-align: center; padding: 60px; color: #999; font-size: 16px; }
        .text-red { color: #d32f2f !important; }
        .text-green { color: #27ae60 !important; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .text-right { text-align: right; }
        .empty-state-container { grid-column: 1 / -1; text-align: center; padding: 100px; background: #f8f9fa; border-radius: 20px; border: 2px dashed #eee; color: #999; }
        .loader-spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--honda-red); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default DealerLedger;
