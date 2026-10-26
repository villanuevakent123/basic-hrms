// ==============================================
// HRMS — FINAL FIXED VERSION
// Default Admin: admin / admin123
// ==============================================

const STORAGE = {
    employees: JSON.parse(localStorage.getItem('hrms_emp') || '[]'),
    attendance: JSON.parse(localStorage.getItem('hrms_att') || '[]'),
    leave: JSON.parse(localStorage.getItem('hrms_leave') || '[]'),
    accounts: JSON.parse(localStorage.getItem('hrms_accounts') || '[]'),

    ensureDefaultAdmin() {
        // Always ensure default admin exists
        const hasAdmin = this.accounts.some(a => a.role === 'admin');
        if (!hasAdmin) {
            this.accounts.unshift({
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                linkedEmpId: null
            });
            console.log('✅ Default admin created');
        }
    },

    resetAdmin() {
        // Remove all existing admins & add default
        this.accounts = this.accounts.filter(a => a.role !== 'admin');
        this.accounts.unshift({
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            linkedEmpId: null
        });
        this.save();
        alert('✅ Admin RESET!\n\nUsername: admin\nPassword: admin123');
        location.reload(true);
    },

    save() {
        localStorage.setItem('hrms_emp', JSON.stringify(this.employees));
        localStorage.setItem('hrms_att', JSON.stringify(this.attendance));
        localStorage.setItem('hrms_leave', JSON.stringify(this.leave));
        localStorage.setItem('hrms_accounts', JSON.stringify(this.accounts));
        console.log('💾 Data saved');
    }
};

// Force default admin on every load
STORAGE.ensureDefaultAdmin();

// Session
const SESSION = {
    currentUser: null,
    isAdmin() { return this.currentUser?.role === 'admin'; },
    getLinkedEmpId() { return this.currentUser?.linkedEmpId || null; },
    set(user) {
        this.currentUser = user;
        sessionStorage.setItem('hrms_session', JSON.stringify(user));
        console.log('✅ Session started:', user.username, user.role);
    },
    restore() {
        try {
            const data = sessionStorage.getItem('hrms_session');
            if (data) {
                this.currentUser = JSON.parse(data);
                return true;
            }
        } catch (e) { console.log('⚠️ Session restore failed'); }
        return false;
    },
    clear() {
        this.currentUser = null;
        sessionStorage.removeItem('hrms_session');
    }
};

// PH Rates
const PH_RATES = {
    sss: { ee: 0.045, threshold: 30000 },
    philhealth: { rate: 0.05, share: 0.5 },
    pagibig: { max: 200, rate: 0.02 },
    taxBrackets: [
        { min: 0, max: 25000, rate: 0 },
        { min: 25000, max: 40000, rate: 0.15, base: 0 },
        { min: 40000, max: 80000, rate: 0.20, base: 2250 },
        { min: 80000, max: 180000, rate: 0.25, base: 10250 },
        { min: 180000, max: 320000, rate: 0.30, base: 35250 },
        { min: 320000, max: 500000, rate: 0.32, base: 77250 },
        { min: 500000, max: Infinity, rate: 0.35, base: 134850 }
    ]
};

function formatDate(d = new Date()) { return d.toISOString().split('T')[0]; }
function formatTime(d = new Date()) { return d.toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'}); }
function currency(amt) { return new Intl.NumberFormat('en-PH', {style:'currency', currency:'PHP'}).format(amt); }
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }

function computePayroll(basic, daysWorked = 22) {
    const dailyRate = basic / 22;
    const taxable = basic;
    const sssEE = Math.min(basic, PH_RATES.sss.threshold) * PH_RATES.sss.ee;
    const philEE = (taxable * PH_RATES.philhealth.rate) * PH_RATES.philhealth.share;
    const pagEE = Math.min(basic * PH_RATES.pagibig.rate, PH_RATES.pagibig.max);
    let tax = 0;
    for (const b of PH_RATES.taxBrackets) {
        if (taxable > b.min && taxable <= b.max) {
            tax = ((taxable - b.min) * b.rate) + (b.base || 0);
            break;
        }
    }
    const totalDed = sssEE + philEE + pagEE + tax;
    return { basic, dailyRate, daysWorked, sssEE, philEE, pagEE, withholdingTax: tax, totalDeductions: totalDed, netPay: basic - totalDed };
}

