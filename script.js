// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const mainDashboard = document.getElementById('main-dashboard');
const logoutBtn = document.getElementById('logout-btn');
const roleBadge = document.getElementById('role-badge');

// Views
const navTabs = document.getElementById('nav-tabs');
const viewContents = document.querySelectorAll('.view-content');
const dashboardView = document.getElementById('dashboard-view');
const leaveManagementView = document.getElementById('leave-management-view');
const timeTrackingView = document.getElementById('time-tracking-view');

// Dashboard Elements
const addFormView = document.getElementById('add-form-view');
const employeeForm = document.getElementById('employee-form');
const employeeListEl = document.getElementById('employee-list');
const loadingIndicator = document.getElementById('loading-indicator');
const noEmployeesMessage = document.getElementById('no-employees-message');
const searchInput = document.getElementById('search-input');
const totalEmployeesEl = document.getElementById('total-employees');
const avgSalaryEl = document.getElementById('avg-salary');

// Leave Management Elements
const leaveRequestForm = document.getElementById('leave-request-form');
const leaveRequestListEl = document.getElementById('leave-request-list');
const leaveActionHeader = document.getElementById('leave-action-header');

// Time Tracking Elements
const timeClockBtn = document.getElementById('time-clock-btn');
const clockStatusDisplay = document.getElementById('clock-status-display');
const timeLogListEl = document.getElementById('time-log-list');

// Modals & Messages (details, edit, confirm, message-box elements)
const detailsModal = document.getElementById('details-modal');
const detailsName = document.getElementById('details-name');
const detailsContent = document.getElementById('details-content');
const closeDetailsBtn = document.getElementById('close-details-modal');
const editDetailsBtn = document.getElementById('edit-details-btn');
const deleteDetailsBtn = document.getElementById('delete-details-btn');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-employee-form');
const editCancelBtn = document.getElementById('edit-cancel-btn');
const confirmModal = document.getElementById('confirmation-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');

let allEmployees = [];
let currentUserRole = null;
let currentUserId = null;
let deptChartInstance = null;
let salaryChartInstance = null;

const API_BASE = 'http://127.0.0.1:5000/api';

// --- API Request Wrapper ---
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const fetchOptions = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(url, fetchOptions);
        if (response.status === 401) {
            // Unauthenticated or token expired, redirect to login
            localStorage.clear();
            showLoginScreen();
            showMessage('Session expired. Please log in again.', 'error');
            throw new Error('Unauthorized');
        }
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        return data;
    } catch (err) {
        console.error(`Fetch error on ${endpoint}:`, err);
        throw err;
    }
}

// --- Utilities ---
function showMessage(text, type = 'success') {
    const messageEmoji = document.getElementById('message-emoji');
    const messageIconBox = document.getElementById('message-icon-box');
    
    messageText.textContent = text;
    
    messageBox.classList.remove('border-emerald-500/20', 'border-red-500/20', 'border-brand-500/20');
    messageIconBox.className = "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors";
    
    if (type === 'success') {
        messageEmoji.textContent = '✅';
        messageBox.classList.add('border-emerald-500/20');
        messageIconBox.classList.add('bg-emerald-500/10', 'border-emerald-500/20', 'text-emerald-400');
    } else if (type === 'error') {
        messageEmoji.textContent = '❌';
        messageBox.classList.add('border-red-500/20');
        messageIconBox.classList.add('bg-red-500/10', 'border-red-500/20', 'text-red-400');
    } else {
        messageEmoji.textContent = '✨';
        messageBox.classList.add('border-brand-500/20');
        messageIconBox.classList.add('bg-brand-500/10', 'border-brand-500/20', 'text-brand-400');
    }
    
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBox.classList.remove('translate-y-4', 'opacity-0');
        messageBox.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        messageBox.classList.remove('translate-y-0', 'opacity-100');
        messageBox.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 300);
    }, 3500);
}

