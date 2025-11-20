# Step 1: Build React frontend
FROM node:18 AS frontend
WORKDIR /app/frontend
COPY frontend/ .
RUN npm install && npm run build

# Step 2: Build FastAPI backend
FROM python:3.11-slim AS backend
WORKDIR /app

# System deps for GeoPandas/Fiona/PROJ on slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3-dev \
    gdal-bin libgdal-dev libproj-dev proj-data proj-bin \
 && rm -rf /var/lib/apt/lists/*

# Copy backend code and geojson file
COPY backend/ ./backend/
COPY backend/arizona_data.geojson ./arizona_data.geojson

# Install dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# GDAL/PROJ runtime paths (common locations on Debian slim)
ENV GDAL_DATA=/usr/share/gdal
ENV PROJ_LIB=/usr/share/proj

# Copy built React app from frontend stage
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Set environment variables (optional for Cloud Run)
ENV PYTHONUNBUFFERED=1

# Expose port (Render sets $PORT at runtime)
EXPOSE 8080

# Start FastAPI using uvicorn (bind to Render's $PORT if provided)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
