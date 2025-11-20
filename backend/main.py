from functools import lru_cache
import json
from pathlib import Path
from typing import Any, Dict, List

import fiona
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


@lru_cache(maxsize=1)
def load_geojson() -> Dict[str, Any]:
    """Load GeoJSON once as plain dicts."""
    data_path = Path(__file__).resolve().parent.parent / "arizona_data.geojson"
    print("✅ Loading GeoJSON from:", data_path)
    with data_path.open("r") as f:
        data = json.load(f)
    return data



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
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
