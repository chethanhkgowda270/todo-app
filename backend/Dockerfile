# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Copy only requirements first — this is a caching trick
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the app
COPY . .

EXPOSE 5000

# gunicorn is a production-grade server — Flask's built-in server isn't meant for real use
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} app:app