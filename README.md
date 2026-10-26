# Basic HRMS — Philippines Edition
A lightweight, fully functional Human Resource Management System with **Admin & Employee Login System**.
Built with pure HTML/CSS/JavaScript — no database server required to start.

## 🔐 User Roles & Permissions

| Feature | Admin | Employee |
|---|---|---|
| Dashboard Overview | ✅ Full | ✅ Own view |
| Add/Edit/Delete Employees | ✅ Yes | ❌ No |
| Create User Accounts | ✅ Yes | ❌ No |
| Time In/Out (all employees) | ✅ Yes | ✅ Only yourself |
| View Attendance | ✅ All | ✅ Only your records |
| File Leave Request | ✅ For anyone | ✅ Only yourself |
| Approve/Reject Leave | ✅ Yes | ❌ No |
| Generate Payslips (all) | ✅ Yes | ❌ No |
| View Your Payslip | ✅ Yes | ✅ Yes |
| Export CSV Reports | ✅ Yes | ❌ No |
| Manage User Accounts | ✅ Yes | ❌ No |

### Default Admin
- Username: `admin`
- Password: `admin123`
- ⚠️ **Change this after first login!**

## ✨ Features
- 🔑 **Secure Login System** — role-based access control
- 👥 **Employee Management** — add, edit, delete, track status
- ⏰ **Attendance Logging** — Time In / Time Out
- 📅 **Leave Management** — file requests, approve/reject workflow
- 💰 **PH Payroll Calculator** — SSS, PhilHealth, Pag-IBIG, Withholding Tax (2026 rates)
- 📄 **Payslip Generation** — employee self-service view
- 📊 **CSV Export Reports** — admin only
- 📱 **Responsive Design** — works on phones, tablets, desktops
- 💾 **Auto-Save** — data persists in browser storage

## 🚀 Quick Start
1. Clone or download this repo
2. Open `index.html` in any modern browser
3. Sign in with default admin or create your own
4. **Step 1:** Add your employees
5. **Step 2:** Go to **User Accounts** → create employee accounts linked to their records
6. Done! Employees can sign in and access their portal

## 🔗 How to Create Employee Accounts
1. Login as Admin
2. Go to **User Accounts** → **+ Create User Account**
3. Enter username & password
4. Select Role = **Employee**
5. **Link to Employee Record** → select their name from the list
6. Save — they can now login with limited access

## 🧮 PH Payroll Formulas (2026)
- SSS: 4.5% employee share (capped at ₱30,000)
- PhilHealth: 5% annual premium, equally shared
- Pag-IBIG: 2% capped at ₱200/month
- Withholding Tax: BIR graduated monthly table

## 📂 Structure