function formatINR(amount) {
    if (isNaN(amount) || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function hideModal(modal) {
    modal.classList.add('hidden');
}

function confirmAction(title, message, callback) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    const oldConfirmBtn = modalConfirmBtn.cloneNode(true);
    modalConfirmBtn.parentNode.replaceChild(oldConfirmBtn, modalConfirmBtn);
    const newConfirmBtn = document.getElementById('modal-confirm-btn');

    newConfirmBtn.addEventListener('click', () => {
        hideModal(confirmModal);
        callback();
    }, { once: true });

    modalCancelBtn.onclick = () => hideModal(confirmModal);
    confirmModal.classList.remove('hidden');
}

function updateUIForRole(role) {
    const isAdminOrManager = role === 'Admin' || role === 'Manager';
    const isEmployee = role === 'Employee';

    addFormView.classList.toggle('hidden', !isAdminOrManager);
    document.getElementById('employee-list-section').classList.toggle('hidden', isEmployee);
    document.getElementById('stats-view').classList.toggle('hidden', isEmployee);
    document.getElementById('employee-profile-section').classList.toggle('hidden', !isEmployee);

    roleBadge.textContent = role;

    fetchEmployeesAndStats();
}

function switchView(viewId) {
    viewContents.forEach(view => view.classList.add('hidden'));

    const selectedView = document.getElementById(viewId);
    if (selectedView) {
        selectedView.classList.remove('hidden');
    }

    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.dataset.view === viewId) {
            button.className = "tab-button flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition duration-200 bg-brand-600/15 text-brand-400 border-l-2 border-brand-500 shadow-inner whitespace-nowrap w-full";
        } else {
            button.className = "tab-button flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition duration-200 text-slate-400 hover:text-white hover:bg-slate-900/60 whitespace-nowrap w-full";
        }
    });

    if (viewId === 'leave-management-view') {
        renderLeaveRequests();
    } else if (viewId === 'time-tracking-view') {
        renderTimeTrackingUI();
    } else if (viewId === 'dashboard-view') {
        fetchEmployeesAndStats();
    }
}

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    mainDashboard.classList.add('hidden');
    loginForm.reset();
    loginMessage.classList.add('hidden');
    currentUserRole = null;
    currentUserId = null;
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
    updateUIForRole(currentUserRole);
    switchView('dashboard-view');
}

// --- Chart Rendering ---
function renderCharts(employees) {
    if (employees.length === 0) return;
    
    // Group counts by department
    const deptData = employees.reduce((acc, emp) => {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
        return acc;
    }, {});
    
    // Group salary averages by department
    const deptSalaries = employees.reduce((acc, emp) => {
        if (!acc[emp.department]) {
            acc[emp.department] = { sum: 0, count: 0 };
        }
        acc[emp.department].sum += emp.salary;
        acc[emp.department].count += 1;
        return acc;
    }, {});
    
    const deptNames = Object.keys(deptData);
    const deptCounts = Object.values(deptData);
    const avgSalaries = deptNames.map(dept => Math.round(deptSalaries[dept].sum / deptSalaries[dept].count));
    
    // 1. Department Doughnut Chart
    const deptCtx = document.getElementById('deptChart');
    if (deptCtx) {
        if (deptChartInstance) {
            deptChartInstance.destroy();
        }
        deptChartInstance = new Chart(deptCtx, {
            type: 'doughnut',
            data: {
                labels: deptNames,
                datasets: [{
                    data: deptCounts,
                    backgroundColor: [
                        'rgba(139, 92, 246, 0.75)',
                        'rgba(16, 185, 129, 0.75)',
                        'rgba(245, 158, 11, 0.75)',
                        'rgba(59, 130, 246, 0.75)',
                        'rgba(236, 72, 153, 0.75)'
                    ],
                    borderColor: '#111827',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } }
                    }
                }
            }
        });
    }
    
    // 2. Average Salary Bar Chart
    const salaryCtx = document.getElementById('salaryChart');
    if (salaryCtx) {
        if (salaryChartInstance) {
            salaryChartInstance.destroy();
        }
        salaryChartInstance = new Chart(salaryCtx, {
            type: 'bar',
            data: {
                labels: deptNames,
                datasets: [{
                    label: 'Avg Salary (INR)',
                    data: avgSalaries,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1.5,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(75, 85, 99, 0.15)' },
                        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } }
                    }
                }
            }
        });
    }
}

