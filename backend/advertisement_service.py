"""
Module 4: Advertisement-Based Revenue Generation Engine
Built on the 1000-row MSRTC advertisement dataset.

Features:
  1. Position-based pricing (Front/First 10 Seats/Middle/Rear)
  2. Dataset Analytics & Revenue Summaries
  3. Machine Learning Ad Revenue Predictor (Linear Regression & Random Forest)
  4. In-Bus QR Code Scan & Retail Discount Coupon Simulator
  5. Local Merchant Ad Placement Portal
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_PATH = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "data", "advertisements.csv"))
if not os.path.exists(DATA_PATH):
    DATA_PATH = os.path.realpath(os.path.join(os.path.dirname(__file__), "data", "advertisements.csv"))

class AdvertisementService:
    # Proposed base daily rates by bus position (as highlighted in PDF)
    POSITION_RATES = {
        "Front": {"base_daily_fee": 180, "tier": "Premium", "multiplier": 1.45, "visibility": "High Eye-Level"},
        "First 10 Seats Area": {"base_daily_fee": 150, "tier": "High", "multiplier": 1.25, "visibility": "Boarding Flow"},
        "Middle": {"base_daily_fee": 100, "tier": "Medium", "multiplier": 1.00, "visibility": "In-Transit Seated"},
        "Rear": {"base_daily_fee": 70, "tier": "Standard", "multiplier": 0.75, "visibility": "Exit / Rear Exterior"}
    }
    
    CAMPAIGN_FACTORS = {
        "Digital": 1.35, # Digital displays have high rotation & engagement
        "QR": 1.15,      # Interactive QR codes
        "Banner": 1.00   # Static vinyl poster
    }

    PARTNER_RETAILERS = [
        {"name": "Kolhapuri Chappal Emporium", "category": "Footwear", "discount": "15% OFF", "code": "KOLHAPUR15"},
        {"name": "Chitale Bandhu Mithaiwale", "category": "Sweets & Snacks", "discount": "10% OFF", "code": "CHITALE10"},
        {"name": "Katraj Dairy & Milk Products", "category": "Beverages", "discount": "₹20 OFF", "code": "KATRAJ20"},
        {"name": "Deccan Textile Mart", "category": "Apparel", "discount": "20% OFF", "code": "DECCAN20"},
        {"name": "Mahalaxmi Agro Products", "category": "Spices & Jaggery", "discount": "12% OFF", "code": "AGRO12"}
    ]

    def __init__(self):
        self.df = None
        self.ml_model = None
        self.ml_metrics = {}
        self.feature_columns = ['duration_days', 'qr_scans', 'advertisement_fee',
                                'pos_Middle', 'pos_Rear', 'type_Digital', 'type_QR']
        self._load_and_train()

    def _load_and_train(self):
        if not os.path.exists(DATA_PATH):
            print(f"[Ad Service] Warning: {DATA_PATH} not found.")
            return
            
        self.df = pd.read_csv(DATA_PATH)
        print(f"[Ad Service] Loaded {len(self.df)} advertisement records from {DATA_PATH}.")
        
        # Prepare ML feature matrix
        pos_dummies = pd.get_dummies(self.df['advertisement_position'], prefix='pos', drop_first=True)
        type_dummies = pd.get_dummies(self.df['campaign_type'], prefix='type', drop_first=True)
        
        X = pd.concat([
            self.df[['duration_days', 'qr_scans', 'advertisement_fee']],
            pos_dummies,
            type_dummies
        ], axis=1)
        
        # Ensure column alignment
        for col in self.feature_columns:
            if col not in X.columns:
                X[col] = 0
        X = X[self.feature_columns]
        y = self.df['advertisement_revenue']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Compare Linear Regression and Random Forest
        lr = LinearRegression()
        lr.fit(X_train, y_train)
        lr_preds = lr.predict(X_test)
        
        rf = RandomForestRegressor(n_estimators=100, random_state=42)
        rf.fit(X_train, y_train)
        rf_preds = rf.predict(X_test)
        
        lr_r2 = float(r2_score(y_test, lr_preds))
        rf_r2 = float(r2_score(y_test, rf_preds))
        
        self.ml_metrics = {
            'Linear Regression': {
                'mae': round(float(mean_absolute_error(y_test, lr_preds)), 2),
                'rmse': round(float(np.sqrt(mean_squared_error(y_test, lr_preds))), 2),
                'r2': round(lr_r2, 4)
            },
            'Random Forest': {
                'mae': round(float(mean_absolute_error(y_test, rf_preds)), 2),
                'rmse': round(float(np.sqrt(mean_squared_error(y_test, rf_preds))), 2),
                'r2': round(rf_r2, 4)
            }
        }
        
        self.ml_model = lr if lr_r2 >= rf_r2 else rf
        print(f"[Ad Service] Trained Ad Revenue ML Model. Best R2: {max(lr_r2, rf_r2):.4f}")

    def get_analytics(self):
        """Returns deep statistical analytics on the 1000 dataset records."""
        if self.df is None:
            return {}
            
        total_revenue = float(round(self.df['advertisement_revenue'].sum(), 2))
        total_fees = float(round(self.df['advertisement_fee'].sum(), 2))
        total_scans = int(self.df['qr_scans'].sum())
        total_campaigns = int(len(self.df))
        avg_revenue = float(round(self.df['advertisement_revenue'].mean(), 2))
        avg_duration = float(round(self.df['duration_days'].mean(), 1))
        
        # Position breakdown
        pos_grp = self.df.groupby('advertisement_position').agg({
            'advertisement_revenue': ['sum', 'mean'],
            'advertisement_fee': 'sum',
            'qr_scans': ['sum', 'mean'],
            'advertisement_id': 'count'
        })
        
        position_breakdown = []
        for pos, row in pos_grp.iterrows():
            position_breakdown.append({
                'position': pos,
                'campaign_count': int(row[('advertisement_id', 'count')]),
                'total_revenue': round(float(row[('advertisement_revenue', 'sum')]), 2),
                'avg_revenue': round(float(row[('advertisement_revenue', 'mean')]), 2),
                'total_scans': int(row[('qr_scans', 'sum')]),
                'avg_scans': round(float(row[('qr_scans', 'mean')]), 1),
                'tier': self.POSITION_RATES.get(pos, {}).get('tier', 'Standard')
            })
            
        # Campaign type breakdown
        type_grp = self.df.groupby('campaign_type').agg({
            'advertisement_revenue': ['sum', 'mean'],
            'qr_scans': 'sum',
            'advertisement_id': 'count'
        })
        campaign_type_breakdown = []
        for ctype, row in type_grp.iterrows():
            campaign_type_breakdown.append({
                'campaign_type': ctype,
                'count': int(row[('advertisement_id', 'count')]),
                'total_revenue': round(float(row[('advertisement_revenue', 'sum')]), 2),
                'avg_revenue': round(float(row[('advertisement_revenue', 'mean')]), 2),
                'total_scans': int(row[('qr_scans', 'sum')])
            })
            
        # Top 5 Routes by revenue
        top_routes = self.df.groupby('route_id').agg({
            'advertisement_revenue': 'sum',
            'advertisement_id': 'count',
            'qr_scans': 'sum'
        }).sort_values(by='advertisement_revenue', ascending=False).head(6)
        
        top_routes_list = []
        for rid, row in top_routes.iterrows():
            top_routes_list.append({
                'route_id': rid,
                'revenue': round(float(row['advertisement_revenue']), 2),
                'campaigns': int(row['advertisement_id']),
                'scans': int(row['qr_scans'])
            })
            
        return {
            'total_revenue': total_revenue,
            'total_fees': total_fees,
            'net_profit': round(total_revenue - total_fees, 2),
            'roi_multiplier': round(total_revenue / total_fees, 2) if total_fees else 1.0,
            'total_scans': total_scans,
            'total_campaigns': total_campaigns,
            'avg_revenue': avg_revenue,
            'avg_duration': avg_duration,
            'position_breakdown': position_breakdown,
            'campaign_type_breakdown': campaign_type_breakdown,
            'top_routes': top_routes_list,
            'ml_model_metrics': self.ml_metrics,
            'position_rate_card': self.POSITION_RATES
        }

    def predict_revenue(self, position, campaign_type, duration_days, expected_scans=None):
        """
        Calculates quote and uses the trained ML model to predict advertisement revenue.
        """
        pos_cfg = self.POSITION_RATES.get(position, self.POSITION_RATES["Middle"])
        type_factor = self.CAMPAIGN_FACTORS.get(campaign_type, 1.0)
        
        daily_fee = pos_cfg["base_daily_fee"] * type_factor
        calculated_fee = int(round(daily_fee * duration_days))
        
        # Estimate scans if not provided (~50 scans per day average)
        if expected_scans is None:
            expected_scans = int(duration_days * (65 if campaign_type in ["QR", "Digital"] else 35))
            
        # Feature row for ML model
        row = {
            'duration_days': duration_days,
            'qr_scans': expected_scans,
            'advertisement_fee': calculated_fee,
            'pos_Middle': 1 if position == 'Middle' else 0,
            'pos_Rear': 1 if position == 'Rear' else 0,
            'type_Digital': 1 if campaign_type == 'Digital' else 0,
            'type_QR': 1 if campaign_type == 'QR' else 0
        }
        X_in = pd.DataFrame([row])[self.feature_columns]
        
        ml_pred_rev = float(self.ml_model.predict(X_in)[0]) if self.ml_model else calculated_fee * 1.10
        predicted_revenue = max(calculated_fee * 0.9, round(ml_pred_rev, 2))
        
        return {
            'position': position,
            'campaign_type': campaign_type,
            'duration_days': duration_days,
            'tier': pos_cfg['tier'],
            'advertisement_fee': calculated_fee,
            'estimated_qr_scans': expected_scans,
            'predicted_revenue': predicted_revenue,
            'expected_net_gain': round(predicted_revenue - calculated_fee, 2)
        }

    def get_sample_ads(self, limit=20):
        """Returns sample active ads for display and QR scan simulation."""
        if self.df is None:
            return []
            
        samples = self.df.sample(n=min(limit, len(self.df)), random_state=42).copy()
        out = []
        for _, r in samples.iterrows():
            retailer = self.PARTNER_RETAILERS[hash(r['advertisement_id']) % len(self.PARTNER_RETAILERS)]
            out.append({
                'advertisement_id': r['advertisement_id'],
                'route_id': r['route_id'],
                'bus_id': r['bus_id'],
                'position': r['advertisement_position'],
                'campaign_type': r['campaign_type'],
                'duration_days': int(r['duration_days']),
                'qr_scans': int(r['qr_scans']),
                'fee': float(r['advertisement_fee']),
                'revenue': float(r['advertisement_revenue']),
                'brand_name': retailer['name'],
                'category': retailer['category'],
                'offer': retailer['discount'],
                'coupon_code': retailer['code']
            })
        return out

    def simulate_qr_scan(self, ad_id):
        """Simulates passenger scanning QR code inside bus and returns coupon."""
        retailer = self.PARTNER_RETAILERS[hash(ad_id) % len(self.PARTNER_RETAILERS)]
        # Increment scans in memory
        if self.df is not None:
            mask = self.df['advertisement_id'] == ad_id
            if mask.any():
                self.df.loc[mask, 'qr_scans'] += 1
                
        return {
            'success': True,
            'advertisement_id': ad_id,
            'brand': retailer['name'],
            'category': retailer['category'],
            'deal': retailer['discount'],
            'coupon_code': f"{retailer['code']}-{ad_id[-4:]}",
            'message': f"Scan Verified! Present this coupon or your MSRTC ticket at {retailer['name']} to redeem your {retailer['discount']} discount!"
        }

AD_SERVICE = AdvertisementService()
