"""
Module 1: ML-Based Passenger Demand Forecasting
Trained directly on passenger_demand.csv (10,000 real records).

Implements & benchmarks 4 Algorithms:
  1. Linear Regression
  2. Decision Tree Regressor
  3. Random Forest Regressor
  4. XGBoost Regressor

Evaluates all models using MAE, RMSE, and R2 on a test split.
Forecasts passenger demand, expected occupancy, vacant seats, and demand class.
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_PATH = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "data", "passenger_demand.csv"))
BUS_CAPACITY = 28

class DemandForecastingEngine:
    def __init__(self):
        self.models = {}
        self.metrics = {}
        self.best_model_name = None
        self.best_model = None
        self.feature_columns = [
            'route_distance_km', 'departure_hour', 'fare_per_seat', 
            'is_holiday', 'hours_before_departure', 'current_bookings', 
            'bus_capacity', 'rainfall_mm'
        ]
        self.day_cols = []
        self._train_models()

    def _train_models(self):
        if not os.path.exists(DATA_PATH):
            print(f"[ML Forecasting Engine] Warning: {DATA_PATH} not found.")
            return

        df = pd.read_csv(DATA_PATH)
        print(f"[ML Forecasting Engine] Training 4 ML models on {len(df):,} records from passenger_demand.csv...")

        # Feature preparation
        day_dummies = pd.get_dummies(df['day_of_week'], prefix='day', drop_first=True)
        self.day_cols = list(day_dummies.columns)

        X = pd.concat([df[self.feature_columns], day_dummies], axis=1)
        y = df['actual_bookings']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        model_defs = {
            'XGBoost Regressor': XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.08, random_state=42),
            'Random Forest Regressor': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            'Decision Tree Regressor': DecisionTreeRegressor(max_depth=6, random_state=42),
            'Linear Regression': LinearRegression()
        }

        best_mae = float('inf')
        for name, model in model_defs.items():
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            preds_clamped = np.clip(preds, 1, 50)

            mae = float(mean_absolute_error(y_test, preds_clamped))
            rmse = float(np.sqrt(mean_squared_error(y_test, preds_clamped)))
            r2 = float(r2_score(y_test, preds_clamped))

            self.models[name] = model
            self.metrics[name] = {
                'mae': round(mae, 2),
                'rmse': round(rmse, 2),
                'r2': round(r2, 4),
                'accuracy_pct': round(max(0, 100 - (mae / float(y_test.mean()) * 100)), 1),
                'sample_prediction': float(round(preds_clamped[0], 1))
            }

            # Lower MAE is better
            if mae < best_mae:
                best_mae = mae
                self.best_model_name = name
                self.best_model = model

        print(f"[ML Forecasting Engine] Models trained successfully! Best Model: {self.best_model_name} (MAE={best_mae:.2f} seats)")

    def get_model_comparison(self):
        """Returns comparison table of all 4 algorithms for Admin Dashboard"""
        return {
            'dataset': 'passenger_demand.csv (10,000 records)',
            'best_model': self.best_model_name,
            'models': self.metrics
        }

    def predict_demand(self, distance_km, departure_time_str, travel_date_str, bus_type="Shivshahi (AC Seater)"):
        """
        Infers expected passenger demand, occupancy %, and vacant seats.
        """
        try:
            dep_hour = int(departure_time_str.split(':')[0])
        except Exception:
            dep_hour = 12

        try:
            d_obj = date.fromisoformat(travel_date_str)
            day_name = d_obj.strftime("%A")
            day_of_week = d_obj.weekday()
        except Exception:
            day_name = "Thursday"
            day_of_week = 3

        is_weekend = 1 if day_of_week in [5, 6] else 0
        is_holiday = 1 if is_weekend or travel_date_str in {"2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-12-25"} else 0

        # Estimated fare for slot
        fare_per_seat = max(150, int(round(distance_km * (1.8 if 'Shiv' in bus_type else 1.1))))
        bus_cap = 42 if 'Ordinary' in bus_type else 28

        # Build feature vector
        row_dict = {
            'route_distance_km': float(distance_km),
            'departure_hour': dep_hour,
            'fare_per_seat': fare_per_seat,
            'is_holiday': is_holiday,
            'hours_before_departure': 24, # 24 hrs forecast window
            'current_bookings': int(bus_cap * 0.25), # approx 25% baseline
            'bus_capacity': bus_cap,
            'rainfall_mm': 0.0
        }
        for c in self.day_cols:
            row_dict[c] = 1 if c == f'day_{day_name}' else 0

        X_in = pd.DataFrame([row_dict])
        
        if self.best_model:
            pred_val = float(self.best_model.predict(X_in)[0])
        else:
            pred_val = 11.0

        expected_demand = int(np.clip(round(pred_val), 1, bus_cap))
        expected_occupancy_pct = round((expected_demand / bus_cap) * 100, 1)
        expected_vacant_seats = bus_cap - expected_demand

        if expected_occupancy_pct >= 65:
            demand_class = "HIGH"
        elif expected_occupancy_pct >= 35:
            demand_class = "MEDIUM"
        else:
            demand_class = "LOW"

        # Happy hours condition: off-peak slump (11:00 - 16:00 or late night) and occupancy < 55%
        is_offpeak_hour = (11 <= dep_hour <= 16) or (dep_hour >= 21) or (dep_hour <= 6)
        happy_hours_eligible = (expected_occupancy_pct < 55) or (is_offpeak_hour and expected_occupancy_pct < 65)

        return {
            'expected_demand': expected_demand,
            'bus_capacity': bus_cap,
            'expected_occupancy_pct': expected_occupancy_pct,
            'expected_vacant_seats': expected_vacant_seats,
            'demand_class': demand_class,
            'is_happy_hours_eligible': happy_hours_eligible,
            'model_used': self.best_model_name,
            'dataset_source': 'passenger_demand.csv (10k records)'
        }

# Global singleton
FORECAST_ENGINE = DemandForecastingEngine()
