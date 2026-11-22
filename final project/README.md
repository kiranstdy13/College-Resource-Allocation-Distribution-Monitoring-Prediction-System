# College Resource Allocation, Distribution, Monitoring and Demand Prediction System

A full-stack, institutional web application designed for managing, distributing, monitoring, and predicting college resources across academic departments (MCA, MBA, MTech) with centralized Admin governance, 6-month allocation cycles, and Machine Learning demand forecasting.

---

## 🏛️ Separate Portals Architecture

The system features three **completely independent, role-isolated portals** for Admin, HOD, and Staff. Each role has its own dedicated login page, registration page, and operational dashboard.

### 1. Main Landing Page (`/`)
- Professional institution landing page displaying the system title, real-time cycle status, and three dedicated portal entry cards.
- **Admin Portal Card:** Centralized college resource and departmental management.
- **HOD Portal Card:** Department resource requests, inventory and allocation tracking.
- **Staff Portal Card:** Department resource usage, damage reporting and maintenance.

### 2. Admin Portal
- **Login:** `/admin/login` (Admin ID or Official Email + Password)
- **Registration:** `/admin/register` (Requires institutional setup secret `COLLEGE_ADMIN_KEY_2026`)
- **Dashboard:** `/admin/dashboard`
- **User Authorization Console:** Review, approve, reject (with reason), or suspend pending HOD and Staff accounts.
- **Features:** Central inventory, 6-month cycle management, shortage analysis, atomic allocation, transfers, ML demand studio, audit logs.

### 3. HOD Portal
- **Login:** `/hod/login` (HOD ID or Official Email + Password)
- **Registration:** `/hod/register` (Creates a pending account; checks 1 active HOD per department limit)
- **Dashboard:** `/hod/dashboard`
- **Features:** Department student strength, 6-month demand submission, urgent mid-cycle requests, surplus transfers, equipment usage logs, AI demand forecasts.

### 4. Staff Portal
- **Login:** `/staff/login` (Staff ID or Official Email + Password)
- **Registration:** `/staff/register` (Creates a pending account; requires Admin / HOD authorization)
- **Dashboard:** `/staff/dashboard`
- **Features:** Department resource usage logging, damage and defect incident reports, maintenance tracking.

### 5. Common Utility Pages
- **Access Denied / Unauthorized:** `/unauthorized` (Displays current session info, role details, and buttons to return to the user's authorized dashboard or switch portals).
- **Password Recovery:** `/forgot-password` (Select role/portal, enter identifier, reset credentials).

---

## 🔒 Security & Role Authorization Rules

1. **Role Isolation:** Each login endpoint strictly validates the user's role against the database record (`user["role"].lower() == expected_role`). Cross-portal logins (e.g., an HOD attempting to log in at the Admin portal) are rejected with HTTP 403.
2. **Account Approval Workflow:**
   - Newly registered HOD and Staff accounts are created with `account_status: "pending"`.
   - Pending users cannot log in and receive an explicit approval notification upon login attempts.
   - Central Administrators review applications in the Admin Dashboard and approve, reject (with reason), or suspend accounts.
3. **Protected Admin Setup:**
   - Public users cannot create Admin accounts freely.
   - Admin registration requires the institutional authorization key (`COLLEGE_ADMIN_KEY_2026`) or an active authorized Admin session.
   - Standalone CLI setup script: `setup_admin.bat` or `python backend/seed_admin.py`.
4. **Token Verification:**
   - All backend requests verify JWT tokens with claims directly validated against the database.
   - Inactive or suspended accounts are immediately blocked from protected endpoints.

---

## 👥 Default Evaluation Credentials

| Role | Portal Login URL | ID / Email | Password | Scope |
|---|---|---|---|---|
| **Central Admin** | `/admin/login` | `ADM-001` or `admin@college.edu` | `Admin@123` | College-wide Central Warehouse |
| **HOD MCA** | `/hod/login` | `HOD-MCA-01` or `hod.mca@college.edu` | `Hod@123` | Department of Computer Applications |
| **HOD MBA** | `/hod/login` | `HOD-MBA-01` or `hod.mba@college.edu` | `Hod@123` | Department of Management Studies |
| **HOD MTech** | `/hod/login` | `HOD-MTC-01` or `hod.mtech@college.edu` | `Hod@123` | Department of Advanced Engineering |
| **Staff MCA** | `/staff/login` | `STF-MCA-01` or `staff.mca@college.edu` | `Staff@123` | MCA Lab Instructor |

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Lucide React |
| **Backend** | Python Flask, REST API, PyJWT, Werkzeug Security, Flask-CORS |
| **Database** | MongoDB / PyMongo (with persistent embedded fallback) |
| **Machine Learning** | Scikit-Learn, Pandas, NumPy, Joblib |

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) MongoDB local server running on `mongodb://localhost:27017`

### Quick Start (Windows)
1. Double-click `run_backend.bat` to launch the Flask REST API on `http://localhost:5000`.
2. Double-click `run_frontend.bat` to launch the React Vite frontend on `http://localhost:5173`.
3. Open `http://localhost:5173` in your browser.

### Manual Command Line Setup

#### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Reseed database with updated user schema and test data
python seed_data.py --force

# Retrain ML model pipelines
python ml/train_model.py

# Run verification test suites
python test_portals.py
python test_system.py

# Start Flask Backend Server (Port 5000)
python app.py
```

#### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Start Vite Development Server (Port 5173)
npm run dev
```

---

## 🧪 Testing the Portal Workflows

1. **Visit the Main Landing Page (`http://localhost:5173`):**
   - Click **Admin Login** -> navigates to `/admin/login`.
   - Click **HOD Login** -> navigates to `/hod/login`.
   - Click **Staff Login** -> navigates to `/staff/login`.
2. **Test Unauthorized Portal Protection:**
   - Log in as **Staff** (`staff.mca@college.edu` / `Staff@123`).
   - Manually enter `/admin/dashboard` in your browser URL bar.
   - The route guard intercepts the request and redirects to `/unauthorized` with your current session details and a button to return to your Staff dashboard.
3. **Test HOD / Staff Registration & Approval Workflow:**
   - Go to `/staff/register` and submit a new staff application (e.g. `STF-MCA-99`).
   - Notice the success message that the account is **pending approval**.
   - Attempt to log in at `/staff/login`: Login is prevented with `Your account is pending review and approval by an Administrator`.
   - Log in as Admin (`admin@college.edu` / `Admin@123`).
   - On the **Admin Dashboard**, locate the **User Registration Authorization** section.
   - Click **Approve** on the new staff record.
   - Return to `/staff/login`: The staff member can now log in successfully!
