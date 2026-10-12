# EmergencyAI

## Project report

### Abstract

EmergencyAI is a prototype emergency-response coordination application. It brings emergency case intake, patient vital-sign review, ambulance dispatch, and hospital resource recommendations together in a web interface. A rule-based decision-support service calculates a severity score from the information entered and prepares recommendations for responders.

This software is a demonstration and is **not a medical device**. Its scores and recommendations are not a diagnosis or a substitute for qualified clinical judgment.

### Problem statement

Emergency response involves coordinating patient information, ambulance availability, and hospital capacity under time pressure. This prototype demonstrates how a shared dashboard and automated triage and allocation recommendations could help organize that information.

### Objectives

- Record emergency cases and relevant patient observations.
- Present current emergencies, alerts, ambulances, and hospitals in a dashboard.
- Calculate a prototype severity category and identify contributing risk factors.
- Recommend an available ambulance and a hospital using location, resources, occupancy, and specialist information.
- Provide operational views and basic emergency analytics.

### Scope and limitations

The project is intended for demonstration and educational use. It uses seeded sample records, a local SQLite database, hard-coded demo location coordinates, and a transparent rule-based scoring algorithm. It does not connect to emergency services, live GPS, hospital systems, or validated clinical data. The displayed confidence is a formula-derived prototype value, not a statistically validated probability.

## Main features

- **Dashboard:** summary counts and recent emergency activity.
- **Emergency intake:** enter patient details, observations, symptoms, and required specialist.
- **Severity analysis:** calculate a score, severity category, risk factors, and recommended action.
- **Ambulance operations:** view ambulance status and dispatch or update units.
- **Hospital operations:** review hospital capacity, resources, and specialties.
- **Smart allocation:** compare ambulance and hospital recommendations.
- **Patient records, alerts, predictions, and analytics:** supporting operational views.
- **Emergency simulation:** create a demonstration incident from the interface.

## Technology

| Layer | Technology |
|---|---|
| Frontend | React, Vite, React Router, Recharts, Leaflet |
| Backend | Python, FastAPI, Uvicorn, Pydantic |
| Data access | SQLAlchemy |
| Database | SQLite |

## Architecture

The React frontend makes HTTP requests to the FastAPI backend. The backend validates incoming data, applies the decision-support and allocation logic, and reads or writes records through SQLAlchemy. On startup, it creates missing database tables and seeds demonstration records when the relevant tables are empty.

```text
Browser (React/Vite)
        |
        | HTTP / JSON
        v
FastAPI service (backend/main.py)
        |
        +-- Emergency severity and allocation logic
        +-- SQLAlchemy models and database
        |
        v
SQLite (backend/emergency_ai.db)
```

## Decision-support approach

The severity service adds rule-based points for selected observations and indicators, including low SpO₂, elevated heart rate, low systolic blood pressure, rapid breathing, elevated temperature, specified injury terms, chest pain or breathing difficulty, and loss of consciousness. The score is capped at 100 and mapped to `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.

Ambulance selection considers available units, estimated distance and ETA, and emergency type. Hospital ranking considers estimated distance and travel time, ICU and emergency capacity, ventilators, specialist/capability matching, and occupancy. These are prototype heuristics and have not been clinically validated.

## Data model

The main SQLAlchemy entities are:

- **Emergency:** case details, observations, severity result, status, and allocation references.
- **Patient:** patient identifier and demographic and emergency information.
- **Ambulance:** vehicle/team details, availability, location, destination, and ETA.
- **Hospital:** location, bed and equipment counts, occupancy, specialists, and capacity.
- **Alert:** emergency and operational notifications.
- **HospitalResource:** resource inventory records.
- **User:** demonstration user and role records.

## Run locally

### Prerequisites

- Python 3.9 or newer
- Node.js and npm

Open two terminals from the project directory.

### 1. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The API is at [http://127.0.0.1:8000](http://127.0.0.1:8000). Interactive API documentation is at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite, normally [http://localhost:5173](http://localhost:5173). Keep both terminals open while using the application. Stop either development server with `Ctrl+C`.

The frontend defaults to `http://localhost:8000/api` for its backend. To use a different API URL, create `frontend/.env.local` with:

```dotenv
VITE_API_URL=http://localhost:8000/api
```

The SQLite database URL is relative to the backend working directory. Running Uvicorn from `backend/` stores the database at `backend/emergency_ai.db`.

## API overview

The backend exposes these main routes; the interactive `/docs` page lists request and response schemas.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/dashboard/stats` | Dashboard summary |
| `GET` | `/api/emergencies` | List all emergency records |
| `GET` | `/api/emergencies/active` | List unresolved emergencies |
| `POST` | `/api/emergencies` | Create and analyze an emergency |
| `DELETE` | `/api/emergencies/{emergency_id}` | Remove an emergency record |
| `GET` | `/api/ambulances` | List ambulances |
| `POST` | `/api/ambulances/{ambulance_id}/dispatch` | Dispatch an ambulance |
| `PUT` | `/api/ambulances/{ambulance_id}/status` | Update ambulance status |
| `GET` | `/api/hospitals` | List hospitals |
| `GET` | `/api/hospitals/{hospital_id}` | Get a hospital |
| `POST` | `/api/allocation/recommend` | Request allocation recommendations |
| `POST` | `/api/allocation/assign` | Assign an allocation |
| `GET` | `/api/analytics` | Retrieve analytics |
| `POST` | `/api/simulation/emergency` | Create a demonstration emergency |
| `GET` | `/api/alerts` | List alerts |

## Example emergency request

Use the `POST /api/emergencies` route in the API docs with a request body such as:

```json
{
  "patient_name": "Sample Patient",
  "age": 35,
  "gender": "Female",
  "emergency_type": "Road Accident",
  "location": "Chennai",
  "heart_rate": 105,
  "spo2": 94,
  "blood_pressure": "100/70",
  "respiratory_rate": 20,
  "temperature": 37.2,
  "symptoms": "Pain after a road accident",
  "injury_type": "Possible fracture",
  "loss_of_consciousness": false,
  "required_specialist": "General Surgeon"
}
```

## Suggested demonstration/report workflow

1. Start the backend and frontend using the instructions above.
2. Open the dashboard and note the seeded demonstration data.
3. Submit a sample case through emergency intake.
4. Review the returned severity, risk factors, ambulance, and hospital recommendation.
5. Visit the ambulance, hospital, alerts, patient, and analytics views to observe the operational data.
6. Include screenshots and explain that the algorithm and data are demonstrative, not clinically validated.

## Project structure

```text
emergency-ai/
├── backend/
│   ├── app/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── seed.py
│   │   └── services/ai_engine.py
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── layouts/
    │   ├── pages/
    │   └── services/api.js
    └── package.json
```

## Responsible-use notice

Do not use this prototype to make real emergency-care decisions or enter identifiable real-patient information. In an actual emergency, contact local emergency services and qualified medical professionals.
