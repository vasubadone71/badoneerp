# BADONE RTO & INSURANCE ERP

> **Enterprise Dealership Operations & Financial Ledger Suite**  
> Custom built for **Badone Motors** to manage customer master entries, RTO processing, insurance differences, agent commissions, and multi-tier dealer ledger networks (Main Dealer, ASCs, and FO Points).

---

## 🏛️ System Architecture

The application is built on a high-performance **Electron + Vite + React** hybrid architecture, delivering a native desktop performance combined with a premium, responsive user interface.

```mermaid
graph TD
    %% Frontend / Renderer Process
    subgraph Renderer ["React 19 Frontend (Vite)"]
        UI[User Interface Components]
        State[React State & Memoized Selectors]
        ViteDev[Vite Server: Port 5179]
    end

    %% Preload Context Bridge
    subgraph ContextBridge ["Electron Preload Bridge"]
        API[window.api exposing secure IPC Renderer channels]
    end

    %% Backend / Main Process
    subgraph MainProcess ["Electron Main Process"]
        IPC[IPC Main Event Listeners]
        Backup[Backup & Restore Utility]
        
        subgraph Database ["SQLite Database (better-sqlite3)"]
            Engine[(badone_erp.db)]
            WAL[WAL Journal Mode]
            FK[Foreign Key Constraints]
        end
    end

    %% Connections
    UI <--> State
    UI <--> API
    API <--> IPC
    IPC <--> Engine
    IPC <--> Backup
    ViteDev -.-> UI
```

---

## 🗄️ Database Schema & Data Model

The backend runs an optimized **SQLite** engine utilizing the `better-sqlite3` driver. The engine operates in **Write-Ahead Logging (WAL)** mode for concurrent high-speed operations and enforces strict **Foreign Key Constraints** for data integrity.

### Entity Relationship Diagram
```mermaid
erDiagram
    settings {
        INTEGER id PK
        TEXT machine_id
        BOOLEAN auto_backup
        TEXT company_name
        TEXT address
        TEXT gst
        TEXT contact_info
        TEXT last_backup_time
    }

    network_locations {
        INTEGER id PK
        TEXT dealer_name
        TEXT dealer_type
        TEXT address
        TEXT mobile
        TEXT gst_no
        TEXT contact_person
        TEXT status
    }

    master_entries {
        INTEGER id PK
        TEXT s_no
        INTEGER location_id FK
        TEXT invoice_no
        TEXT invoice_date
        TEXT customer_name
        TEXT father_name
        TEXT mobile_number
        TEXT address
        TEXT vehicle_model
        TEXT vehicle_color
        TEXT frame_no
        TEXT engine_no
    }

    insurance_details {
        INTEGER id PK
        INTEGER master_entry_id FK
        TEXT policy_no
        REAL insurance_price_list
        REAL insurance_actual_deducted
        REAL insurance_difference
        REAL penalty_charges
        TEXT policy_start_date
        TEXT policy_expiry_date
        TEXT insurance_deducted_date
        BOOLEAN zero_def
        BOOLEAN third_party
        TEXT status
        TEXT document_path
        TEXT document_name
        TEXT document_upload_date
    }

    rto_details {
        INTEGER id PK
        INTEGER master_entry_id FK
        TEXT registration_no
        REAL rto_price_list
        REAL rto_actual_deducted
        REAL rto_difference
        REAL vid_feeding_charge
        REAL penalty_charges
        TEXT rto_deducted_date
        TEXT status
        TEXT document_path
        TEXT document_name
        TEXT document_upload_date
    }

    agent_commissions {
        INTEGER id PK
        INTEGER master_entry_id FK
        TEXT department_type
        TEXT assigned_agent
        TEXT commission_type
        REAL amount
        TEXT status
        TEXT notes
        TEXT paid_date
    }

    dealer_payment_ledgers {
        INTEGER id PK
        INTEGER dealer_id FK
        TEXT department_type
        REAL current_balance
    }

    dealer_transactions {
        INTEGER id PK
        INTEGER dealer_id FK
        TEXT department_type
        TEXT transaction_type
        INTEGER master_entry_id FK
        REAL amount
        REAL debit
        REAL credit
        REAL running_balance
        TEXT payment_mode
        TEXT notes
        TEXT created_at
    }

    dealer_monthly_balances {
        INTEGER id PK
        INTEGER dealer_id FK
        TEXT department_type
        INTEGER month
        INTEGER year
        REAL opening_balance
        REAL closing_balance
    }

    backup_history {
        INTEGER id PK
        TEXT backup_date
        TEXT filename
    }

    network_locations ||--o{ master_entries : "hosts"
    master_entries ||--|| insurance_details : "has"
    master_entries ||--|| rto_details : "has"
    master_entries ||--o{ agent_commissions : "tracks"
    network_locations ||--o{ dealer_payment_ledgers : "tracks balance"
    network_locations ||--o{ dealer_transactions : "owns"
    master_entries ||--o{ dealer_transactions : "references"
    network_locations ||--o{ dealer_monthly_balances : "summarizes"
```

---

## Unified Multi-Tier Ledger Rules

