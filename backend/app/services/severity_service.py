from typing import Tuple, Dict, Any

class SeverityService:
    """
    Transparent, explainable severity classification engine.
    Calculates severity based on:
    1. Bounding box surface area ratio relative to road frame.
    2. Model detection confidence.
    3. Structural impact factor.
    
    NOTE (Scientific Disclaimer):
    Optical bounding-box surface area represents 2D surface coverage
    in the camera perspective and serves as an empirical risk proxy.
    It does not measure physical cavity depth or volumetric displacement.
    """
    
    @staticmethod
    def calculate_severity(
        area_ratio: float,
        confidence: float,
        traffic_importance: str = "High",
        facility_risk: str = "None"
    ) -> Tuple[str, float, str]:
        """
        Returns: (severity_label, severity_score_0_100, explanation_text)
        """
        # Normalized area ratio in percentage (e.g. 0.05 = 5.0%)
        area_pct = area_ratio * 100.0
        
        # Base score from area coverage
        if area_pct >= 8.0:
            base_score = 45.0
            size_desc = f"Massive optical defect (>8.0% surface coverage: {area_pct:.2f}%)"
        elif area_pct >= 4.0:
            base_score = 35.0
            size_desc = f"Large road defect (4.0% - 8.0% coverage: {area_pct:.2f}%)"
        elif area_pct >= 1.5:
            base_score = 25.0
            size_desc = f"Medium defect (1.5% - 4.0% coverage: {area_pct:.2f}%)"
        else:
            base_score = 15.0
            size_desc = f"Minor surface fissure (<1.5% coverage: {area_pct:.2f}%)"
            
        # Confidence multiplier (higher confidence yields sharper certainty)
        confidence_factor = confidence * 25.0 # Max 25 points
        
        # Environmental risk factor
        traffic_weights = {
            "Critical": 20.0,
            "High": 15.0,
            "Medium": 10.0,
            "Low": 5.0
        }
        traffic_factor = traffic_weights.get(traffic_importance, 10.0)
        
        facility_weights = {
            "High": 10.0,
            "Medium": 6.0,
            "Low": 3.0,
            "None": 0.0
        }
        facility_factor = facility_weights.get(facility_risk, 0.0)
        
        total_severity_score = min(100.0, round(base_score + confidence_factor + traffic_factor + facility_factor, 1))
        
        if total_severity_score >= 75.0:
            severity = "Critical"
        elif total_severity_score >= 55.0:
            severity = "High"
        elif total_severity_score >= 35.0:
            severity = "Medium"
        else:
            severity = "Low"
            
        explanation = (
            f"Severity classified as '{severity}' (Score: {total_severity_score}/100). "
            f"Factors: {size_desc}; Model Confidence: {confidence*100:.1f}%; "
            f"Traffic Importance: {traffic_importance} (+{traffic_factor} pts); "
            f"Facility Risk: {facility_risk} (+{facility_factor} pts). "
            f"Disclaimer: Area ratio is a 2D optical surface proxy, not physical cavity depth."
        )
        
        return severity, total_severity_score, explanation

