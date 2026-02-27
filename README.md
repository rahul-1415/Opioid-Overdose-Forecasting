
# Opioid-Overdose Forecasting Data Visualizer

This project is an interactive web application to visualize data collected for the Opioid Overdose Forecasting project at the Census Block Group (CBG) level across Arizona. It combines a FastAPI backend with a React + TypeScript frontend and can be deployed using Render (Docker) for the backend and Netlify for the frontend.

---

## 📁 Project Structure

```
Opioid-Overdose-Forecasting-Data-Visualizer/
│
├── backend/              # FastAPI backend with data filtering and API serving
├── frontend/             # React + TypeScript frontend for visualization
├── Dockerfile            # Unified container for frontend and backend
```

## ⚡ Performance Improvements (2026-02-27)

To reduce initial frontend load time, the data-loading pipeline was optimized:

1) **Split initial map payload from full feature payload**
   - Added `GET /map_data` to return only map-required properties (`GEOID`, `COUNTYFP`, `total_dosage`) plus geometry.
   - Frontend now loads `/map_data` for first render, not the full dataset.

2) **Lazy-load sidebar details**
   - Added `GET /feature/{geoid}` for on-demand full property fetch after a user clicks a block group.
   - Sidebar no longer requires downloading all 238 properties for all 4,773 features up front.

3) **Serve compressed responses with cache headers**
   - Large GeoJSON responses are served as prebuilt gzip when client supports gzip.
   - Added `Cache-Control: public, max-age=86400` and `Vary: Accept-Encoding` for better repeat-load performance.

4) **Prebuild optimized artifacts during Docker image build**
   - Docker build now generates:
     - lightweight map file: `backend/arizona_data.map.geojson`
     - gzip files: `backend/*.geojson.gz`
   - This avoids first-request preprocessing cost in production containers.

5) **Map rendering optimization**
   - Enabled Leaflet canvas rendering (`preferCanvas`) and updated selection flow to reduce map rework on interactions.

### Payload Size Impact

- Full dataset (raw): `58,037,781` bytes
- Full dataset (gzip): `12,930,053` bytes
- Map dataset (raw): `31,762,050` bytes
- Map dataset (gzip): `8,344,012` bytes

This reduces initial map payload transfer by roughly **86%** compared to the old raw full-file load path.

## ⚙️ How to Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Opioid-Overdose-Forecasting-Data-Visualizer.git
cd Opioid-Overdose-Forecasting-Data-Visualizer
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Build Frontend

```bash
npm run build
```

### 5. Serve the Full Application

Go back to the root folder and run FastAPI server:

```bash
cd ..
uvicorn backend.main:app --reload
```

Open your browser and navigate to:  
🔗 `http://localhost:8000`

---

## 🚀 Deployment to Render (Dockerfile)

Render can run the full stack from the root `Dockerfile`.

1) Push repo to GitHub (already done).
2) On Render: **New + → Web Service**.
3) Connect the repo `Opioid-Overdose-Forecasting-Data-Visualizer`.
4) Choose the root `Dockerfile` (Render auto-builds). No extra build/start commands needed.
5) Deploy. Render gives you a URL like `https://opioid-visualizer.onrender.com`.

Use that URL for the frontend API base.

---

## 🚀 Frontend Hosting on Netlify

Build the Vite app and point it to your Render backend via `VITE_API_BASE_URL`.

Netlify settings:
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Env var: `VITE_API_BASE_URL=https://opioid-visualizer.onrender.com` (replace with your Render backend URL)

Optionally verify locally:
```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

---


## 🚀 Deployment to AWS EC2 (Docker Host)

Run the exact same Docker image on a single EC2 instance instead of Elastic Beanstalk. The repo now ships with `deploy/ec2/docker-compose.yml` and a helper script so the instance behaves like a lightweight PaaS.

1) **Provision the instance**
   - Use Ubuntu 22.04 LTS (t3.micro fits in the free tier).
   - Add a security group rule for inbound HTTP (80) and, optionally, HTTPS (443).

2) **Install Docker + Compose plugin**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER  # allow current user to run docker
newgrp docker                  # start a new shell with the updated group
```

3) **Clone and deploy**
```bash
git clone https://github.com/your-username/Opioid-Overdose-Forecasting-Data-Visualizer.git
cd Opioid-Overdose-Forecasting-Data-Visualizer
./deploy/ec2/deploy.sh
```
- The compose file builds from the root `Dockerfile`, maps host port 80 → container 8080, and restarts the container after reboots (`restart: unless-stopped`).

4) **Verify**
```bash
curl http://<EC2-PUBLIC-IP>/get_data
```

Because the Docker image already includes the built frontend assets, visiting `http://<EC2-PUBLIC-IP>` serves both the UI and the API from the same host. If you prefer to keep Netlify (or any other static host) for the frontend, set `VITE_API_BASE_URL=http://<EC2-PUBLIC-IP>` and redeploy the static site.

Production tips:
- Attach an Elastic IP or behind an ALB to keep the URL stable.
- Add TLS with AWS Certificate Manager + ALB or by installing Nginx/Traefik on the instance and terminating HTTPS there.
- CloudWatch Agent or a simple cron `docker compose logs --tail 100` redirect can help capture logs.
- For zero-downtime upgrades, run the deploy script after pulling the latest `main`—Compose rebuilds and restarts the container in place.

---


## 🧱 Tech Stack

- **Frontend:** React, TypeScript, React-Leaflet, CSS
- **Backend:** FastAPI, GeoPandas, CORS, GZip
- **Deployment:** Docker, Render (backend), Netlify (frontend)
- **Data Sources:** ACS Census, ADHS Facilities, Life Expectancy, Opioid Prescriptions

---

## 📊 Features

- Heatmap of prescribed opioid dosage per CBG
- County and ZIP filtering
- Interactive sidebar with neighborhood-level details
- Scalable and cloud-deployable architecture

---

## 📄 License

MIT License

---

## 🙋‍♂️ Author

Rahul Babu  
LinkedIn: linkedin.com/in/rahulb1407/
Email: rahulb1407@gmail.com
