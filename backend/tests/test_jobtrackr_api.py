"""Core auth, applications, detections, analytics, and Gmail config API tests."""

import os
import uuid

import pytest
import requests


BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL")


@pytest.fixture(scope="session")
def api_client():
    if not BASE_URL:
        pytest.skip("EXPO_PUBLIC_BACKEND_URL is not set")
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def auth_context(api_client):
    email = f"test_jobtrackr_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass123!"
    name = "TEST JobTrackr"

    register_response = api_client.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": password, "name": name},
        timeout=20,
    )
    assert register_response.status_code == 200
    register_data = register_response.json()
    assert register_data["user"]["email"] == email
    assert register_data["user"]["name"] == name
    assert register_data["user"]["auth_provider"] == "email"

    token = register_data["token"]
    assert token

    login_response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=20,
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["user"]["email"] == email
    assert login_data["token"]

    headers = {"Authorization": f"Bearer {token}"}
    return {"email": email, "password": password, "token": token, "headers": headers, "created_apps": [], "created_detection": None}


def test_auth_me_protected_endpoint(api_client, auth_context):
    response = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_context["headers"], timeout=20)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == auth_context["email"]
    assert data["auth_provider"] == "email"


# Applications CRUD-lite and Kanban status lifecycle
def test_create_application_and_verify_in_list(api_client, auth_context):
    payload = {
        "company_name": "TEST Acme Corp",
        "role": "TEST Mobile Engineer",
        "status": "Applied",
        "applied_date": "2026-01-15",
        "job_link": "https://example.com/jobs/1",
        "notes": "TEST create flow",
        "resume_version": "v1",
        "follow_up_date": "2026-01-20",
        "source": "manual",
    }
    create_response = api_client.post(
        f"{BASE_URL}/api/applications",
        json=payload,
        headers=auth_context["headers"],
        timeout=20,
    )
    assert create_response.status_code == 200
    created = create_response.json()
    auth_context["created_apps"].append(created["id"])
    assert created["company_name"] == payload["company_name"]
    assert created["role"] == payload["role"]
    assert created["status"] == "Applied"

    list_response = api_client.get(f"{BASE_URL}/api/applications", headers=auth_context["headers"], timeout=20)
    assert list_response.status_code == 200
    listed = list_response.json()
    match = next((item for item in listed if item["id"] == created["id"]), None)
    assert match is not None
    assert match["company_name"] == payload["company_name"]
    assert match["source"] == "manual"


def test_update_application_status_and_verify(api_client, auth_context):
    apps_response = api_client.get(f"{BASE_URL}/api/applications", headers=auth_context["headers"], timeout=20)
    assert apps_response.status_code == 200
    apps = apps_response.json()
    if not apps:
        pytest.skip("No application available to update")

    app_id = apps[0]["id"]
    patch_response = api_client.patch(
        f"{BASE_URL}/api/applications/{app_id}/status",
        json={"status": "Interview"},
        headers=auth_context["headers"],
        timeout=20,
    )
    assert patch_response.status_code == 200
    patched = patch_response.json()
    assert patched["id"] == app_id
    assert patched["status"] == "Interview"

    verify_response = api_client.get(f"{BASE_URL}/api/applications", headers=auth_context["headers"], timeout=20)
    assert verify_response.status_code == 200
    verified = verify_response.json()
    updated = next((item for item in verified if item["id"] == app_id), None)
    assert updated is not None
    assert updated["status"] == "Interview"


# Detection parsing and acceptance workflow
def test_detection_parse_fallback_without_grok_key(api_client, auth_context):
    response = api_client.post(
        f"{BASE_URL}/api/detections/parse",
        json={
            "source": "share",
            "text": "Applied to TEST Globex for Senior Engineer on 2026-01-10 https://globex.com/jobs/22",
        },
        headers=auth_context["headers"],
        timeout=25,
    )
    assert response.status_code == 200
    parsed = response.json()
    auth_context["created_detection"] = parsed["id"]
    assert parsed["source"] == "share"
    assert parsed["state"] == "pending"
    assert parsed["ai_available"] is False
    assert "fallback" in parsed["config_message"].lower() or "not configured" in parsed["config_message"].lower()


def test_accept_detection_creates_application(api_client, auth_context):
    detection_id = auth_context.get("created_detection")
    if not detection_id:
        pytest.skip("No detection available to accept")

    accept_response = api_client.post(
        f"{BASE_URL}/api/detections/{detection_id}/accept",
        headers=auth_context["headers"],
        timeout=20,
    )
    assert accept_response.status_code == 200
    accepted_app = accept_response.json()
    auth_context["created_apps"].append(accepted_app["id"])
    assert accepted_app["source"] == "share"
    assert accepted_app["company_name"]
    assert accepted_app["role"]

    list_response = api_client.get(f"{BASE_URL}/api/applications", headers=auth_context["headers"], timeout=20)
    assert list_response.status_code == 200
    listed = list_response.json()
    created = next((item for item in listed if item["id"] == accepted_app["id"]), None)
    assert created is not None
    assert created["company_name"] == accepted_app["company_name"]


# Analytics and Gmail config gating checks
def test_analytics_endpoint_metrics_shape(api_client, auth_context):
    response = api_client.get(f"{BASE_URL}/api/analytics", headers=auth_context["headers"], timeout=20)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["total"], int)
    assert isinstance(data["success_rate"], (int, float))
    assert "Applied" in data["by_status"]
    assert "Rejected" in data["by_status"]


def test_gmail_config_reports_unconfigured_and_redirect_uri(api_client, auth_context):
    response = api_client.get(f"{BASE_URL}/api/gmail/config", headers=auth_context["headers"], timeout=20)
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is False
    assert data["connected"] is False
    assert data["redirect_uri"].endswith("/api/gmail/callback")
    assert "GOOGLE_CLIENT_ID" in data["message"]


def test_cleanup_created_applications(api_client, auth_context):
    for app_id in auth_context["created_apps"]:
        delete_response = api_client.delete(
            f"{BASE_URL}/api/applications/{app_id}",
            headers=auth_context["headers"],
            timeout=20,
        )
        assert delete_response.status_code == 200
