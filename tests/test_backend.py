import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
import numpy as np

from backend.app.main import app
from backend.app.services.severity_service import SeverityService
from backend.app.services.priority_service import PriorityService

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_status"] == "connected"
    assert data["model_loaded"] is True

def test_dashboard_stats():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_potholes" in data
    assert "critical_potholes" in data
    assert "road_health_score" in data
    assert data["total_potholes"] > 0

def test_potholes_list_and_filter():
    response = client.get("/api/potholes?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) > 0

    first_id = data["items"][0]["id"]
    detail_res = client.get(f"/api/potholes/{first_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == first_id
    assert "pothole_code" in detail

def test_map_locations():
    response = client.get("/api/map/locations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "latitude" in data[0]
    assert "longitude" in data[0]

def test_analytics():
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "road_statistics" in data
    assert "facility_risk_breakdown" in data

def test_assistant_query():
    response = client.post("/api/assistant/query", json={"query": "How many potholes are critical?"})
    assert response.status_code == 200
    data = response.json()
    assert "critical" in data["answer"].lower()
    assert len(data["recommendations"]) > 0

def test_severity_and_priority_calculation():
    # Large defect near emergency hospital on critical road
    sev, score, reason = SeverityService.calculate_severity(
        area_ratio=0.08,
        confidence=0.92,
        traffic_importance="Critical",
        facility_risk="High"
    )
    assert sev in ["High", "Critical"]
    assert score > 60

    pri_score, pri_cat, breakdown, action = PriorityService.calculate_priority(
        severity=sev,
        traffic_importance="Critical",
        nearby_facility="Hospital",
        facility_risk="High",
        confidence=0.92,
        is_recurrent=True
    )
    assert pri_score >= 80
    assert pri_cat == "Critical"
    assert "EMERGENCY" in action

def test_image_detection_synthetic():
    # Create synthetic test road image with dark cavity
    img = Image.new("RGB", (640, 480), color=(128, 128, 128))
    draw = ImageDraw.Draw(img)
    # Draw dark pothole cavity
    draw.ellipse([200, 180, 360, 320], fill=(30, 30, 30), outline=(20, 20, 20))
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()

    response = client.post(
        "/api/detect/image",
        files={"file": ("test_road.jpg", img_bytes, "image/jpeg")},
        data={
            "road_name": "Test Arterial Highway",
            "latitude": "12.9800",
            "longitude": "77.6000",
            "traffic_importance": "Critical",
            "nearby_facility": "Hospital",
            "facility_risk": "High",
            "save_to_database": "true"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "detected" in data
    assert "inference_time_ms" in data
    if data["detected"]:
        assert "crops" in data
        assert "summary" in data
        assert "total_damage" in data["summary"]
        assert len(data["crops"]) == data["count"]

def test_report_export():
    res_csv = client.get("/api/reports/export?format=csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]

    res_pdf = client.get("/api/reports/export?format=pdf")
    assert res_pdf.status_code == 200
    assert "application/pdf" in res_pdf.headers["content-type"]

