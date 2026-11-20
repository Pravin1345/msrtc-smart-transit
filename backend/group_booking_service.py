"""
Module 5: Group & Long-Duration Reservation Discounts Engine

Features:
  1. Bulk/Group bookings (weddings, family tours, college trips)
  2. Multi-day reservations (> 3 days)
  3. Tiered group discounts
  4. Flexible seat allocation (single passenger reserving multi-person seats / family blocks)
"""

class GroupBookingService:
    GROUP_DISCOUNT_TIERS = [
        {"min_pax": 21, "max_pax": 28, "discount_pct": 20, "name": "Bulk / Wedding Charter Tier"},
        {"min_pax": 11, "max_pax": 20, "discount_pct": 15, "name": "Large Group / Tour Tier"},
        {"min_pax": 5, "max_pax": 10, "discount_pct": 10, "name": "Small Group / Family Tier"},
        {"min_pax": 1, "max_pax": 4, "discount_pct": 0, "name": "Standard Individual Booking"}
    ]
    
    MULTI_DAY_BONUS_PCT = 5 # Extra 5% off if duration >= 3 days

    def calculate_group_quote(self, per_seat_base_fare, passenger_count, duration_days=1, is_flexible_comfort=False):
        """
        Calculates group discount and total fare.
        If is_flexible_comfort is True (e.g. senior citizen reserving adjacent seat for space),
        the comfort seat gets a 50% relaxation discount.
        """
        pax = int(passenger_count)
        days = int(duration_days)
        
        # Determine group tier
        base_disc = 0
        tier_name = "Standard"
        for tier in self.GROUP_DISCOUNT_TIERS:
            if tier["min_pax"] <= pax <= tier["max_pax"]:
                base_disc = tier["discount_pct"]
                tier_name = tier["name"]
                break
                
        # Multi-day loyalty bonus (> 3 days)
        multi_day_disc = self.MULTI_DAY_BONUS_PCT if days >= 3 else 0
        total_discount_pct = min(35, base_disc + multi_day_disc)
        
        gross_fare = per_seat_base_fare * pax * days
        discount_amount = round(gross_fare * (total_discount_pct / 100))
        net_fare = gross_fare - discount_amount
        gst = round(net_fare * 0.05)
        final_total = net_fare + gst
        
        # Recommended contiguous seats for group
        recommended_seats = []
        for i in range(min(pax, 28)):
            row = (i // 4) + 1
            col = "ABCD"[i % 4]
            recommended_seats.append(f"{row}{col}")
            
        return {
            'passenger_count': pax,
            'duration_days': days,
            'tier_name': tier_name,
            'base_discount_pct': base_disc,
            'multi_day_bonus_pct': multi_day_disc,
            'total_discount_pct': total_discount_pct,
            'per_seat_rate': round(net_fare / max(1, pax * days)),
            'gross_fare': gross_fare,
            'discount_amount': discount_amount,
            'net_fare': net_fare,
            'gst': gst,
            'final_total': final_total,
            'recommended_seats': recommended_seats,
            'flexible_comfort_applied': is_flexible_comfort,
            'savings_message': f"You save ₹{discount_amount} ({total_discount_pct}% off) with MSRTC Group & Multi-Day Benefits!"
        }

GROUP_SERVICE = GroupBookingService()
