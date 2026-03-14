import os
import requests
import sys

# Required environment variables for test credentials:
#   TEST_USER_EMAIL    - e-mail address of the test account
#   TEST_USER_PASSWORD - password of the test account
#   TEST_USER_NAME     - display name of the test account (default: "Test")
#   TEST_USER_ROLE     - role of the test account (default: "Clinician")
BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:8000")
TIMEOUT = 5

def test_backend():
    # 1. Health check (if exists) or just root
    r = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
    assert r.status_code == 200, f"/health returned {r.status_code}: {r.text}"

    # 2. Login
    payload = {
        "email": os.environ["TEST_USER_EMAIL"],
        "password": os.environ["TEST_USER_PASSWORD"],
        "name": os.environ.get("TEST_USER_NAME", "Test"),
        "role": os.environ.get("TEST_USER_ROLE", "Clinician"),
    }
    r = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, f"/auth/login returned {r.status_code}: {r.text}"
    token = r.json().get("access_token")
    assert token is not None, "Login response did not contain access_token"

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Test Dashboard Summary
    r = requests.get(f"{BASE_URL}/dashboard/summary", headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200, f"/dashboard/summary returned {r.status_code}: {r.text}"

    # 4. Test Dashboard Audit Logs
    r = requests.get(f"{BASE_URL}/dashboard/audit-logs", headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200, f"/dashboard/audit-logs returned {r.status_code}: {r.text}"

if __name__ == "__main__":
    test_backend()
