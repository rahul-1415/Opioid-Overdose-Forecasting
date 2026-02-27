from functools import lru_cache
import gzip
import json
from pathlib import Path
import re
import shutil
import threading
from typing import Any, Dict, List

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles



app = FastAPI()
STATIC_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24
_BUILD_LOCK = threading.Lock()

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


def _build_gzip_file(source_path: Path) -> Path:
    """Build a stable gzip artifact for static file responses."""
    gzip_path = source_path.with_suffix(source_path.suffix + ".gz")
    source_mtime = source_path.stat().st_mtime
    needs_build = not gzip_path.exists() or gzip_path.stat().st_mtime < source_mtime

    if not needs_build:
        return gzip_path

    with _BUILD_LOCK:
        needs_build = not gzip_path.exists() or gzip_path.stat().st_mtime < source_mtime
        if not needs_build:
            return gzip_path

        print("✅ Building gzip cache:", gzip_path)
        with source_path.open("rb") as source_file, gzip_path.open("wb") as gzip_file:
            with gzip.GzipFile(
                filename="", mode="wb", fileobj=gzip_file, compresslevel=6, mtime=0
            ) as compressor:
                shutil.copyfileobj(source_file, compressor, length=1024 * 1024)

    return gzip_path


def _cache_headers(content_encoding: str | None = None) -> Dict[str, str]:
    headers = {
        "Cache-Control": f"public, max-age={STATIC_CACHE_MAX_AGE_SECONDS}",
        "Vary": "Accept-Encoding",
    }
    if content_encoding:
        headers["Content-Encoding"] = content_encoding
    return headers


def _client_accepts_gzip(request: Request) -> bool:
    return "gzip" in request.headers.get("accept-encoding", "").lower()


@lru_cache(maxsize=1)
def load_geojson() -> Dict[str, Any]:
    """Load GeoJSON once as plain dicts."""
    geojson_path = resolve_geojson_path()
    print("✅ Loading GeoJSON into memory from:", geojson_path)
    with geojson_path.open("r") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def resolve_map_geojson_path() -> Path:
    """
    Build a lightweight GeoJSON with only fields needed for the map and filters.
    This significantly reduces initial payload size for frontend boot.
    """
    source_path = resolve_geojson_path()
    map_path = source_path.with_name(f"{source_path.stem}.map.geojson")
    source_mtime = source_path.stat().st_mtime
    needs_build = not map_path.exists() or map_path.stat().st_mtime < source_mtime

    if not needs_build:
        return map_path

    with _BUILD_LOCK:
        needs_build = not map_path.exists() or map_path.stat().st_mtime < source_mtime
        if not needs_build:
            return map_path

        print("✅ Building lightweight map GeoJSON at:", map_path)
        data = load_geojson()
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

        map_payload = {"type": "FeatureCollection", "features": map_features}
        with map_path.open("w") as out_file:
            json.dump(map_payload, out_file, separators=(",", ":"))

    return map_path


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
def get_data(request: Request):
    try:
        source_path = resolve_geojson_path()
        if _client_accepts_gzip(request):
            try:
                gzip_path = _build_gzip_file(source_path)
                return FileResponse(
                    gzip_path,
                    media_type="application/json",
                    headers=_cache_headers(content_encoding="gzip"),
                )
            except Exception as gzip_error:
                print("⚠️ Falling back to uncompressed GeoJSON:", gzip_error)

        return FileResponse(
            source_path,
            media_type="application/json",
            headers=_cache_headers(),
        )
    except Exception as e:
        print("❌ Failed to load GeoJSON:", e)
        return JSONResponse(
            content={"error": "GeoJSON failed to load."}, status_code=500
        )


@app.get("/map_data")
def get_map_data(request: Request):
    try:
        try:
            map_geojson_path = resolve_map_geojson_path()
        except Exception as map_error:
            # If map artifact cannot be built, keep endpoint functional with full data.
            print("⚠️ Falling back to full GeoJSON for /map_data:", map_error)
            map_geojson_path = resolve_geojson_path()

        if _client_accepts_gzip(request):
            try:
                gzip_path = _build_gzip_file(map_geojson_path)
                return FileResponse(
                    gzip_path,
                    media_type="application/json",
                    headers=_cache_headers(content_encoding="gzip"),
                )
            except Exception as gzip_error:
                print("⚠️ Falling back to uncompressed map GeoJSON:", gzip_error)

        return FileResponse(
            map_geojson_path, media_type="application/json", headers=_cache_headers()
        )
    except Exception as e:
        print("❌ Failed to load map GeoJSON:", e)
        return JSONResponse(
            content={"error": "Map GeoJSON failed to load."}, status_code=500
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


@app.get("/feature/{geoid}")
def get_feature(geoid: str):
    try:
        data = load_geojson()
    except Exception as e:
        print("❌ Failed to load GeoJSON:", e)
        return JSONResponse(content={"error": "GeoJSON failed to load."}, status_code=500)

    target_geoid = str(geoid)
    for feat in data.get("features", []):
        props = feat.get("properties", {})
        if str(props.get("GEOID", "")) == target_geoid:
            return JSONResponse(content=props)

    return JSONResponse(content={"error": "Feature not found"}, status_code=404)


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