// --- Employee Database Views ---
function showDetailsModal(employee) {
    detailsName.textContent = employee.name;
    detailsContent.innerHTML = `
        <div class="grid grid-cols-2 gap-y-3.5 text-xs">
            <p><span class="font-bold text-slate-400 uppercase tracking-wide">Employee ID:</span></p>
            <p class="text-right text-slate-200 font-semibold">${employee.empId}</p>
            
            <p><span class="font-bold text-slate-400 uppercase tracking-wide">Role / Title:</span></p>
            <p class="text-right text-slate-200">${employee.job_role || 'Employee'}</p>
            
            <p><span class="font-bold text-slate-400 uppercase tracking-wide">Email:</span></p>
            <p class="text-right text-slate-200 truncate select-all">${employee.email}</p>
            
            <p><span class="font-bold text-slate-400 uppercase tracking-wide">Age:</span></p>
            <p class="text-right text-slate-200">${employee.age} yrs</p>
            
            <p><span class="font-bold text-slate-400 uppercase tracking-wide">Department:</span></p>
            <p class="text-right text-slate-200">${employee.department}</p>
            
            <p><span class="font-bold text-slate-400 uppercase tracking-wide">Salary:</span></p>
            <p class="text-right text-emerald-400 font-semibold">${formatINR(employee.salary)}</p>
            
            <p><span class="font-bold text-slate-400 uppercase tracking-wide">Phone:</span></p>
            <p class="text-right text-slate-200">${employee.phone_number || 'N/A'}</p>
        </div>
    `;

    const isAdmin = currentUserRole === 'Admin';

    editDetailsBtn.onclick = () => { hideModal(detailsModal); showEditModal(employee); };
    deleteDetailsBtn.onclick = () => {
        hideModal(detailsModal);
        confirmAction('Delete Employee', `Are you sure you want to delete employee ${employee.name} (${employee.empId})? This action cannot be undone.`, () => deleteEmployee(employee.id));
    };

    document.getElementById('details-actions').classList.toggle('hidden', !isAdmin);
    detailsModal.classList.remove('hidden');
}

function showEditModal(employee) {
    document.getElementById('edit-empId').value = employee.id;
    document.getElementById('edit-name').value = employee.name;
    document.getElementById('edit-email').value = employee.email;
    document.getElementById('edit-age').value = employee.age;
    document.getElementById('edit-salary').value = employee.salary;
    document.getElementById('edit-department').value = employee.department;
    document.getElementById('edit-phone-number').value = employee.phone_number || '';
    editModal.classList.remove('hidden');
}

async function addEmployee(employeeData) {
    try {
        await apiFetch('/employees', {
            method: 'POST',
            body: JSON.stringify(employeeData)
        });
        showMessage(`Employee ${employeeData.name} added successfully!`, 'success');
        fetchEmployeesAndStats();
        return true;
    } catch (err) {
        showMessage(err.message || 'Failed to add employee.', 'error');
        return false;
    }
}

async function updateEmployee(id, updatedData) {
    try {
        await apiFetch(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });
        showMessage('Employee updated successfully.', 'success');
        fetchEmployeesAndStats();
        return true;
    } catch (err) {
        showMessage(err.message || 'Failed to update employee.', 'error');
        return false;
    }
}

async function deleteEmployee(id) {
    try {
        await apiFetch(`/employees/${id}`, {
            method: 'DELETE'
        });
        showMessage('Employee record deleted successfully.', 'success');
        fetchEmployeesAndStats();
    } catch (err) {
        showMessage(err.message || 'Failed to delete employee.', 'error');
    }
}

async function fetchEmployeesAndStats() {
    if (currentUserRole !== 'Employee') {
        loadingIndicator.classList.remove('hidden');
    }
    
    try {
        const data = await apiFetch('/employees');
        allEmployees = data;
        
        if (currentUserRole === 'Employee') {
            showEmployeeProfile();
        } else {
            filterEmployeeList(searchInput.value);
            renderStats();
            renderCharts(allEmployees);
        }
    } catch (err) {
        console.error(err);
        loadingIndicator.classList.add('hidden');
    }
}

function renderStats() {
    const total = allEmployees.length;
    const totalSalary = allEmployees.reduce((sum, emp) => sum + emp.salary, 0);
    const avgSalary = total > 0 ? totalSalary / total : 0;

    totalEmployeesEl.textContent = total;
    avgSalaryEl.textContent = formatINR(avgSalary);
}

