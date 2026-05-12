const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  verifyMachineId: () => ipcRenderer.invoke('verify-machine-id'),
  
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  
  getDealers: () => ipcRenderer.invoke('get-dealers'),
  addDealer: (dealer) => ipcRenderer.invoke('add-dealer', dealer),
  updateDealer: (dealer) => ipcRenderer.invoke('update-dealer', dealer),
  deleteDealer: (id) => ipcRenderer.invoke('delete-dealer', id),
  
  getMasterEntries: () => ipcRenderer.invoke('get-master-entries'),
  getMasterManagement: () => ipcRenderer.invoke('get-master-management'),
  addMasterEntry: (entry) => ipcRenderer.invoke('add-master-entry', entry),
  deleteMasterEntry: (id) => ipcRenderer.invoke('delete-master-entry', id),
  
  
  updateMasterEntry: (entry) => ipcRenderer.invoke('update-master-entry', entry),
  
  getInsuranceDetails: () => ipcRenderer.invoke('get-insurance-details'),
  updateInsurance: (data) => ipcRenderer.invoke('update-insurance', data),
  getRtoDetails: () => ipcRenderer.invoke('get-rto-details'),
  updateRto: (data) => ipcRenderer.invoke('update-rto', data),
  getCommissions: (filters) => ipcRenderer.invoke('get-commissions', filters),
  syncCommissions: () => ipcRenderer.invoke('sync-commissions'),
  
  createBackup: () => ipcRenderer.invoke('create-backup'),
  restoreBackup: () => ipcRenderer.invoke('restore-backup'),
  getBackupHistory: () => ipcRenderer.invoke('get-backup-history'),
  
  uploadDocument: (data) => ipcRenderer.invoke('upload-document', data),

  // Dealer Payment Ledger APIs
  getDealerLedgers: (filters) => ipcRenderer.invoke('get-dealer-ledgers', filters),
  getDealerTransactions: (filters) => ipcRenderer.invoke('get-dealer-transactions', filters),
  addDealerPayment: (payment) => ipcRenderer.invoke('add-dealer-payment', payment),
  getLedgerDashboardStats: () => ipcRenderer.invoke('get-ledger-dashboard-stats'),
  deleteDealerTransaction: (id) => ipcRenderer.invoke('delete-dealer-transaction', id),
  closeMonth: (data) => ipcRenderer.invoke('close-month', data),
  factoryReset: () => ipcRenderer.invoke('factory-reset'),

  invoke: (channel, data) => ipcRenderer.invoke(channel, data)
});