The ERP handles both internal and external operations using a unified bookkeeping method. Network locations are classified into three types:
1. **Main Dealer** (Internal accounts, showroom insurance, self-hosted RTO entries)
2. **ASC Dealers** (Authorized Service Centers)
3. **FO Points** (Franchise Outlets)

### Ledger Posting Flow Chart
```mermaid
flowchart TD
    Start([Customer Master Entry Created]) --> LocationCheck{Check Dealer Type}
    LocationCheck -->|Main Dealer / ASC / FO| AutoProfile[Create Insurance & RTO Profiles]
    
    AutoProfile --> WorkDone{Work Completed & Status Updated}
    
    WorkDone -->|Insurance Done| CalcIns[Calculate difference: Price List - Actual]
    WorkDone -->|RTO Done| CalcRTO[Calculate difference: Price List - Actual + Fees]
    
    CalcIns --> PostLedger[Atomic Ledger Posting via Transaction]
    CalcRTO --> PostLedger
    
    PostLedger --> GetRunning[Fetch Latest Running Balance for Dealer & Dept]
    GetRunning --> NewBal[New Balance = Last Balance + Debit - Credit]
    NewBal --> DB_Trans[Insert dealer_transactions entry]
    DB_Trans --> DB_Ledger[Upsert current_balance in dealer_payment_ledgers]
    
    LocationCheck2{Is Main Dealer?}
    WorkDone --> LocationCheck2
    LocationCheck2 -->|Yes| SyncComm[Insert/Update Agent Commissions - Teerth/Vasu]
    LocationCheck2 -->|No| SkipComm[Direct Ledger Posting only]
```

### Key Accounting Algorithms
* **Insurance Ledger Entry**: Triggered when status is set to `Completed`. The `insurance_price_list` amount represents the outstanding bill (debit) charged to the dealer, while `insurance_difference` handles commissions.
* **RTO Ledger Entry**: Triggered when status is set to `Completed`. The RTO debit is computed as `rto_price_list` (which already covers registrations, feeding charges, and standard operational costs).
* **Payment Deposit / Adjustment**: Handled via the *Receive Dealer Payment Modal*. Adjustments decrease the outstanding debit (`running_balance` decreases by the credit amount).

---

## 📦 Directory Tree Layout

```
badone-erp/
├── electron/
│   ├── database.js          # SQLite WAL schema, table definitions, and indexes
│   ├── ipcHandlers.js       # Main process IPC logic (completions, ledger posting, reports)
│   ├── main.js              # Electron window instantiation, lifecycle, and backup engines
│   └── preload.js           # Context bridge exposing secure channels to window.api
├── src/
│   ├── assets/              # Icons, styling tokens, and static media
│   ├── components/          # Reusable UI elements (Navigation, Modals, Export Widgets)
│   ├── pages/
│   │   ├── Dashboard.jsx    # Unified dashboard metrics grid (5 columns)
│   │   ├── MasterEntry.jsx  # Customer Processing Desk (Customer registration form)
│   │   ├── Insurance.jsx    # Insurance tracking, status toggles, document uploaders
│   │   ├── RTO.jsx          # RTO desk tracking registration feeds & documents
│   │   ├── DealerLedger.jsx # Network Payments Overview, Ledger grids & Payment receiving
│   │   ├── Commission.jsx   # Teerth & Vasu Agent Commission lists and synchronization
│   │   ├── Network.jsx      # Dealer profile registration hub
│   │   ├── Reports.jsx      # Departmental reporting export deck
│   │   └── Settings.jsx     # Backup and restoration tools
│   ├── utils/
│   │   └── export.js        # jsPDF, jsPDF-autotable, and SheetJS (XLSX) wrappers
│   ├── App.jsx              # Main React layout, state control, and page router
│   ├── index.css            # Premium custom CSS stylesheets, HSL vars, animations
│   └── main.jsx             # React DOM loader
├── package.json             # Manifest file containing Electron-Builder & dependency definitions
└── vite.config.js           # Vite React 19 dev server options (Port 5179)
```

---

## 🚀 Developer Operations & Build Guides

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** (comes bundled with Node.js)
* **C++ Build Tools** (Required on Windows to compile native bindings for `better-sqlite3`)

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 2. Run in Development Mode
Launch the Vite asset dev server (port 5179) and Electron simultaneously:
```bash
npm run electron:dev
```

### 3. Linting Checks
To run the ESLint analyzer across modified workspace components:
```bash
npm run lint
```

### 4. Compiling & Packaging (Portable Windows Build)
To compile frontend bundles and package the entire ERP as a single, portable Windows executable installer using `electron-builder`:
```bash
npm run electron:build
```
Once complete, the built executable installer will be available inside the `/dist_electron` directory.

---

## 🛡️ Data Backup & Restoration Policy

The system implements a dual-safety backup layout:
1. **Auto-Backup Trigger**: Whenever a significant transaction occurs or the database is loaded, an automatic snapshot is saved to local storage.
2. **Manual Restore Hub**: Located in the *Settings Desk*. Allows importing external database backup files (`.db`) securely. The application handles SQLite lock prevention and database connection closures atomic-style before overwriting the file.
