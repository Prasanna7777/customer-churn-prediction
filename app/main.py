import os
import joblib
import pandas as pd
import shap
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Customer Churn Prediction API")

# Allow the React dev server (and any origin, for local demo purposes) to call this API.
# In production, replace "*" with your actual frontend's domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "outputs", "xgb_model.json")
ENCODERS_PATH = os.path.join(BASE_DIR, "..", "outputs", "encoders.pkl")

model = xgb.XGBClassifier()
model.load_model(MODEL_PATH)
encoders = joblib.load(ENCODERS_PATH)
explainer = shap.TreeExplainer(model)
feature_names = model.get_booster().feature_names


class CustomerInput(BaseModel):
    gender: str = "Female"
    SeniorCitizen: int = 0
    Partner: str = "No"
    Dependents: str = "No"
    tenure: int
    PhoneService: str = "Yes"
    MultipleLines: str = "No"
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str = "No"
    DeviceProtection: str = "No"
    TechSupport: str
    StreamingTV: str = "No"
    StreamingMovies: str = "No"
    Contract: str
    PaperlessBilling: str = "Yes"
    PaymentMethod: str
    MonthlyCharges: float
    TotalCharges: float


class PredictionResponse(BaseModel):
    prediction: str
    churn_probability: float
    base_value: float
    shap_values: dict[str, float]


@app.get("/")
def root():
    return {"status": "Churn prediction API is running"}


@app.post("/predict", response_model=PredictionResponse)
def predict(customer: CustomerInput):
    try:
        input_df = pd.DataFrame([customer.model_dump()])

        for col, le in encoders.items():
            input_df[col] = le.transform(input_df[col].astype(str))

        input_df = input_df[feature_names]

        proba = float(model.predict_proba(input_df)[0, 1])
        prediction = "Churn" if proba >= 0.5 else "No Churn"

        shap_values = explainer(input_df)
        shap_dict = dict(zip(feature_names, shap_values.values[0].tolist()))

        return PredictionResponse(
            prediction=prediction,
            churn_probability=round(proba, 4),
            base_value=float(shap_values.base_values[0]),
            shap_values=shap_dict,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid category value: {e}")