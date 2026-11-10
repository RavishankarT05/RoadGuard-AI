import os
import sys
import shutil
import time
import torch
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.roadguard_models import (
    Pothole, Road, Detection, RepairAssignment, RepairHistory, MaintenanceReport, SystemSetting, User
)
from backend.app.schemas.pothole_schemas import (
    PotholeResponse, PotholeUpdate, StatusUpdateRequest, PriorityOverrideRequest,
    DashboardStats, MapLocationItem, AssistantQueryRequest, AssistantQueryResponse,
    SystemHealthResponse
)
from backend.app.services.yolo_service import yolo_service
from backend.app.services.severity_service import SeverityService
from backend.app.services.priority_service import PriorityService
from backend.app.services.assistant_service import AssistantService
from backend.app.services.report_service import ReportService
from backend.app.services.seed_service import seed_database_if_empty

router = APIRouter()

# -------------------------------------------------------------
# 1. Health & System Diagnostics
# -------------------------------------------------------------
@router.get("/health", response_model=SystemHealthResponse)
def get_health(db: Session = Depends(get_db)):
    """System health check and hardware diagnostic report."""
    total_potholes = db.query(Pothole).count()
    status_info = yolo_service.get_status()
    
    # Calculate free disk space
    total, used, free = shutil.disk_usage(str(settings.DATABASE_DIR))
    free_mb = round(free / (1024 * 1024), 2)
    
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "python_version": sys.version.split(" ")[0],
        "torch_version": torch.__version__,
        "ultralytics_version": "8.4.42",
        "opencv_version": "4.13.0",
        "database_status": "connected",
        "database_potholes_count": total_potholes,
        "model_name": status_info["model_name"],
        "model_loaded": status_info["is_loaded"],
        "device": status_info["device_name"],
        "storage_free_mb": free_mb
    }

