// Data Store — persists in browser localStorage
const STORAGE = {
    employees: JSON.parse(localStorage.getItem('hrms_emp') || '[]'),
    attendance: JSON.parse(localStorage.getItem('hrms_att') || '[]'),
    leave: JSON.parse(localStorage.getItem('hrms_leave') || '[]'),
    save() {
        localStorage.setItem('hrms_emp', JSON.stringify(this.employees));
        localStorage.setItem('hrms_att', JSON.stringify(this.attendance));
        localStorage.setItem('hrms_leave', JSON.stringify(this.leave));
    }
};

// PH Payroll Constants (2026 rates)
const PH_RATES = {
    sss: { ee: 0.045, er: 0.075, threshold: 30000 },
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

// Helpers
function formatDate(d = new Date()) { return d.toISOString().split('T')[0]; }
function formatTime(d = new Date()) { return d.toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'}); }
function currency(amt) { return new Intl.NumberFormat('en-PH', {style:'currency', currency:'PHP'}).format(amt); }
function getMonthDays(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m, 0).getDate();
}

// PH Payroll Logic
function computePayroll(basic, daysWorked = 22, payPeriod) {
    const dailyRate = basic / 22;
    const taxable = basic;

    // SSS
    const sssBase = Math.min(basic, PH_RATES.sss.threshold);
    const sssEE = sssBase * PH_RATES.sss.ee;

    // PhilHealth
    const philPrem = taxable * PH_RATES.philhealth.rate;
    const philEE = philPrem * PH_RATES.philhealth.share;

    // Pag-IBIG
    const pagEE = Math.min(basic * PH_RATES.pagibig.rate, PH_RATES.pagibig.max);

    // Withholding Tax (Monthly)
    let tax = 0;
    for (const b of PH_RATES.taxBrackets) {
        if (taxable > b.min && taxable <= b.max) {
            tax = ((taxable - b.min) * b.rate) + (b.base || 0);
            break;
        }
    }

    const totalDed = sssEE + philEE + pagEE + tax;
    const net = basic - totalDed;

    return {
        basic, dailyRate, daysWorked,
        sssEE, philEE, pagEE, withholdingTax: tax,
        totalDeductions: totalDed, netPay: net
    };
}

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
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.id}</td>
            <td>${emp.name}</td>
            <td>${emp.position}</td>
            <td>${currency(emp.salary)}</td>
            <td>${emp.status}</td>
            <td>
                <button class="btn secondary" data-edit="${idx}">Edit</button>
                <button class="btn danger" data-del="${idx}">Delete</button>
            </td>`;
        tbody.appendChild(tr);
    });
    // Attach handlers
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editEmp(parseInt(b.dataset.edit))));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        if (confirm('Delete this employee?')) {
            STORAGE.employees.splice(parseInt(b.dataset.del), 1);
            STORAGE.save(); renderEmpTable(); updateSelects();
        }
    }));
}

function openEmpModal() {
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modal-title').textContent = 'Add Employee';
    document.getElementById('emp-form').reset();
    document.getElementById('edit-emp-id').value = '';
}
function editEmp(idx) {
    const emp = STORAGE.employees[idx];
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modal-title').textContent = 'Edit Employee';
    document.getElementById('edit-emp-id').value = idx;
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-pos').value = emp.position;
    document.getElementById('emp-salary').value = emp.salary;
    document.getElementById('emp-status').value = emp.status;
}
document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
});
document.getElementById('add-emp-btn').addEventListener('click', openEmpModal);
document.getElementById('emp-form').addEventListener('submit', e => {
    e.preventDefault();
    const idx = document.getElementById('edit-emp-id').value;
    const empData = {
        id: idx === '' ? `EMP${String(STORAGE.employees.length + 1).padStart(3,'0')}` : STORAGE.employees[parseInt(idx)].id,
        name: document.getElementById('emp-name').value,
        position: document.getElementById('emp-pos').value,
        salary: parseFloat(document.getElementById('emp-salary').value),
        status: document.getElementById('emp-status').value
    };
    if (idx === '') STORAGE.employees.push(empData);
    else STORAGE.employees[parseInt(idx)] = empData;
    STORAGE.save();
    document.getElementById('modal').style.display = 'none';
    renderEmpTable(); updateSelects(); renderDashboard();
});

// Dropdowns
function updateSelects() {
    const opts = STORAGE.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    ['att-emp-select','leave-emp','payroll-emp'].forEach(id => {
        const sel = document.getElementById(id);
        sel.innerHTML = `<option value="">Select Employee</option>` + opts;
    });
}

// Attendance
function renderAttendance() {
    const tbody = document.getElementById('att-table-body');
    tbody.innerHTML = '';
    STORAGE.attendance.slice().reverse().forEach(r => {
        const emp = STORAGE.employees.find(e => e.id === r.empId);
        const hours = r.timeOut ? ((new Date(`${r.date}T${r.timeOut}`) - new Date(`${r.date}T${r.timeIn}`)) / 3600000).toFixed(2) : '—';
        tbody.innerHTML += `
            <tr>
                <td>${r.date}</td>
                <td>${emp?.name || 'Unknown'}</td>
                <td>${r.timeIn}</td>
                <td>${r.timeOut || '—'}</td>
                <td>${hours}</td>
            </tr>`;
    });
}
document.getElementById('time-in-btn').addEventListener('click', () => {
    const empId = document.getElementById('att-emp-select').value;
    if (!empId) return alert('Select employee first');
    STORAGE.attendance.push({ empId, date: formatDate(), timeIn: formatTime() });
    STORAGE.save(); renderAttendance();
});
document.getElementById('time-out-btn').addEventListener('click', () => {
    const empId = document.getElementById('att-emp-select').value;
    if (!empId) return alert('Select employee first');
    const rec = STORAGE.attendance.filter(r => r.empId === empId && r.date === formatDate() && !r.timeOut).pop();
    if (!rec) return alert('No active Time In found');
    rec.timeOut = formatTime();
    STORAGE.save(); renderAttendance();
});

// Leave
function renderLeave() {
    const tbody = document.getElementById('leave-table-body');
    tbody.innerHTML = '';
    STORAGE.leave.forEach((lv, idx) => {
        const emp = STORAGE.employees.find(e => e.id === lv.empId);
        tbody.innerHTML += `
            <tr>
                <td>${emp?.name || 'Unknown'}</td>
                <td>${lv.type}</td>
                <td>${lv.start} to ${lv.end}</td>
                <td>${lv.status}</td>
                <td>
                    ${lv.status === 'Pending' ? `
                        <button class="btn primary" data-approve="${idx}">Approve</button>
                        <button class="btn danger" data-reject="${idx}">Reject</button>
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
    STORAGE.leave.push({
        empId: document.getElementById('leave-emp').value,
        type: document.getElementById('leave-type').value,
        start: document.getElementById('leave-start').value,
        end: document.getElementById('leave-end').value,
        status: 'Pending'
    });
    STORAGE.save();
    e.target.reset();
    renderLeave(); renderDashboard();
});

// Payroll
document.getElementById('compute-btn').addEventListener('click', () => {
    const empId = document.getElementById('payroll-emp').value;
    const payPeriod = document.getElementById('pay-period').value;
    if (!empId || !payPeriod) return alert('Complete all fields');
    const emp = STORAGE.employees.find(e => e.id === empId);
    if (!emp) return;

    const result = computePayroll(emp.salary, 22, payPeriod);
    const slip = document.getElementById('payslip-result');
    slip.style.display = 'block';
    slip.innerHTML = `
        <h3>Payslip — ${payPeriod}</h3>
        <p><strong>Employee:</strong> ${emp.name} (${emp.id}) — ${emp.position}</p>
        <hr style="border:0; border-top:1px solid ${PH_RATES.border || '#334155'}; margin:12px 0;">
        <div class="row"><span>Basic Monthly Salary</span><span>${currency(result.basic)}</span></div>
        <div class="row"><span>Daily Rate</span><span>${currency(result.dailyRate)}</span></div>
        <div class="row"><span>Days Worked</span><span>${result.daysWorked}</span></div>
        <br>
        <h4>Deductions</h4>
        <div class="row"><span>SSS (Employee Share)</span><span>${currency(result.sssEE)}</span></div>
        <div class="row"><span>PhilHealth</span><span>${currency(result.philEE)}</span></div>
        <div class="row"><span>Pag-IBIG</span><span>${currency(result.pagEE)}</span></div>
        <div class="row"><span>Withholding Tax</span><span>${currency(result.withholdingTax)}</span></div>
        <div class="row total"><span>Total Deductions</span><span>- ${currency(result.totalDeductions)}</span></div>
        <div class="row total"><span>NET PAY</span><span style="color:var(--success); font-size:1.3rem;">${currency(result.netPay)}</span></div>
        <p style="margin-top:16px; font-size:0.85rem; color:var(--muted);">
            Computed using 2026 PH contribution rates. This is a system-generated document.
        </p>`;
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
document.getElementById('export-emp').addEventListener('click', () => {
    const rows = [['ID','Name','Position','Basic Salary','Status']];
    STORAGE.employees.forEach(e => rows.push([e.id, e.name, e.position, e.salary, e.status]));
    downloadCSV(toCSV(rows), `employees-${formatDate()}.csv`);
});
document.getElementById('export-att').addEventListener('click', () => {
    const rows = [['Date','Employee','Time In','Time Out']];
    STORAGE.attendance.forEach(r => {
        const emp = STORAGE.employees.find(e => e.id === r.empId);
        rows.push([r.date, emp?.name || 'Unknown', r.timeIn, r.timeOut || '']);
    });
    downloadCSV(toCSV(rows), `attendance-${formatDate()}.csv`);
});
document.getElementById('export-pay').addEventListener('click', () => alert('Select employee & compute first to export payslip data'));

// Master Render
function renderAll() {
    renderDashboard();
    renderEmpTable();
    renderAttendance();
    renderLeave();
    updateSelects();
}

// Initialize
renderAll();
