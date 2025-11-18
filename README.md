
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
