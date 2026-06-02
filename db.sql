-- db_setup.sql (MySQL Edition)
-- Use a specific database (e.g., 'ems_db')

CREATE DATABASE IF NOT EXISTS ems_db;
USE ems_db;

-- 1. Users Table (for Authentication and Authorization)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    -- Recommended length for bcrypt hash is 60 or 255 for future-proofing
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'Employee', -- 'Admin', 'Manager', 'Employee'
    employee_id VARCHAR(20) UNIQUE, -- Links user to the employees table (e.g., E1001)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTE: Passwords must be generated and HASHED using Flask/Python (e.g., bcrypt)
-- before insertion. The values below are placeholders that your Python script will overwrite.
INSERT INTO users (username, password_hash, role, employee_id) VALUES
('admin', '$2b$12$jQf/2vH.1.E5V/O7eQ5w.eN6zS0qL2mD0gW6y0c9m9Q4c0l7K5yG4S', 'Admin', NULL),     -- Password: adminpassword
('manager', '$2b$12$H7f/2vH.1.E5V/O7eQ5w.eN6zS0qL2mD0gW6y0c9m9Q4c0l7K5yG4S', 'Manager', NULL), -- Password: managerpassword
('alice', '$2b$12$lQf/2vH.1.E5V/O7eQ5w.eN6zS0qL2mD0gW6y0c9m9Q4c0l7K5yG4S', 'Employee', 'E1001'); -- Password: anypass

-- 2. Employees Table for main Employee Data
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empId VARCHAR(20) NOT NULL UNIQUE, -- Unique Employee Business ID (E1001)
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    age INT,
    salary INT,
    department VARCHAR(50),
    job_role VARCHAR(50),
    phone_number VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some initial employee data
INSERT INTO employees (empId, name, email, age, salary, department, job_role, phone_number) VALUES
('E1001', 'Alice Johnson', 'alice.j@corp.com', 30, 85000, 'Development', 'Senior Developer', '9876543210'),
('E1002', 'Bob Smith', 'bob.s@corp.com', 45, 120000, 'Management', 'Project Manager', '9988776655');

-- 3. Leave Requests Table
CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    empId VARCHAR(20) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 4. Time Logs Table
CREATE TABLE time_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    empId VARCHAR(20) NOT NULL,
    clock_in DATETIME NOT NULL,
    clock_out DATETIME NULL,
    duration DECIMAL(5, 2), -- Calculated hours (e.g., 8.50)
    status VARCHAR(20) DEFAULT 'In', -- 'In', 'Completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);