// Show/Hide Screens
function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.body.classList.remove('is-admin');
}
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    if (SESSION.isAdmin()) {
        document.body.classList.add('is-admin');
        document.getElementById('user-role-display').textContent = 'Administrator';
    } else {
        document.body.classList.remove('is-admin');
        const emp = STORAGE.employees.find(e => e.id === SESSION.getLinkedEmpId());
        document.getElementById('user-role-display').textContent = emp ? `Employee: ${emp.name}` : 'Employee';
    }
    updateSelects();
    renderAll();
}

// LOGIN HANDLER — CLEAR & SIMPLE
document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    console.log('🔐 Login attempt:', username);
    console.log('📋 Accounts in system:', STORAGE.accounts);

    const user = STORAGE.accounts.find(a =>
        a.username === username && a.password === password
    );

    if (user) {
        console.log('✅ Login SUCCESS:', user);
        SESSION.set(user);
        showApp();
    } else {
        alert('❌ Login FAILED!\n\nUsername or password incorrect.\n\nClick "🔧 Reset Admin Account" below to reset to:\nUsername: admin\nPassword: admin123');
    }
});

document.getElementById('reset-admin-btn').addEventListener('click', () => {
    if (confirm('Reset admin account to:\n\nUsername: admin\nPassword: admin123\n\nThis will NOT delete your employees.')) {
        STORAGE.resetAdmin();
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    SESSION.clear();
    showLogin();
});

// Navigation
document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.section).classList.add('active');
        renderAll();
    });
});

// Dashboard
function renderDashboard() {
    document.getElementById('total-employees').textContent = STORAGE.employees.length;
    document.getElementById('active-employees').textContent = STORAGE.employees.filter(e => e.status === 'Active').length;
    document.getElementById('leave-pending').textContent = STORAGE.leave.filter(l => l.status === 'Pending').length;
    document.getElementById('payroll-month').textContent = new Date().toLocaleDateString('en-PH', {month:'long', year:'numeric'});
}

