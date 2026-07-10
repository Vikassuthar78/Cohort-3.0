/* ===================== AUTH (simple session check — no real backend) ===================== */
const AUTH_KEYS = {
  users: 'fintrackpro_users',
  session: 'fintrackpro_session'
};

function getUsers(){
  const raw = localStorage.getItem(AUTH_KEYS.users);
  return raw ? JSON.parse(raw) : [];
}
function saveUsers(list){
  localStorage.setItem(AUTH_KEYS.users, JSON.stringify(list));
}
function getSession(){
  return localStorage.getItem(AUTH_KEYS.session);
}
function setSession(username){
  localStorage.setItem(AUTH_KEYS.session, username);
}
function clearSession(){
  localStorage.removeItem(AUTH_KEYS.session);
}

/* Guard used on the dashboard/settings page — redirect to login if no session */
function requireSession(){
  if(!getSession()){
    window.location.href = 'index.html';
  }
}

/* Called from login.html and register.html forms */
function handleRegister(event){
  event.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const errorBox = document.getElementById('authError');

  errorBox.classList.remove('show');

  if(!username || !password || !confirm){
    return showAuthError(errorBox, 'Please fill in every field.');
  }
  if(password.length < 4){
    return showAuthError(errorBox, 'Password must be at least 4 characters.');
  }
  if(password !== confirm){
    return showAuthError(errorBox, 'Passwords do not match.');
  }

  const users = getUsers();
  if(users.some(u => u.username.toLowerCase() === username.toLowerCase())){
    return showAuthError(errorBox, 'That username is already taken.');
  }

  users.push({ username, password });
  saveUsers(users);

  window.location.href = 'index.html?registered=1';
}

function handleLogin(event){
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorBox = document.getElementById('authError');

  errorBox.classList.remove('show');

  if(!username || !password){
    return showAuthError(errorBox, 'Please enter your username and password.');
  }

  const users = getUsers();
  const match = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

  if(!match){
    return showAuthError(errorBox, 'Incorrect username or password.');
  }

  setSession(match.username);
  window.location.href = 'dashboard.html';
}

function handleLogout(){
  clearSession();
  window.location.href = 'index.html';
}

function showAuthError(box, msg){
  box.textContent = msg;
  box.classList.add('show');
}

/* Show a "registered successfully" banner on login page if redirected from register */
function checkRegisteredBanner(){
  const params = new URLSearchParams(window.location.search);
  if(params.get('registered') === '1'){
    const successBox = document.getElementById('authSuccess');
    if(successBox){
      successBox.textContent = 'Account created — please log in.';
      successBox.classList.add('show');
    }
  }
}

/* Note: dark mode preference is applied for every page inside init() below */
/* ===================== STORAGE HELPERS ===================== */
const STORE_KEYS = {
  txns: 'fintrackpro_transactions',
  name: 'fintrackpro_name',
  currency: 'fintrackpro_currency',
  dark: 'fintrackpro_dark'
};

function loadTransactions(){
  const raw = localStorage.getItem(STORE_KEYS.txns);
  return raw ? JSON.parse(raw) : [];
}
function saveTransactions(list){
  localStorage.setItem(STORE_KEYS.txns, JSON.stringify(list));
}

let transactions = loadTransactions();
let currentFilter = 'all';
let cashChart = null;

const CURRENCY_SYMBOLS = { USD:'$', EUR:'€', GBP:'£', INR:'₹', JPY:'¥' };

