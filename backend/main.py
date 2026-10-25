
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from elexon import evaluate_day, evaluate_month
from datetime import date
import os
app = FastAPI(
    title="Wind Forecast Dashboard API",
    description="UK wind generation forecast analysis using Elexon data",
    version="0.2.0",
)

allowed_origins = ["http://localhost:5173"]

frontend_origins = os.getenv("FRONTEND_ORIGINS", "")
allowed_origins.extend(
    origin.strip().rstrip("/")
    for origin in frontend_origins.split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Wind Forecast Dashboard API is running",
        "status": "ok",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/evaluation")
def monthly_evaluation(
    year: int = Query(default=2026, ge=2020, le=2035),
    month: int = Query(default=1, ge=1, le=12),
):
    try:
        return evaluate_month(year, month)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/evaluation/day")
def daily_evaluation(
    delivery_date: date = Query(default=date(2026, 1, 15)),
):
    try:
        return evaluate_day(delivery_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
