import re
from datetime import date

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from flask_migrate import Migrate

from config import Config
from models import db, User, Task, VALID_PRIORITIES
from email_utils import send_email

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_TAGS = 10
MAX_TAG_LENGTH = 50


def clean_tags(raw_tags):
    """Validate/normalize a list of tag strings. Raises ValueError on bad input."""
    if raw_tags is None:
        return []
    if not isinstance(raw_tags, list):
        raise ValueError("tags must be a list of strings")

    cleaned = []
    seen = set()
    for tag in raw_tags:
        if not isinstance(tag, str):
            raise ValueError("each tag must be a string")
        t = tag.strip()
        if not t:
            continue
        if len(t) > MAX_TAG_LENGTH:
            raise ValueError(f"tags must be {MAX_TAG_LENGTH} characters or fewer")
        if t.lower() not in seen:
            seen.add(t.lower())
            cleaned.append(t)
    if len(cleaned) > MAX_TAGS:
        raise ValueError(f"a task can have at most {MAX_TAGS} tags")
    return cleaned


def parse_due_date(raw):
    """Parse an ISO 'YYYY-MM-DD' string into a date, or None. Raises ValueError."""
    if raw in (None, ""):
        return None
    try:
        return date.fromisoformat(raw)
    except (TypeError, ValueError):
        raise ValueError("due_date must be in YYYY-MM-DD format")


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    Migrate(app, db)
    JWTManager(app)
    CORS(app, origins=app.config["CORS_ORIGINS"])

    # ---------- health ----------
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    # ---------- auth: register / login / refresh ----------
    @app.post("/api/auth/register")
    def register():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not EMAIL_RE.match(email):
            return jsonify({"error": "a valid email is required"}), 400
        if len(password) < 6:
            return jsonify({"error": "password must be at least 6 characters"}), 400
        if User.query.filter_by(email=email).first() is not None:
            return jsonify({"error": "an account with that email already exists"}), 409

        user = User(email=email)
        user.set_password(password)
        token = user.generate_verification_token()
        db.session.add(user)
        db.session.commit()

        verify_link = f"{app.config['FRONTEND_URL']}/verify-email?token={token}"
        send_email(
            to=user.email,
            subject="Verify your Ledger account",
            body=f"Welcome! Verify your email by visiting:\n{verify_link}",
        )

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        response = {"access_token": access_token, "refresh_token": refresh_token, "user": user.to_dict()}
        if app.config["EXPOSE_AUTH_LINKS_IN_RESPONSE"]:
            response["dev_verify_link"] = verify_link
        return jsonify(response), 201

    @app.post("/api/auth/login")
    def login():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if user is None or not user.check_password(password):
            return jsonify({"error": "invalid email or password"}), 401

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        return jsonify({"access_token": access_token, "refresh_token": refresh_token, "user": user.to_dict()})

    @app.post("/api/auth/refresh")
    @jwt_required(refresh=True)
    def refresh():
        user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=user_id)
        return jsonify({"access_token": new_access_token})

    @app.get("/api/auth/me")
    @jwt_required()
    def me():
        user = User.query.get(int(get_jwt_identity()))
        if user is None:
            return jsonify({"error": "user not found"}), 404
        return jsonify(user.to_dict())

    # ---------- auth: email verification ----------
    @app.post("/api/auth/resend-verification")
    @jwt_required()
    def resend_verification():
        user = User.query.get(int(get_jwt_identity()))
        if user is None:
            return jsonify({"error": "user not found"}), 404
        if user.is_verified:
            return jsonify({"message": "this account is already verified"})

        token = user.generate_verification_token()
        db.session.commit()

        verify_link = f"{app.config['FRONTEND_URL']}/verify-email?token={token}"
        send_email(
            to=user.email,
            subject="Verify your Ledger account",
            body=f"Verify your email by visiting:\n{verify_link}",
        )

        response = {"message": "verification email sent"}
        if app.config["EXPOSE_AUTH_LINKS_IN_RESPONSE"]:
            response["dev_verify_link"] = verify_link
        return jsonify(response)

    @app.post("/api/auth/verify-email")
    def verify_email():
        data = request.get_json(silent=True) or {}
        token = data.get("token") or ""
        user = User.query.filter_by(verification_token=token).first() if token else None
        if user is None:
            return jsonify({"error": "invalid or expired verification link"}), 400

        user.is_verified = True
        user.verification_token = None
        db.session.commit()
        return jsonify({"message": "email verified", "user": user.to_dict()})

    # ---------- auth: password reset ----------
    @app.post("/api/auth/request-password-reset")
    def request_password_reset():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        user = User.query.filter_by(email=email).first()

        # Always return 200 here (don't reveal whether an email is registered).
        generic_response = {"message": "if that email is registered, a reset link has been sent"}

        if user is None:
            return jsonify(generic_response)

        token = user.generate_reset_token()
        db.session.commit()

        reset_link = f"{app.config['FRONTEND_URL']}/reset-password?token={token}"
        send_email(
            to=user.email,
            subject="Reset your Ledger password",
            body=f"Reset your password (valid 1 hour) by visiting:\n{reset_link}",
        )

        if app.config["EXPOSE_AUTH_LINKS_IN_RESPONSE"]:
            generic_response["dev_reset_link"] = reset_link
        return jsonify(generic_response)

    @app.post("/api/auth/reset-password")
    def reset_password():
        data = request.get_json(silent=True) or {}
        token = data.get("token") or ""
        new_password = data.get("password") or ""

        if len(new_password) < 6:
            return jsonify({"error": "password must be at least 6 characters"}), 400

        user = User.query.filter_by(reset_token=token).first() if token else None
        if user is None or not user.reset_token_is_valid(token):
            return jsonify({"error": "invalid or expired reset link"}), 400

        user.set_password(new_password)
        user.clear_reset_token()
        db.session.commit()
        return jsonify({"message": "password updated"})

    # ---------- tasks (all scoped to the logged-in user) ----------
    @app.get("/api/tasks")
    @jwt_required()
    def list_tasks():
        user_id = int(get_jwt_identity())
        status = request.args.get("status", "all")  # all | active | done
        query = Task.query.filter_by(user_id=user_id)
        if status == "active":
            query = query.filter_by(done=False)
        elif status == "done":
            query = query.filter_by(done=True)
        tasks = query.order_by(Task.position.asc(), Task.created_at.desc()).all()
        return jsonify([t.to_dict() for t in tasks])

    @app.post("/api/tasks")
    @jwt_required()
    def create_task():
        user_id = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}
        text = (data.get("text") or "").strip()
        priority = data.get("priority", "medium")

        if not text:
            return jsonify({"error": "text is required"}), 400
        if len(text) > 200:
            return jsonify({"error": "text must be 200 characters or fewer"}), 400
        if priority not in VALID_PRIORITIES:
            return jsonify({"error": f"priority must be one of {VALID_PRIORITIES}"}), 400

        try:
            due_date = parse_due_date(data.get("due_date"))
            tags = clean_tags(data.get("tags"))
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        # New tasks go to the top of the custom order.
        min_position = db.session.query(db.func.min(Task.position)).filter_by(user_id=user_id).scalar()
        next_position = (min_position - 1) if min_position is not None else 0

        task = Task(
            user_id=user_id,
            text=text,
            priority=priority,
            done=False,
            due_date=due_date,
            tags=tags,
            position=next_position,
        )
        db.session.add(task)
        db.session.commit()
        return jsonify(task.to_dict()), 201

    @app.patch("/api/tasks/reorder")
    @jwt_required()
    def reorder_tasks():
        user_id = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}
        order = data.get("order")

        if not isinstance(order, list) or not all(isinstance(i, int) for i in order):
            return jsonify({"error": "order must be a list of task ids"}), 400

        tasks_by_id = {t.id: t for t in Task.query.filter_by(user_id=user_id).all()}
        for position, task_id in enumerate(order):
            task = tasks_by_id.get(task_id)
            if task is not None:
                task.position = position

        db.session.commit()
        tasks = Task.query.filter_by(user_id=user_id).order_by(Task.position.asc()).all()
        return jsonify([t.to_dict() for t in tasks])

    @app.patch("/api/tasks/<int:task_id>")
    @jwt_required()
    def update_task(task_id):
        user_id = int(get_jwt_identity())
        task = Task.query.filter_by(id=task_id, user_id=user_id).first()
        if task is None:
            return jsonify({"error": "task not found"}), 404

        data = request.get_json(silent=True) or {}

        if "text" in data:
            text = (data["text"] or "").strip()
            if not text:
                return jsonify({"error": "text cannot be empty"}), 400
            if len(text) > 200:
                return jsonify({"error": "text must be 200 characters or fewer"}), 400
            task.text = text

        if "priority" in data:
            if data["priority"] not in VALID_PRIORITIES:
                return jsonify({"error": f"priority must be one of {VALID_PRIORITIES}"}), 400
            task.priority = data["priority"]

        if "done" in data:
            task.done = bool(data["done"])

        if "due_date" in data:
            try:
                task.due_date = parse_due_date(data["due_date"])
            except ValueError as e:
                return jsonify({"error": str(e)}), 400

        if "tags" in data:
            try:
                task.tags = clean_tags(data["tags"])
            except ValueError as e:
                return jsonify({"error": str(e)}), 400

        db.session.commit()
        return jsonify(task.to_dict())

    @app.delete("/api/tasks/<int:task_id>")
    @jwt_required()
    def delete_task(task_id):
        user_id = int(get_jwt_identity())
        task = Task.query.filter_by(id=task_id, user_id=user_id).first()
        if task is None:
            return jsonify({"error": "task not found"}), 404
        db.session.delete(task)
        db.session.commit()
        return "", 204

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
