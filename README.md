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

### Frontend

- React
- Vite
- Recharts
- Lucide React
- Nginx

### Backend

- Python
- FastAPI
- Pandas
- Requests

### Deployment

- Docker
- Docker Compose

## Data Sources

WindScope uses the following Elexon BMRS API datasets:

- **Actual generation — FUELHH:** [Elexon FUELHH API documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
- **Wind generation forecasts — WINDFOR:** [Elexon WINDFOR API documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)

The application uses wind generation records and their publication and delivery timestamps to compare forecasts with actual generation.

## Evaluation Methodology

The default evaluation period is January 2026.

1. Retrieve actual wind generation records for each delivery day.
2. Convert half-hourly actual generation readings into hourly values by averaging the two half-hourly readings within each hour.
3. Retrieve wind forecast records published on the preceding day.
4. Select the latest forecast vintage published at or before the configured day-ahead cutoff.
5. Match forecasts and actual generation by delivery-hour start time.
6. Calculate forecast-performance metrics using the matched hourly values.

**Publication cutoff assumption:** The current implementation uses 11:00 UTC on the preceding day as the day-ahead forecast selection cutoff. This is an explicit modelling assumption and should be interpreted in the context of the purchasing decision being evaluated. It should not be taken as confirmation of an official market deadline.

January is on GMT in the UK, so UTC and UK local time coincide during this evaluation period.

### Performance Metrics

Let \(F_t\) be forecast generation and \(A_t\) be actual generation for hour \(t\). Forecast error is defined as:

\[
e_t = F_t - A_t
\]

- **Mean Absolute Error (MAE):** The mean of the absolute forecast errors. Lower values indicate better accuracy.
- **Root Mean Squared Error (RMSE):** The square root of the mean squared forecast errors. Larger errors receive greater weight.
- **Forecast Bias:** The mean forecast error. Positive bias indicates over-forecasting, while negative bias indicates under-forecasting.

All generation errors and metrics are expressed in MW.

## January 2026 Evaluation Results

The following results were returned by the current local implementation:

| Metric                  |       Result |
| ----------------------- | -----------: |
| Delivery days evaluated |           31 |
| Hourly comparisons      |          744 |
| Failed delivery days    |            0 |
| MAE                     |  2,122.81 MW |
| RMSE                    |  2,616.69 MW |
| Bias                    | +1,840.30 MW |

The positive monthly bias indicates that forecast generation exceeded actual wind generation on average over the evaluated hours. These results depend on the selected publication cutoff, data availability, and hourly aggregation methodology.

## Architecture

The application consists of two services:

- **React frontend:** Displays summary KPIs, daily charts, and evaluation results.
- **FastAPI backend:** Retrieves Elexon data, selects forecast vintages, aligns observations, and calculates metrics.

Nginx serves the built frontend and proxies API requests to the backend.

## Run Locally with Docker

### Prerequisites

- Docker Desktop
- Docker Compose

### Start the Application

Clone the repository and enter the project directory:

```bash
git clone https://github.com/MOHAMMED-RIYAZ/r7m2vk.git
cd r7m2vk
```

Build and start both services:

```bash
docker compose up --build -d
```

Open the dashboard:

- **Dashboard:** http://localhost:8080
- **Backend health check:** http://localhost:8000/health
- **API documentation:** http://localhost:8000/docs

### Stop the Application

```bash
docker compose down
```

## API Endpoints

| Method | Endpoint                                       | Description                   |
| ------ | ---------------------------------------------- | ----------------------------- |
| GET    | `/health`                                      | Health check                  |
| GET    | `/api/evaluation?year=2026&month=1`            | Monthly evaluation            |
| GET    | `/api/evaluation/day?delivery_date=2026-01-15` | Single-day evaluation         |
| GET    | `/docs`                                        | Interactive API documentation |

## Limitations and Assumptions

- Forecast evaluation depends on the configured day-ahead publication cutoff.
- Half-hourly actual generation readings are averaged to match the hourly forecast resolution.
- Only hours with matching forecast and actual data can be compared.
- The current implementation expects 24 matched hourly values per delivery day.
- Results describe forecast performance for the selected historical period and do not guarantee future performance.
- Forecast metrics may change if the publication cutoff, source data, or aggregation methodology changes.

## Project Structure

```text
r7m2vk/
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

## AI Tools Disclosure

ChatGPT (OpenAI) was used as an AI-assisted development tool for implementation guidance, debugging, documentation, and reviewing the forecast-evaluation methodology. The application was tested locally using Docker, and the reported January 2026 evaluation results were verified against the running API.

## Demo Video

**WindScope Project Demonstration:** [Watch the demo on YouTube](https://www.youtube.com/watch?v=08c3oC3IPVU)

The 8-minute demonstration covers the customer-facing dashboard, forecast-performance metrics, data-processing methodology, technical architecture, and deployment.

The video is set to **Unlisted** and can be accessed by anyone with the link.

**Live Dashboard:** https://windscope-mu.vercel.app/

**Backend Health Check:** https://windscope-api-066t.onrender.com/health

The dashboard evaluates UK day-ahead wind generation forecasts against actual generation using Elexon BMRS data. Select an evaluation month to review forecast accuracy metrics, daily error charts, and evaluation coverage.

## License

No license has been specified for this project yet.