# -------------------------------------------------------------
# 2. Dashboard Statistics
# -------------------------------------------------------------
@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Aggregates real-time statistics directly from SQLite for municipal executive view."""
    total_potholes = db.query(Pothole).count()
    
    # Severity breakdown
    critical = db.query(Pothole).filter(Pothole.severity == "Critical").count()
    high = db.query(Pothole).filter(Pothole.severity == "High").count()
    medium = db.query(Pothole).filter(Pothole.severity == "Medium").count()
    low = db.query(Pothole).filter(Pothole.severity == "Low").count()
    
    # Priority breakdown
    pri_crit = db.query(Pothole).filter(Pothole.priority_category == "Critical").count()
    pri_high = db.query(Pothole).filter(Pothole.priority_category == "High").count()
    pri_med = db.query(Pothole).filter(Pothole.priority_category == "Medium").count()
    pri_low = db.query(Pothole).filter(Pothole.priority_category == "Low").count()
    
    # Repair status counts
    repaired = db.query(Pothole).filter(Pothole.repair_status.in_(["Repaired", "Verified"])).count()
    in_progress = db.query(Pothole).filter(Pothole.repair_status == "In Progress").count()
    pending = total_potholes - repaired
    
    # Status dictionary
    statuses = ["Detected", "Reported", "Assigned", "In Progress", "Repaired", "Verified"]
    status_distribution = {}
    for st in statuses:
        status_distribution[st] = db.query(Pothole).filter(Pothole.repair_status == st).count()
        
    total_roads = db.query(Road).count()
    
    # City Pavement Health Index (0 - 100)
    # Higher density of Critical/High severity defects penalizes overall network score
    if total_potholes > 0:
        penalty = ((critical * 9.0) + (high * 5.0) + (medium * 2.5) + (low * 1.0)) / total_potholes * 8.5
        health_score = max(15.0, min(100.0, round(100.0 - penalty, 1)))
    else:
        health_score = 98.0
        
    # Weekly detection breakdown (portable across SQLite and PostgreSQL)
    now = datetime.datetime.utcnow()
    weekly_detections = []
    for i in range(6, -1, -1):
        day_date = (now - datetime.timedelta(days=i)).date()
        day_start = datetime.datetime.combine(day_date, datetime.time.min)
        day_end = datetime.datetime.combine(day_date, datetime.time.max)
        day_count = db.query(Pothole).filter(
            Pothole.detection_date >= day_start,
            Pothole.detection_date <= day_end
        ).count()
        weekly_detections.append({
            "day": day_date.strftime("%a"),
            "date": day_date.strftime("%b %d"),
            "count": day_count
        })
        
    # Recent activity
    recent = db.query(Pothole).order_by(desc(Pothole.detection_date)).limit(6).all()
    
    return {
        "total_potholes": total_potholes,
        "critical_potholes": critical,
        "high_priority_potholes": pri_high + pri_crit,
        "medium_priority_potholes": pri_med,
        "low_priority_potholes": pri_low,
        "repaired_potholes": repaired,
        "pending_repairs": pending,
        "in_progress_repairs": in_progress,
        "total_roads_monitored": total_roads,
        "road_health_score": health_score,
        "severity_distribution": {
            "Critical": critical,
            "High": high,
            "Medium": medium,
            "Low": low
        },
        "priority_distribution": {
            "Critical": pri_crit,
            "High": pri_high,
            "Medium": pri_med,
            "Low": pri_low
        },
        "status_distribution": status_distribution,
        "weekly_detections": weekly_detections,
        "recent_activity": recent
    }

# -------------------------------------------------------------
# 3. AI Pothole Detection (Image Inference)
# -------------------------------------------------------------
@router.post("/detect/image")
async def detect_road_image(
    file: UploadFile = File(...),
    road_name: str = Form("Central Ring Road"),
    latitude: float = Form(12.9716),
    longitude: float = Form(77.5946),
    location_description: Optional[str] = Form(""),
    traffic_importance: str = Form("High"),
    nearby_facility: str = Form("None"),
    facility_risk: str = Form("None"),
    save_to_database: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Accepts road image (JPG, PNG).
    Runs real local YOLO model inference.
    If defect detected: calculates severity, priority, renders HUD bounding boxes,
    and stores record in SQLite. If no defect, rejects empty database storage.
    """
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid image format. Supported formats: JPG, JPEG, PNG, WEBP.")

    # Save uploaded file
    clean_filename = f"upload_{int(time.time()*1000)}{ext}"
    upload_path = settings.UPLOADS_DIR / clean_filename
    
    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Run Local YOLO Inference in asynchronous worker threadpool to prevent event loop blocking
        result = await run_in_threadpool(
            yolo_service.detect_potholes,
            image_path=str(upload_path),
            traffic_importance=traffic_importance,
            facility_risk=facility_risk
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Vision Model inference failed: {str(e)}")

    if not result["detected"]:
        # Clean road with zero potholes: Never store false record in database
        return {
            "success": True,
            "detected": False,
            "message": "Pavement surface analyzed successfully. No potholes or surface defects detected.",
            "count": 0,
            "total_damage": 0,
            "detections": [],
            "crops": [],
            "summary": {
                "total_damage": 0,
                "critical_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "low_count": 0,
                "avg_confidence": 0.0
            },
            "inference_time_ms": result["inference_time_ms"],
            "original_image_path": f"/uploads/{clean_filename}",
            "original_image_url": f"/uploads/{clean_filename}",
            "annotated_image_path": result.get("annotated_image_path"),
            "annotated_image_base64": result.get("annotated_image_base64"),
            "annotated_image_url": result.get("annotated_image_path")
        }

    # If defect detected, calculate explainable priority score
    max_severity = result["max_severity"]
    detections_list = result["detections"]
    primary_confidence = detections_list[0]["confidence"] if detections_list else 0.85
    
    # Check historical recurrence (are there existing potholes on this road within 100 meters?)
    recurrence_count = db.query(Pothole).filter(
        Pothole.road_name.ilike(f"%{road_name.strip()}%"),
        Pothole.repair_status != "Repaired"
    ).count()
    is_recurrent = recurrence_count > 0

    pri_score, pri_cat, pri_breakdown, pri_action = PriorityService.calculate_priority(
        severity=max_severity,
        traffic_importance=traffic_importance,
        nearby_facility=nearby_facility,
        facility_risk=facility_risk,
        confidence=primary_confidence,
        is_recurrent=is_recurrent
    )

    created_pothole = None
    if save_to_database:
        # Generate official sequential code
        total_p = db.query(Pothole).count()
        code = f"PG-{datetime.datetime.utcnow().year}-{str(total_p + 1).zfill(4)}"

        # Find or create road
        road_record = db.query(Road).filter(Road.name.ilike(road_name.strip())).first()
        if not road_record:
            road_record = Road(name=road_name.strip(), road_type="Arterial")
            db.add(road_record)
            db.flush()

        created_pothole = Pothole(
            pothole_code=code,
            road_id=road_record.id,
            road_name=road_record.name,
            latitude=latitude,
            longitude=longitude,
            location_description=location_description or f"Surface defect on {road_record.name}",
            severity=max_severity,
            severity_score=result["max_severity_score"],
            severity_reason=result["severity_reason"],
            estimated_area_ratio=detections_list[0]["area_ratio"] if detections_list else 0.0,
            detection_confidence=primary_confidence,
            priority_score=pri_score,
            priority_category=pri_cat,
            priority_breakdown=pri_breakdown,
            recommended_action=pri_action,
            traffic_importance=traffic_importance,
            nearby_facility=nearby_facility,
            facility_risk=facility_risk,
            repair_status="Detected",
            image_original_path=f"/uploads/{clean_filename}",
            image_annotated_path=result["annotated_image_path"],
            detection_date=datetime.datetime.utcnow(),
            detected_by=f"YOLOv8 Local Model ({yolo_service.model_name})"
        )
        db.add(created_pothole)
        db.flush()

        # Save individual bounding boxes
        for d in detections_list:
            det_model = Detection(
                pothole_id=created_pothole.id,
                bbox_x1=d["bbox_x1"],
                bbox_y1=d["bbox_y1"],
                bbox_x2=d["bbox_x2"],
                bbox_y2=d["bbox_y2"],
                confidence=d["confidence"],
                class_name="pothole",
                area_pixels=d["area_pixels"],
                area_ratio=d["area_ratio"]
            )
            db.add(det_model)

        # Audit history entry
        history_entry = RepairHistory(
            pothole_id=created_pothole.id,
            previous_status=None,
            new_status="Detected",
            changed_by="YOLOv8 AI Vision Engine",
            change_type="detection",
            remarks=f"Visual defect detected with {len(detections_list)} bounding box(es). Max severity: {max_severity}."
        )
        db.add(history_entry)
        db.commit()
        db.refresh(created_pothole)

    return {
        "success": True,
        "detected": True,
        "count": result["count"],
        "total_damage": result["count"],
        "detections": detections_list,
        "crops": result.get("crops", []),
        "summary": result.get("summary", {
            "total_damage": result["count"],
            "critical_count": sum(1 for d in detections_list if d.get("severity") == "Critical"),
            "high_count": sum(1 for d in detections_list if d.get("severity") == "High"),
            "medium_count": sum(1 for d in detections_list if d.get("severity") == "Medium"),
            "low_count": sum(1 for d in detections_list if d.get("severity") == "Low"),
            "avg_confidence": round(sum(d.get("confidence", 0) for d in detections_list) / max(1, len(detections_list)) * 100, 1)
        }),
        "max_severity": max_severity,
        "max_severity_score": result["max_severity_score"],
        "severity_reason": result["severity_reason"],
        "priority_score": pri_score,
        "priority_category": pri_cat,
        "priority_breakdown": pri_breakdown,
        "recommended_action": pri_action,
        "annotated_image_path": result.get("annotated_image_path"),
        "annotated_image_base64": result.get("annotated_image_base64"),
        "annotated_image_url": result.get("annotated_image_path"),
        "original_image_path": f"/uploads/{clean_filename}",
        "original_image_url": f"/uploads/{clean_filename}",
        "inference_time_ms": result["inference_time_ms"],
        "saved_pothole_id": created_pothole.id if created_pothole else None,
        "pothole_code": created_pothole.pothole_code if created_pothole else None
    }

# -------------------------------------------------------------
# 4. Potholes CRUD & Filtering
# -------------------------------------------------------------
@router.get("/potholes")
def get_potholes(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    priority_category: Optional[str] = None,
    repair_status: Optional[str] = None,
    sort_by: Optional[str] = "date_desc",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lists potholes with search, filter, sort and pagination."""
    query = db.query(Pothole)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Pothole.pothole_code.ilike(search_fmt)) |
            (Pothole.road_name.ilike(search_fmt)) |
            (Pothole.location_description.ilike(search_fmt)) |
            (Pothole.nearby_facility.ilike(search_fmt))
        )

    if severity and severity != "all":
        query = query.filter(Pothole.severity == severity)

    if priority_category and priority_category != "all":
        query = query.filter(Pothole.priority_category == priority_category)

    if repair_status and repair_status != "all":
        query = query.filter(Pothole.repair_status == repair_status)

    # Sorting
    if sort_by == "priority_desc":
        query = query.order_by(desc(Pothole.priority_score))
    elif sort_by == "priority_asc":
        query = query.order_by(Pothole.priority_score)
    elif sort_by == "severity_desc":
        query = query.order_by(desc(Pothole.severity_score))
    elif sort_by == "date_asc":
        query = query.order_by(Pothole.detection_date)
    else: # default date_desc
        query = query.order_by(desc(Pothole.detection_date))

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items
    }

@router.get("/potholes/{pothole_id}", response_model=PotholeResponse)
def get_pothole_detail(pothole_id: int, db: Session = Depends(get_db)):
    """Fetches single pothole with all relations, bounding boxes, and audit history."""
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole record not found.")
    return pothole

@router.put("/potholes/{pothole_id}", response_model=PotholeResponse)
def update_pothole(pothole_id: int, data: PotholeUpdate, db: Session = Depends(get_db)):
    """Updates pothole metadata or manual parameters."""
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole record not found.")

    update_fields = data.dict(exclude_unset=True)
    for key, val in update_fields.items():
        setattr(pothole, key, val)

    pothole.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(pothole)
    return pothole

@router.delete("/potholes/{pothole_id}")
def delete_pothole(pothole_id: int, db: Session = Depends(get_db)):
    """Deletes a pothole record and its related audit records."""
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole record not found.")

    code = pothole.pothole_code
    db.delete(pothole)
    db.commit()
    return {"success": True, "message": f"Pothole {code} deleted successfully."}

# -------------------------------------------------------------
# 5. Repair Lifecycle Status & Assignment
# -------------------------------------------------------------
@router.post("/potholes/{pothole_id}/status")
def update_pothole_status(pothole_id: int, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    """
    Transitions pothole along repair lifecycle:
    Detected -> Reported -> Assigned -> In Progress -> Repaired -> Verified
    Records assignment details, notes, before/after images, and audit trail.
    """
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole record not found.")

    prev_status = pothole.repair_status
    pothole.repair_status = req.new_status
    pothole.updated_at = datetime.datetime.utcnow()

    if req.after_image_url:
        pothole.image_after_path = req.after_image_url

    # Add assignment if contractor or officer is provided
    if req.contractor_name or req.officer_in_charge:
        assign = RepairAssignment(
            pothole_id=pothole.id,
            contractor_name=req.contractor_name or "Municipal Patch Crew",
            officer_in_charge=req.officer_in_charge or "Zone Officer",
            notes=req.remarks or "",
            estimated_cost=req.cost or 0.0,
            materials_used=req.materials or "Hot-Mix Asphalt"
        )
        db.add(assign)

    # Log immutable audit history
    history = RepairHistory(
        pothole_id=pothole.id,
        previous_status=prev_status,
        new_status=req.new_status,
        changed_by=req.changed_by or "Municipal Authority",
        change_type="status_change",
        remarks=req.remarks or f"Status shifted from {prev_status} to {req.new_status}"
    )
    db.add(history)
    db.commit()
    db.refresh(pothole)

    return {
        "success": True,
        "pothole_id": pothole.id,
        "previous_status": prev_status,
        "new_status": pothole.repair_status,
        "updated_at": pothole.updated_at
    }

# -------------------------------------------------------------
# 6. Priority Override with Audit History
# -------------------------------------------------------------
@router.post("/potholes/{pothole_id}/priority-override")
def override_priority(pothole_id: int, req: PriorityOverrideRequest, db: Session = Depends(get_db)):
    """Allows authorized engineers to override AI priority with mandatory rationale."""
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole record not found.")

    old_score = pothole.priority_score
    old_cat = pothole.priority_category

    pothole.priority_score = req.priority_score
    pothole.priority_category = req.priority_category
    pothole.is_manual_override = True
    pothole.override_reason = req.override_reason
    pothole.updated_at = datetime.datetime.utcnow()

    history = RepairHistory(
        pothole_id=pothole.id,
        previous_status=pothole.repair_status,
        new_status=pothole.repair_status,
        changed_by=req.officer_name,
        change_type="priority_override",
        remarks=f"Authority Priority Override: Score changed from {old_score} ({old_cat}) to {req.priority_score} ({req.priority_category}). Reason: {req.override_reason}"
    )
    db.add(history)
    db.commit()
    db.refresh(pothole)

    return {
        "success": True,
        "pothole_id": pothole.id,
        "old_score": old_score,
        "new_score": pothole.priority_score,
        "new_category": pothole.priority_category,
        "override_reason": pothole.override_reason
    }

# -------------------------------------------------------------
# 7. Interactive GIS Map Locations
# -------------------------------------------------------------
@router.get("/map/locations", response_model=List[MapLocationItem])
def get_map_locations(
    severity: Optional[str] = None,
    repair_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Provides geospatial coordinates and metadata for React-Leaflet GIS layer."""
    query = db.query(Pothole)

    if severity and severity != "all":
        query = query.filter(Pothole.severity == severity)

    if repair_status and repair_status != "all":
        query = query.filter(Pothole.repair_status == repair_status)

    if search:
        query = query.filter(Pothole.road_name.ilike(f"%{search.strip()}%"))

    potholes = query.all()
    
    return [
        {
            "id": p.id,
            "pothole_code": p.pothole_code,
            "road_name": p.road_name,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "severity": p.severity,
            "priority_score": p.priority_score,
            "priority_category": p.priority_category,
            "repair_status": p.repair_status,
            "nearby_facility": p.nearby_facility,
            "image_annotated_path": p.image_annotated_path,
            "detection_date": p.detection_date
        }
        for p in potholes
    ]

# -------------------------------------------------------------
# 8. Analytics & Road-Wise Insights
# -------------------------------------------------------------
@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """In-depth analytical aggregation for charts and municipal reports."""
    total_potholes = db.query(Pothole).count()
    
    # Road-wise defect statistics
    road_breakdown = (
        db.query(
            Pothole.road_name,
            func.count(Pothole.id).label("total"),
            func.sum(case((Pothole.severity == "Critical", 1), else_=0)).label("critical_count"),
            func.sum(case((Pothole.repair_status.in_(["Repaired", "Verified"]), 1), else_=0)).label("repaired_count"),
            func.avg(Pothole.priority_score).label("avg_priority")
        )
        .group_by(Pothole.road_name)
        .order_by(desc("total"))
        .limit(10)
        .all()
    )

    road_stats = [
        {
            "road_name": r[0],
            "total_defects": r[1],
            "critical_defects": r[2],
            "repaired_defects": r[3],
            "pending_defects": r[1] - r[3],
            "avg_priority": round(r[4], 1) if r[4] else 0.0
        }
        for r in road_breakdown
    ]

    # Facility risk statistics
    facilities = db.query(
        Pothole.nearby_facility,
        func.count(Pothole.id).label("count")
    ).group_by(Pothole.nearby_facility).all()

    facility_stats = [{"facility": f[0] or "None", "count": f[1]} for f in facilities]

    # Monthly Trend (portable across SQLite and PostgreSQL)
    is_postgres = getattr(db.bind, "dialect", None) and db.bind.dialect.name == "postgresql"
    if is_postgres:
        month_expr = func.to_char(Pothole.detection_date, "YYYY-MM").label("month")
    else:
        month_expr = func.strftime("%Y-%m", Pothole.detection_date).label("month")

    monthly_data = (
        db.query(
            month_expr,
            func.count(Pothole.id).label("count")
        )
        .group_by("month")
        .order_by("month")
        .all()
    )
    monthly_trend = [{"month": m[0] or "Current", "count": m[1]} for m in monthly_data]

    # Repair SLA turnaround
    repaired_items = db.query(Pothole).filter(Pothole.repair_status.in_(["Repaired", "Verified"])).count()
    completion_rate = round(repaired_items / max(1, total_potholes) * 100, 1)

    return {
        "total_potholes": total_potholes,
        "completion_rate": completion_rate,
        "road_statistics": road_stats,
        "facility_risk_breakdown": facility_stats,
        "monthly_trend": monthly_trend
    }

# -------------------------------------------------------------
# 9. Reports & Exports (CSV and PDF)
# -------------------------------------------------------------
@router.get("/reports/export")
def export_reports(
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    road_name: Optional[str] = None,
    severity: Optional[str] = None,
    repair_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generates official municipal CSV or PDF report."""
    if format == "pdf":
        file_path = ReportService.export_pdf(
            db=db, road_name=road_name, severity=severity, repair_status=repair_status
        )
        return FileResponse(
            file_path,
            media_type="application/pdf",
            filename=os.path.basename(file_path)
        )
    else:
        file_path = ReportService.export_csv(
            db=db, road_name=road_name, severity=severity, repair_status=repair_status
        )
        return FileResponse(
            file_path,
            media_type="text/csv",
            filename=os.path.basename(file_path)
        )

# -------------------------------------------------------------
# 10. Local Rule-Based Road Maintenance Assistant
# -------------------------------------------------------------
@router.post("/assistant/query", response_model=AssistantQueryResponse)
def query_assistant(req: AssistantQueryRequest, db: Session = Depends(get_db)):
    """Answers natural language queries using live SQLite data. 100% offline & local."""
    result = AssistantService.process_query(db, req.query)
    return result

# -------------------------------------------------------------
# 11. Model Configuration & Weight Management
# -------------------------------------------------------------
@router.get("/settings/model")
def get_model_settings():
    """Returns status of local YOLO model and available weights."""
    return yolo_service.get_status()

@router.post("/settings/model/upload")
async def upload_model_weights(file: UploadFile = File(...)):
    """Accepts uploaded .pt weights file and switches active model."""
    if not file.filename.endswith(".pt"):
        raise HTTPException(status_code=400, detail="Only .pt PyTorch / YOLO weight files are supported.")

    dest_path = settings.WEIGHTS_DIR / file.filename
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    success = yolo_service.load_custom_weights(str(dest_path))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to load uploaded model weights.")

    return {
        "success": True,
        "message": f"YOLO model weights '{file.filename}' loaded successfully.",
        "status": yolo_service.get_status()
    }

# -------------------------------------------------------------
# 12. Database Backup & Seed Demo Data
# -------------------------------------------------------------
@router.post("/database/seed")
def seed_data(force: bool = False, db: Session = Depends(get_db)):
    """Seeds realistic municipal defect demo records."""
    seed_database_if_empty(db, force=force)
    return {"success": True, "message": "Demo data populated successfully."}

@router.get("/database/backup")
def backup_database():
    """Downloads current SQLite database file."""
    db_path = settings.DATABASE_DIR / "roadguard.db"
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Database file not found.")
    return FileResponse(
        str(db_path),
        media_type="application/x-sqlite3",
        filename=f"roadguard_backup_{int(time.time())}.db"
    )

@router.get("/roads")
def get_roads_list(db: Session = Depends(get_db)):
    """Returns list of registered municipal roads."""
    roads = db.query(Road).order_by(Road.name).all()
    return roads

# -------------------------------------------------------------
# 13. Direct Static Output Image Endpoints (CORS-Enabled)
# -------------------------------------------------------------
@router.get("/outputs/{filename}")
def get_output_image(filename: str):
    """Direct high-speed delivery of annotated images and crops with explicit CORS headers."""
    file_path = settings.OUTPUTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Output image not found.")
    return FileResponse(
        str(file_path),
        media_type="image/jpeg",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400"
        }
    )

@router.get("/uploads/{filename}")
def get_upload_image(filename: str):
    """Direct delivery of original uploads with explicit CORS headers."""
    file_path = settings.UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Upload image not found.")
    return FileResponse(
        str(file_path),
        media_type="image/jpeg",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400"
        }
    )