/* ===================== MODAL ===================== */
function openModal(){
  document.getElementById('fType').value = 'expense';
  document.getElementById('fDesc').value = '';
  document.getElementById('fAmount').value = '';
  document.getElementById('fCategory').value = '';
  document.getElementById('fDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal(){
  document.getElementById('modalOverlay').classList.remove('show');
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

/* ===================== ADD / DELETE ===================== */
function saveTransaction(){
  const type = document.getElementById('fType').value;
  const desc = document.getElementById('fDesc').value.trim();
  const amount = parseFloat(document.getElementById('fAmount').value);
  const date = document.getElementById('fDate').value;
  const category = document.getElementById('fCategory').value;

  if(!desc || !amount || isNaN(amount) || amount <= 0 || !date || !category){
    showToast('Please fill in every field with a valid amount.');
    return;
  }

  const txn = {
    id: Date.now(),
    type, description: desc, amount, date, category
  };
  transactions.push(txn);
  saveTransactions(transactions);
  closeModal();
  refreshAll();
  showToast('Transaction saved.');
}

function deleteTransaction(id){
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions(transactions);
  refreshAll();
  showToast('Transaction deleted.');
}

/* ===================== FILTER ===================== */
function setFilter(filter){
  currentFilter = filter;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
  renderTable();
}

/* ===================== CALCULATIONS ===================== */
function calcTotals(){
  let income = 0, expense = 0;
  transactions.forEach(t => {
    if(t.type === 'income') income += t.amount;
    else expense += t.amount;
  });
  return { income, expense, balance: income - expense };
}

function getCurrency(){
  return localStorage.getItem(STORE_KEYS.currency) || 'USD';
}
function formatMoney(n){
  const symbol = CURRENCY_SYMBOLS[getCurrency()] || '$';
  const sign = n < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(n).toFixed(2)}`;
}

/* ===================== RENDER: CARDS ===================== */
function updateCards(){
  if(!document.getElementById('statBalance')) return;
  const { income, expense, balance } = calcTotals();
  document.getElementById('statBalance').textContent = formatMoney(balance);
  document.getElementById('statIncome').textContent = formatMoney(income);
  document.getElementById('statExpense').textContent = formatMoney(expense);
  document.getElementById('statCount').textContent = transactions.length;
}

/* ===================== RENDER: TABLE ===================== */
function renderTable(){
  const tbody = document.getElementById('txnBody');
  if(!tbody) return;
  const emptyNote = document.getElementById('emptyNote');
  tbody.innerHTML = '';

  let list = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
  if(currentFilter !== 'all'){
    list = list.filter(t => t.type === currentFilter);
  }

  if(list.length === 0){
    emptyNote.style.display = 'block';
    return;
  }
  emptyNote.style.display = 'none';

  list.forEach(t => {
    const tr = document.createElement('tr');
    const displayAmt = (t.type === 'income' ? '+' : '-') + formatMoney(t.amount).replace('-','');
    tr.innerHTML = `
      <td>${formatDate(t.date)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td><span class="cat-badge">${escapeHtml(t.category)}</span></td>
      <td class="amt ${t.type}">${displayAmt}</td>
      <td><button class="del-btn" title="Delete" onclick="deleteTransaction(${t.id})">🗑</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function formatDate(iso){
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===================== RENDER: CHART ===================== */
function renderChart(){
  const canvas = document.getElementById('cashChart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const sorted = [...transactions].sort((a,b) => new Date(a.date) - new Date(b.date));
  const labels = sorted.map(t => formatDate(t.date));
  const incomeData = sorted.map(t => t.type === 'income' ? t.amount : 0);
  const expenseData = sorted.map(t => t.type === 'expense' ? t.amount : 0);

  const isDark = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#9497ab' : '#6b7080';

  if(cashChart) cashChart.destroy();

  cashChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No data yet'],
      datasets: [
        { label: 'Income', data: incomeData.length ? incomeData : [0], backgroundColor: '#16a34a', borderRadius: 4, maxBarThickness: 28 },
        { label: 'Expenses', data: expenseData.length ? expenseData : [0], backgroundColor: '#dc2626', borderRadius: 4, maxBarThickness: 28 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: tickColor, font: { family: 'Inter', weight: '600' } } }
      },
      scales: {
        x: { grid: { display:false }, ticks: { color: tickColor, font:{family:'Inter'} } },
        y: { grid: { color: gridColor }, ticks: { color: tickColor, font:{family:'Inter'} } }
      }
    }
  });
}

/* ===================== MASTER REFRESH ===================== */
function refreshAll(){
  updateCards();
  renderTable();
  renderChart();
}

/* ===================== SETTINGS ===================== */
function loadSettingsIntoForm(){
  document.getElementById('settingName').value = localStorage.getItem(STORE_KEYS.name) || '';
  document.getElementById('settingCurrency').value = getCurrency();
  document.getElementById('darkToggle').checked = localStorage.getItem(STORE_KEYS.dark) === 'true';
}

function saveProfile(){
  const name = document.getElementById('settingName').value.trim();
  const currency = document.getElementById('settingCurrency').value;
  localStorage.setItem(STORE_KEYS.name, name);
  localStorage.setItem(STORE_KEYS.currency, currency);
  applyUserChip();
  refreshAll();
  showToast('Profile saved.');
}

function applyUserChip(){
  const name = localStorage.getItem(STORE_KEYS.name) || getSession() || '';
  const existing = document.getElementById('userChip');
  if(existing) existing.remove();
  if(name){
    const chip = document.createElement('span');
    chip.id = 'userChip';
    chip.className = 'user-chip';
    chip.textContent = name;
    document.querySelector('.nav-actions').prepend(chip);
  }
}

function toggleDark(){
  const checked = document.getElementById('darkToggle').checked;
  document.body.classList.toggle('dark', checked);
  localStorage.setItem(STORE_KEYS.dark, checked);
  renderChart();
}

function resetAllData(){
  if(!confirm('This will permanently delete all transactions and preferences. Continue?')) return;
  localStorage.removeItem(STORE_KEYS.txns);
  localStorage.removeItem(STORE_KEYS.name);
  localStorage.removeItem(STORE_KEYS.currency);
  localStorage.removeItem(STORE_KEYS.dark);
  transactions = [];
  document.body.classList.remove('dark');
  loadSettingsIntoForm();
  applyUserChip();
  refreshAll();
  showToast('All data has been reset.');
}

/* ===================== TOAST ===================== */
let toastTimer;
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ===================== INIT ===================== */
(function init(){
  if(localStorage.getItem(STORE_KEYS.dark) === 'true'){
    document.body.classList.add('dark');
  }

  // Pages that require a logged-in session
  if(document.body.dataset.authRequired === 'true'){
    requireSession();
  }

  // Nav user chip (present on dashboard.html and settings.html)
  if(document.querySelector('.nav-actions')){
    applyUserChip();
  }

  // Dashboard-only widgets
  if(document.getElementById('cashChart')){
    refreshAll();
  }

  // Settings-only form
  if(document.getElementById('settingName')){
    loadSettingsIntoForm();
  }
})();
