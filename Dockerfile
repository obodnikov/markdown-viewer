# Multi-stage Dockerfile for Markdown Viewer

# Backend stage
FROM python:3.13-slim AS backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pandoc \
    texlive-xetex \
    texlive-fonts-recommended \
    texlive-plain-generic \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt /app/backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend/ /app/backend/

# Frontend stage (static files)
FROM nginx:alpine AS frontend

# Copy frontend files
COPY public/ /usr/share/nginx/html/
COPY styles/ /usr/share/nginx/html/styles/
COPY scripts/ /usr/share/nginx/html/scripts/
COPY icons/ /usr/share/nginx/html/icons/

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Final stage - combine backend and frontend
FROM backend

# Install nginx for serving frontend
RUN apt-get update && apt-get install -y nginx supervisor && \
    rm -rf /var/lib/apt/lists/*

# Copy frontend files to nginx directory
COPY --from=frontend /usr/share/nginx/html /var/www/html
COPY --from=frontend /etc/nginx/conf.d/default.conf /etc/nginx/sites-available/default

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 80 5050

# Set environment
ENV FLASK_APP=backend/app.py
ENV PYTHONPATH=/app

# Run supervisor to manage both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
