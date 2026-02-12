from functools import lru_cache
import json
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
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
def load_geojson() -> Dict[str, Any]:
    """Load GeoJSON once as plain dicts."""
    # Try both root and backend locations so deployments don't break if the file moves.
    candidates = [
        Path(__file__).resolve().parent / "arizona_data.geojson",
        Path(__file__).resolve().parent.parent / "arizona_data.geojson",
    ]

    for data_path in candidates:
        if data_path.exists():
            print("✅ Loading GeoJSON from:", data_path)
            with data_path.open("r") as f:
                return json.load(f)

    raise FileNotFoundError(
        f"arizona_data.geojson not found. Tried: {', '.join(str(p) for p in candidates)}"
    )



@app.get("/get_data")
def get_data():
    try:
        data = load_geojson()
        return JSONResponse(content=data)
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
        if zip_code != "All" and not str(props.get("GEOID", "")).startswith(zip_code):
            continue
        filtered.append(feat)

    if not filtered:
        return JSONResponse(content={"error": "No data found"}, status_code=404)

    return JSONResponse(content={"type": "FeatureCollection", "features": filtered})


@app.get("/zipcodes")
def get_zipcodes():
    try:
        data = load_geojson()
    except Exception as e:
        print("❌ Failed to load GeoJSON:", e)
        return []

    unique_zips = sorted(
        {
            str(feat.get("properties", {}).get("GEOID", ""))[5:10]
            for feat in data["features"]
            if str(feat.get("properties", {}).get("GEOID", ""))[:5].isdigit()
        }
    )
    return unique_zips


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