// Employees
function renderEmpTable() {
    const tbody = document.getElementById('emp-table-body');
    tbody.innerHTML = '';
    STORAGE.employees.forEach((emp, idx) => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(emp.id)}</td>
                <td>${escapeHtml(emp.name)}</td>
                <td>${escapeHtml(emp.position)}</td>
                <td>${currency(emp.salary)}</td>
                <td>${escapeHtml(emp.status)}</td>
                <td class="admin-col">
                    <button class="btn secondary" data-edit-emp="${idx}">Edit</button>
                    <button class="btn danger" data-del-emp="${idx}">Delete</button>
                </td>
            </tr>`;
    });
    tbody.querySelectorAll('[data-edit-emp]').forEach(b => b.addEventListener('click', () => editEmp(parseInt(b.dataset.editEmp))));
    tbody.querySelectorAll('[data-del-emp]').forEach(b => b.addEventListener('click', () => {
        if (confirm('Delete this employee?')) {
            STORAGE.employees.splice(parseInt(b.dataset.delEmp), 1);
            STORAGE.save(); renderEmpTable(); updateSelects(); renderDashboard();
        }
    }));
}

function openEmpModal() {
    document.getElementById('emp-modal').style.display = 'flex';
    document.getElementById('emp-modal-title').textContent = 'Add Employee';
    document.getElementById('emp-form').reset();
    document.getElementById('edit-emp-id').value = '';
}
function editEmp(idx) {
    const emp = STORAGE.employees[idx];
    document.getElementById('emp-modal').style.display = 'flex';
    document.getElementById('emp-modal-title').textContent = 'Edit Employee';
    document.getElementById('edit-emp-id').value = idx;
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-pos').value = emp.position;
    document.getElementById('emp-salary').value = emp.salary;
    document.getElementById('emp-status').value = emp.status;
}
document.querySelector('.close-btn').onclick = () => document.getElementById('emp-modal').style.display = 'none';
document.getElementById('add-emp-btn')?.addEventListener('click', openEmpModal);
document.getElementById('emp-form').addEventListener('submit', e => {
    e.preventDefault();
    const idx = document.getElementById('edit-emp-id').value;
    const empData = {
        id: idx === '' ? `EMP${String(STORAGE.employees.length + 1).padStart(3,'0')}` : STORAGE.employees[parseInt(idx)].id,
        name: document.getElementById('emp-name').value.trim(),
        position: document.getElementById('emp-pos').value.trim(),
        salary: parseFloat(document.getElementById('emp-salary').value),
        status: document.getElementById('emp-status').value
    };
    if (idx === '') STORAGE.employees.push(empData);
    else STORAGE.employees[parseInt(idx)] = empData;
    STORAGE.save();
    document.getElementById('emp-modal').style.display = 'none';
    renderEmpTable(); updateSelects(); renderDashboard();
});

// Dropdowns
function updateSelects() {
    const opts = STORAGE.employees.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join('');
    ['att-emp-select','leave-emp','payroll-emp','link-emp-id'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const extra = id === 'link-emp-id' ? '<option value="">— Not Linked —</option>' : '<option value="">Select Employee</option>';
        sel.innerHTML = extra + opts;
    });
    if (!SESSION.isAdmin()) {
        const emp = STORAGE.employees.find(e => e.id === SESSION.getLinkedEmpId());
        if (emp) {
            const nameField = document.getElementById('leave-emp-name-display');
            if (nameField) nameField.value = emp.name;
        }
    }
}

// Attendance
function renderAttendance() {
    const tbody = document.getElementById('att-table-body');
    let records = STORAGE.attendance.slice();
    if (!SESSION.isAdmin()) records = records.filter(r => r.empId === SESSION.getLinkedEmpId());
    tbody.innerHTML = '';
    records.reverse().forEach(r => {
        const emp = STORAGE.employees.find(e => e.id === r.empId);
        const hours = r.timeOut ? ((new Date(`${r.date}T${r.timeOut}`) - new Date(`${r.date}T${r.timeIn}`)) / 3600000).toFixed(2) : '—';
        tbody.innerHTML += `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(emp?.name || 'Unknown')}</td><td>${escapeHtml(r.timeIn)}</td><td>${escapeHtml(r.timeOut || '—')}</td><td>${hours}</td></tr>`;
    });
}
document.getElementById('time-in-btn')?.addEventListener('click', () => {
    const empId = SESSION.isAdmin() ? document.getElementById('att-emp-select').value : SESSION.getLinkedEmpId();
    if (!empId) return alert('Select employee or link account first');
    STORAGE.attendance.push({ empId, date: formatDate(), timeIn: formatTime() });
    STORAGE.save(); renderAttendance();
});
document.getElementById('time-out-btn')?.addEventListener('click', () => {
    const empId = SESSION.isAdmin() ? document.getElementById('att-emp-select').value : SESSION.getLinkedEmpId();
    if (!empId) return alert('Select employee or link account first');
    const rec = STORAGE.attendance.filter(r => r.empId === empId && r.date === formatDate() && !r.timeOut).pop();
    if (!rec) return alert('No active Time In found');
    rec.timeOut = formatTime();
    STORAGE.save(); renderAttendance();
});

// Leave
function renderLeave() {
    const tbody = document.getElementById('leave-table-body');
    let records = STORAGE.leave.slice();
    if (!SESSION.isAdmin()) records = records.filter(r => r.empId === SESSION.getLinkedEmpId());
    tbody.innerHTML = '';
    records.forEach((lv) => {
        const emp = STORAGE.employees.find(e => e.id === lv.empId);
        const realIdx = STORAGE.leave.indexOf(lv);
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(emp?.name || 'Unknown')}</td>
                <td>${escapeHtml(lv.type)}</td>
                <td>${escapeHtml(lv.start)} to ${escapeHtml(lv.end)}</td>
                <td>${escapeHtml(lv.status)}</td>
                <td class="admin-col">
                    ${lv.status === 'Pending' ? `
                        <button class="btn primary" data-approve="${realIdx}">Approve</button>
                        <button class="btn danger" data-reject="${realIdx}">Reject</button>
                    ` : 'Processed'}
                </td>
            </tr>`;
    });
    tbody.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => {
        STORAGE.leave[parseInt(b.dataset.approve)].status = 'Approved';
        STORAGE.save(); renderLeave(); renderDashboard();
    }));
    tbody.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => {
        STORAGE.leave[parseInt(b.dataset.reject)].status = 'Rejected';
        STORAGE.save(); renderLeave(); renderDashboard();
    }));
}
document.getElementById('leave-form').addEventListener('submit', e => {
    e.preventDefault();
    const empId = SESSION.isAdmin() ? document.getElementById('leave-emp').value : SESSION.getLinkedEmpId();
    if (!empId) return alert('Employee not linked to this account');
    STORAGE.leave.push({
        empId, type: document.getElementById('leave-type').value,
        start: document.getElementById('leave-start').value,
        end: document.getElementById('leave-end').value,
        status: 'Pending'
    });
    STORAGE.save(); e.target.reset(); renderLeave(); renderDashboard();
    alert('✅ Leave request submitted');
});

