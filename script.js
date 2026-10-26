// ==============================================
// HRMS — FIXED NO-ERROR VERSION
// Login: admin / admin123
// ==============================================

const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    linkedEmpId: null
};

function getAccounts() {
    let accs = [];
    try {
        accs = JSON.parse(localStorage.getItem('hrms_accounts') || '[]');
    } catch {
        accs = [];
    }
    
    if (!accs.some(a => a.role === 'admin')) {
        accs.unshift(DEFAULT_ADMIN);
        saveAccounts(accs);
    }
    return accs;
}

function saveAccounts(accs) {
    localStorage.setItem('hrms_accounts', JSON.stringify(accs));
}

function resetAdmin() {
    let accs = getAccounts().filter(a => a.role !== 'admin');
    accs.unshift(DEFAULT_ADMIN);
    saveAccounts(accs);
    alert('✅ RESET!\n\nUsername: admin\nPassword: admin123');
    location.reload(true);
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp(user) {
    sessionStorage.setItem('hrms_session', JSON.stringify(user));
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    if (user.role === 'admin') {
        document.body.classList.add('is-admin');
        document.getElementById('user-role-display').textContent = 'Administrator';
    } else {
        document.body.classList.remove('is-admin');
        document.getElementById('user-role-display').textContent = 'Employee';
    }
}

// Check session on load
const savedSession = sessionStorage.getItem('hrms_session');
if (savedSession) {
    try {
        showApp(JSON.parse(savedSession));
    } catch {
        showLogin();
    }
} else {
    showLogin();
}

// LOGIN HANDLER — FIXED SYNTAX
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const uname = document.getElementById('login-username').value.trim();
    const pword = document.getElementById('login-password').value;
    
    console.log('👉 Trying login:', uname);
    
    // Direct match for default admin
    if (uname === DEFAULT_ADMIN.username && pword === DEFAULT_ADMIN.password) {
        console.log('✅ Admin match — entering');
        showApp(DEFAULT_ADMIN);
        return;
    }
    
    // Check other accounts
    const accounts = getAccounts();
    const found = accounts.find(function(a) {
        return a.username === uname && a.password === pword;
    });
    
    if (found) {
        console.log('✅ Account found — entering');
        showApp(found);
    } else {
        alert('❌ Incorrect login.\n\nUse:\nUsername: admin\nPassword: admin123\n\nOr click "Reset Admin Account"');
    }
});

// Reset button
document.getElementById('reset-admin-btn').addEventListener('click', resetAdmin);

// Logout
document.getElementById('logout-btn').addEventListener('click', function() {
    sessionStorage.clear();
    location.reload(true);
});
