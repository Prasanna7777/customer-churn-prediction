import { useState } from "react";
import "./App.css";

// ---- Types ----
interface CustomerInput {
  gender: string;
  SeniorCitizen: number;
  Partner: string;
  Dependents: string;
  tenure: number;
  PhoneService: string;
  MultipleLines: string;
  InternetService: string;
  OnlineSecurity: string;
  OnlineBackup: string;
  DeviceProtection: string;
  TechSupport: string;
  StreamingTV: string;
  StreamingMovies: string;
  Contract: string;
  PaperlessBilling: string;
  PaymentMethod: string;
  MonthlyCharges: number;
  TotalCharges: number;
}

interface PredictionResponse {
  prediction: "Churn" | "No Churn";
  churn_probability: number;
  base_value: number;
  shap_values: Record<string, number>;
}

const DEFAULT_CUSTOMER: CustomerInput = {
  gender: "Female",
  SeniorCitizen: 0,
  Partner: "No",
  Dependents: "No",
  tenure: 12,
  PhoneService: "Yes",
  MultipleLines: "No",
  InternetService: "Fiber optic",
  OnlineSecurity: "No",
  OnlineBackup: "No",
  DeviceProtection: "No",
  TechSupport: "No",
  StreamingTV: "No",
  StreamingMovies: "No",
  Contract: "Month-to-month",
  PaperlessBilling: "Yes",
  PaymentMethod: "Electronic check",
  MonthlyCharges: 65,
  TotalCharges: 780,
};

