# Employee Management System (EMS)

A premium, full-stack Employee Management System built with a sleek glassmorphic slate dark-mode UI, powered by a Python Flask backend and MySQL database.

---

## 🚀 Features

- **Slate Dark-Mode Dashboard**: Built with custom Google Fonts (*Outfit* & *Plus Jakarta Sans*), micro-interactions, custom scrollbars, and full responsive design.
- **Dynamic Analytics**: Real-time stats counting total active employees, average salary, and department distribution charts powered by **Chart.js**.
- **Employee CRUD (Admin Only)**: Admin roles can add, edit, and delete employee records directly mapping to the database.
- **Leave & Time-Off Management**: 
  - Employees can request time-off.
  - Admins and Managers can review pending requests and approve/reject them.
- **Attendance & Time Tracking**:
  - Employees can clock in and clock out dynamically.
  - Active session state is updated on the database.
  - Displays formatted worked logs with durations.
- **Toast Notifications**: Interactive animated Toast notifications popup from the bottom-right corner for clean success/error message visibility.

---

## 📁 Repository Structure

- `employee_management_app.html` - The static frontend HTML structure and style definitions.
- `script.js` - Frontend API client and views controller.
- `app.py` - Python Flask RESTful API server.
- `db.sql` - MySQL Database schema and initial test user records.
- `test_api.py` - Integration validation script to test endpoints.

---

## 🛠️ Local Installation & Setup

### 1. Database Setup (MySQL)
1. Ensure your local MySQL server is running.
2. Run the SQL schema to create the database and seed initial test records:
   ```bash
   mysql -u root -p < db.sql
   ```
   *(Note: The default schema sets password hashes for users `admin`, `manager`, and `alice`)*.

### 2. Python Environment Setup
1. Inside the workspace folder, activate your python virtual environment:
   ```bash
   # Windows PowerShell
   .\venv\Scripts\Activate.ps1
   ```
2. Install the required python dependencies:
   ```bash
   pip install Flask mysql-connector-python bcrypt
   ```

### 3. Running the Backend Server
1. Run the Flask application:
   ```bash
   python app.py
   ```
2. The server will start on `http://127.0.0.1:5000/`. Manual CORS interceptors are built-in so that the local HTML file can communicate directly with this port.

### 4. Running the Frontend
Simply double-click or open `employee_management_app.html` in any modern web browser.

---

## 🔑 Test Credentials

| Username | Password | Role | Employee ID Link |
| :--- | :--- | :--- | :--- |
| `admin` | `adminpassword` | **Admin** | None (Access to all stats, CRUD, leaves approval) |
| `manager` | `managerpassword` | **Manager** | None (Access to stats, leaves approval) |
| `alice` | `anypass` | **Employee** | `E1001` (Access to profile, clock-in, leave requests) |

---

## 🧪 Integration Verification

You can run the programmatic API testing suite to confirm all backend routing and SQL formatting is verified:
```bash
python test_api.py
```
This tests session login, employees CRUD operations, attendance clock-in status, and leaves approval logs.

---