// Payroll
function showPayslip(emp, payPeriod) {
    const res = computePayroll(emp.salary, 22);
    const slip = document.getElementById('payslip-result');
    slip.style.display = 'block';
    slip.innerHTML = `
        <h3>Payslip — ${escapeHtml(payPeriod)}</h3>
        <p><strong>Employee:</strong> ${escapeHtml(emp.name)} (${escapeHtml(emp.id)}) — ${escapeHtml(emp.position)}</p>
        <hr style="border:0; border-top:1px solid #334155; margin:12px 0;">
        <div class="row"><span>Basic Monthly Salary</span><span>${currency(res.basic)}</span></div>
        <div class="row"><span>Daily Rate</span><span>${currency(res.dailyRate)}</span></div>
        <div class="row"><span>Days Worked</span><span>${res.daysWorked}</span></div>
        <br>
        <h4>Deductions</h4>
        <div class="row"><span>SSS</span><span>${currency(res.sssEE)}</span></div>
        <div class="row"><span>PhilHealth</span><span>${currency(res.philEE)}</span></div>
        <div class="row"><span>Pag-IBIG</span><span>${currency(res.pagEE)}</span></div>
        <div class="row"><span>Withholding Tax</span><span>${currency(res.withholdingTax)}</span></div>
        <div class="row total"><span>Total Deductions</span><span>- ${currency(res.totalDeductions)}</span></div>
        <div class="row total"><span>NET PAY</span><span style="color:var(--success); font-size:1.3rem;">${currency(res.netPay)}</span></div>
        <p style="margin-top:16px; font-size:0.85rem; color:var(--muted);">2026 PH rates — system-generated</p>`;
}
document.getElementById('compute-btn')?.addEventListener('click', () => {
    const empId = document.getElementById('payroll-emp').value;
    const payPeriod = document.getElementById('pay-period').value;
    if (!empId || !payPeriod) return alert('Complete all fields');
    const emp = STORAGE.employees.find(e => e.id === empId);
    if (!emp) return;
    showPayslip(emp, payPeriod);
});
document.getElementById('emp-view-payslip-btn')?.addEventListener('click', () => {
    const empId = SESSION.getLinkedEmpId();
    const payPeriod = document.getElementById('emp-pay-period').value;
    if (!empId || !payPeriod) return alert('Select pay period');
    const emp = STORAGE.employees.find(e => e.id === empId);
    if (!emp) return alert('Employee record not found');
    showPayslip(emp, payPeriod);
});

