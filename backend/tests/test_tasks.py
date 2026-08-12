def register_and_login(client):
    """
    Helper (not a test itself) — registers a user and returns their
    access token, since every task endpoint requires authentication.
    """
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "secure123"
    })
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "secure123"
    })
    return response.get_json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_create_task_requires_auth(client):
    """Hitting the tasks endpoint with no token should be rejected."""
    response = client.post("/api/tasks", json={"text": "Buy milk"})
    assert response.status_code == 401


def test_create_and_list_task(client):
    """A logged-in user should be able to create a task and see it listed."""
    token = register_and_login(client)

    create_response = client.post(
        "/api/tasks",
        json={"text": "Buy milk", "priority": "high"},
        headers=auth_header(token)
    )
    assert create_response.status_code == 201
    assert create_response.get_json()["text"] == "Buy milk"

    list_response = client.get("/api/tasks", headers=auth_header(token))
    assert list_response.status_code == 200
    tasks = list_response.get_json()
    assert len(tasks) == 1
    assert tasks[0]["text"] == "Buy milk"


def test_update_task(client):
    """Marking a task as done should be reflected when fetched again."""
    token = register_and_login(client)
    create_response = client.post(
        "/api/tasks", json={"text": "Walk the dog"}, headers=auth_header(token)
    )
    task_id = create_response.get_json()["id"]

    update_response = client.patch(
        f"/api/tasks/{task_id}", json={"done": True}, headers=auth_header(token)
    )
    assert update_response.status_code == 200
    assert update_response.get_json()["done"] is True


def test_delete_task(client):
    """A deleted task should no longer appear in the task list."""
    token = register_and_login(client)
    create_response = client.post(
        "/api/tasks", json={"text": "Temporary task"}, headers=auth_header(token)
    )
    task_id = create_response.get_json()["id"]

    delete_response = client.delete(f"/api/tasks/{task_id}", headers=auth_header(token))
    assert delete_response.status_code == 204

    list_response = client.get("/api/tasks", headers=auth_header(token))
    assert list_response.get_json() == []


def test_cannot_access_another_users_task(client):
    """A user should not be able to update/delete another user's task."""
    token1 = register_and_login(client)

    # Second user registers separately
    client.post("/api/auth/register", json={
        "email": "other@example.com",
        "password": "secure123"
    })
    login2 = client.post("/api/auth/login", json={
        "email": "other@example.com",
        "password": "secure123"
    })
    token2 = login2.get_json()["access_token"]

    create_response = client.post(
        "/api/tasks", json={"text": "User 1's task"}, headers=auth_header(token1)
    )
    task_id = create_response.get_json()["id"]

    # User 2 tries to delete User 1's task
    delete_response = client.delete(f"/api/tasks/{task_id}", headers=auth_header(token2))
    assert delete_response.status_code == 404