function renderEmployeeList(employees) {
    loadingIndicator.classList.add('hidden');
    employeeListEl.innerHTML = '';

    if (employees.length === 0) {
        noEmployeesMessage.classList.remove('hidden');
        return;
    }
    noEmployeesMessage.classList.add('hidden');

    employees.forEach(employee => {
        const employeeCard = document.createElement('div');
        employeeCard.className = 'glass-card p-5 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-all duration-200 cursor-pointer border border-slate-800 hover:border-brand-500/30';
        employeeCard.innerHTML = `
            <div class="space-y-3">
                <div class="flex justify-between items-start">
                    <div class="truncate">
                        <h3 class="text-base font-bold text-slate-100 truncate">${employee.name}</h3>
                        <p class="text-xs text-slate-500 mt-0.5">${employee.job_role || 'Employee'} • ${employee.empId}</p>
                    </div>
                    <span class="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md">${employee.department}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>${employee.email}</span>
                    <span class="font-semibold text-emerald-400">${formatINR(employee.salary)}</span>
                </div>
            </div>
            <div class="flex justify-end mt-4 border-t border-slate-800/50 pt-3">
                <button class="text-brand-400 hover:text-brand-300 font-semibold text-xs py-1 px-3.5 bg-brand-500/10 hover:bg-brand-500/20 rounded-xl transition duration-150">
                    Details
                </button>
            </div>
        `;
        
        employeeCard.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            showDetailsModal(employee);
        });
        employeeCard.addEventListener('click', () => showDetailsModal(employee));

        employeeListEl.appendChild(employeeCard);
    });
}

function filterEmployeeList(searchTerm) {
    document.getElementById('sort-filter-combo').value = "";
    const lowerCaseSearch = searchTerm.toLowerCase().trim();
    const filteredEmployees = allEmployees.filter(emp =>
        emp.name.toLowerCase().includes(lowerCaseSearch) ||
        emp.empId.toLowerCase().includes(lowerCaseSearch) ||
        emp.department.toLowerCase().includes(lowerCaseSearch)
    );
    renderEmployeeList(filteredEmployees);
}

document.getElementById('sort-filter-combo').addEventListener('change', function () {
    const value = this.value;
    let filtered = allEmployees;

    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(emp =>
            emp.name.toLowerCase().includes(searchTerm) ||
            emp.empId.toLowerCase().includes(searchTerm) ||
            emp.department.toLowerCase().includes(searchTerm)
        );
    }

    if (value === 'department') {
        filtered = filtered.slice().sort((a, b) => a.department.localeCompare(b.department));
    } else if (value === 'salary-asc') {
        filtered = filtered.slice().sort((a, b) => a.salary - b.salary);
    } else if (value === 'salary-desc') {
        filtered = filtered.slice().sort((a, b) => b.salary - a.salary);
    } else if (value === 'age-asc') {
        filtered = filtered.slice().sort((a, b) => a.age - b.age);
    } else if (value === 'age-desc') {
        filtered = filtered.slice().sort((a, b) => b.age - a.age);
    }

    renderEmployeeList(filtered);
});

// --- Leave Management ---
async function renderLeaveRequests() {
    const isAdminOrManager = currentUserRole === 'Admin' || currentUserRole === 'Manager';
    leaveActionHeader.classList.toggle('hidden', !isAdminOrManager);
    
    try {
        const data = await apiFetch('/leaves');
        
        if (data.length === 0) {
            leaveRequestListEl.innerHTML = `<tr><td colspan="${isAdminOrManager ? 6 : 5}" class="px-6 py-8 text-center text-slate-500 font-medium">
                ${currentUserRole === 'Employee' ? 'You have no recorded leave requests.' : 'No leave requests found in database.'}
             </td></tr>`;
            return;
        }

        leaveRequestListEl.innerHTML = data.map(req => {
            const statusColor = req.status === 'Approved' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                req.status === 'Rejected' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                    'bg-amber-500/10 border border-amber-500/20 text-amber-400';

            const employeeCell = `
                <td class="px-6 py-4 font-semibold text-slate-200">
                    <div>${req.name}</div>
                    <div class="text-[10px] text-slate-500 font-normal mt-0.5">${req.empId}</div>
                </td>`;

            const actionCell = isAdminOrManager ? `
                <td class="px-6 py-4 whitespace-nowrap text-xs">
                    ${req.status === 'Pending' ? `
                        <button onclick="window.processLeaveRequest(${req.id}, 'Approved')" class="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg font-semibold mr-2 transition">Approve</button>
                        <button onclick="window.processLeaveRequest(${req.id}, 'Rejected')" class="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg font-semibold transition">Reject</button>
                    ` : `
                        <span class="text-slate-500">-</span>
                    `}
                </td>
            ` : '';

            return `
                <tr class="hover:bg-slate-900/30 transition duration-150">
                    ${employeeCell}
                    <td class="px-6 py-4 text-slate-300 font-medium">${req.leave_type}</td>
                    <td class="px-6 py-4 text-slate-400">${req.startDate} to ${req.endDate}</td>
                    <td class="px-6 py-4 text-slate-400 max-w-xs truncate" title="${req.reason}">${req.reason}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2.5 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full uppercase tracking-wider ${statusColor}">
                            ${req.status}
                        </span>
                    </td>
                    ${actionCell}
                </tr>
            `;
        }).join('');
    } catch (err) {
        showMessage('Failed to load leave requests.', 'error');
    }
}