// ---- API call ----
async function predictChurn(
  apiUrl: string,
  customer: CustomerInput
): Promise<PredictionResponse> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API returned ${res.status}: ${detail}`);
  }
  return (await res.json()) as PredictionResponse;
}

// ---- SHAP bar chart sub-component ----
function ShapBars({ shapValues }: { shapValues: Record<string, number> }) {
  const entries = Object.entries(shapValues)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 10);
  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.01);

  return (
    <div className="shap-bars">
      <div className="section-title">TOP CONTRIBUTING FACTORS (SHAP)</div>
      {entries.map(([name, val]) => {
        const pct = (Math.abs(val) / maxAbs) * 45;
        const isRisk = val >= 0;
        const left = isRisk ? "50%" : `${50 - pct}%`;
        return (
          <div className="shap-row" key={name}>
            <div className="fname">{name}</div>
            <div className="bar-track">
              <div className="zero" />
              <div
                className={`bar ${isRisk ? "risk" : "safe"}`}
                style={{ left, width: `${pct}%` }}
              />
            </div>
            <div className="val">
              {val >= 0 ? "+" : ""}
              {val.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Main app ----
export default function App() {
  const [apiUrl, setApiUrl] = useState("https://customer-churn-prediction-k5hs.onrender.com//predict");
  const [customer, setCustomer] = useState<CustomerInput>(DEFAULT_CUSTOMER);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CustomerInput>(
    key: K,
    value: CustomerInput[K]
  ) {
    setCustomer((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "tenure" || key === "MonthlyCharges") {
        next.TotalCharges = Number(
          (next.tenure * next.MonthlyCharges).toFixed(2)
        );
      }
      return next;
    });
  }

  async function handlePredict() {
    setLoading(true);
    setError(null);
    try {
      const res = await predictChurn(apiUrl, customer);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const isRisk = result ? result.churn_probability >= 0.5 : false;

  return (
    <>
      <header>
        <div className="kicker">XGBOOST + SHAP</div>
        <h1>Customer Churn Risk</h1>
      </header>

      <main>
        <section className="panel form-panel">
          <div className="field">
            <label>API ENDPOINT</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>

          <div className="field">
            <label>
              TENURE (MONTHS)
              <span className="range-value">{customer.tenure}</span>
            </label>
            <input
              type="range"
              min={0}
              max={72}
              value={customer.tenure}
              onChange={(e) => updateField("tenure", Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>CONTRACT</label>
            <select
              value={customer.Contract}
              onChange={(e) => updateField("Contract", e.target.value)}
            >
              <option>Month-to-month</option>
              <option>One year</option>
              <option>Two year</option>
            </select>
          </div>

          <div className="field">
            <label>
              MONTHLY CHARGES ($)
              <span className="range-value">{customer.MonthlyCharges}</span>
            </label>
            <input
              type="range"
              min={18}
              max={120}
              value={customer.MonthlyCharges}
              onChange={(e) =>
                updateField("MonthlyCharges", Number(e.target.value))
              }
            />
          </div>

          <div className="field">
            <label>TOTAL CHARGES ($)</label>
            <input
              type="number"
              value={customer.TotalCharges}
              onChange={(e) =>
                updateField("TotalCharges", Number(e.target.value))
              }
            />
          </div>

          <div className="field">
            <label>INTERNET SERVICE</label>
            <select
              value={customer.InternetService}
              onChange={(e) => updateField("InternetService", e.target.value)}
            >
              <option>DSL</option>
              <option>Fiber optic</option>
              <option>No</option>
            </select>
          </div>

          <div className="field">
            <label>ONLINE SECURITY</label>
            <select
              value={customer.OnlineSecurity}
              onChange={(e) => updateField("OnlineSecurity", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
              <option>No internet service</option>
            </select>
          </div>

          <div className="field">
            <label>TECH SUPPORT</label>
            <select
              value={customer.TechSupport}
              onChange={(e) => updateField("TechSupport", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
              <option>No internet service</option>
            </select>
          </div>

          <div className="field">
            <label>PAYMENT METHOD</label>
            <select
              value={customer.PaymentMethod}
              onChange={(e) => updateField("PaymentMethod", e.target.value)}
            >
              <option>Electronic check</option>
              <option>Mailed check</option>
              <option>Bank transfer (automatic)</option>
              <option>Credit card (automatic)</option>
            </select>
          </div>

          <div className="field">
            <label>PAPERLESS BILLING</label>
            <select
              value={customer.PaperlessBilling}
              onChange={(e) =>
                updateField("PaperlessBilling", e.target.value)
              }
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>

          <div className="field">
            <label>SENIOR CITIZEN</label>
            <select
              value={customer.SeniorCitizen}
              onChange={(e) =>
                updateField("SeniorCitizen", Number(e.target.value))
              }
            >
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </div>

          <div className="field">
            <label>GENDER</label>
            <select
              value={customer.gender}
              onChange={(e) => updateField("gender", e.target.value)}
            >
              <option>Female</option>
              <option>Male</option>
            </select>
          </div>

          <div className="field">
            <label>PARTNER</label>
            <select
              value={customer.Partner}
              onChange={(e) => updateField("Partner", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          <div className="field">
            <label>DEPENDENTS</label>
            <select
              value={customer.Dependents}
              onChange={(e) => updateField("Dependents", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          <div className="field">
            <label>PHONE SERVICE</label>
            <select
              value={customer.PhoneService}
              onChange={(e) => updateField("PhoneService", e.target.value)}
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>

          <div className="field">
            <label>MULTIPLE LINES</label>
            <select
              value={customer.MultipleLines}
              onChange={(e) => updateField("MultipleLines", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
              <option>No phone service</option>
            </select>
          </div>

          <div className="field">
            <label>ONLINE BACKUP</label>
            <select
              value={customer.OnlineBackup}
              onChange={(e) => updateField("OnlineBackup", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
              <option>No internet service</option>
            </select>
          </div>

          <div className="field">
            <label>DEVICE PROTECTION</label>
            <select
              value={customer.DeviceProtection}
              onChange={(e) => updateField("DeviceProtection", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
              <option>No internet service</option>
            </select>
          </div>

          <div className="field">
            <label>STREAMING TV</label>
            <select
              value={customer.StreamingTV}
              onChange={(e) => updateField("StreamingTV", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
              <option>No internet service</option>
            </select>
          </div>

          <div className="field">
            <label>STREAMING MOVIES</label>
            <select
              value={customer.StreamingMovies}
              onChange={(e) => updateField("StreamingMovies", e.target.value)}
            >
              <option>No</option>
              <option>Yes</option>
              <option>No internet service</option>
            </select>
          </div>

          <button id="predictBtn" onClick={handlePredict} disabled={loading}>
            {loading ? "RUNNING…" : "RUN PREDICTION"}
          </button>
        </section>

        <section className="panel result-panel">
          {error && (
            <div className="error-box">
              Request failed: {error}
              <br />
              Check that the FastAPI server is running and the endpoint URL
              is correct.
            </div>
          )}

          {!error && !result && (
            <div className="placeholder">
              Fill in a customer profile and run a prediction.
            </div>
          )}

          {!error && result && (
            <>
              <div className="verdict">
                <div className={`score ${isRisk ? "risk" : "safe"}`}>
                  {(result.churn_probability * 100).toFixed(1)}%
                </div>
                <div className="label">
                  CHURN PROBABILITY
                  <strong>
                    {isRisk ? "⚠ Likely to churn" : "✓ Likely to stay"}
                  </strong>
                </div>
              </div>
              <ShapBars shapValues={result.shap_values} />
            </>
          )}
        </section>
      </main>
    </>
  );
}