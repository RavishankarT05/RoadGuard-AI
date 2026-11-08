from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DetectionSchema(BaseModel):
    id: Optional[int] = None
    bbox_x1: float
    bbox_y1: float
    bbox_x2: float
    bbox_y2: float
    confidence: float
    class_name: str = "pothole"
    area_pixels: float = 0.0
    area_ratio: float = 0.0

    class Config:
        from_attributes = True

class RepairAssignmentSchema(BaseModel):
    id: Optional[int] = None
    contractor_name: str
    officer_in_charge: str
    department: Optional[str] = "Municipal Roads & Highway Maintenance"
    contact_number: Optional[str] = ""
    assigned_date: Optional[datetime] = None
    target_completion_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None
    estimated_cost: Optional[float] = 0.0
    actual_cost: Optional[float] = 0.0
    repair_method: Optional[str] = "Hot-Mix Asphalt Patching"
    materials_used: Optional[str] = "Bituminous Mix Type B"
    notes: Optional[str] = ""

    class Config:
        from_attributes = True

class RepairHistorySchema(BaseModel):
    id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_by: str
    change_type: str
    remarks: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class PotholeResponse(BaseModel):
    id: int
    pothole_code: str
    road_id: Optional[int] = None
    road_name: str
    latitude: float
    longitude: float
    location_description: Optional[str] = ""
    
    severity: str
    severity_score: float
    severity_reason: str
    estimated_area_ratio: float
    detection_confidence: float
    
    priority_score: int
    priority_category: str
    priority_breakdown: str
    recommended_action: str
    
    traffic_importance: str
    nearby_facility: str
    facility_risk: str
    repair_status: str
    
    image_original_path: Optional[str] = None
    image_annotated_path: Optional[str] = None
    image_after_path: Optional[str] = None
    
    detection_date: datetime
    detected_by: str
    is_manual_override: bool
    override_reason: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    
    detections: List[DetectionSchema] = []
    assignments: List[RepairAssignmentSchema] = []
    history: List[RepairHistorySchema] = []

    class Config:
        from_attributes = True

class PotholeUpdate(BaseModel):
    road_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_description: Optional[str] = None
    traffic_importance: Optional[str] = None
    nearby_facility: Optional[str] = None
    facility_risk: Optional[str] = None
    repair_status: Optional[str] = None
    priority_score: Optional[int] = None
    priority_category: Optional[str] = None
    override_reason: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    new_status: str
    changed_by: Optional[str] = "Municipal Officer"
    remarks: Optional[str] = ""
    after_image_url: Optional[str] = None
    contractor_name: Optional[str] = None
    officer_in_charge: Optional[str] = None
    target_date: Optional[str] = None
    cost: Optional[float] = None
    materials: Optional[str] = None

class PriorityOverrideRequest(BaseModel):
    priority_score: int
    priority_category: str
    override_reason: str
    officer_name: str = "Chief Engineer"

class DashboardStats(BaseModel):
    total_potholes: int
    critical_potholes: int
    high_priority_potholes: int
    medium_priority_potholes: int
    low_priority_potholes: int
    repaired_potholes: int
    pending_repairs: int
    in_progress_repairs: int
    total_roads_monitored: int
    road_health_score: float
    severity_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    status_distribution: Dict[str, int]
    weekly_detections: List[Dict[str, Any]]
    recent_activity: List[PotholeResponse]

class MapLocationItem(BaseModel):
    id: int
    pothole_code: str
    road_name: str
    latitude: float
    longitude: float
    severity: str
    priority_score: int
    priority_category: str
    repair_status: str
    nearby_facility: str
    image_annotated_path: Optional[str] = None
    detection_date: datetime

class AssistantQueryRequest(BaseModel):
    query: str

class AssistantQueryResponse(BaseModel):
    query: str
    intent: str
    answer: str
    data: Optional[Any] = None
    recommendations: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SystemHealthResponse(BaseModel):
    status: str
    version: str
    python_version: str
    torch_version: str
    ultralytics_version: str
    opencv_version: str
    database_status: str
    database_potholes_count: int
    model_name: str
    model_loaded: bool
    device: str
    storage_free_mb: float

