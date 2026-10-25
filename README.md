# WindScope — UK Wind Forecast Accuracy Dashboard

A full-stack web application for evaluating UK national wind power generation forecasts against actual generation using data from Elexon BMRS. Built to support day-ahead electricity procurement decisions by helping energy teams understand forecast availability, accuracy, and potential forecast error.

**[Live Dashboard](https://windscope-mu.vercel.app/)** · **[Backend API](https://windscope-api-066t.onrender.com/)** · **[API Documentation](https://windscope-api-066t.onrender.com/docs)** · **[Demo Video](https://www.youtube.com/watch?v=08c3oC3IPVU)**

---

## 1. Problem Statement

A UK energy utility must procure sufficient electricity from the wholesale market to meet consumer demand. Since wind generation depends on weather conditions, the utility must estimate how much wind power will be available when making day-ahead purchasing decisions.

Underestimating wind generation may lead to unnecessary additional procurement, while overestimating it may leave the utility needing to source more electricity than expected.

WindScope addresses two key requirements:

1. **Forecast visibility:** Identify the latest available national wind generation forecast at the assumed decision cutoff before the delivery day.
2. **Forecast accuracy evaluation:** Compare forecast wind generation with actual wind generation and quantify forecast error to support informed procurement decisions.

The application evaluates UK national wind generation using Elexon BMRS data for January 2026, as specified in the assignment.

## 2. Features

- **Forecast and actual comparison:** Compare forecast wind generation against recorded actual generation.
- **Forecast vintage selection:** Select the latest forecast available at or before the configured evaluation cutoff.
- **Accuracy metrics:** Calculate Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and forecast bias.
- **Time-series visualisation:** Explore forecast and actual generation trends.
- **Daily evaluation:** Inspect results for individual delivery dates.
- **Monthly evaluation:** Review performance across the January 2026 evaluation period.
- **API-backed architecture:** Separate the React frontend from the Python backend.
- **Containerised execution:** Run the application locally using Docker Compose.

## 3. Technology Stack

| Layer               | Technologies                      |
| ------------------- | --------------------------------- |
| Frontend            | React, Vite, Recharts, Lucide     |
| Backend             | Python, FastAPI, Pandas, Requests |
| Data source         | Elexon BMRS API                   |
| Visualisation       | Recharts                          |
| Containerisation    | Docker, Docker Compose            |
| Frontend deployment | Vercel                            |
| Backend deployment  | Render                            |
| API documentation   | FastAPI / OpenAPI                 |

## 4. Data Sources

The application uses only the two Elexon datasets specified in the assignment.

### Actual wind generation — FUELHH

Source: [Elexon FUELHH API documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)

- Dataset: `FUELHH`
- Filter: `fuelType = WIND`
- `startTime`: Start time of the generation interval.
- `generation`: Actual wind power generation, expressed in MW.

The source data has a 30-minute resolution. The application aggregates the half-hourly values into hourly values for comparison with the selected forecast series.

### Forecast wind generation — WINDFOR

Source: [Elexon WINDFOR API documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)

- Dataset: `WINDFOR`
- `startTime`: Start time of the forecasted generation interval.
- `publishTime`: Time at which the forecast was published.
- `generation`: Forecast wind power generation, expressed in MW.

The `publishTime` field is used to distinguish forecast vintages and select the forecast available by the assumed decision cutoff.

**Evaluation period:** 1–31 January 2026.

No additional generation datasets or external weather datasets are used.

## 5. Forecast Selection and Evaluation Methodology

### Step 1 — Retrieve actual generation

Retrieve FUELHH records for wind generation by filtering `fuelType = WIND` and selecting the relevant delivery intervals.

### Step 2 — Retrieve forecast vintages

Retrieve WINDFOR forecast records for the relevant delivery intervals. Preserve both `startTime` and `publishTime` so forecasts can be evaluated using the information available before the delivery day.

### Step 3 — Apply the forecast-selection cutoff

The current implementation uses **11:00 UTC on the day before delivery** as the forecast-selection cutoff.

For each delivery interval, the application selects the latest eligible forecast vintage published at or before that cutoff. This avoids selecting a forecast published after the assumed purchasing decision time.

**Important assumption:** The assignment does not specify an exact cutoff time. The 11:00 UTC cutoff is a modelling assumption and must be validated against the client's actual day-ahead market decision process. It should not be interpreted as a verified official market deadline.

### Step 4 — Align actuals and forecasts

Aggregate the half-hourly actual generation observations into hourly values and align the actuals with the selected forecasts using their corresponding delivery-time intervals.

The comparison uses matching delivery intervals so that each forecast is evaluated against actual generation for the same period.

### Step 5 — Calculate accuracy metrics

For \(n\) matched hourly observations, let \(F_t\) represent forecast generation and \(A_t\) represent actual generation.

**Mean Absolute Error (MAE)**

\[
\mathrm{MAE}=\frac{1}{n}\sum\_{t=1}^{n}|F_t-A_t|
\]

MAE measures the average absolute difference between forecast and actual generation. Lower values indicate better average accuracy.

**Root Mean Squared Error (RMSE)**

\[
\mathrm{RMSE}=\sqrt{\frac{1}{n}\sum\_{t=1}^{n}(F_t-A_t)^2}
\]

RMSE penalises larger errors more heavily than MAE. Lower values indicate better performance under this metric.

**Forecast Bias**

\[
\mathrm{Bias}=\frac{1}{n}\sum\_{t=1}^{n}(F_t-A_t)
\]

- Positive bias means generation was overforecast on average.
- Negative bias means generation was underforecast on average.
- Bias close to zero indicates little average signed error, but does not necessarily mean individual forecasts were accurate.

All three metrics are expressed in MW.

## 6. January 2026 Results

The current implementation reports the following results for January 2026.

| Metric                         |       Result |
| ------------------------------ | -----------: |
| Delivery days evaluated        |           31 |
| Matched hourly comparisons     |          744 |
| Failed delivery days           |            0 |
| Mean Absolute Error (MAE)      |  2,122.81 MW |
| Root Mean Squared Error (RMSE) |  2,616.69 MW |
| Forecast Bias                  | +1,840.30 MW |

A positive forecast bias indicates that forecast wind generation was higher than actual wind generation on average under the implemented definition of forecast minus actual.

These are the results reported by the current application implementation. They should be interpreted in the context of the stated data processing, aggregation, forecast-selection cutoff, and interval-alignment assumptions.

The results describe wind forecast performance; they do not directly calculate the utility's total electricity demand, required thermal generation, procurement volume, or financial cost.

## 7. Application Architecture

The application separates the presentation layer from the data processing and evaluation layer.

```text
                 Elexon BMRS API
                  /           \
             FUELHH             WINDFOR
          Actual generation   Forecast vintages
                  \           /
                   Python Backend
                       |
             Data processing and alignment
                       |
                Forecast selection
                       |
               MAE / RMSE / Bias
                       |
                   FastAPI REST
                       |
                  React Frontend
                       |
                Dashboard and Charts
```

### Frontend

The React application provides the dashboard interface, calls the backend API, and visualises forecast accuracy and generation trends.

### Backend

The FastAPI service retrieves and processes Elexon data, applies the forecast-selection and time-alignment logic, calculates evaluation metrics, and exposes results through REST endpoints.

### Deployment

- Frontend: Vercel
- Backend: Render
- Local development: Docker Compose

## 8. Live Application

| Resource                      | Link                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| WindScope dashboard           | [Open dashboard](https://windscope-mu.vercel.app/)                     |
| Backend service               | [Open backend](https://windscope-api-066t.onrender.com/)               |
| Health endpoint               | [Check backend health](https://windscope-api-066t.onrender.com/health) |
| Interactive API documentation | [Open Swagger UI](https://windscope-api-066t.onrender.com/docs)        |

The backend is hosted on Render. Depending on the hosting plan and current activity, the first request after inactivity may take longer while the service starts.

## 9. Running Locally with Docker

### Prerequisites

- Git
- Docker Desktop with Docker Compose

### Clone the repository

```bash
git clone https://github.com/MOHAMMED-RIYAZ/r7m2vk.git
cd r7m2vk
```

### Start the application

```bash
docker compose up --build -d
```

Open the local frontend at:

- **Dashboard:** http://localhost:8080
- **Backend health check:** http://localhost:8000/health
- **API documentation:** http://localhost:8000/docs

These backend URLs assume that Docker Compose publishes port `8000` to the host, and that the frontend is published on port `8080`.

### Stop the application

```bash
docker compose down
```

This stops the containers and removes the Compose-created network. It does not remove downloaded Docker images.

## 10. API Endpoints

| Endpoint                                           | Purpose                                          |
| -------------------------------------------------- | ------------------------------------------------ |
| `GET /health`                                      | Check backend health                             |
| `GET /api/evaluation?year=2026&month=1`            | Retrieve monthly evaluation results              |
| `GET /api/evaluation/day?delivery_date=2026-01-15` | Retrieve evaluation for a specific delivery date |
| `GET /docs`                                        | Explore the API through Swagger UI               |

Example monthly request:

```http
GET /api/evaluation?year=2026&month=1
```

Example daily request:

```http
GET /api/evaluation/day?delivery_date=2026-01-15
```

## 11. Project Structure

The main components of the project are organised as follows.

```text
r7m2vk/
├── backend/
│   ├── elexon.py              # Elexon data retrieval and processing
│   ├── main.py                # FastAPI application and API endpoints
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Backend container configuration
│   └── .dockerignore          # Backend Docker build exclusions
│
├── frontend/
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── assets/            # Frontend assets
│   │   ├── App.css            # Dashboard styling
│   │   ├── App.jsx            # Main React application
│   │   ├── index.css          # Global styles
│   │   └── main.jsx           # React entry point
│   ├── index.html             # HTML entry point
│   ├── package.json           # Frontend dependencies and scripts
│   ├── package-lock.json      # Locked npm dependency versions
│   ├── vite.config.js         # Vite configuration
│   ├── eslint.config.js       # ESLint configuration
│   ├── nginx.conf             # Nginx configuration
│   ├── Dockerfile             # Frontend container configuration
│   ├── .dockerignore          # Frontend Docker build exclusions
│   └── .gitignore             # Frontend Git exclusions
│
├── docker-compose.yml         # Local multi-container configuration
├── .gitignore                 # Root Git exclusions
└── README.md                  # Project documentation
```

Generated files and local development folders such as `node_modules/`, `dist/`, `__pycache__/`, and `.venv/` are generally excluded from version control.

## 12. Assumptions and Limitations

- **Forecast cutoff:** The 11:00 UTC previous-day cutoff is an implementation assumption requiring client validation.
- **Data scope:** The evaluation uses national wind generation from Elexon FUELHH and WINDFOR only, as required by the assignment.
- **Hourly aggregation:** Half-hourly actual generation observations are averaged into hourly values for comparison.
- **Forecast vintages:** Forecast selection depends on the interpretation of `publishTime` and the delivery interval.
- **Procurement decisions:** The dashboard supports forecast-informed analysis but does not itself optimise electricity purchases or calculate the amount of thermal generation required.
- **Market prices and demand:** Electricity demand, wholesale prices, other generation sources, and balancing costs are outside the scope of this version.
- **Historical evaluation:** January 2026 is the specified evaluation period; results should not automatically be generalised to other months or weather conditions.
- **Data quality:** Results depend on source data, missing observations, timestamp handling, and the implemented alignment logic.

## 13. AI Tools Disclosure

AI tools, including ChatGPT, were used to assist with development guidance, debugging, documentation, and reviewing the evaluation methodology.

The application was built and tested as a full-stack project, with Docker used for local containerised execution and the frontend and backend deployed separately.

The reported evaluation results come from the current application implementation. The forecast-selection cutoff remains an assumption requiring validation against the client's business process.

## 14. Demo Video

**[Watch the WindScope Demo](https://www.youtube.com/watch?v=08c3oC3IPV0)**

The unlisted video covers the two parts requested in the assignment:

1. **Customer presentation:** Product overview, dashboard, generation comparisons, forecast accuracy metrics, and how the analysis can support day-ahead procurement decisions.
2. **Technical review:** Architecture, React frontend, Python/FastAPI backend, Elexon data sources, forecast selection, accuracy calculations, Docker, and deployment.

The video is approximately 8 minutes long, within the assignment's 10-minute limit. Each of the two parts should remain within five minutes.

## 15. Repository

**GitHub:** [https://github.com/MOHAMMED-RIYAZ/r7m2vk](https://github.com/MOHAMMED-RIYAZ/r7m2vk)

The repository contains the source code and instructions for running the application locally.

## 16. License

This project was developed as a software engineering assignment and pilot implementation. No separate open-source license is specified unless a license file is added to the repository.
