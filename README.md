# Opioid Overdose Forecasting Data Visualizer

Interactive Arizona Census Block Group (CBG) web app for opioid-related risk exploration.

The project combines a **FastAPI backend** and a **React + TypeScript frontend**. It supports map-based exploration, neighborhood detail drill-down, and a new analytics view for quick EDA summaries.

## Live Deployments

- Frontend (Netlify): `https://opioid-overdose-forecasting.netlify.app/`
- Backend (Render): `https://opioid-overdose-forecasting.onrender.com`

## What the App Does

### Explorer Tab

- Arizona CBG map colored by `total_dosage`
- County and ZIP filters
- Click a block group to fetch full feature details (`/feature/{geoid}`)
- Sidebar with key indicators + categorized details
- Loading/error states for map and feature detail requests

### Analytics Tab

- Filter-aware KPI summary (visible CBGs, total/avg/median dosage, ZIP coverage)
- Dosage distribution buckets
- Top counties and top block groups by dosage
- EDA notes and engineered-feature formulas from project documentation

### UI/UX

- Dark/light theme toggle (default: dark, persisted in `localStorage`)
- Responsive layout for desktop/mobile
- Accessible focus states and live status messaging

## Architecture

```text
frontend (React + Vite)
  -> GET /map_data (lightweight map payload)
  -> GET /zipcodes (ZIP filter options)
  -> GET /feature/{geoid} (full sidebar details on click)

backend (FastAPI)
  -> serves API
  -> serves built frontend assets when bundled with Docker
```

## API Endpoints

- `GET /healthz` - health check
- `GET /map_data` - lightweight map GeoJSON (geometry + `COUNTYFP`, `GEOID`, `total_dosage`)
- `GET /feature/{geoid}` - full properties for one selected CBG
- `GET /zipcodes` - unique ZIP list derived from GEOID
- `GET /get_data` - full GeoJSON payload
- `GET /filter?county=...&zip_code=...` - server-side filtered full-feature collection

## Performance Optimizations Implemented

- Lightweight startup payload via `/map_data` instead of full-feature payload
- Lazy sidebar detail fetch via `/feature/{geoid}`
- Gzip response artifacts (`*.geojson.gz`) with cache headers
- Prebuilt optimized map artifact (`arizona_data.map.geojson`) during Docker build
- Leaflet canvas preference and reduced map redraw pressure

## Project Structure

```text
.
├── backend/
│   ├── main.py
│   ├── arizona_data.geojson
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── deploy/ec2/
│   ├── docker-compose.yml
│   └── deploy.sh
└── Dockerfile
```

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### 1) Backend

From repo root:

```bash
python3 -m pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at `http://localhost:8000`.

### 2) Frontend

In a new terminal:

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

Frontend runs at `http://localhost:5173` (default Vite port).

### 3) Frontend quality checks

```bash
cd frontend
npm run lint
npm run build
```

## Docker (Unified Full Stack)

Build and run from repo root:

```bash
docker build -t opioid-overdose-forecasting .
docker run --rm -p 8080:8080 opioid-overdose-forecasting
```

Open `http://localhost:8080`.

## Deployment Notes

### Render (Backend or unified Docker app)

- Connect repo as a Web Service
- Use root `Dockerfile`
- Render provides `PORT`; container command already respects `${PORT:-8080}`

### Netlify (Frontend only)

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Env var: `VITE_API_BASE_URL=https://opioid-overdose-forecasting.onrender.com`

### EC2 (Docker host)

- Use `deploy/ec2/deploy.sh` to build/run via compose
- Compose maps host `80 -> container 8080`

## Data Sources

- ACS Census data
- ADHS facility data
- Life expectancy estimates
- Prescription opioid data

## License

MIT

## Author

Rahul Babu  
LinkedIn: `linkedin.com/in/rahulb1407/`  
Email: `rahulb1407@gmail.com`