// Accounts
function renderAccountsTable() {
    const tbody = document.getElementById('accounts-table-body');
    tbody.innerHTML = '';
    STORAGE.accounts.forEach((acc, idx) => {
        const linkedEmp = STORAGE.employees.find(e => e.id === acc.linkedEmpId);
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(acc.username)}</td>
                <td>${escapeHtml(linkedEmp?.name || '— Not Linked —')}</td>
                <td>${acc.role === 'admin' ? 'Administrator' : 'Employee'}</td>
                <td>
                    <button class="btn secondary" data-edit-acc="${idx}">Edit</button>
                    ${acc.username !== 'admin' ? `<button class="btn danger" data-del-acc="${idx}">Delete</button>` : ''}
                </td>
            </tr>`;
    });
    tbody.querySelectorAll('[data-edit-acc]').forEach(b => b.addEventListener('click', () => editAccount(parseInt(b.dataset.editAcc))));
    tbody.querySelectorAll('[data-del-acc]').forEach(b => b.addEventListener('click', () => {
        if (confirm('Delete this account?')) {
            STORAGE.accounts.splice(parseInt(b.dataset.delAcc), 1);
            STORAGE.save(); renderAccountsTable();
        }
    }));
}
function openAccountModal() {
    document.getElementById('account-modal').style.display = 'flex';
    document.getElementById('account-modal-title').textContent = 'Create User Account';
    document.getElementById('account-form').reset();
    document.getElementById('edit-account-idx').value = '';
}
function editAccount(idx) {
    const acc = STORAGE.accounts[idx];
    document.getElementById('account-modal').style.display = 'flex';
    document.getElementById('account-modal-title').textContent = 'Edit Account';
    document.getElementById('edit-account-idx').value = idx;
    document.getElementById('new-username').value = acc.username;
    document.getElementById('new-role').value = acc.role;
    document.getElementById('link-emp-id').value = acc.linkedEmpId || '';
}
document.querySelector('.close-account-btn').onclick = () => document.getElementById('account-modal').style.display = 'none';
document.getElementById('add-account-btn')?.addEventListener('click', openAccountModal);
document.getElementById('account-form').addEventListener('submit', e => {
    e.preventDefault();
    const idx = document.getElementById('edit-account-idx').value;
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;
    const linkedEmpId = document.getElementById('link-emp-id').value || null;

    if ((idx === '' && STORAGE.accounts.some(a => a.username === username)) ||
        (idx !== '' && STORAGE.accounts.some((a, i) => i !== parseInt(idx) && a.username === username))) {
        return alert('❌ Username already exists');
    }
    const accData = {
        username,
        password: password || (idx !== '' ? STORAGE.accounts[parseInt(idx)].password : ''),
        role, linkedEmpId
    };
    if (!accData.password) return alert('❌ Password is required');
    if (idx === '') STORAGE.accounts.push(accData);
    else STORAGE.accounts[parseInt(idx)] = accData;
    STORAGE.save();
    document.getElementById('account-modal').style.display = 'none';
    renderAccountsTable();
});

// Export
function toCSV(rows) {
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
}
function downloadCSV(content, filename) {
    const blob = new Blob([content], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}
document.getElementById('export-emp')?.addEventListener('click', () => {
    const rows = [['ID','Name','Position','Basic Salary','Status']];
    STORAGE.employees.forEach(e => rows.push([e.id, e.name, e.position, e.salary, e.status]));
    downloadCSV(toCSV(rows), `employees-${formatDate()}.csv`);
});
document.getElementById('export-att')?.addEventListener('click', () => {
    const rows = [['Date','Employee','Time In','Time Out']];
    STORAGE.attendance.forEach(r => {
        const emp = STORAGE.employees.find(e => e.id === r.empId);
        rows.push([r.date, emp?.name || 'Unknown', r.timeIn, r.timeOut || '']);
    });
    downloadCSV(toCSV(rows), `attendance-${formatDate()}.csv`);
});

// Master Render
function renderAll() {
    if (!SESSION.currentUser) return;
    renderDashboard();
    renderEmpTable();
    renderAttendance();
    renderLeave();
    renderAccountsTable();
}

// INIT
if (SESSION.restore()) {
    showApp();
} else {
    showLogin();
}
