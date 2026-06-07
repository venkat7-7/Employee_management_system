import mysql.connector
from flask import Flask, request, jsonify
from functools import wraps
import bcrypt
import datetime

# =======================================================================
# Configuration
# =======================================================================
app = Flask(__name__)

# MySQL Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',       
    'password': 'root', 
    'database': 'ems_db'  
}

# Simple dictionary to simulate user sessions and roles based on a token.
# Key: Mock Token (username/session string), Value: User Details dict
MOCK_TOKENS = {}

# =======================================================================
# Database Connection Utilities
# =======================================================================

def get_db_connection():
    """Establishes and returns a new connection to the MySQL database."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None

# =======================================================================
# CORS Middleware Handlers
# =======================================================================

@app.before_request
def handle_options():
    """Intercept pre-flight OPTIONS requests for CORS compliance."""
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return response

@app.after_request
def add_cors_headers(response):
    """Append standard CORS headers to every response."""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

# =======================================================================
# Authentication and Authorization Decorators
# =======================================================================

def token_required(f):
    """Decorator to check for a valid 'Authorization' header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Frontend is expected to send 'Authorization': 'Bearer <token>'
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'message': 'Authorization token is missing'}), 401

        # Extract token (assuming 'Bearer token')
        try:
            token = auth_header.split()[1]
        except IndexError:
            return jsonify({'message': 'Token format is invalid'}), 401

        if token not in MOCK_TOKENS:
            return jsonify({'message': 'Token is invalid or expired'}), 401

        # Pass the current user info to the request context
        request.current_user = MOCK_TOKENS[token]
        request.current_user_role = MOCK_TOKENS[token]['role']
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator to check if the current user has the 'Admin' role."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.current_user_role != 'Admin':
            return jsonify({'message': 'Access denied: Admin role required'}), 403
        return f(*args, **kwargs)
    return decorated

def admin_or_manager_required(f):
    """Decorator to check if the current user has 'Admin' or 'Manager' role."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.current_user_role not in ['Admin', 'Manager']:
            return jsonify({'message': 'Access denied: Admin or Manager role required'}), 403
        return f(*args, **kwargs)
    return decorated

# =======================================================================
# Authentication API Endpoint
# =======================================================================

@app.route('/api/login', methods=['POST'])
def login():
    """Handles user login and returns a token (username) and role."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Missing username or password'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor(dictionary=True)
    
    # Query for the user
    query = "SELECT username, role, password_hash, employee_id FROM users WHERE username = %s"
    cursor.execute(query, (username,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()

    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')): 
        # Successful login
        token = user['username'] # Use username as simple session token
        MOCK_TOKENS[token] = {
            'username': user['username'],
            'role': user['role'],
            'employee_id': user['employee_id']
        }
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'role': user['role'],
            'employee_id': user['employee_id']
        }), 200
    else:
        # Failed login
        return jsonify({'message': 'Invalid credentials'}), 401

# =======================================================================
# Employee CRUD API Endpoints
# =======================================================================

