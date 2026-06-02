import mysql.connector
from flask import Flask, request, jsonify
from functools import wraps

# =======================================================================
# Configuration
# =======================================================================
app = Flask(__name__)

# NOTE: Replace these credentials with your actual MySQL database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',       # Example user
    'password': 'root', # REPLACE THIS
    'database': 'ems_db'  # Database created using mysql_schema.sql
}

# Simple dictionary to simulate user sessions and roles based on a token.
# In a real application, you would use JWTs (JSON Web Tokens) or Flask-Login.
# Key: Mock Token (username), Value: Role ('Admin' or 'User')
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

        # Pass the current user role to the function
        request.current_user_role = MOCK_TOKENS[token]
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
    query = "SELECT username, role, password_hash FROM users WHERE username = %s"
    cursor.execute(query, (username,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()

    if user and user['password_hash'] == password: 
        # Successful login
        token = user['username'] # Use username as a simple token
        MOCK_TOKENS[token] = user['role']
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'role': user['role']
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
    query = "SELECT id, name, email, age, salary, department, job_role FROM employees"
    cursor.execute(query)
    employees = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    # The frontend expects a list of employees.
    return jsonify(employees), 200

@app.route('/api/employees', methods=['POST'])
@admin_required # Only Admin can add new employees
def add_employee():
    """Adds a new employee record to the database."""
    data = request.get_json()
    try:
        name = data['name']
        email = data['email']
        age = data['age']
        salary = data['salary']
        department = data['department']
        job_role = data['role'] # Frontend uses 'role' for job title
    except KeyError as e:
        return jsonify({'message': f'Missing field: {e}'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor()
    query = """
    INSERT INTO employees (name, email, age, salary, department, job_role)
    VALUES (%s, %s, %s, %s, %s, %s)
    """
    try:
        cursor.execute(query, (name, email, age, salary, department, job_role))
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({'message': 'Employee added successfully', 'id': new_id}), 201
    except mysql.connector.IntegrityError:
        cursor.close()
        conn.close()
        return jsonify({'message': 'Email already exists for another employee'}), 409
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/employees/<int:emp_id>', methods=['PUT'])
@admin_required # Only Admin can edit employees
def update_employee(emp_id):
    """Updates an existing employee record by ID."""
    data = request.get_json()
    
    # Extract data with safety checks
    fields = ['name', 'email', 'age', 'salary', 'department', 'role']
    update_data = {}
    for field in fields:
        if field in data:
            # Map 'role' from frontend to 'job_role' in DB
            db_field = 'job_role' if field == 'role' else field 
            update_data[db_field] = data[field]
    
    if not update_data:
        return jsonify({'message': 'No fields provided for update'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection error'}), 500

    cursor = conn.cursor()
    
    # Build dynamic UPDATE query
    set_clauses = [f"{key} = %s" for key in update_data.keys()]
    query = f"UPDATE employees SET {', '.join(set_clauses)} WHERE id = %s"
    
    # Create tuple of values: values + emp_id
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
        return jsonify({'message': 'Email already exists for another employee'}), 409
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
# Run Application
# =======================================================================

if __name__ == '__main__':
    # You can run this file using 'python app.py' and it will serve on 
    # http://127.0.0.1:5000/
    print(f"Starting Flask server on http://127.0.0.1:5000/")
    print(f"Admin Token: admin (Role: Admin) | User Token: user (Role: User)")
    print(f"NOTE: The frontend code must be modified to point its fetch calls to http://127.0.0.1:5000/api/...")
    app.run(debug=True)
