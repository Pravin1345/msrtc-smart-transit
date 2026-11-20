"""
Modules 2 & 3: Seat Occupancy and Happy Hours Dynamic Fare Optimization Engine

Core Business Logic:
  Expected Revenue = Promotional Fare * Expected Bookings
  Subject to:
    1. Bus Capacity Constraint: Expected Bookings <= 28
    2. Maximum Discount Constraint: Discount <= 50%
    3. Minimum Revenue Requirement: Total Expected Revenue >= Minimum Cost
    4. Regulatory Bounds
"""

from ml_demand_forecasting import BUS_CAPACITY

class HappyHoursOptimizer:
    def __init__(self, capacity=BUS_CAPACITY, max_discount=0.50, elasticity=1.35):
        self.capacity = capacity
        self.max_discount = max_discount
        self.elasticity = elasticity # Off-peak bus riders are price-sensitive

    def optimize_trip_fare(self, base_fare, baseline_demand, bus_type="Shivshahi (AC Seater)"):
        """
        Evaluates discount scenarios: 0%, 10%, 20%, 25%, 30%, 35%, 40%, 50%.
        Selects optimal fare satisfying all constraints while maximizing Expected Revenue.
        """
        min_rev_floor = base_fare * (self.capacity * 0.25) # Floor: at least 25% occupancy revenue
        
        scenarios = []
        discount_steps = [0.0, 0.10, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]
        
        best_scenario = None
        max_revenue = -1
        
        for disc in discount_steps:
            promo_fare = round(base_fare * (1.0 - disc))
            
            # Demand response function
            if disc == 0.0:
                expected_bookings = baseline_demand
            else:
                demand_boost = baseline_demand * (self.elasticity * (disc / (1.0 - disc * 0.5)))
                expected_bookings = min(self.capacity, int(round(baseline_demand + demand_boost)))
                
            expected_revenue = promo_fare * expected_bookings
            vacant_seats = max(0, self.capacity - expected_bookings)
            occupancy_pct = round((expected_bookings / self.capacity) * 100, 1)
            
            # Constraint verification
            capacity_ok = expected_bookings <= self.capacity
            discount_ok = disc <= self.max_discount
            min_rev_ok = expected_revenue >= min_rev_floor
            feasible = capacity_ok and discount_ok and min_rev_ok
            
            scenario = {
                'discount_pct': int(disc * 100),
                'promotional_fare': promo_fare,
                'expected_bookings': expected_bookings,
                'expected_vacant_seats': vacant_seats,
                'occupancy_pct': occupancy_pct,
                'expected_revenue': expected_revenue,
                'is_feasible': feasible,
                'constraints': {
                    'capacity_ok': capacity_ok,
                    'discount_ok': discount_ok,
                    'min_revenue_ok': min_rev_ok
                }
            }
            scenarios.append(scenario)
            
            if feasible and expected_revenue > max_revenue:
                max_revenue = expected_revenue
                best_scenario = scenario
                
        base_scenario = scenarios[0]
        revenue_uplift = best_scenario['expected_revenue'] - base_scenario['expected_revenue']
        uplift_pct = round((revenue_uplift / base_scenario['expected_revenue']) * 100, 1) if base_scenario['expected_revenue'] else 0
        
        return {
            'is_happy_hours_recommended': best_scenario['discount_pct'] > 0 and revenue_uplift > 0,
            'base_fare': base_fare,
            'optimal_fare': best_scenario['promotional_fare'],
            'optimal_discount_pct': best_scenario['discount_pct'],
            'expected_bookings': best_scenario['expected_bookings'],
            'expected_vacant_seats': best_scenario['expected_vacant_seats'],
            'expected_occupancy_pct': best_scenario['occupancy_pct'],
            'expected_revenue': best_scenario['expected_revenue'],
            'base_revenue_without_promo': base_scenario['expected_revenue'],
            'revenue_gain': revenue_uplift,
            'revenue_uplift_pct': uplift_pct,
            'scenarios': scenarios
        }

HAPPY_HOURS_OPTIMIZER = HappyHoursOptimizer()