@app.route('/api/employees', methods=['GET'])
@token_required
def get_employees():
    """Fetches all employee records."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor(dictionary=True)
    query = "SELECT id, empId, name, email, age, salary, department, job_role, phone_number FROM employees"
    cursor.execute(query)
    employees = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(employees), 200

@app.route('/api/employees', methods=['POST'])
@admin_required # Only Admin can add new employees
def add_employee():
    """Adds a new employee record to the database."""
    data = request.get_json()
    try:
        empId = data['empId']
        name = data['name']
        email = data['email']
        age = data['age']
        salary = data['salary']
        department = data['department']
        job_role = data.get('role', '') # Frontend uses 'role' or 'job_role'
        phone_number = data.get('phoneNumber', '')
    except KeyError as e:
        return jsonify({'message': f'Missing field: {e}'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor()
    query = """
    INSERT INTO employees (empId, name, email, age, salary, department, job_role, phone_number)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    try:
        cursor.execute(query, (empId, name, email, age, salary, department, job_role, phone_number))
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({'message': 'Employee added successfully', 'id': new_id}), 201
    except mysql.connector.IntegrityError as e:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Email or Employee ID already exists'}), 409
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/employees/<int:emp_id>', methods=['PUT'])
@admin_required # Only Admin can edit employees
def update_employee(emp_id):
    """Updates an existing employee record by ID."""
    data = request.get_json()
    
    fields = ['name', 'email', 'age', 'salary', 'department', 'role', 'phoneNumber', 'empId']
    update_data = {}
    for field in fields:
        if field in data:
            if field == 'role':
                db_field = 'job_role'
            elif field == 'phoneNumber':
                db_field = 'phone_number'
            else:
                db_field = field
            update_data[db_field] = data[field]
    
    if not update_data:
        return jsonify({'message': 'No fields provided for update'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor()
    
    set_clauses = [f"{key} = %s" for key in update_data.keys()]
    query = f"UPDATE employees SET {', '.join(set_clauses)} WHERE id = %s"
    values = list(update_data.values()) + [emp_id]

    try:
        cursor.execute(query, tuple(values))
        conn.commit()
        rows_affected = cursor.rowcount
        cursor.close()
        conn.close()

        if rows_affected == 0:
            return jsonify({'message': f'Employee with ID {emp_id} not found'}), 404
        
        return jsonify({'message': 'Employee updated successfully'}), 200

    except mysql.connector.IntegrityError:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Email or Employee ID already exists for another employee'}), 409
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({'message': f'Database error: {str(e)}'}), 500


@app.route('/api/employees/<int:emp_id>', methods=['DELETE'])
@admin_required # Only Admin can delete employees
def delete_employee(emp_id):
    """Deletes an employee record by ID."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor()
    query = "DELETE FROM employees WHERE id = %s"
    
    try:
        cursor.execute(query, (emp_id,))
        conn.commit()
        rows_affected = cursor.rowcount
        cursor.close()
        conn.close()

        if rows_affected == 0:
            return jsonify({'message': f'Employee with ID {emp_id} not found'}), 404
            
        return jsonify({'message': 'Employee deleted successfully'}), 200

    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({'message': f'Database error: {str(e)}'}), 500

# =======================================================================
# Leave Management Endpoints
# =======================================================================

@app.route('/api/leaves', methods=['GET'])
@token_required
def get_leaves():
    """Retrieve leave requests. Employees see their own; Admin/Manager see all."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor(dictionary=True)
    
    if request.current_user_role == 'Employee':
        query = """
        SELECT lr.id, lr.employee_id, lr.empId, lr.leave_type, 
               DATE_FORMAT(lr.start_date, '%Y-%m-%d') as startDate, 
               DATE_FORMAT(lr.end_date, '%Y-%m-%d') as endDate, 
               lr.reason, lr.status, e.name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        WHERE lr.empId = %s
        ORDER BY lr.created_at DESC
        """
        cursor.execute(query, (request.current_user['employee_id'],))
    else:
        # Admin or Manager sees all
        query = """
        SELECT lr.id, lr.employee_id, lr.empId, lr.leave_type, 
               DATE_FORMAT(lr.start_date, '%Y-%m-%d') as startDate, 
               DATE_FORMAT(lr.end_date, '%Y-%m-%d') as endDate, 
               lr.reason, lr.status, e.name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        ORDER BY lr.created_at DESC
        """
        cursor.execute(query)
        
    leaves = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(leaves), 200

@app.route('/api/leaves', methods=['POST'])
@token_required
def request_leave():
    """Request a new leave (Employee only)."""
    if request.current_user_role != 'Employee':
        return jsonify({'message': 'Access denied: Only employees can request leaves'}), 403

    data = request.get_json()
    try:
        leave_type = data['leave_type']
        start_date = data['start_date']
        end_date = data['end_date']
        reason = data['reason']
    except KeyError as e:
        return jsonify({'message': f'Missing field: {e}'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor(dictionary=True)
    
    # Get employee primary key id from business empId
    empId = request.current_user['employee_id']
    cursor.execute("SELECT id FROM employees WHERE empId = %s", (empId,))
    emp = cursor.fetchone()
    
    if not emp:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Employee record not found'}), 404

    query = """
    INSERT INTO leave_requests (employee_id, empId, leave_type, start_date, end_date, reason, status)
    VALUES (%s, %s, %s, %s, %s, %s, 'Pending')
    """
    try:
        cursor.execute(query, (emp['id'], empId, leave_type, start_date, end_date, reason))
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({'message': 'Leave request submitted successfully', 'id': new_id}), 201
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/leaves/<int:request_id>', methods=['PUT'])
@admin_or_manager_required
def update_leave_status(request_id):
    """Approve or reject a leave request (Admin/Manager only)."""
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['Approved', 'Rejected']:
        return jsonify({'message': 'Invalid status value. Must be Approved or Rejected'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor()
    query = "UPDATE leave_requests SET status = %s WHERE id = %s"
    try:
        cursor.execute(query, (status, request_id))
        conn.commit()
        rows = cursor.rowcount
        cursor.close()
        conn.close()
        
        if rows == 0:
            return jsonify({'message': 'Leave request not found'}), 404
            
        return jsonify({'message': f'Leave request successfully {status.lower()}'}), 200
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({'message': f'Database error: {str(e)}'}), 500

# =======================================================================
# Time Tracking & Attendance Endpoints
# =======================================================================

@app.route('/api/time/status', methods=['GET'])
@token_required
def get_clock_status():
    """Retrieve current clock status for the logged-in Employee."""
    if request.current_user_role != 'Employee':
        return jsonify({'message': 'Access denied: Only employees have clock status'}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor(dictionary=True)
    empId = request.current_user['employee_id']
    
    query = """
    SELECT DATE_FORMAT(clock_in, '%Y-%m-%d %H:%i:%S') as clock_in 
    FROM time_logs 
    WHERE empId = %s AND status = 'In' AND clock_out IS NULL
    LIMIT 1
    """
    cursor.execute(query, (empId,))
    log = cursor.fetchone()
    cursor.close()
    conn.close()

    if log:
        return jsonify({'status': 'Clocked In', 'clock_in': log['clock_in']}), 200
    else:
        return jsonify({'status': 'Clocked Out'}), 200

@app.route('/api/time/clock', methods=['POST'])
@token_required
def perform_clock():
    """Clock in or clock out (Employee only)."""
    if request.current_user_role != 'Employee':
        return jsonify({'message': 'Access denied: Only employees can clock in/out'}), 403

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor(dictionary=True)
    empId = request.current_user['employee_id']
    
    # Get employee primary key id
    cursor.execute("SELECT id FROM employees WHERE empId = %s", (empId,))
    emp = cursor.fetchone()
    if not emp:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Employee record not found'}), 404

    # Check for active clock-in
    query_active = "SELECT id, clock_in FROM time_logs WHERE employee_id = %s AND status = 'In' AND clock_out IS NULL"
    cursor.execute(query_active, (emp['id'],))
    active_log = cursor.fetchone()

    now = datetime.datetime.now()
    now_str = now.strftime('%Y-%m-%d %H:%M:%S')

    if active_log:
        # Clock Out: Update active log
        clock_in_time = active_log['clock_in']
        duration_delta = now - clock_in_time
        duration_hours = round(duration_delta.total_seconds() / 3600.0, 2)
        
        query_update = """
        UPDATE time_logs 
        SET clock_out = %s, duration = %s, status = 'Completed' 
        WHERE id = %s
        """
        try:
            cursor.execute(query_update, (now_str, duration_hours, active_log['id']))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({
                'message': 'Clocked out successfully', 
                'clock_out': now_str, 
                'duration': duration_hours
            }), 200
        except Exception as e:
            cursor.close()
            conn.close()
            return jsonify({'message': f'Database error: {str(e)}'}), 500
    else:
        # Clock In: Insert new log
        query_insert = """
        INSERT INTO time_logs (employee_id, empId, clock_in, status)
        VALUES (%s, %s, %s, 'In')
        """
        try:
            cursor.execute(query_insert, (emp['id'], empId, now_str))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({
                'message': 'Clocked in successfully', 
                'clock_in': now_str
            }), 201
        except Exception as e:
            cursor.close()
            conn.close()
            return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/time/logs', methods=['GET'])
@token_required
def get_time_logs():
    """Retrieve time logs. Employees see their own; Admin/Manager see all."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor(dictionary=True)
    
    if request.current_user_role == 'Employee':
        query = """
        SELECT tl.id, tl.employee_id, tl.empId, 
               DATE_FORMAT(tl.clock_in, '%Y-%m-%d %H:%i:%S') as clockIn, 
               DATE_FORMAT(tl.clock_out, '%Y-%m-%d %H:%i:%S') as clockOut, 
               tl.duration, tl.status, e.name
        FROM time_logs tl
        JOIN employees e ON tl.employee_id = e.id
        WHERE tl.empId = %s
        ORDER BY tl.clock_in DESC
        """
        cursor.execute(query, (request.current_user['employee_id'],))
    else:
        query = """
        SELECT tl.id, tl.employee_id, tl.empId, 
               DATE_FORMAT(tl.clock_in, '%Y-%m-%d %H:%i:%S') as clockIn, 
               DATE_FORMAT(tl.clock_out, '%Y-%m-%d %H:%i:%S') as clockOut, 
               tl.duration, tl.status, e.name
        FROM time_logs tl
        JOIN employees e ON tl.employee_id = e.id
        ORDER BY tl.clock_in DESC
        """
        cursor.execute(query)

    logs = cursor.fetchall()
    cursor.close()
    conn.close()
    
    # Process float serialization
    for log in logs:
        if log['duration'] is not None:
            log['duration'] = float(log['duration'])
            
    return jsonify(logs), 200

# =======================================================================
# Run Application
# =======================================================================

if __name__ == '__main__':
    print(f"Starting Flask server on http://127.0.0.1:5000/")
    print(f"Admin Token: admin (Role: Admin) | User Token: user (Role: User)")
    app.run(debug=True)
