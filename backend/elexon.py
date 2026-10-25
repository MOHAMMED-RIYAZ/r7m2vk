
from datetime import date, datetime, timedelta, timezone
from collections import defaultdict
import calendar

import requests

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
CUTOFF_HOUR_UTC = 11
SESSION = requests.Session()


def to_api_timestamp(value: datetime) -> str:
    """Format a UTC datetime for the Elexon API."""
    return value.isoformat().replace("+00:00", "Z")


def parse_time(value: str) -> datetime:
    """Parse an ISO timestamp returned by Elexon."""
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def fetch_records(
    dataset: str,
    start: str,
    end: str,
) -> list[dict]:
    """Fetch records filtered by publication time."""
    response = SESSION.get(
        f"{BASE_URL}/{dataset}/stream",
        params={
            "publishDateTimeFrom": start,
            "publishDateTimeTo": end,
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def get_hourly_actuals(delivery_day: date) -> dict[str, float]:
    """
    Fetch wind actuals and average the two half-hourly readings
    into each hourly delivery interval.
    """
    day_start = datetime.combine(
        delivery_day,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )
    next_day = day_start + timedelta(days=1)

    records = fetch_records(
        "FUELHH",
        to_api_timestamp(day_start),
        to_api_timestamp(next_day),
    )

    half_hourly = [
        record
        for record in records
        if record.get("fuelType") == "WIND"
        and record.get("settlementDate") == delivery_day.isoformat()
        and record.get("generation") is not None
    ]

    hourly_values = defaultdict(list)

    for record in half_hourly:
        start_time = parse_time(record["startTime"])
        hour_start = start_time.replace(
            minute=0,
            second=0,
            microsecond=0,
        )

        hourly_values[hour_start.isoformat()].append(
            float(record["generation"])
        )

    actuals = {}

    for hour, values in hourly_values.items():
        if len(values) != 2:
            raise ValueError(
                f"Expected 2 half-hourly readings for {hour}; "
                f"received {len(values)}"
            )

        actuals[hour] = sum(values) / 2

    if len(actuals) != 24:
        raise ValueError(
            f"Expected 24 hourly actuals for {delivery_day}; "
            f"received {len(actuals)}"
        )

    return actuals


def get_day_ahead_forecasts(
    delivery_day: date,
) -> dict[str, float]:
    """
    Select the latest forecast for each delivery hour published
    on or before 11:00 UTC on the preceding day.
    """
    previous_day = delivery_day - timedelta(days=1)

    publish_start = datetime.combine(
        previous_day,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )
    cutoff = publish_start.replace(hour=CUTOFF_HOUR_UTC)

    records = fetch_records(
        "WINDFOR",
        to_api_timestamp(publish_start),
        to_api_timestamp(cutoff),
    )

    delivery_start = datetime.combine(
        delivery_day,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )
    delivery_end = delivery_start + timedelta(days=1)

    latest_by_hour = {}

    for record in records:
        if (
            record.get("generation") is None
            or not record.get("startTime")
            or not record.get("publishTime")
        ):
            continue

        start_time = parse_time(record["startTime"])
        publish_time = parse_time(record["publishTime"])

        if not delivery_start <= start_time < delivery_end:
            continue

        if publish_time > cutoff:
            continue

        hour_key = start_time.isoformat()
        existing = latest_by_hour.get(hour_key)

        if existing is None or publish_time > existing[0]:
            latest_by_hour[hour_key] = (
                publish_time,
                float(record["generation"]),
            )

    return {
        hour: generation
        for hour, (_, generation) in latest_by_hour.items()
    }


def calculate_metrics(
    actuals: dict[str, float],
    forecasts: dict[str, float],
    delivery_day: date,
) -> dict:
    """Calculate MAE, RMSE, bias, and hourly comparisons."""
    common_hours = sorted(set(actuals) & set(forecasts))

    if len(common_hours) != 24:
        raise ValueError(
            f"Expected 24 matching hourly values for {delivery_day}; "
            f"found {len(common_hours)}. "
            f"Actual hours: {len(actuals)}, "
            f"forecast hours: {len(forecasts)}"
        )

    errors = [
        forecasts[hour] - actuals[hour]
        for hour in common_hours
    ]

    mae = sum(abs(error) for error in errors) / len(errors)
    rmse = (
        sum(error ** 2 for error in errors) / len(errors)
    ) ** 0.5
    bias = sum(errors) / len(errors)

    hourly_data = [
        {
            "time": hour,
            "forecast_mw": round(forecasts[hour], 2),
            "actual_mw": round(actuals[hour], 2),
            "error_mw": round(forecasts[hour] - actuals[hour], 2),
        }
        for hour in common_hours
    ]

    return {
        "date": delivery_day.isoformat(),
        "hours_evaluated": len(common_hours),
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "bias_mw": round(bias, 2),
        "hourly_data": hourly_data,
    }


def evaluate_day(delivery_day: date) -> dict:
    """Evaluate forecast accuracy for one delivery day."""
    actuals = get_hourly_actuals(delivery_day)
    forecasts = get_day_ahead_forecasts(delivery_day)

    return calculate_metrics(actuals, forecasts, delivery_day)


def evaluate_month(year: int, month: int) -> dict:
    """
    Evaluate every day in a month.
    Days without complete data are recorded as failures.
    """
    if not 1 <= month <= 12:
        raise ValueError("Month must be between 1 and 12")

    number_of_days = calendar.monthrange(year, month)[1]

    daily_results = []
    failed_days = []

    for day_number in range(1, number_of_days + 1):
        delivery_day = date(year, month, day_number)

        try:
            result = evaluate_day(delivery_day)
            daily_results.append(result)
            print(f"Evaluated {delivery_day}: OK")

        except (requests.RequestException, ValueError, KeyError) as exc:
            failed_days.append({
                "date": delivery_day.isoformat(),
                "error": str(exc),
            })
            print(f"Evaluated {delivery_day}: FAILED - {exc}")

    all_hours = [
        row
        for day_result in daily_results
        for row in day_result["hourly_data"]
    ]

    metrics = None

    if all_hours:
        errors = [row["error_mw"] for row in all_hours]

        metrics = {
            "mae_mw": round(
                sum(abs(error) for error in errors) / len(errors),
                2,
            ),
            "rmse_mw": round(
                (
                    sum(error ** 2 for error in errors)
                    / len(errors)
                ) ** 0.5,
                2,
            ),
            "bias_mw": round(
                sum(errors) / len(errors),
                2,
            ),
        }

    return {
        "year": year,
        "month": month,
        "days_in_month": number_of_days,
        "days_evaluated": len(daily_results),
        "hours_evaluated": len(all_hours),
        "failed_days": failed_days,
        "metrics": metrics,
        "daily_results": [
            {
                "date": result["date"],
                "hours_evaluated": result["hours_evaluated"],
                "mae_mw": result["mae_mw"],
                "rmse_mw": result["rmse_mw"],
                "bias_mw": result["bias_mw"],
            }
            for result in daily_results
        ],
    }


if __name__ == "__main__":
    result = evaluate_day(date(2026, 1, 15))

    print("\nSingle-day evaluation")
    print("Date:", result["date"])
    print("Hours evaluated:", result["hours_evaluated"])
    print("MAE (MW):", result["mae_mw"])
    print("RMSE (MW):", result["rmse_mw"])
    print("Bias (MW):", result["bias_mw"])

    print("\nRunning monthly evaluation...")
    monthly = evaluate_month(2026, 1)

    print("\nMonthly summary")
    print("Days evaluated:", monthly["days_evaluated"])
    print("Hours evaluated:", monthly["hours_evaluated"])
    print("Failed days:", len(monthly["failed_days"]))
    print("Metrics:", monthly["metrics"])