async function handleLeaveRequest(event) {
    event.preventDefault();

    if (currentUserRole !== 'Employee') {
        showMessage('Only registered employees can submit leave requests.', 'error');
        return;
    }

    const leaveType = document.getElementById('leave-type').value;
    const startDate = document.getElementById('leave-start-date').value;
    const endDate = document.getElementById('leave-end-date').value;
    const reason = document.getElementById('leave-reason').value.trim();

    if (new Date(startDate) > new Date(endDate)) {
        showMessage('Start date cannot be after end date.', 'error');
        return;
    }

    const payload = {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason
    };

    try {
        await apiFetch('/leaves', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        leaveRequestForm.reset();
        showMessage('Leave request submitted successfully.', 'success');
        renderLeaveRequests();
    } catch (err) {
        showMessage(err.message || 'Failed to submit leave request.', 'error');
    }
}

window.processLeaveRequest = async function (id, status) {
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Manager') return;

    try {
        await apiFetch(`/leaves/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showMessage(`Leave request ${status.toLowerCase()} successfully.`, 'success');
        renderLeaveRequests();
    } catch (err) {
        showMessage(err.message || 'Failed to process leave request.', 'error');
    }
};

// --- Time Tracking ---
async function renderTimeTrackingUI() {
    const isEmployee = currentUserRole === 'Employee';
    document.getElementById('time-clock-section').classList.toggle('hidden', !isEmployee);

    if (isEmployee) {
        try {
            const statusData = await apiFetch('/time/status');
            const isClockedIn = statusData.status === 'Clocked In';

            clockStatusDisplay.textContent = isClockedIn ? 'Clocked In' : 'Clocked Out';
            clockStatusDisplay.className = isClockedIn ? 
                "text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 transition-all duration-300" :
                "text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 transition-all duration-300";

            const innerBtn = timeClockBtn.querySelector('span:last-child');
            if (innerBtn) {
                innerBtn.textContent = isClockedIn ? 'Clock Out' : 'Clock In';
            }
            timeClockBtn.className = isClockedIn ?
                "w-40 h-40 rounded-full border-4 border-red-500/30 bg-red-950/20 text-white font-extrabold text-base flex flex-col items-center justify-center shadow-lg transition-all duration-300 cursor-pointer active:scale-95 group hover:border-red-500/50" :
                "w-40 h-40 rounded-full border-4 border-slate-800 bg-slate-900/40 text-white font-extrabold text-base flex flex-col items-center justify-center shadow-lg transition-all duration-300 cursor-pointer active:scale-95 group hover:border-brand-500/40";
        } catch (err) {
            console.error(err);
        }
    }

    renderTimeLogs();
}

async function handleTimeClock() {
    try {
        const res = await apiFetch('/time/clock', {
            method: 'POST'
        });
        showMessage(res.message || 'Clock action succeeded!', 'success');
        renderTimeTrackingUI();
    } catch (err) {
        showMessage(err.message || 'Failed to toggle clock status.', 'error');
    }
}

async function renderTimeLogs() {
    const isAdminOrManager = currentUserRole === 'Admin' || currentUserRole === 'Manager';

    document.querySelectorAll('.time-log-manager-only').forEach(el => {
        el.classList.toggle('hidden', !isAdminOrManager);
    });

    try {
        const logs = await apiFetch('/time/logs');
        
        if (logs.length === 0) {
            timeLogListEl.innerHTML = `<tr><td colspan="${isAdminOrManager ? 5 : 4}" class="px-6 py-8 text-center text-slate-500 font-medium">No clock logs recorded.</td></tr>`;
            return;
        }

        timeLogListEl.innerHTML = logs.map(log => {
            const employeeCell = isAdminOrManager ?
                `<td class="px-6 py-4 font-semibold text-slate-200">
                    <div>${log.name}</div>
                    <div class="text-[10px] text-slate-500 font-normal mt-0.5">${log.empId}</div>
                </td>` :
                '';

            const isClockedIn = log.status === 'In' && !log.clockOut;
            const statusColor = isClockedIn ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
            const clockOutTime = isClockedIn ? '<span class="text-brand-400 font-semibold tracking-wider uppercase text-[10px] animate-pulse">Active</span>' : log.clockOut;
            const durationDisplay = isClockedIn ? '--' : (log.duration !== null ? log.duration.toFixed(2) : '0.00');
            const statusText = isClockedIn ? 'Active' : 'Completed';

            return `
                <tr class="hover:bg-slate-900/30 transition duration-150">
                    ${employeeCell}
                    <td class="px-6 py-4 text-slate-400">${log.clockIn}</td>
                    <td class="px-6 py-4 text-slate-400">${clockOutTime}</td>
                    <td class="px-6 py-4 text-slate-300 font-medium">${durationDisplay}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2.5 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full uppercase tracking-wider ${statusColor}">
                            ${statusText}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        showMessage('Failed to load time logs.', 'error');
    }
}

// --- Session Handlers ---
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    loginMessage.classList.add('hidden');

    try {
        const res = await apiFetch('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        currentUserRole = res.role;
        currentUserId = res.employee_id || res.token;
        
        localStorage.setItem('token', res.token);
        localStorage.setItem('currentUserRole', currentUserRole);
        localStorage.setItem('currentUserId', currentUserId);
        
        showDashboard();
        showMessage(`Welcome back, ${username}!`, 'success');
    } catch (err) {
        loginMessage.textContent = err.message || 'Invalid credentials or connection error.';
        loginMessage.classList.remove('hidden');
    }
}

function handleLogout() {
    confirmAction('Confirm Logout', 'Are you sure you want to log out?', () => {
        showMessage(`Goodbye!`, 'success');
        localStorage.clear();
        showLoginScreen();
    });
}

function showEmployeeProfile() {
    const employee = allEmployees.find(emp => emp.empId === currentUserId);
    if (!employee) return;
    document.getElementById('employee-profile-content').innerHTML = `
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40">
            <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Employee ID</span>
            <span class="text-sm font-semibold text-slate-200">${employee.empId}</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40">
            <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Full Name</span>
            <span class="text-sm font-semibold text-slate-200">${employee.name}</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40">
            <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Email Address</span>
            <span class="text-sm font-semibold text-slate-200 select-all">${employee.email}</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40">
            <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Department</span>
            <span class="text-sm font-semibold text-slate-200">${employee.department}</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40">
            <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Title / Job Role</span>
            <span class="text-sm font-semibold text-slate-200">${employee.job_role || 'Employee'}</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40">
            <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Phone Number</span>
            <span class="text-sm font-semibold text-slate-200">${employee.phone_number || 'N/A'}</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40">
            <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Age</span>
            <span class="text-sm font-semibold text-slate-200">${employee.age} Years</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/40">
            <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Monthly Compensation</span>
            <span class="text-sm font-semibold text-emerald-400">${formatINR(employee.salary)}</span>
        </div>
    `;
}

// --- App Entry Point ---
window.onload = function () {
    currentUserRole = localStorage.getItem('currentUserRole');
    currentUserId = localStorage.getItem('currentUserId');
    
    if (currentUserRole && currentUserId && localStorage.getItem('token')) {
        showDashboard();
    } else {
        showLoginScreen();
    }

    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    searchInput.addEventListener('input', (e) => filterEmployeeList(e.target.value));

    navTabs.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-button');
        if (button) {
            switchView(button.dataset.view);
        }
    });

    employeeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newEmployee = {
            empId: document.getElementById('empId').value.trim(),
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            age: parseInt(document.getElementById('age').value),
            salary: parseInt(document.getElementById('salary').value),
            department: document.getElementById('department').value.trim(),
            role: 'Employee',
            phoneNumber: document.getElementById('phone-number').value.trim()
        };
        addEmployee(newEmployee).then(success => {
            if (success) employeeForm.reset();
        });
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const empId = document.getElementById('edit-empId').value;
        const updatedData = {
            name: document.getElementById('edit-name').value.trim(),
            email: document.getElementById('edit-email').value.trim(),
            age: parseInt(document.getElementById('edit-age').value),
            salary: parseInt(document.getElementById('edit-salary').value),
            department: document.getElementById('edit-department').value.trim(),
            phoneNumber: document.getElementById('edit-phone-number').value.trim()
        };
        updateEmployee(empId, updatedData).then(success => {
            if (success) hideModal(editModal);
        });
    });

    closeDetailsBtn.addEventListener('click', () => hideModal(detailsModal));
    editCancelBtn.addEventListener('click', () => hideModal(editModal));
    leaveRequestForm.addEventListener('submit', handleLeaveRequest);
    timeClockBtn.addEventListener('click', handleTimeClock);
};