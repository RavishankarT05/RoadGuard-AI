import io
import os
import time
import pandas as pd
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.app.core.config import settings
from backend.app.models.roadguard_models import Pothole, Road

class ReportService:
    @staticmethod
    def export_csv(
        db: Session,
        road_name: Optional[str] = None,
        severity: Optional[str] = None,
        repair_status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> str:
        """Generates a CSV file and returns its path."""
        query = db.query(Pothole)
        
        if road_name and road_name != "all":
            query = query.filter(Pothole.road_name.ilike(f"%{road_name}%"))
        if severity and severity != "all":
            query = query.filter(Pothole.severity == severity)
        if repair_status and repair_status != "all":
            query = query.filter(Pothole.repair_status == repair_status)
        if start_date:
            query = query.filter(Pothole.detection_date >= start_date)
        if end_date:
            query = query.filter(Pothole.detection_date <= end_date)
            
        potholes = query.order_by(Pothole.detection_date.desc()).all()
        
        records = []
        for p in potholes:
            records.append({
                "Pothole Code": p.pothole_code,
                "Road Name": p.road_name,
                "Latitude": p.latitude,
                "Longitude": p.longitude,
                "Severity": p.severity,
                "Severity Score (0-100)": p.severity_score,
                "Priority Score (0-100)": p.priority_score,
                "Priority Category": p.priority_category,
                "Detection Confidence": f"{p.detection_confidence * 100:.1f}%",
                "Repair Status": p.repair_status,
                "Traffic Importance": p.traffic_importance,
                "Nearby Facility": p.nearby_facility,
                "Facility Risk": p.facility_risk,
                "Detected By": p.detected_by,
                "Detection Date": p.detection_date.strftime("%Y-%m-%d %H:%M:%S") if p.detection_date else "",
                "Recommended Action": p.recommended_action
            })
            
        df = pd.DataFrame(records)
        filename = f"roadguard_audit_{int(time.time())}.csv"
        file_path = settings.REPORTS_DIR / filename
        df.to_csv(file_path, index=False, encoding="utf-8")
        
        return str(file_path)

    @staticmethod
    def export_pdf(
        db: Session,
        road_name: Optional[str] = None,
        severity: Optional[str] = None,
        repair_status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> str:
        """Generates an official municipal PDF report using ReportLab and returns its file path."""
        query = db.query(Pothole)
        
        if road_name and road_name != "all":
            query = query.filter(Pothole.road_name.ilike(f"%{road_name}%"))
        if severity and severity != "all":
            query = query.filter(Pothole.severity == severity)
        if repair_status and repair_status != "all":
            query = query.filter(Pothole.repair_status == repair_status)
        if start_date:
            query = query.filter(Pothole.detection_date >= start_date)
        if end_date:
            query = query.filter(Pothole.detection_date <= end_date)
            
        potholes = query.order_by(Pothole.priority_score.desc()).all()
        total_count = len(potholes)
        
        # Summary counts
        critical_count = sum(1 for p in potholes if p.severity == "Critical")
        high_count = sum(1 for p in potholes if p.severity == "High")
        repaired_count = sum(1 for p in potholes if p.repair_status in ["Repaired", "Verified"])
        pending_count = total_count - repaired_count
        
        filename = f"roadguard_executive_report_{int(time.time())}.pdf"
        file_path = settings.REPORTS_DIR / filename
        
        doc = SimpleDocTemplate(
            str(file_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569"),
            spaceAfter=12
        )
        section_style = ParagraphStyle(
            "SectionTitle",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#1E3A8A"),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1E293B")
        )
        caption_style = ParagraphStyle(
            "Caption",
            parent=styles["Italic"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748B")
        )
        
        elements = []
        
        # Header banner
        elements.append(Paragraph("<b>ROADGUARD AI — MUNICIPAL ROAD CONDITION AUDIT</b>", title_style))
        elements.append(Paragraph(
            f"Generated: {datetime.now().strftime('%B %d, %Y - %I:%M %p')} | "
            f"Classification: Official Engineering Documentation | System Version: 1.0.0",
            subtitle_style
        ))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563EB"), spaceAfter=12))
        
        # Executive Summary Stats
        elements.append(Paragraph("Executive Summary & Core Metrics", section_style))
        summary_data = [
            ["Total Defects Monitored", str(total_count), "Critical Severity", str(critical_count)],
            ["Repaired / Verified", str(repaired_count), "High Severity", str(high_count)],
            ["Pending Field Action", str(pending_count), "Repair Completion SLA", f"{round(repaired_count/max(1, total_count)*100, 1)}%"]
        ]
        
        summary_table = Table(summary_data, colWidths=[1.8 * inch, 1.2 * inch, 1.8 * inch, 1.2 * inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#0F172A")),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 14))
        
        # Table of Defect Records
        elements.append(Paragraph(f"Prioritized Defect Register (Showing top {min(25, total_count)} items)", section_style))
        
        headers = ["ID", "Road Corridor", "Severity", "Priority", "Status", "Facility", "Lat / Long"]
        table_rows = [headers]
        
        for p in potholes[:25]:
            coords = f"{round(p.latitude, 4)}, {round(p.longitude, 4)}"
            table_rows.append([
                p.pothole_code,
                p.road_name[:20],
                p.severity,
                f"{p.priority_score}/100",
                p.repair_status,
                p.nearby_facility[:12] if p.nearby_facility else "None",
                coords
            ])
            
        defect_table = Table(table_rows, colWidths=[1.0 * inch, 1.6 * inch, 0.8 * inch, 0.8 * inch, 0.9 * inch, 1.0 * inch, 1.3 * inch])
        defect_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (3, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7.5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(defect_table)
        elements.append(Spacer(1, 14))
        
        # Scientific Disclaimer & Sign-off
        disclaimer = (
            "<b>Engineering Disclaimer:</b> Optical bounding-box area calculations in this report represent "
            "2D surface visual defect proxies from camera perspectives. Volumetric depths are not physical depth measurements. "
            "All repairs should be inspected by certified civil municipal engineers."
        )
        elements.append(Paragraph(disclaimer, caption_style))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Verified by: RoadGuard AI Inspection Engine & Municipal Operations Team", caption_style))
        
        doc.build(elements)
        return str(file_path)

