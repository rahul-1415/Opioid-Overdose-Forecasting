# Step 1: Build React frontend
FROM node:18 AS frontend
WORKDIR /app/frontend
COPY frontend/ .
RUN npm install && npm run build

# Step 2: Build FastAPI backend
FROM python:3.11-slim AS backend
WORKDIR /app

# Copy backend code and geojson file
COPY backend/ ./backend/
COPY backend/arizona_data.geojson ./arizona_data.geojson

# Install dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy built React app from frontend stage
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Set environment variables (optional for Cloud Run)
ENV PYTHONUNBUFFERED=1

# Expose Cloud Run port
EXPOSE 8080

# Start FastAPI using uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
