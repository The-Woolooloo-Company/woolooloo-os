FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    pydantic \
    pydantic-settings \
    sqlalchemy \
    asyncpg \
    redis \
    celery[redis] \
    httpx \
    python-dotenv \
    python-multipart \
    notion-client \
    slack-sdk \
    twilio \
    python-jose[cryptography] \
    passlib[bcrypt]

# Copy source code
COPY pyproject.toml ./
COPY src ./src

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
