        // --- DOM Elements ---
        const loginScreen = document.getElementById('login-screen');
        const loginForm = document.getElementById('login-form');
        const loginMessage = document.getElementById('login-message');
        const mainDashboard = document.getElementById('main-dashboard');
        const logoutBtn = document.getElementById('logout-btn');

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
        const departmentStatsEl = document.getElementById('department-stats');

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
        let nextLeaveRequestId = 3; // Starting after mock data
        let nextTimeLogId = 3;

        let mockLeaveRequests = [
            { id: 1, employeeId: 'E1001', name: 'Alice Johnson', type: 'Vacation', startDate: '2025-10-01', endDate: '2025-10-05', reason: 'Annual trip', status: 'Pending' },
            { id: 2, employeeId: 'E1002', name: 'Bob Smith', type: 'Sick', startDate: '2025-09-27', endDate: '2025-09-27', reason: 'Flu', status: 'Approved' }
        ];

        let mockTimeLogs = [
            { id: 1, employeeId: 'E1001', name: 'Alice Johnson', clockIn: '2025-09-26 09:00:00', clockOut: '2025-09-26 17:00:00', duration: 8.0, status: 'Completed' },
            { id: 2, employeeId: 'E1002', name: 'Bob Smith', clockIn: '2025-09-27 09:15:00', clockOut: '2025-09-27 18:00:00', duration: 8.75, status: 'Completed' }
        ];

        // Tracks which employee is currently clocked in (key: employeeId, value: clockIn time string)
        let timeClockState = {};

        function saveLeaveRequests() {
            localStorage.setItem('mockLeaveRequests', JSON.stringify(mockLeaveRequests));
        }
        function loadLeaveRequests() {
            const stored = localStorage.getItem('mockLeaveRequests');
            if (stored) {
                mockLeaveRequests = JSON.parse(stored);
                // Update nextLeaveRequestId to avoid duplicate IDs
                nextLeaveRequestId = mockLeaveRequests.reduce((max, req) => Math.max(max, req.id), 0) + 1;
            }
        }

        function showMessage(text, type = 'success') {
            messageText.textContent = text;
            messageBox.classList.remove('hidden', 'border-green-500', 'border-red-500');
            if (type === 'success') {
                messageBox.classList.add('border-green-500');
                messageBox.classList.remove('border-red-500');
            } else {
                messageBox.classList.add('border-red-500');
                messageBox.classList.remove('border-green-500');
            }
            messageBox.style.opacity = '1';
            messageBox.style.transform = 'translateY(0)';

            setTimeout(() => {
                messageBox.style.opacity = '0';
                messageBox.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    messageBox.classList.add('hidden');
                }, 300);
            }, 3000);
        }

        /** Formats a number as Indian Rupees currency. */
        function formatINR(amount) {
            if (isNaN(amount) || amount === null) return 'N/A';
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
        }

        function calculateDuration(clockIn, clockOut) {
            if (!clockIn || !clockOut) return 'N/A';
            // Use ISO string to ensure correct Date parsing across browsers
            const start = new Date(clockIn.replace(' ', 'T'));
            const end = new Date(clockOut.replace(' ', 'T'));
            const durationMs = end - start;
            return (durationMs / (1000 * 60 * 60)).toFixed(2);
        }

        function hideModal(modal) {
            modal.classList.add('hidden');
        }

        function confirmAction(title, message, callback) {
            modalTitle.textContent = title;
            modalMessage.textContent = message;

            // Reattach event listener for confirmation using a fresh clone to prevent multiple calls
            const oldConfirmBtn = modalConfirmBtn.cloneNode(true);
            modalConfirmBtn.parentNode.replaceChild(oldConfirmBtn, modalConfirmBtn);
            const newConfirmBtn = document.getElementById('modal-confirm-btn');

            newConfirmBtn.addEventListener('click', () => {
                hideModal(confirmModal);
                callback();
            }, { once: true }); // Use { once: true } to auto-remove the listener after first use

            modalCancelBtn.onclick = () => hideModal(confirmModal);
            confirmModal.classList.remove('hidden');
        }

        function updateUIForRole(role) {
            const isAdminOrManager = role === 'Admin' || role === 'Manager';
            const isEmployee = role === 'Employee';

            // Show/hide sections
            addFormView.classList.toggle('hidden', !isAdminOrManager);
            document.getElementById('employee-list-section').classList.toggle('hidden', isEmployee);
            document.getElementById('stats-view').classList.toggle('hidden', isEmployee);
            document.getElementById('employee-profile-section').classList.toggle('hidden', !isEmployee);

            // Show role in dashboard header
            let roleBadge = document.getElementById('role-badge');
            if (!roleBadge) {
                roleBadge = document.createElement('span');
                roleBadge.id = 'role-badge';
                roleBadge.className = 'ml-4 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-sm';
                document.querySelector('header.flex').appendChild(roleBadge);
            }
            roleBadge.textContent = role;

            // If employee, load their profile
            if (isEmployee) {
                showEmployeeProfile();
            }
        }

        function switchView(viewId) {
            // Hide all views
            viewContents.forEach(view => view.classList.add('hidden'));

            // Show the selected view
            const selectedView = document.getElementById(viewId);
            if (selectedView) {
                selectedView.classList.remove('hidden');
            }

            // Update tab styles
            document.querySelectorAll('.tab-button').forEach(button => {
                if (button.dataset.view === viewId) {
                    button.classList.add('border-indigo-600', 'text-indigo-600');
                    button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                } else {
                    button.classList.remove('border-indigo-600', 'text-indigo-600');
                    button.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                }
            });
            // Re-render data for the new view
            if (viewId === 'leave-management-view') {
                renderLeaveRequests();
            } else if (viewId === 'time-tracking-view') {
                renderTimeTrackingUI();
            } else if (viewId === 'dashboard-view') {
                // Ensure employee list is re-rendered on return to dashboard
                filterEmployeeList(searchInput.value);
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
            switchView('dashboard-view'); // Default view
        }

        function showDetailsModal(employee) {
            detailsName.textContent = employee.name;
            detailsContent.innerHTML = `
                <div class="grid grid-cols-2 gap-y-2 text-sm">
                    <p><span class="font-bold text-gray-600">ID:</span></p>
                    <p class="text-right">${employee.id}</p>
                    <p><span class="font-bold text-gray-600">Email:</span></p>
                    <p class="text-right">${employee.email}</p>
                    <p><span class="font-bold text-gray-600">Age:</span></p>
                    <p class="text-right">${employee.age}</p>
                    <p><span class="font-bold text-gray-600">Department:</span></p>
                    <p class="text-right">${employee.department}</p>
                    <p><span class="font-bold text-gray-600">Salary:</span></p>
                    <p class="text-right">${formatINR(employee.salary)}</p>
                    <p><span class="font-bold text-gray-600">Phone:</span></p>
                    <p class="text-right">${employee.phoneNumber || 'N/A'}</p>
                </div>
            `;

            const isAdmin = currentUserRole === 'Admin';

            editDetailsBtn.onclick = () => { hideModal(detailsModal); showEditModal(employee); };
            deleteDetailsBtn.onclick = () => {
                hideModal(detailsModal);
                confirmAction('Delete Employee', `Are you sure you want to delete employee ${employee.name} (${employee.id})? This action cannot be undone.`, () => deleteEmployee(employee.id));
            };

            // Toggle visibility of Admin actions
            document.getElementById('details-actions').classList.toggle('hidden', !isAdmin);

            detailsModal.classList.remove('hidden');
        }

        /** Populates and shows the employee edit modal. */
        function showEditModal(employee) {
            document.getElementById('edit-empId').value = employee.id;
            document.getElementById('edit-name').value = employee.name;
            document.getElementById('edit-email').value = employee.email;
            document.getElementById('edit-age').value = employee.age;
            document.getElementById('edit-salary').value = employee.salary;
            document.getElementById('edit-department').value = employee.department;
            document.getElementById('edit-phone-number').value = employee.phoneNumber || '';
            editModal.classList.remove('hidden');
        }

        function addEmployee(employeeData) {
            if (allEmployees.some(emp => emp.id === employeeData.id)) {
                showMessage(`Employee ID ${employeeData.id} already exists.`, 'error');
                return false;
            }
            allEmployees.push(employeeData);
            localStorage.setItem('allEmployees', JSON.stringify(allEmployees));
            renderEmployeeList(allEmployees);
            renderStats();
            showMessage(`Employee ${employeeData.name} added successfully!`, 'success');
            return true;
        }

        function updateEmployee(id, updatedData) {
            const index = allEmployees.findIndex(emp => emp.id === id);
            if (index !== -1) {
                allEmployees[index] = { ...allEmployees[index], ...updatedData };
                // Re-filter/render the current list state
                filterEmployeeList(searchInput.value);
                renderStats();
                showMessage(`Employee ${updatedData.name} updated successfully.`, 'success');
                return true;
            }
            showMessage(`Employee ID ${id} not found.`, 'error');
            return false;
        }

        function deleteEmployee(id) {
            const initialLength = allEmployees.length;
            allEmployees = allEmployees.filter(emp => emp.id !== id);
            if (allEmployees.length < initialLength) {
                // Re-filter/render the current list state
                filterEmployeeList(searchInput.value);
                renderStats();
                showMessage(`Employee ID ${id} deleted successfully.`, 'success');
            } else {
                showMessage(`Employee ID ${id} not found.`, 'error');
            }
        }

        function fetchEmployeesAndStats() {
            // Try to load from localStorage first
            const stored = localStorage.getItem('allEmployees');
            if (stored) {
                allEmployees = JSON.parse(stored);
            } else {
                allEmployees = [
                    { id: 'E1001', name: 'Alice Johnson', email: 'alice@corp.com', age: 30, salary: 750000, department: 'Engineering', phoneNumber: '9876543210' },
                    { id: 'E1002', name: 'Bob Smith', email: 'bob@corp.com', age: 45, salary: 1200000, department: 'Management', phoneNumber: '9988776655' },
                    { id: 'E1003', name: 'Charlie Brown', email: 'charlie@corp.com', age: 24, salary: 500000, department: 'Marketing', phoneNumber: '9000111222' },
                    { id: 'E1004', name: 'Diana Prince', email: 'diana@corp.com', age: 38, salary: 950000, department: 'Engineering', phoneNumber: '9123456789' }
                ];
                localStorage.setItem('allEmployees', JSON.stringify(allEmployees));
            }
            renderEmployeeList(allEmployees);
            renderStats();
        }

        function renderStats() {
            const total = allEmployees.length;
            const totalSalary = allEmployees.reduce((sum, emp) => sum + emp.salary, 0);
            const avgSalary = total > 0 ? totalSalary / total : 0;

            // Department Counts
            const deptCounts = allEmployees.reduce((acc, emp) => {
                acc[emp.department] = (acc[emp.department] || 0) + 1;
                return acc;
            }, {});

            totalEmployeesEl.textContent = total;
            avgSalaryEl.textContent = formatINR(avgSalary);

            departmentStatsEl.innerHTML = Object.entries(deptCounts).map(([dept, count]) =>
                `<p class="flex justify-between text-sm"><span class="font-medium">${dept}:</span> <span>${count}</span></p>`
            ).join('');
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
                employeeCard.className = 'bg-white p-4 rounded-lg shadow-md border-l-4 border-indigo-500 hover:shadow-xl transition duration-200 cursor-pointer';
                employeeCard.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div class="truncate">
                            <h3 class="text-lg font-semibold text-gray-800 truncate">${employee.name} (${employee.id})</h3>
                            <p class="text-sm text-gray-500">${employee.department} - ${formatINR(employee.salary)}</p>
                        </div>
                        <button class="text-indigo-600 hover:text-indigo-800 font-medium text-sm p-2 rounded-full hover:bg-indigo-50 transition duration-150">
                            Details
                        </button>
                    </div>
                `;
                employeeCard.querySelector('button').addEventListener('click', () => showDetailsModal(employee));

                employeeListEl.appendChild(employeeCard);
            });
        }
        function filterEmployeeList(searchTerm) {
            document.getElementById('sort-filter-combo').value = "";
            const lowerCaseSearch = searchTerm.toLowerCase().trim();
            const filteredEmployees = allEmployees.filter(emp =>
                emp.name.toLowerCase().includes(lowerCaseSearch) ||
                emp.id.toLowerCase().includes(lowerCaseSearch) ||
                emp.department.toLowerCase().includes(lowerCaseSearch)
            );
            renderEmployeeList(filteredEmployees);
        }
        document.getElementById('sort-filter-combo').addEventListener('change', function () {
            const value = this.value;
            let filtered = allEmployees;

            // Apply search filter first
            const searchTerm = searchInput.value.toLowerCase().trim();
            if (searchTerm) {
                filtered = filtered.filter(emp =>
                    emp.name.toLowerCase().includes(searchTerm) ||
                    emp.id.toLowerCase().includes(searchTerm) ||
                    emp.department.toLowerCase().includes(searchTerm)
                );
            }

            // Apply sort/filter
            if (value === 'department') {
                // Group by department (sorted alphabetically)
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

        function renderLeaveRequests() {
            let filteredRequests = mockLeaveRequests;
            const isAdminOrManager = currentUserRole === 'Admin' || currentUserRole === 'Manager';

            if (currentUserRole === 'Employee') {
                filteredRequests = mockLeaveRequests.filter(req => req.employeeId === currentUserId);
            }

            leaveActionHeader.classList.toggle('hidden', !isAdminOrManager);

            if (filteredRequests.length === 0) {
                leaveRequestListEl.innerHTML = `<tr><td colspan="${isAdminOrManager ? 7 : 6}" class="px-6 py-4 text-center text-gray-500">
                    ${currentUserRole === 'Employee' ? 'You have no recorded leave requests.' : 'No pending leave requests found.'}
                 </td></tr>`;
                return;
            }

            leaveRequestListEl.innerHTML = filteredRequests.map(req => {
                const statusColor = req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800';

                const employeeCell = isAdminOrManager ?
                    `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${req.name} (${req.employeeId})</td>` :
                    '';

                const actionCell = isAdminOrManager ? `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        ${req.status === 'Pending' ? `
                            <button onclick="window.processLeaveRequest(${req.id}, 'Approved')" class="text-green-600 hover:text-green-900 mr-3 transition duration-150">Approve</button>
                            <button onclick="window.processLeaveRequest(${req.id}, 'Rejected')" class="text-red-600 hover:text-red-900 transition duration-150">Reject</button>
                        ` : `
                            <span class="text-gray-400">N/A</span>
                        `}
                    </td>
                ` : '';

                return `
                    <tr class="hover:bg-gray-50 transition duration-150">
                        ${employeeCell}
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${req.type}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${req.startDate} to ${req.endDate}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${req.reason.substring(0, 50)}${req.reason.length > 50 ? '...' : ''}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                                ${req.status}
                            </span>
                        </td>
                        ${actionCell}
                    </tr>
                `;
            }).join('');
        }

        function handleLeaveRequest(event) {
            event.preventDefault();

            if (!currentUserId || !currentUserId.startsWith('E')) {
                showMessage('Only registered employees (E-IDs) can submit leave requests.', 'error');
                return;
            }

            const leaveType = document.getElementById('leave-type').value;
            const startDate = document.getElementById('leave-start-date').value;
            const endDate = document.getElementById('leave-end-date').value;
            const reason = document.getElementById('leave-reason').value;

            if (new Date(startDate) > new Date(endDate)) {
                showMessage('Start date cannot be after end date.', 'error');
                return;
            }

            const employee = allEmployees.find(emp => emp.id === currentUserId);

            const newRequest = {
                id: nextLeaveRequestId++,
                employeeId: currentUserId,
                name: employee.name,
                type: leaveType,
                startDate: startDate,
                endDate: endDate,
                reason: reason,
                status: 'Pending'
            };

            mockLeaveRequests.push(newRequest);
            saveLeaveRequests();
            renderLeaveRequests();
            leaveRequestForm.reset();
            showMessage('Leave request submitted successfully. Waiting for approval.', 'success');
        }

        window.processLeaveRequest = function (id, status) {
            if (currentUserRole !== 'Admin' && currentUserRole !== 'Manager') return;

            const requestIndex = mockLeaveRequests.findIndex(req => req.id === id);
            if (requestIndex !== -1) {
                mockLeaveRequests[requestIndex].status = status;
                saveLeaveRequests();
                renderLeaveRequests();
                showMessage(`Leave request for ${mockLeaveRequests[requestIndex].name} ${status} successfully.`, 'success');
            }
        }

        function renderTimeTrackingUI() {
            // Hide clock-in/out feature for non-employees
            const isEmployee = currentUserId && currentUserId.startsWith('E');
            document.getElementById('time-clock-section').classList.toggle('hidden', !isEmployee);

            if (!isEmployee) {
                // Manager/Admin view should just show the full log
                renderTimeLogs();
                return;
            }

            const isClockedIn = !!timeClockState[currentUserId];

            clockStatusDisplay.textContent = isClockedIn ? 'Clocked In' : 'Clocked Out';
            // Update colors based on status
            clockStatusDisplay.classList.toggle('bg-white', !isClockedIn);
            clockStatusDisplay.classList.toggle('text-gray-800', !isClockedIn);
            clockStatusDisplay.classList.toggle('bg-green-600', isClockedIn);
            clockStatusDisplay.classList.toggle('text-white', isClockedIn);

            timeClockBtn.textContent = isClockedIn ? 'Clock Out' : 'Clock In';
            timeClockBtn.classList.toggle('bg-green-600', !isClockedIn);
            timeClockBtn.classList.toggle('bg-red-600', isClockedIn);
            timeClockBtn.classList.toggle('hover:bg-green-700', !isClockedIn);
            timeClockBtn.classList.toggle('hover:bg-red-700', isClockedIn);

            renderTimeLogs(); // Render the employee's logs
        }

        function handleTimeClock() {
            const employeeId = currentUserId;
            const employeeName = allEmployees.find(emp => emp.id === employeeId)?.name || 'Unknown Employee';
            const now = new Date();
            // Format to match mock data standard for consistency (YYYY-MM-DD HH:MM:SS)
            const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

            if (timeClockState[employeeId]) {
                // Clock Out
                const clockInTime = timeClockState[employeeId];
                const duration = calculateDuration(clockInTime, timestamp);

                const newLog = {
                    id: nextTimeLogId++,
                    employeeId: employeeId,
                    name: employeeName,
                    clockIn: clockInTime,
                    clockOut: timestamp,
                    duration: parseFloat(duration),
                    status: 'Completed'
                };
                mockTimeLogs.unshift(newLog); // Add to the start (most recent first)
                delete timeClockState[employeeId]; // Clear state
                showMessage(`Clocked Out successfully. Duration: ${duration} hours.`, 'success');

            } else {
                // Clock In
                timeClockState[employeeId] = timestamp;
                showMessage('Clocked In successfully. Happy working!', 'success');
            }
            renderTimeTrackingUI();
        }

        function renderTimeLogs() {
            let logsToDisplay = mockTimeLogs;
            const isAdminOrManager = currentUserRole === 'Admin' || currentUserRole === 'Manager';

            if (currentUserRole === 'Employee') {
                logsToDisplay = mockTimeLogs.filter(log => log.employeeId === currentUserId);
            }

            document.querySelectorAll('.time-log-manager-only').forEach(el => {
                el.classList.toggle('hidden', !isAdminOrManager);
            });

            if (logsToDisplay.length === 0) {
                timeLogListEl.innerHTML = `<tr><td colspan="${isAdminOrManager ? 5 : 4}" class="px-6 py-4 text-center text-gray-500">No time logs recorded yet.</td></tr>`;
                return;
            }

            timeLogListEl.innerHTML = logsToDisplay.map(log => {
                const employeeCell = isAdminOrManager ?
                    `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.name} (${log.employeeId})</td>` :
                    '';

                const isClockedIn = !log.clockOut && (log.employeeId in timeClockState);
                const statusColor = isClockedIn ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
                const clockOutTime = isClockedIn ? '<span class="text-indigo-500 font-medium">-- Active --</span>' : log.clockOut;
                const durationDisplay = isClockedIn ? '--' : log.duration.toFixed(2);
                const statusText = isClockedIn ? 'Active' : 'Completed';

                return `
                    <tr class="hover:bg-gray-50 transition duration-150">
                        ${employeeCell}
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.clockIn}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${clockOutTime}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${durationDisplay}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function handleLogin(event) {
            event.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            loginMessage.classList.add('hidden');

            if (username === 'admin' && password === 'adminpassword') {
                currentUserRole = 'Admin';
                currentUserId = 'admin';
            } else if (username === 'manager' && password === 'managerpassword') {
                currentUserRole = 'Manager';
                currentUserId = 'manager';
            } else if (username.startsWith('E') && allEmployees.some(e => e.id === username)) {
                const employee = allEmployees.find(e => e.id === username);
                currentUserRole = 'Employee';
                currentUserId = employee.id;
            } else {
                loginMessage.textContent = 'Invalid username or password. Check the test credentials below.';
                loginMessage.classList.remove('hidden');
                return;
            }
            // Save session
            localStorage.setItem('currentUserRole', currentUserRole);
            localStorage.setItem('currentUserId', currentUserId);
            showDashboard();
            showMessage(`Welcome, ${username}!`, 'success');
        }

        function handleLogout() {
            confirmAction('Confirm Logout', 'Are you sure you want to log out?', () => {
                showMessage(`Goodbye, ${currentUserRole}!`, 'success');
                // Remove session
                localStorage.removeItem('currentUserRole');
                localStorage.removeItem('currentUserId');
                showLoginScreen();
            });
        }

        function showEmployeeProfile() {
            const employee = allEmployees.find(emp => emp.id === currentUserId);
            if (!employee) return;
            document.getElementById('employee-profile-content').innerHTML = `
        <div><span class="font-bold">ID:</span> ${employee.id}</div>
        <div><span class="font-bold">Name:</span> ${employee.name}</div>
        <div><span class="font-bold">Email:</span> ${employee.email}</div>
        <div><span class="font-bold">Department:</span> ${employee.department}</div>
        <div><span class="font-bold">Phone:</span> ${employee.phoneNumber || 'N/A'}</div>
        <div><span class="font-bold">Salary:</span> ${formatINR(employee.salary)}</div>
    `;
        }

        window.onload = function () {
            fetchEmployeesAndStats();
            loadLeaveRequests();

            // Restore session
            currentUserRole = localStorage.getItem('currentUserRole');
            currentUserId = localStorage.getItem('currentUserId');
            if (currentUserRole && currentUserId) {
                showDashboard();
            } else {
                showLoginScreen();
            }

            loginForm.addEventListener('submit', handleLogin);
            logoutBtn.addEventListener('click', handleLogout);
            searchInput.addEventListener('input', (e) => filterEmployeeList(e.target.value));

            navTabs.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-button')) {
                    switchView(e.target.dataset.view);
                }
            });

            employeeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (currentUserRole !== 'Admin') return showMessage('Access denied. Only Admin can add employees.', 'error');

                const newEmployee = {
                    id: document.getElementById('empId').value.trim(),
                    name: document.getElementById('name').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    age: parseInt(document.getElementById('age').value),
                    salary: parseInt(document.getElementById('salary').value),
                    department: document.getElementById('department').value.trim(),
                    phoneNumber: document.getElementById('phone-number').value.trim()
                };

                if (addEmployee(newEmployee)) {
                    employeeForm.reset();
                }
            });

            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (currentUserRole !== 'Admin') return showMessage('Access denied. Only Admin can edit employees.', 'error');

                const empId = document.getElementById('edit-empId').value;
                const updatedData = {
                    name: document.getElementById('edit-name').value.trim(),
                    email: document.getElementById('edit-email').value.trim(),
                    age: parseInt(document.getElementById('edit-age').value),
                    salary: parseInt(document.getElementById('edit-salary').value),
                    department: document.getElementById('edit-department').value.trim(),
                    phoneNumber: document.getElementById('edit-phone-number').value.trim()
                };

                updateEmployee(empId, updatedData);
                hideModal(editModal);
            });

            closeDetailsBtn.addEventListener('click', () => hideModal(detailsModal));
            editCancelBtn.addEventListener('click', () => hideModal(editModal));

            leaveRequestForm.addEventListener('submit', handleLeaveRequest);

            timeClockBtn.addEventListener('click', handleTimeClock);

        };