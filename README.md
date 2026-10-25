# WindScope — Wind Forecast Accuracy Dashboard

WindScope is a full-stack dashboard for evaluating day-ahead UK wind generation forecasts against actual generation data published by Elexon BMRS.

The dashboard provides monthly and daily forecast-performance metrics, visualisations, and hourly forecast-versus-actual comparisons.

## Features

- Monthly evaluation of day-ahead wind generation forecasts.
- KPI cards for Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and forecast bias.
- Daily MAE and RMSE trend chart.
- Daily forecast-bias chart.
- Daily evaluation coverage and results table.
- Hourly forecast, actual generation, and forecast-error data.
- Month selection and data refresh.
- Docker-based deployment of the frontend and backend.

## Technology Stack

**Frontend**

- React
- Vite
- Recharts
- Lucide React
- Nginx

**Backend**

- Python
- FastAPI
- Pandas and Requests

**Deployment**

- Docker
- Docker Compose

## Data Sources

WindScope uses Elexon BMRS API datasets:

- **Actual generation — FUELHH:** https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream
- **Wind generation forecasts — WINDFOR:** https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream

The application uses wind generation records and their publication and delivery timestamps to compare forecasts with actual generation.

## Evaluation Methodology

The default evaluation period is January 2026.

1. Retrieve actual wind generation records for each delivery day.
2. Convert half-hourly actual generation readings into hourly values by averaging the two half-hourly readings within each hour.
3. Retrieve wind forecast records published on the preceding day.
4. Select the latest forecast vintage published at or before the configured day-ahead cutoff.
5. Match forecasts and actual generation by delivery-hour start time.
6. Calculate the forecast-performance metrics using the matched hourly values.

**Publication cutoff assumption:** The current implementation uses 11:00 UTC on the preceding day as the day-ahead forecast selection cutoff. This is an explicit modelling assumption and should be interpreted in the context of the purchasing decision being evaluated.

January is on GMT in the UK, so UTC and UK local time coincide during this evaluation period.

### Performance Metrics

Let \(F_t\) be forecast generation and \(A_t\) be actual generation for hour \(t\). Forecast error is defined as \(e_t = F_t - A_t\).

- **MAE:** Mean of the absolute forecast errors. Lower values indicate better accuracy.
- **RMSE:** Square root of the mean squared forecast errors. Larger errors receive greater weight.
- **Bias:** Mean forecast error. Positive bias indicates over-forecasting; negative bias indicates under-forecasting.

All generation errors and metrics are expressed in MW.

## January 2026 Evaluation Results

Results from the current implementation:

| Metric                  |       Result |
| ----------------------- | -----------: |
| Delivery days evaluated |           31 |
| Hourly comparisons      |          744 |
| Failed delivery days    |            0 |
| MAE                     |  2,122.81 MW |
| RMSE                    |  2,616.69 MW |
| Bias                    | +1,840.30 MW |

The positive monthly bias indicates that forecasts exceeded actual wind generation on average over the evaluated hours. These figures are specific to the selected publication cutoff and hourly aggregation methodology.

## Architecture

The application consists of two services:

- **React frontend:** Displays summary KPIs, daily charts, and evaluation results.
- **FastAPI backend:** Retrieves Elexon data, selects forecast vintages, aligns observations, and calculates metrics.

Nginx serves the built frontend and proxies API requests to the backend.

## Run Locally with Docker

### Prerequisites

- Docker Desktop
- Docker Compose

### Start the application

Clone the repository and enter the project directory:

```bash
git clone https://github.com/MOHAMMED-RIYAZ/wind-forecast-dashboard.git
cd wind-forecast-dashboard
```

Build and start both services:

```bash
docker compose up --build -d
```

Open the dashboard:

http://localhost:8080

Backend health check:

http://localhost:8080/health

API documentation:

http://localhost:8080/docs

### Stop the application

```bash
docker compose down
```

## API Endpoints

| Endpoint                                           | Description                   |
| -------------------------------------------------- | ----------------------------- |
| `GET /health`                                      | Health check                  |
| `GET /api/evaluation?year=2026&month=1`            | Monthly evaluation            |
| `GET /api/evaluation/day?delivery_date=2026-01-15` | Single-day evaluation         |
| `GET /docs`                                        | Interactive API documentation |

## Limitations and Assumptions

- Forecast evaluation depends on the configured day-ahead publication cutoff.
- Half-hourly actuals are averaged to match the hourly forecast resolution.
- Only hours with matching forecast and actual data can be compared.
- The current implementation expects 24 matched hourly values per delivery day.
- Results describe forecast performance for the selected historical period; they do not guarantee future performance.
- Forecast metrics can change if the publication cutoff or aggregation methodology changes.

## Project Structure

```text
wind-forecast-dashboard/
├── backend/
│   ├── main.py
│   ├── elexon.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Demo

Video demonstration: Add the unlisted YouTube link here after recording the walkthrough.

## License

No license has been specified for this project yet.
