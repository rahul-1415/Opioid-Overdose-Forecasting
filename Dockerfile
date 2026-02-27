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

# Build lightweight map dataset and gzip artifacts during image build.
# This avoids runtime preprocessing on the first user request.
RUN python - <<'PY'
import gzip
import json
import shutil
from pathlib import Path

data_path = Path("backend/arizona_data.geojson")
map_path = data_path.with_name(f"{data_path.stem}.map.geojson")

with data_path.open("r") as f:
    data = json.load(f)

map_features = []
for feat in data.get("features", []):
    props = feat.get("properties", {})
    map_features.append(
        {
            "type": "Feature",
            "properties": {
                "COUNTYFP": str(props.get("COUNTYFP", "")),
                "GEOID": str(props.get("GEOID", "")),
                "total_dosage": props.get("total_dosage", 0),
            },
            "geometry": feat.get("geometry"),
        }
    )

with map_path.open("w") as f:
    json.dump({"type": "FeatureCollection", "features": map_features}, f, separators=(",", ":"))

for source_path in (data_path, map_path):
    gzip_path = source_path.with_suffix(source_path.suffix + ".gz")
    with source_path.open("rb") as source_file, gzip_path.open("wb") as gzip_file:
        with gzip.GzipFile(
            filename="", mode="wb", fileobj=gzip_file, compresslevel=6, mtime=0
        ) as compressor:
            shutil.copyfileobj(source_file, compressor, length=1024 * 1024)
PY

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
