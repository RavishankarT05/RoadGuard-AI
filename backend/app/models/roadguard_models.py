import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(30), default="engineer") # admin, engineer, inspector
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, index=True, nullable=False)
    road_type = Column(String(50), default="Arterial") # Highway, Arterial, Collector, Local Street
    ward_zone = Column(String(100), default="Zone 1 - Central")
    length_km = Column(Float, default=5.0)
    surface_type = Column(String(50), default="Asphalt") # Asphalt, Concrete
    speed_limit_kmh = Column(Integer, default=50)
    avg_daily_traffic = Column(Integer, default=15000)
    last_inspected = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    potholes = relationship("Pothole", back_populates="road", cascade="all, delete-orphan")

class Pothole(Base):
    __tablename__ = "potholes"

    id = Column(Integer, primary_key=True, index=True)
    pothole_code = Column(String(50), unique=True, index=True, nullable=False)
    road_id = Column(Integer, ForeignKey("roads.id", ondelete="SET NULL"), nullable=True)
    road_name = Column(String(150), nullable=False, index=True)
    
    # Location
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    location_description = Column(String(255), default="")
    
    # AI Detection & Severity
    severity = Column(String(20), default="Medium", index=True) # Critical, High, Medium, Low
    severity_score = Column(Float, default=50.0)
    severity_reason = Column(Text, default="")
    estimated_area_ratio = Column(Float, default=0.0) # Normalized bbox area %
    detection_confidence = Column(Float, default=0.85)
    
    # Priority
    priority_score = Column(Integer, default=50, index=True) # 0 to 100
    priority_category = Column(String(20), default="Medium", index=True) # Critical, High, Medium, Low
    priority_breakdown = Column(Text, default="{}") # JSON or text string breakdown
    recommended_action = Column(String(255), default="")
    
    # Road and Environmental Factors
    traffic_importance = Column(String(20), default="High") # Critical, High, Medium, Low
    nearby_facility = Column(String(50), default="None") # Hospital, School, Transit Hub, Market, None
    facility_risk = Column(String(20), default="None") # High, Medium, Low, None
    
    # Repair Lifecycle
    # Detected -> Reported -> Assigned -> In Progress -> Repaired -> Verified
    repair_status = Column(String(30), default="Detected", index=True)
    
    # Images
    image_original_path = Column(String(255), nullable=True)
    image_annotated_path = Column(String(255), nullable=True)
    image_after_path = Column(String(255), nullable=True)
    
    # Detection info
    detection_date = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    detected_by = Column(String(100), default="YOLOv8 AI Vision Engine")
    
    # Manual Override Flag
    is_manual_override = Column(Boolean, default=False)
    override_reason = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    road = relationship("Road", back_populates="potholes")
    detections = relationship("Detection", back_populates="pothole", cascade="all, delete-orphan")
    assignments = relationship("RepairAssignment", back_populates="pothole", cascade="all, delete-orphan")
    history = relationship("RepairHistory", back_populates="pothole", cascade="all, delete-orphan", order_by="desc(RepairHistory.timestamp)")

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    pothole_id = Column(Integer, ForeignKey("potholes.id", ondelete="CASCADE"), nullable=False)
    
    # Bounding Box normalized [0, 1] or pixel coords
    bbox_x1 = Column(Float, nullable=False)
    bbox_y1 = Column(Float, nullable=False)
    bbox_x2 = Column(Float, nullable=False)
    bbox_y2 = Column(Float, nullable=False)
    
    confidence = Column(Float, nullable=False)
    class_name = Column(String(50), default="pothole")
    area_pixels = Column(Float, default=0.0)
    area_ratio = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    pothole = relationship("Pothole", back_populates="detections")

class RepairAssignment(Base):
    __tablename__ = "repair_assignments"

    id = Column(Integer, primary_key=True, index=True)
    pothole_id = Column(Integer, ForeignKey("potholes.id", ondelete="CASCADE"), nullable=False)
    
    contractor_name = Column(String(100), nullable=False)
    officer_in_charge = Column(String(100), nullable=False)
    department = Column(String(100), default="Municipal Roads & Highway Maintenance")
    contact_number = Column(String(30), default="")
    
    assigned_date = Column(DateTime, default=datetime.datetime.utcnow)
    target_completion_date = Column(DateTime, nullable=True)
    actual_completion_date = Column(DateTime, nullable=True)
    
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    repair_method = Column(String(100), default="Hot-Mix Asphalt Patching")
    materials_used = Column(String(200), default="Bituminous Mix Type B, Tack Coat")
    notes = Column(Text, default="")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    pothole = relationship("Pothole", back_populates="assignments")

class RepairHistory(Base):
    __tablename__ = "repair_history"

    id = Column(Integer, primary_key=True, index=True)
    pothole_id = Column(Integer, ForeignKey("potholes.id", ondelete="CASCADE"), nullable=False)
    
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    changed_by = Column(String(100), default="System AI")
    change_type = Column(String(50), default="status_change") # status_change, priority_override, assignment, verification, notes
    remarks = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    pothole = relationship("Pothole", back_populates="history")

class MaintenanceReport(Base):
    __tablename__ = "maintenance_reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    report_type = Column(String(50), default="monthly") # monthly, road_summary, priority_audit, custom
    file_path = Column(String(255), nullable=False)
    file_format = Column(String(10), default="pdf") # pdf, csv
    total_records = Column(Integer, default=0)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    generated_by = Column(String(100), default="RoadGuard Intelligence Engine")
    parameters_json = Column(Text, default="{}")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(50), unique=True, index=True, nullable=False)
    setting_value = Column(Text, nullable=False)
    description = Column(String(255), default="")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

