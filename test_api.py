import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:5000"

def make_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req_data = None
    if data:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode("utf-8")
            if res_body:
                return json.loads(res_body), res.status
            return {}, res.status
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            return json.loads(error_body), e.code
        except Exception:
            return {"error": error_body}, e.code

def test_flow():
    print("--- STARTING API VERIFICATION ---")
    
    # 1. Login Admin
    print("\n1. Testing Admin Login...")
    admin_login_data = {"username": "admin", "password": "adminpassword"}
    res, status = make_request("/api/login", "POST", admin_login_data)
    print(f"Status: {status}, Response: {res}")
    if status != 200:
        print("FAIL: Login Admin failed")
        return
    admin_token = res["token"]
    
    # 2. Login Employee (Alice)
    print("\n2. Testing Employee Login...")
    alice_login_data = {"username": "alice", "password": "anypass"}
    res, status = make_request("/api/login", "POST", alice_login_data)
    print(f"Status: {status}, Response: {res}")
    if status != 200:
        print("FAIL: Login Employee failed")
        return
    alice_token = res["token"]

    # 3. Get Employees
    print("\n3. Testing Get Employees (Admin)...")
    res, status = make_request("/api/employees", "GET", token=admin_token)
    print(f"Status: {status}, Total Employees: {len(res)}")
    print(res)

    # 4. Add Employee (Admin)
    print("\n4. Testing Add Employee...")
    new_emp = {
        "empId": "E1003",
        "name": "Charlie Chaplin",
        "email": "charlie@corp.com",
        "age": 55,
        "salary": 95000,
        "department": "Production",
        "role": "Actor",
        "phoneNumber": "8887776665"
    }
    res, status = make_request("/api/employees", "POST", new_emp, token=admin_token)
    print(f"Status: {status}, Response: {res}")
    charlie_id = res.get("id")

    # 5. Check Clock Status for Employee (Alice)
    print("\n5. Checking Clock Status for Alice...")
    res, status = make_request("/api/time/status", "GET", token=alice_token)
    print(f"Status: {status}, Response: {res}")
    original_status = res.get("status")

    # 6. Toggle Clock (Alice Clock In/Out)
    print("\n6. Toggling clock (Clock In/Out) for Alice...")
    res, status = make_request("/api/time/clock", "POST", token=alice_token)
    print(f"Status: {status}, Response: {res}")

    # Check Status again
    res, status = make_request("/api/time/status", "GET", token=alice_token)
    print(f"Status: {status}, New Status Response: {res}")

    # Toggle again to revert clock state
    print("\n7. Toggling clock again (Clock In/Out) for Alice...")
    res, status = make_request("/api/time/clock", "POST", token=alice_token)
    print(f"Status: {status}, Response: {res}")

    # 8. Request Leave (Alice)
    print("\n8. Requesting Leave (Alice)...")
    leave_req = {
        "leave_type": "Vacation",
        "start_date": "2026-07-01",
        "end_date": "2026-07-05",
        "reason": "Family trip to mountains"
    }
    res, status = make_request("/api/leaves", "POST", leave_req, token=alice_token)
    print(f"Status: {status}, Response: {res}")
    leave_id = res.get("id")

    # 9. Get Leaves (Admin sees all)
    print("\n9. Testing Get Leaves (Admin)...")
    res, status = make_request("/api/leaves", "GET", token=admin_token)
    print(f"Status: {status}, Total Leaves: {len(res)}")
    print(res)

    # 10. Approve Leave (Admin)
    if leave_id:
        print(f"\n10. Approving Leave ID {leave_id} (Admin)...")
        res, status = make_request(f"/api/leaves/{leave_id}", "PUT", {"status": "Approved"}, token=admin_token)
        print(f"Status: {status}, Response: {res}")

    # 11. Delete Charlie to clean up database (Admin)
    if charlie_id:
        print(f"\n11. Cleaning up: Deleting Charlie ID {charlie_id}...")
        res, status = make_request(f"/api/employees/{charlie_id}", "DELETE", token=admin_token)
        print(f"Status: {status}, Response: {res}")

    print("\n--- API VERIFICATION COMPLETED ---")

if __name__ == "__main__":
    test_flow()
