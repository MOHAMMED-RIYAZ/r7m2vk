import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  Wind,
  Zap,
} from "lucide-react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "" : "http://localhost:8000");

function MetricCard({ title, value, unit, description, icon: Icon }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <span className="metric-icon">
          <Icon size={19} />
        </span>
      </div>
      <div className="metric-value">
        {value ?? "—"} <small>{unit}</small>
      </div>
      <p>{description}</p>
    </div>
  );
}

function App() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/evaluation?year=${year}&month=${month}`,
      );

      if (!response.ok) {
        throw new Error(`API request failed (${response.status})`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(
        `${err.message}. Check that the FastAPI backend is running at ${API_URL}.`,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [year, month]);

  const monthlyMetrics = data?.metrics;
  const dailyData = data?.daily_results ?? [];
  const allHours = data?.hours_evaluated ?? 0;
  const successfulDays = data?.days_evaluated ?? 0;
  const failedDays = data?.failed_days?.length ?? 0;

  const biasDescription =
    monthlyMetrics?.bias_mw > 0
      ? "Forecasts were higher than actuals on average"
      : monthlyMetrics?.bias_mw < 0
        ? "Forecasts were lower than actuals on average"
        : "Forecasts matched actuals on average";

  const monthName = new Date(year, month - 1, 1).toLocaleString("en-GB", {
    month: "long",
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Wind size={23} />
          </span>
          <span>
            Wind<span className="brand-light">Scope</span>
          </span>
        </a>
        <div className="topbar-right">
          <span className="live-dot" />
          <span>Elexon data analysis</span>
          <span className="topbar-divider" />
          <span className="topbar-label">UK POWER</span>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <div className="eyebrow">
              <Activity size={15} /> RENEWABLE ENERGY INTELLIGENCE
            </div>
            <h1>
              Wind Forecast <span>Performance</span>
            </h1>
            <p className="hero-description">
              Compare day-ahead wind generation forecasts against actual UK wind
              generation and understand forecast accuracy.
            </p>
          </div>

          <div className="period-control">
            <label htmlFor="month">Evaluation period</label>
            <div className="select-wrap">
              <CalendarDays size={17} />
              <select
                id="month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {new Date(2026, index, 1).toLocaleString("en-GB", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
              <select
                aria-label="Evaluation year"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                <option value={2026}>2026</option>
              </select>
            </div>
            <button
              className="refresh-button"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              {loading ? "Loading..." : "Refresh data"}
            </button>
          </div>
        </section>

        <section className="data-banner">
          <div className="data-banner-icon">
            <Zap size={18} />
          </div>
          <div>
            <strong>Day-ahead forecast evaluation</strong>
            <p>
              Elexon wind generation data · Hourly comparison · Forecast cutoff:
              11:00 UTC on the previous day
            </p>
          </div>
          <span className="banner-period">
            {monthName} {year}
          </span>
        </section>

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <div>
              <strong>Unable to load dashboard data</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading && !data ? (
          <div className="loading-panel">
            <div className="loader" />
            <h3>Analysing wind generation data</h3>
            <p>
              Fetching forecasts and actuals from Elexon. This may take a
              moment.
            </p>
          </div>
        ) : data ? (
          <>
            <section className="section-heading">
              <div>
                <h2>Performance overview</h2>
                <p>
                  Summary of forecast errors for {monthName} {year}
                </p>
              </div>
              <span className="status-pill">
                <CheckCircle2 size={15} /> {successfulDays} days evaluated
              </span>
            </section>

            <section className="metrics-grid">
              <MetricCard
                title="Mean Absolute Error"
                value={monthlyMetrics?.mae_mw?.toLocaleString("en-GB", {
                  maximumFractionDigits: 2,
                })}
                unit="MW"
                description="Average absolute forecast error"
                icon={Activity}
              />
              <MetricCard
                title="Root Mean Square Error"
                value={monthlyMetrics?.rmse_mw?.toLocaleString("en-GB", {
                  maximumFractionDigits: 2,
                })}
                unit="MW"
                description="Penalises larger forecast errors"
                icon={Zap}
              />
              <MetricCard
                title="Forecast Bias"
                value={monthlyMetrics?.bias_mw?.toLocaleString("en-GB", {
                  maximumFractionDigits: 2,
                })}
                unit="MW"
                description={biasDescription}
                icon={Wind}
              />
              <MetricCard
                title="Hours Compared"
                value={allHours.toLocaleString("en-GB")}
                unit="hours"
                description={`${successfulDays} of ${data.days_in_month} days evaluated`}
                icon={CalendarDays}
              />
            </section>

            {failedDays > 0 && (
              <div className="warning-banner">
                <AlertCircle size={18} />
                {failedDays} day(s) could not be evaluated. Monthly metrics
                cover only the successfully evaluated hours.
              </div>
            )}

            <section className="charts-grid">
              <article className="chart-card chart-wide">
                <div className="chart-heading">
                  <div>
                    <h3>Daily forecast accuracy</h3>
                    <p>MAE and RMSE by delivery day, measured in MW</p>
                  </div>
                  <span className="chart-tag">DAILY</span>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dailyData}
                      margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e8edf3"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => value.slice(8)}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tickLine={false} axisLine={false} width={62} />
                      <Tooltip labelFormatter={(value) => `Date: ${value}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="mae_mw"
                        name="MAE"
                        stroke="#168a75"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rmse_mw"
                        name="RMSE"
                        stroke="#5278d9"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="chart-card">
                <div className="chart-heading">
                  <div>
                    <h3>Daily forecast bias</h3>
                    <p>Positive means over-forecasting</p>
                  </div>
                  <span className="chart-tag">BIAS</span>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyData}
                      margin={{ top: 12, right: 4, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e8edf3"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => value.slice(8)}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tickLine={false} axisLine={false} width={58} />
                      <Tooltip labelFormatter={(value) => `Date: ${value}`} />
                      <Bar
                        dataKey="bias_mw"
                        name="Bias (MW)"
                        fill="#e1a54b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="chart-card">
                <div className="chart-heading">
                  <div>
                    <h3>Daily evaluation coverage</h3>
                    <p>Successfully compared hours per day</p>
                  </div>
                  <span className="chart-tag">COVERAGE</span>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dailyData}
                      margin={{ top: 12, right: 4, left: 0, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id="coverageFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#168a75"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="#168a75"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e8edf3"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => value.slice(8)}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 24]}
                        ticks={[0, 6, 12, 18, 24]}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <Tooltip labelFormatter={(value) => `Date: ${value}`} />
                      <Area
                        type="monotone"
                        dataKey="hours_evaluated"
                        name="Hours"
                        stroke="#168a75"
                        fill="url(#coverageFill)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>

            <section className="table-card">
              <div className="table-heading">
                <div>
                  <h3>Daily evaluation results</h3>
                  <p>Detailed forecast error metrics for each delivery day</p>
                </div>
                <span className="table-count">{dailyData.length} records</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Delivery date</th>
                      <th>Hours</th>
                      <th>MAE (MW)</th>
                      <th>RMSE (MW)</th>
                      <th>Bias (MW)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.map((day) => (
                      <tr key={day.date}>
                        <td className="date-cell">{day.date}</td>
                        <td>{day.hours_evaluated}/24</td>
                        <td>
                          {day.mae_mw.toLocaleString("en-GB", {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td>
                          {day.rmse_mw.toLocaleString("en-GB", {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={
                            day.bias_mw > 0
                              ? "positive-bias"
                              : day.bias_mw < 0
                                ? "negative-bias"
                                : ""
                          }
                        >
                          {day.bias_mw > 0 ? "+" : ""}
                          {day.bias_mw.toLocaleString("en-GB", {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        <footer className="footer">
          <div className="footer-brand">
            <Wind size={17} /> WindScope
          </div>
          <p>Data source: Elexon BMRS · UK wind generation</p>
          <p>
            Forecast cutoff is a documented working assumption and should be
            validated against the intended purchasing decision time.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
