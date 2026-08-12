def test_register_success(client):
    """A valid registration should succeed and return tokens + user info."""
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "secure123"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"


def test_register_rejects_invalid_email(client):
    """Registration should fail with a 400 if the email format is invalid."""
    response = client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "secure123"
    })
    assert response.status_code == 400


def test_register_rejects_short_password(client):
    """Registration should fail if the password is under 6 characters."""
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "123"
    })
    assert response.status_code == 400


def test_register_rejects_duplicate_email(client):
    """Registering the same email twice should fail with a 409 conflict."""
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "secure123"
    })
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "different456"
    })
    assert response.status_code == 409


def test_login_success(client):
    """Logging in with correct credentials should return valid tokens."""
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "secure123"
    })
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "secure123"
    })
    assert response.status_code == 200
    assert "access_token" in response.get_json()


def test_login_rejects_wrong_password(client):
    """Logging in with an incorrect password should return 401."""
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "secure123"
    })
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401