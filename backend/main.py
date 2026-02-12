from functools import lru_cache
import json
from pathlib import Path
import re
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles



app = FastAPI()

# CORS (wide open for demo; tighten for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip large responses
app.add_middleware(GZipMiddleware, minimum_size=500)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@lru_cache(maxsize=1)
def resolve_geojson_path() -> Path:
    """Resolve the GeoJSON file path once."""
    # Try both root and backend locations so deployments don't break if the file moves.
    candidates = [
        Path(__file__).resolve().parent / "arizona_data.geojson",
        Path(__file__).resolve().parent.parent / "arizona_data.geojson",
    ]

    for data_path in candidates:
        if data_path.exists():
            print("✅ Loading GeoJSON from:", data_path)
            return data_path

    raise FileNotFoundError(
        f"arizona_data.geojson not found. Tried: {', '.join(str(p) for p in candidates)}"
    )


@lru_cache(maxsize=1)
def load_geojson() -> Dict[str, Any]:
    """Load GeoJSON once as plain dicts."""
    geojson_path = resolve_geojson_path()
    print("✅ Loading GeoJSON into memory from:", geojson_path)
    with geojson_path.open("r") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def load_zipcodes() -> List[str]:
    """
    Parse GEOID values in a streaming way to avoid loading the full JSON structure.
    This keeps memory use lower on small Render instances.
    """
    geojson_path = resolve_geojson_path()
    geoid_pattern = re.compile(rb'"GEOID"\s*:\s*"?(\d{10,})"?')
    unique_zips = set()
    tail = b""

    with geojson_path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break

            data = tail + chunk
            for match in geoid_pattern.finditer(data):
                geoid = match.group(1).decode("utf-8", errors="ignore")
                if geoid[:5].isdigit() and len(geoid) >= 10:
                    unique_zips.add(geoid[5:10])

            # Keep a small overlap so boundary-spanning matches are not missed.
            tail = data[-64:]

    return sorted(unique_zips)



@app.get("/get_data")
def get_data():
    try:
        geojson_path = resolve_geojson_path()
        # Return the file directly to avoid loading/parsing the full document in memory.
        return FileResponse(geojson_path, media_type="application/json")
    except Exception as e:
        print("❌ Failed to load GeoJSON:", e)
        return JSONResponse(
            content={"error": "GeoJSON failed to load."}, status_code=500
        )


@app.get("/filter")
def filter_data(county: str = "All", zip_code: str = "All", variable: str = "life_expectancy"):
    try:
        data = load_geojson()
    except Exception as e:
        print("❌ Failed to load GeoJSON:", e)
        return JSONResponse(content={"error": "GeoJSON failed to load."}, status_code=500)

    filtered = []
    for feat in data["features"]:
        props = feat.get("properties", {})
        if county != "All" and props.get("COUNTYFP") != county:
            continue
        geoid = str(props.get("GEOID", ""))
        if zip_code != "All" and geoid[5:10] != zip_code:
            continue
        filtered.append(feat)

    if not filtered:
        return JSONResponse(content={"error": "No data found"}, status_code=404)

    return JSONResponse(content={"type": "FeatureCollection", "features": filtered})


@app.get("/zipcodes")
def get_zipcodes():
    try:
        return load_zipcodes()
    except Exception as e:
        print("❌ Failed to load GeoJSON:", e)
        return []


# Serve built frontend if present
frontend_dist_candidates = [
    Path("frontend/dist"),
    Path(__file__).resolve().parent.parent / "frontend" / "dist",
]

for frontend_dist in frontend_dist_candidates:
    if frontend_dist.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
        print("✅ Serving frontend from:", frontend_dist)
        break
else:
    print("⚠️ Frontend build not found; API-only mode enabled.")
