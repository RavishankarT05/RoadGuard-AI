import datetime
import random
from sqlalchemy.orm import Session
from backend.app.models.roadguard_models import (
    User, Road, Pothole, Detection, RepairAssignment, RepairHistory, SystemSetting
)
from backend.app.services.priority_service import PriorityService
from backend.app.services.severity_service import SeverityService

def seed_database_if_empty(db: Session, force: bool = False):
    """Populates realistic municipal road and pothole data for instant live demonstration."""
    existing_count = db.query(Pothole).count()
    if existing_count > 0 and not force:
        return

    if force:
        db.query(Detection).delete()
        db.query(RepairHistory).delete()
        db.query(RepairAssignment).delete()
        db.query(Pothole).delete()
        db.query(Road).delete()
        db.query(User).delete()
        db.commit()

    # 1. Seed Users
    admin_user = User(
        username="admin",
        email="chief.engineer@municipal-roads.gov",
        full_name="Dr. Rajesh Raman (Chief Civil Engineer)",
        role="admin"
    )
    inspector_user = User(
        username="inspector1",
        email="patrol.zone1@municipal-roads.gov",
        full_name="S. Ananth (Zone 1 Senior Inspector)",
        role="inspector"
    )
    db.add_all([admin_user, inspector_user])
    db.flush()

    # 2. Seed System Settings
    settings_data = [
        SystemSetting(setting_key="model_confidence_threshold", setting_value="0.25", description="Detection minimum confidence filter"),
        SystemSetting(setting_key="model_iou_threshold", setting_value="0.45", description="NMS IoU overlap suppression threshold"),
        SystemSetting(setting_key="auto_assign_critical", setting_value="true", description="Automatically flag critical potholes for urgent dispatch"),
        SystemSetting(setting_key="active_model_name", setting_value="yolov8n.pt", description="Active neural model weights")
    ]
    for s in settings_data:
        db.merge(s)

    # 3. Seed Roads
    roads_seed = [
        {"name": "Inner Ring Road (North Arterial)", "type": "Highway", "ward": "Zone 1 - North", "length": 14.2, "adt": 45000, "limit": 70},
        {"name": "Metro Central Corridor (MG Road)", "type": "Arterial", "ward": "Zone 2 - CBD", "length": 8.5, "adt": 38000, "limit": 50},
        {"name": "General Hospital Access Highway", "type": "Arterial", "ward": "Zone 3 - East", "length": 6.8, "adt": 29000, "limit": 60},
        {"name": "University Campus Boulevard", "type": "Collector", "ward": "Zone 4 - South", "length": 5.2, "adt": 16000, "limit": 40},
        {"name": "Cyber Valley Tech Express", "type": "Arterial", "ward": "Zone 5 - West", "length": 11.0, "adt": 42000, "limit": 60},
        {"name": "Old Heritage Market Road", "type": "Local Street", "ward": "Zone 2 - CBD", "length": 3.4, "adt": 12000, "limit": 30},
    ]

    road_objects = []
    for r in roads_seed:
        road_obj = Road(
            name=r["name"],
            road_type=r["type"],
            ward_zone=r["ward"],
            length_km=r["length"],
            speed_limit_kmh=r["limit"],
            avg_daily_traffic=r["adt"]
        )
        db.add(road_obj)
        road_objects.append(road_obj)

    db.flush()

    # Base coordinates (Urban center approx 12.9716, 77.5946 with realistic offsets)
    center_lat = 12.9716
    center_lng = 77.5946

    sample_defects = [
        {
            "code": "PG-2026-0001",
            "road": road_objects[2], # Hospital road
            "lat": center_lat + 0.0142, "lng": center_lng + 0.0210,
            "desc": "Right lane near Trauma Care Emergency Gate",
            "area_ratio": 0.092, "conf": 0.94,
            "traffic": "Critical", "facility": "Emergency Hospital", "fac_risk": "High",
            "status": "In Progress", "days_ago": 3
        },
        {
            "code": "PG-2026-0002",
            "road": road_objects[3], # University road
            "lat": center_lat - 0.0185, "lng": center_lng - 0.0125,
            "desc": "Opposite Primary Public School Crosswalk",
            "area_ratio": 0.078, "conf": 0.91,
            "traffic": "High", "facility": "Public School", "fac_risk": "High",
            "status": "Assigned", "days_ago": 2
        },
        {
            "code": "PG-2026-0003",
            "road": road_objects[1], # MG Road
            "lat": center_lat + 0.0055, "lng": center_lng + 0.0035,
            "desc": "Middle lane under Metro Station Pier 114",
            "area_ratio": 0.065, "conf": 0.88,
            "traffic": "Critical", "facility": "Transit Hub (Metro)", "fac_risk": "Medium",
            "status": "Detected", "days_ago": 1
        },
        {
            "code": "PG-2026-0004",
            "road": road_objects[0], # Ring road
            "lat": center_lat + 0.0320, "lng": center_lng - 0.0150,
            "desc": "Flyover descent ramp fast lane",
            "area_ratio": 0.115, "conf": 0.96,
            "traffic": "Critical", "facility": "None", "fac_risk": "None",
            "status": "In Progress", "days_ago": 4
        },
        {
            "code": "PG-2026-0005",
            "road": road_objects[4], # Cyber valley
            "lat": center_lat - 0.0240, "lng": center_lng + 0.0380,
            "desc": "Outer lane adjacent to Tech Park Gate 3",
            "area_ratio": 0.034, "conf": 0.84,
            "traffic": "High", "facility": "Market / Commercial", "fac_risk": "Medium",
            "status": "Repaired", "days_ago": 7
        },
        {
            "code": "PG-2026-0006",
            "road": road_objects[5], # Market road
            "lat": center_lat - 0.0040, "lng": center_lng + 0.0090,
            "desc": "Narrow marketplace crossing",
            "area_ratio": 0.042, "conf": 0.82,
            "traffic": "Medium", "facility": "Market", "fac_risk": "Medium",
            "status": "Verified", "days_ago": 10
        },
        {
            "code": "PG-2026-0007",
            "road": road_objects[0], # Ring road
            "lat": center_lat + 0.0280, "lng": center_lng - 0.0220,
            "desc": "Shoulder transition near Exit 7",
            "area_ratio": 0.021, "conf": 0.79,
            "traffic": "High", "facility": "None", "fac_risk": "None",
            "status": "Reported", "days_ago": 5
        },
        {
            "code": "PG-2026-0008",
            "road": road_objects[1], # MG road
            "lat": center_lat + 0.0090, "lng": center_lng + 0.0010,
            "desc": "Bus shelter deceleration pocket",
            "area_ratio": 0.055, "conf": 0.89,
            "traffic": "Critical", "facility": "Transit Hub", "fac_risk": "High",
            "status": "Assigned", "days_ago": 3
        },
        {
            "code": "PG-2026-0009",
            "road": road_objects[2], # Hospital road
            "lat": center_lat + 0.0180, "lng": center_lng + 0.0260,
            "desc": "Ambulance turnaround bay",
            "area_ratio": 0.048, "conf": 0.87,
            "traffic": "Critical", "facility": "Hospital", "fac_risk": "High",
            "status": "Repaired", "days_ago": 8
        },
        {
            "code": "PG-2026-0010",
            "road": road_objects[3], # University road
            "lat": center_lat - 0.0150, "lng": center_lng - 0.0190,
            "desc": "Pedestrian refuge island periphery",
            "area_ratio": 0.012, "conf": 0.76,
            "traffic": "Medium", "facility": "School", "fac_risk": "Medium",
            "status": "Detected", "days_ago": 1
        },
        {
            "code": "PG-2026-0011",
            "road": road_objects[4], # Cyber valley
            "lat": center_lat - 0.0290, "lng": center_lng + 0.0310,
            "desc": "Underpass merge corner",
            "area_ratio": 0.088, "conf": 0.93,
            "traffic": "High", "facility": "None", "fac_risk": "None",
            "status": "In Progress", "days_ago": 3
        },
        {
            "code": "PG-2026-0012",
            "road": road_objects[5], # Market road
            "lat": center_lat - 0.0080, "lng": center_lng + 0.0140,
            "desc": "Near fruit wholesale lane entrance",
            "area_ratio": 0.016, "conf": 0.74,
            "traffic": "Low", "facility": "Market", "fac_risk": "Low",
            "status": "Verified", "days_ago": 12
        },
        {
            "code": "PG-2026-0013",
            "road": road_objects[0], # Ring road
            "lat": center_lat + 0.0360, "lng": center_lng - 0.0080,
            "desc": "Median divider edge cavity",
            "area_ratio": 0.062, "conf": 0.90,
            "traffic": "Critical", "facility": "None", "fac_risk": "None",
            "status": "Reported", "days_ago": 2
        },
        {
            "code": "PG-2026-0014",
            "road": road_objects[1], # MG road
            "lat": center_lat + 0.0020, "lng": center_lng + 0.0060,
            "desc": "Pedestrian signal approach lane",
            "area_ratio": 0.029, "conf": 0.81,
            "traffic": "High", "facility": "Transit Hub", "fac_risk": "Medium",
            "status": "Repaired", "days_ago": 6
        },
        {
            "code": "PG-2026-0015",
            "road": road_objects[2], # Hospital road
            "lat": center_lat + 0.0120, "lng": center_lng + 0.0180,
            "desc": "Pedestrian crossing zebra boundary",
            "area_ratio": 0.019, "conf": 0.78,
            "traffic": "High", "facility": "Hospital", "fac_risk": "Low",
            "status": "Detected", "days_ago": 1
        }
    ]

    now = datetime.datetime.utcnow()

    for item in sample_defects:
        det_date = now - datetime.timedelta(days=item["days_ago"], hours=random.randint(1, 10))
        
        # Calculate severity and priority
        sev, sev_score, sev_reason = SeverityService.calculate_severity(
            area_ratio=item["area_ratio"],
            confidence=item["conf"],
            traffic_importance=item["traffic"],
            facility_risk=item["fac_risk"]
        )
        
        pri_score, pri_cat, pri_breakdown, pri_action = PriorityService.calculate_priority(
            severity=sev,
            traffic_importance=item["traffic"],
            nearby_facility=item["facility"],
            facility_risk=item["fac_risk"],
            confidence=item["conf"],
            is_recurrent=(item["days_ago"] > 5)
        )

        pothole = Pothole(
            pothole_code=item["code"],
            road_id=item["road"].id,
            road_name=item["road"].name,
            latitude=item["lat"],
            longitude=item["lng"],
            location_description=item["desc"],
            severity=sev,
            severity_score=sev_score,
            severity_reason=sev_reason,
            estimated_area_ratio=item["area_ratio"],
            detection_confidence=item["conf"],
            priority_score=pri_score,
            priority_category=pri_cat,
            priority_breakdown=pri_breakdown,
            recommended_action=pri_action,
            traffic_importance=item["traffic"],
            nearby_facility=item["facility"],
            facility_risk=item["fac_risk"],
            repair_status=item["status"],
            detection_date=det_date,
            detected_by="YOLOv8 AI Vision Engine",
            image_annotated_path=None
        )
        db.add(pothole)
        db.flush()

        # Seed detection bounding box
        det_bbox = Detection(
            pothole_id=pothole.id,
            bbox_x1=150.0,
            bbox_y1=200.0,
            bbox_x2=380.0,
            bbox_y2=420.0,
            confidence=item["conf"],
            class_name="pothole",
            area_pixels=230.0 * 220.0,
            area_ratio=item["area_ratio"]
        )
        db.add(det_bbox)

        # Seed repair assignment if beyond Detected stage
        if item["status"] in ["Assigned", "In Progress", "Repaired", "Verified"]:
            assign = RepairAssignment(
                pothole_id=pothole.id,
                contractor_name="Apex Infrastructure & Road Care Ltd.",
                officer_in_charge="Er. Vivek Sharma (Deputy Director)",
                department="Municipal Pavement Maintenance Wing",
                contact_number="+91 98450 12345",
                assigned_date=det_date + datetime.timedelta(hours=6),
                target_completion_date=det_date + datetime.timedelta(days=2),
                actual_completion_date=(det_date + datetime.timedelta(days=1, hours=8)) if item["status"] in ["Repaired", "Verified"] else None,
                estimated_cost=4500.0,
                actual_cost=4200.0 if item["status"] in ["Repaired", "Verified"] else 0.0,
                repair_method="Hot-Mix Dense Bituminous Macadam (DBM)",
                materials_used="Cold-Mix Binder, 60/70 Grade Bitumen, Seal Coat",
                notes="Rapid compaction completed with 8-ton vibratory roller."
            )
            db.add(assign)

        # Seed audit history
        hist1 = RepairHistory(
            pothole_id=pothole.id,
            previous_status=None,
            new_status="Detected",
            changed_by="YOLOv8 AI Vision Engine",
            change_type="detection",
            remarks="Automated road defect detection logged from surveillance camera vehicle.",
            timestamp=det_date
        )
        db.add(hist1)

        if item["status"] in ["Reported", "Assigned", "In Progress", "Repaired", "Verified"]:
            hist2 = RepairHistory(
                pothole_id=pothole.id,
                previous_status="Detected",
                new_status="Reported",
                changed_by="S. Ananth (Zone 1 Senior Inspector)",
                change_type="verification",
                remarks="Field engineer verified visual road degradation.",
                timestamp=det_date + datetime.timedelta(hours=2)
            )
            db.add(hist2)

        if item["status"] in ["Assigned", "In Progress", "Repaired", "Verified"]:
            hist3 = RepairHistory(
                pothole_id=pothole.id,
                previous_status="Reported",
                new_status="Assigned",
                changed_by="Municipal Dispatch Desk",
                change_type="assignment",
                remarks="Assigned to Apex Infrastructure & Road Care Ltd. Work order dispatched.",
                timestamp=det_date + datetime.timedelta(hours=6)
            )
            db.add(hist3)

        if item["status"] in ["In Progress", "Repaired", "Verified"]:
            hist4 = RepairHistory(
                pothole_id=pothole.id,
                previous_status="Assigned",
                new_status="In Progress",
                changed_by="Apex Infrastructure Crew Chief",
                change_type="status_change",
                remarks="Crew on site. Cold milling and surface prep underway.",
                timestamp=det_date + datetime.timedelta(days=1)
            )
            db.add(hist4)

        if item["status"] in ["Repaired", "Verified"]:
            hist5 = RepairHistory(
                pothole_id=pothole.id,
                previous_status="In Progress",
                new_status="Repaired",
                changed_by="Apex Infrastructure Crew Chief",
                change_type="status_change",
                remarks="Asphalt patch laid and compacted. Curing complete.",
                timestamp=det_date + datetime.timedelta(days=1, hours=8)
            )
            db.add(hist5)

        if item["status"] == "Verified":
            hist6 = RepairHistory(
                pothole_id=pothole.id,
                previous_status="Repaired",
                new_status="Verified",
                changed_by="Dr. Rajesh Raman (Chief Civil Engineer)",
                change_type="verification",
                remarks="Quality audit passed. Surface smoothness index compliant with IRC standards.",
                timestamp=det_date + datetime.timedelta(days=2)
            )
            db.add(hist6)

    db.commit()
    print(f"[RoadGuard AI] Successfully seeded database with {len(sample_defects)} realistic potholes!")

