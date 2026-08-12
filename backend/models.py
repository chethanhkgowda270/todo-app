import secrets
from datetime import datetime, timezone, timedelta

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import ARRAY
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

VALID_PRIORITIES = ("low", "medium", "high")

RESET_TOKEN_TTL = timedelta(hours=1)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    verification_token = db.Column(db.String(64), nullable=True, unique=True)

    reset_token = db.Column(db.String(64), nullable=True, unique=True)
    reset_token_expires_at = db.Column(db.DateTime, nullable=True)

    tasks = db.relationship("Task", backref="owner", cascade="all, delete-orphan")

    # ---- password ----
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    # ---- email verification ----
    def generate_verification_token(self):
        self.verification_token = secrets.token_urlsafe(32)
        return self.verification_token

    # ---- password reset ----
    def generate_reset_token(self):
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expires_at = datetime.now(timezone.utc) + RESET_TOKEN_TTL
        return self.reset_token

    def reset_token_is_valid(self, token):
        if not self.reset_token or self.reset_token != token:
            return False
        if not self.reset_token_expires_at:
            return False
        expires_at = self.reset_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) < expires_at

    def clear_reset_token(self):
        self.reset_token = None
        self.reset_token_expires_at = None

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat(),
        }


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    text = db.Column(db.String(200), nullable=False)
    priority = db.Column(db.String(10), nullable=False, default="medium")
    done = db.Column(db.Boolean, nullable=False, default=False)
    due_date = db.Column(db.Date, nullable=True)
    tags = db.Column(ARRAY(db.String(50)), nullable=False, default=list)
    position = db.Column(db.Integer, nullable=False, default=0, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "priority": self.priority,
            "done": self.done,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "tags": self.tags or [],
            "position": self.position,
            "created_at": self.created_at.isoformat(),
        }
