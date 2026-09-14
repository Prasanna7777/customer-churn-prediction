import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

TARGET_COL = 'Churn'
ID_COL = 'customerID'


def load_data(path):
    return pd.read_csv(path)


def clean_data(df):
    df = df.copy()
    df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce')
    df['TotalCharges'] = df['TotalCharges'].fillna(df['MonthlyCharges'] * df['tenure'])
    df = df.drop(columns=[ID_COL])
    df[TARGET_COL] = df[TARGET_COL].map({'Yes': 1, 'No': 0})
    return df


def encode_onehot(df):
    """For linear methods like Logistic Regression."""
    categorical_cols = df.select_dtypes(include='object').columns.tolist()
    return pd.get_dummies(df, columns=categorical_cols, drop_first=True)

def encode_label(df):
    """For tree-based models like XGBoost."""
    df = df.copy()
    categorical_cols = df.select_dtypes(include='object').columns.tolist()
    encoders = {}
    for col in categorical_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = le
    return df, encoders


def split_data(df, test_size=0.2, random_state=42):
    X = df.drop(columns=[TARGET_COL])
    y = df[TARGET_COL]
    return train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)