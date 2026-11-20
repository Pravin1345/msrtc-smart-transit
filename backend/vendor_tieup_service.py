"""
Module 6: Vendor and Highway Hotel Tie-Ups Service

Features:
  1. Commercial partnerships with Highway Food Plazas & Onboard Vendors
  2. Kolhapur-Pune Route Katraj Ghat & Karad Rest-Stop Hubs (highlighted in PDF)
  3. Pre-order catalog: MSRTC Neer, Snacks, Maharashtrian Thali Vouchers
  4. Commission & Contract revenue tracking for MSRTC
"""

class VendorTieUpService:
    # Highway Rest-Stop Partners along major Maharashtra Transit Corridors
    HIGHWAY_PARTNERS = [
        {
            "id": "REST_KATRAJ",
            "name": "Katraj Ghat Food Plaza & Highway Rest-Stop",
            "location": "NH48 (Kolhapur - Pune Corridor, Katraj)",
            "amenities": ["Clean Restrooms", "Fast Food Courtyard", "Pure Veg Thali", "Tea Stalls", "EV Charging"],
            "rating": 4.6,
            "monthly_contract_fee": 35000,
            "commission_rate": 0.12 # 12% to MSRTC
        },
        {
            "id": "REST_KARAD",
            "name": "Karad Highway Midway Oasis",
            "location": "NH48 (Satara - Karad Bypass)",
            "amenities": ["24x7 Restaurant", "Family Seating", "Fresh Fruit Juice", "Emergency Pharmacy"],
            "rating": 4.4,
            "monthly_contract_fee": 28000,
            "commission_rate": 0.10
        },
        {
            "id": "REST_LONAVALA",
            "name": "Expressway Midway Haven (Lonavala)",
            "location": "Mumbai - Pune Expressway",
            "amenities": ["Chikki & Farsan Mart", "Food Court", "Hygienic Washrooms"],
            "rating": 4.7,
            "monthly_contract_fee": 45000,
            "commission_rate": 0.15
        }
    ]

    CATALOG = [
        {
            "id": "ITEM_WATER",
            "name": "MSRTC Rail Neer Packaged Mineral Water (1L)",
            "category": "Beverage",
            "price": 15,
            "vendor": "MSRTC Bottling Division",
            "description": "BIS Certified chilled drinking water",
            "icon": "fa-bottle-water",
            "commission": 3.0 # Rs 3 to MSRTC per bottle
        },
        {
            "id": "ITEM_KATRAJ_THALI",
            "name": "Katraj Ghat Highway Special Meal Thali Voucher",
            "category": "Hot Meals",
            "price": 120,
            "vendor": "Katraj Ghat Food Plaza",
            "description": "Pure Veg Maharashtrian Thali (3 Chapatis, Bhaji, Dal, Rice, Sweet)",
            "icon": "fa-utensils",
            "commission": 15.0 # Rs 15 to MSRTC
        },
        {
            "id": "ITEM_SNACK_BOX",
            "name": "Kolhapuri Bhakarwadi & Farsan Snack Box (250g)",
            "category": "Snacks",
            "price": 55,
            "vendor": "Chitale & Kolhapur Sweets",
            "description": "Crunchy traditional snacks packed for travel",
            "icon": "fa-cookie-bite",
            "commission": 8.0
        },
        {
            "id": "ITEM_HYGIENE_KIT",
            "name": "Travel Hygiene & Freshness Kit",
            "category": "Essentials",
            "price": 40,
            "vendor": "HealthGuard Transit",
            "description": "Sanitizer wipes, pocket tissues, mouth freshener, sickness bag",
            "icon": "fa-pump-medical",
            "commission": 6.0
        }
    ]

    def get_catalog(self):
        return {
            'items': self.CATALOG,
            'highway_rest_stops': self.HIGHWAY_PARTNERS
        }

    def calculate_order(self, item_ids):
        """Calculates total cost and MSRTC commission for pre-ordered items."""
        selected = []
        total_amount = 0
        total_commission = 0
        
        lookup = {it["id"]: it for it in self.CATALOG}
        for item_id in item_ids:
            if item_id in lookup:
                it = lookup[item_id]
                selected.append(it)
                total_amount += it["price"]
                total_commission += it["commission"]
                
        return {
            'items': selected,
            'total_amount': total_amount,
            'msrtc_commission': total_commission,
            'voucher_code': f"MSRTC-MEAL-{abs(hash(','.join(item_ids))) % 100000:05d}" if selected else None
        }

VENDOR_SERVICE = VendorTieUpService()
