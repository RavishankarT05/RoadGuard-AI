import json
from typing import Tuple, Dict, Any

class PriorityService:
    """
    Explainable municipal priority scoring engine (0-100 scale).
    Combines:
    - Base Severity Score (Critical=40, High=30, Medium=20, Low=10)
    - Traffic Density / Road Importance (Critical=30, High=20, Medium=10, Low=5)
    - Vulnerable Nearby Facility Risk (Hospital=20, School=15, Transit Hub=10, Market=5, None=0)
    - Historical Recurrence / Defect Cluster (+10 points)
    - High Confidence Verification (+5 points if >= 0.85)
    """

    @staticmethod
    def calculate_priority(
        severity: str,
        traffic_importance: str,
        nearby_facility: str,
        facility_risk: str,
        confidence: float,
        is_recurrent: bool = False
    ) -> Tuple[int, str, str, str]:
        """
        Returns: (priority_score, priority_category, breakdown_json_str, recommended_action)
        """
        breakdown = {}
        
        # 1. Base Severity Contribution (Max 40)
        severity_map = {
            "Critical": 40,
            "High": 30,
            "Medium": 20,
            "Low": 10
        }
        severity_pts = severity_map.get(severity, 20)
        breakdown["severity_points"] = {
            "label": f"Severity ({severity})",
            "points": severity_pts,
            "max": 40
        }
        
        # 2. Traffic Importance Contribution (Max 30)
        traffic_map = {
            "Critical": 30,
            "High": 20,
            "Medium": 10,
            "Low": 5
        }
        traffic_pts = traffic_map.get(traffic_importance, 15)
        breakdown["traffic_points"] = {
            "label": f"Traffic Importance ({traffic_importance})",
            "points": traffic_pts,
            "max": 30
        }
        
        # 3. Facility Risk Contribution (Max 20)
        facility_pts = 0
        facility_desc = "None"
        if nearby_facility and nearby_facility.lower() != "none":
            facility_desc = nearby_facility
            if "hospital" in nearby_facility.lower():
                facility_pts = 20
            elif "school" in nearby_facility.lower():
                facility_pts = 15
            elif "transit" in nearby_facility.lower() or "metro" in nearby_facility.lower() or "station" in nearby_facility.lower():
                facility_pts = 12
            elif "market" in nearby_facility.lower():
                facility_pts = 8
            else:
                facility_pts = 5
                
        # Risk tier scaling
        if facility_risk == "High":
            facility_pts = min(20, facility_pts + 5)
        elif facility_risk == "None" and facility_pts > 0:
            facility_pts = max(0, facility_pts - 5)
            
        breakdown["facility_points"] = {
            "label": f"Facility ({facility_desc} - {facility_risk} Risk)",
            "points": facility_pts,
            "max": 20
        }
        
        # 4. Historical Recurrence / Cluster density (Max 10)
        recurrence_pts = 10 if is_recurrent else 0
        breakdown["recurrence_points"] = {
            "label": "Recurrent / Clustered Defect",
            "points": recurrence_pts,
            "max": 10
        }
        
        # 5. High Confidence Bonus (Max 5)
        confidence_pts = 5 if confidence >= 0.85 else 0
        breakdown["confidence_points"] = {
            "label": f"High AI Confidence ({(confidence*100):.1f}%)",
            "points": confidence_pts,
            "max": 5
        }
        
        raw_score = severity_pts + traffic_pts + facility_pts + recurrence_pts + confidence_pts
        final_score = max(0, min(100, raw_score))
        breakdown["total_score"] = final_score
        
        # Category Assignment
        if final_score >= 80:
            category = "Critical"
            action = "EMERGENCY DISPATCH: Deploy rapid response repair crew within 12-24 hours. Install warning signage immediately."
        elif final_score >= 60:
            category = "High"
            action = "HIGH PRIORITY: Schedule repair crew mobilization within 48 hours. Inspect nearby pavement degradation."
        elif final_score >= 40:
            category = "Medium"
            action = "SCHEDULED REPAIR: Include in municipal weekly road resurfacing batch. Routine safety sweep."
        else:
            category = "Low"
            action = "MONITORING CYCLE: Log in pavement management register. Re-inspect during next monthly district sweep."
            
        return final_score, category, json.dumps(breakdown), action

