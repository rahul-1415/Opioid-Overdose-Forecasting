# from fastapi import FastAPI
# from fastapi.responses import JSONResponse
# from fastapi.staticfiles import StaticFiles
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.middleware.gzip import GZipMiddleware



# import geopandas as gpd
# import json

# app = FastAPI()

# # CORS for local dev (safe to keep)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# app.add_middleware(GZipMiddleware, minimum_size=500)  # Only compress responses >500 bytes

# # --- API Routes First ---
# try:
#     geo_data = gpd.read_file("arizona_data.geojson")
# except Exception as e:
#     print("Failed to load GeoJSON:", e)
#     geo_data = None

# # @app.get("/get_data")
# # def get_data():
# #     return JSONResponse(content=json.loads(geo_data.to_json()))

# @app.get("/get_data")
# def get_data():
#     if geo_data is not None:
#         # 🧪 Send only the first 100 rows for testing
#         # subset = geo_data.head(100)
#         return JSONResponse(content=json.loads(geo_data.to_json()))
#     else:
#         return JSONResponse(content={"error": "GeoJSON failed to load."}, status_code=500)



# @app.get("/filter")
# def filter_data(county: str = "All", zip_code: str = "All", variable: str = "life_expectancy"):
#     filtered = geo_data.copy()
#     if county != "All":
#         filtered = filtered[filtered["COUNTYFP"] == county]
#     if zip_code != "All":
#         filtered = filtered[filtered["GEOID"].str.startswith(zip_code)]
#     if filtered.empty:
#         return JSONResponse(content={"error": "No data found"}, status_code=404)
#     return JSONResponse(content=json.loads(filtered.to_json()))

# # --- Static files mounted last ---
# app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")


from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles  # Uncomment this for deployment with frontend build

import geopandas as gpd
import json

app = FastAPI()

# ✅ CORS for local development — safe to keep always
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 👈 Later, for production, restrict this
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Enable GZip compression for large responses
app.add_middleware(GZipMiddleware, minimum_size=500)

# ✅ Load GeoJSON at startup
try:
    geo_data = gpd.read_file("arizona_data.geojson")
except Exception as e:
    print("❌ Failed to load GeoJSON:", e)
    geo_data = None

# ✅ Full data endpoint
@app.get("/get_data")
def get_data():
    if geo_data is not None:
        return JSONResponse(content=json.loads(geo_data.to_json()))
    return JSONResponse(content={"error": "GeoJSON failed to load."}, status_code=500)

# ✅ Filter by county or ZIP
@app.get("/filter")
def filter_data(county: str = "All", zip_code: str = "All", variable: str = "life_expectancy"):
    filtered = geo_data.copy()
    if county != "All":
        filtered = filtered[filtered["COUNTYFP"] == county]
    if zip_code != "All":
        filtered = filtered[filtered["GEOID"].str.startswith(zip_code)]
    if filtered.empty:
        return JSONResponse(content={"error": "No data found"}, status_code=404)
    return JSONResponse(content=json.loads(filtered.to_json()))

# ✅ Endpoint to get ZIP code dropdown values
@app.get("/zipcodes")
def get_zipcodes():
    if geo_data is not None:
        unique_zips = sorted(geo_data["GEOID"].str[5:10].unique().tolist())
        return unique_zips
    return []

# 🔒 COMMENTED OUT FOR LOCAL TESTING
# 🚀 For production (when frontend is built into 'frontend/dist'), uncomment below:
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
# import os

# if os.getenv("ENV") == "production":
#     app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
