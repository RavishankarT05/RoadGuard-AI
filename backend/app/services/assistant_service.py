import re
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.models.roadguard_models import Pothole, Road, RepairAssignment, RepairHistory

class AssistantService:
    """
    Local Rule-Based & Pattern-Matching Municipal Road Maintenance Assistant.
    Executes live SQL queries directly against SQLite.
    Zero external APIs or cloud dependencies.
    """

    @staticmethod
    def process_query(db: Session, query_text: str) -> Dict[str, Any]:
        q = query_text.lower().strip()
        
        # 1. Critical Potholes Intent
        if "critical" in q:
            crit_potholes = db.query(Pothole).filter(
                (Pothole.severity == "Critical") | (Pothole.priority_category == "Critical")
            ).all()
            total_crit = len(crit_potholes)
            unresolved = [p for p in crit_potholes if p.repair_status not in ["Repaired", "Verified"]]
            
            recs = [
                "Deploy emergency cold/hot asphalt patch squads to active critical zones.",
                "Verify barricades and warning signage around active critical potholes."
            ]
            
            data_list = [
                {
                    "code": p.pothole_code,
                    "road": p.road_name,
                    "severity": p.severity,
                    "priority_score": p.priority_score,
                    "status": p.repair_status,
                    "facility": p.nearby_facility
                }
                for p in unresolved[:8]
            ]
            
            answer = (
                f"There are **{total_crit} total critical defects** in the database. "
                f"Currently, **{len(unresolved)} critical defects remain pending or in progress**. "
                f"Immediate dispatch is required for the highest scored hazards shown below."
            )
            return {
                "query": query_text,
                "intent": "critical_defects_inquiry",
                "answer": answer,
                "data": data_list,
                "recommendations": recs
            }

        # 2. Worst Road / Immediate Repair Road Intent
        elif "which road" in q or "worst road" in q or "immediate repair" in q or "most damaged" in q:
            road_stats = (
                db.query(
                    Pothole.road_name,
                    func.count(Pothole.id).label("defect_count"),
                    func.avg(Pothole.priority_score).label("avg_priority")
                )
                .filter(Pothole.repair_status != "Repaired")
                .group_by(Pothole.road_name)
                .order_by(desc("defect_count"), desc("avg_priority"))
                .all()
            )
            
            if not road_stats:
                return {
                    "query": query_text,
                    "intent": "road_priority_summary",
                    "answer": "All monitored roads are currently in good condition with zero pending defects recorded.",
                    "data": [],
                    "recommendations": ["Maintain regular bi-weekly monitoring scans."]
                }
                
            top_road = road_stats[0]
            answer = (
                f"**{top_road[0]}** requires the most immediate attention, with **{top_road[1]} unresolved potholes** "
                f"and an average priority index of **{round(top_road[2], 1)}/100**. "
                f"Full breakdown of the top critical road corridors is attached below."
            )
            data_list = [
                {"road_name": r[0], "pending_potholes": r[1], "avg_priority": round(r[2], 1)}
                for r in road_stats[:5]
            ]
            return {
                "query": query_text,
                "intent": "road_priority_summary",
                "answer": answer,
                "data": data_list,
                "recommendations": [
                    f"Prioritize heavy machinery resurfacing on {top_road[0]}.",
                    "Coordinate with local traffic police for partial lane closure scheduling."
                ]
            }

        # 3. Repaired Potholes Intent
        elif "repaired" in q or "completion rate" in q or "how many repaired" in q or "fixed" in q:
            total_count = db.query(Pothole).count()
            repaired_count = db.query(Pothole).filter(
                Pothole.repair_status.in_(["Repaired", "Verified"])
            ).count()
            
            rate = round((repaired_count / total_count * 100), 1) if total_count > 0 else 0.0
            
            answer = (
                f"To date, **{repaired_count} out of {total_count} detected potholes ({rate}%)** have been "
                f"successfully repaired or verified by municipal engineering teams. "
                f"**{total_count - repaired_count}** potholes remain in pending, reported, or assigned stages."
            )
            return {
                "query": query_text,
                "intent": "repair_completion_inquiry",
                "answer": answer,
                "data": {
                    "total_detected": total_count,
                    "repaired_or_verified": repaired_count,
                    "pending_repairs": total_count - repaired_count,
                    "completion_rate_pct": rate
                },
                "recommendations": [
                    "Accelerate contractor sign-offs for repairs currently awaiting verification.",
                    "Ensure quality photographic audit for all completed patches."
                ]
            }

        # 4. Highest Priority Locations / Facility Hazards Intent
        elif "highest priority" in q or "school" in q or "hospital" in q or "facility" in q:
            high_pri = db.query(Pothole).filter(
                Pothole.priority_score >= 70,
                Pothole.repair_status != "Repaired"
            ).order_by(desc(Pothole.priority_score)).all()
            
            facility_hazards = [p for p in high_pri if p.nearby_facility and p.nearby_facility.lower() != "none"]
            
            answer = (
                f"Identified **{len(high_pri)} high-priority locations** (Priority Score ≥ 70). "
                f"Crucially, **{len(facility_hazards)} of these defects are adjacent to sensitive public facilities** "
                f"(e.g., schools, emergency hospital corridors, transit terminals)."
            )
            data_list = [
                {
                    "code": p.pothole_code,
                    "road": p.road_name,
                    "priority_score": p.priority_score,
                    "facility": p.nearby_facility,
                    "facility_risk": p.facility_risk,
                    "action": p.recommended_action
                }
                for p in high_pri[:8]
            ]
            return {
                "query": query_text,
                "intent": "facility_hazard_inquiry",
                "answer": answer,
                "data": data_list,
                "recommendations": [
                    "Dispatch mobile repair units to school zones during non-peak school hours.",
                    "Ensure emergency ambulance corridors are repaved first."
                ]
            }

        # 5. Pending Repairs Intent
        elif "pending" in q or "in progress" in q or "assigned" in q:
            pending = db.query(Pothole).filter(
                Pothole.repair_status.in_(["Detected", "Reported", "Assigned", "In Progress"])
            ).order_by(desc(Pothole.priority_score)).all()
            
            status_counts = {}
            for p in pending:
                status_counts[p.repair_status] = status_counts.get(p.repair_status, 0) + 1
                
            breakdown_str = ", ".join([f"{k}: {v}" for k, v in status_counts.items()])
            answer = (
                f"There are **{len(pending)} active pending maintenance tasks**. "
                f"Breakdown by operational phase: **{breakdown_str}**."
            )
            data_list = [
                {
                    "code": p.pothole_code,
                    "road": p.road_name,
                    "severity": p.severity,
                    "priority": p.priority_score,
                    "status": p.repair_status,
                    "date": p.detection_date.strftime("%Y-%m-%d") if p.detection_date else "N/A"
                }
                for p in pending[:8]
            ]
            return {
                "query": query_text,
                "intent": "pending_repairs_inquiry",
                "answer": answer,
                "data": data_list,
                "recommendations": [
                    "Transition 'Reported' defects to 'Assigned' with contractor SLA.",
                    "Track ongoing field patches to ensure completion within 48h."
                ]
            }

        # 6. Summarize Road Conditions Intent
        elif "summarize" in q or "summary" in q or "overview" in q or "health" in q or "condition" in q:
            total = db.query(Pothole).count()
            critical = db.query(Pothole).filter(Pothole.severity == "Critical").count()
            high = db.query(Pothole).filter(Pothole.severity == "High").count()
            medium = db.query(Pothole).filter(Pothole.severity == "Medium").count()
            low = db.query(Pothole).filter(Pothole.severity == "Low").count()
            repaired = db.query(Pothole).filter(Pothole.repair_status.in_(["Repaired", "Verified"])).count()
            pending = total - repaired
            
            # Health score calculation
            if total > 0:
                health_score = max(20.0, round(100.0 - ((critical * 8 + high * 4 + medium * 2 + low * 1) / total * 10), 1))
            else:
                health_score = 95.0
                
            answer = (
                f"### Road Network Health Index: **{health_score} / 100**\n\n"
                f"- **Total Potholes Detected**: {total}\n"
                f"- **Critical Severity**: {critical} (Immediate hazard)\n"
                f"- **High Severity**: {high}\n"
                f"- **Medium / Low**: {medium + low}\n"
                f"- **Repaired / Verified**: {repaired} ({round(repaired/max(1, total)*100, 1)}%)\n"
                f"- **Active Maintenance Queue**: {pending} defects awaiting completion."
            )
            return {
                "query": query_text,
                "intent": "system_summary",
                "answer": answer,
                "data": {
                    "health_score": health_score,
                    "total": total,
                    "critical": critical,
                    "high": high,
                    "repaired": repaired,
                    "pending": pending
                },
                "recommendations": [
                    "Focus municipal resurfacing budget on arterial connectors with Critical defects.",
                    "Deploy automated weekly vision scans to track newly emerging asphalt micro-fractures."
                ]
            }

        # 7. Fallback / Default Guidance
        else:
            total = db.query(Pothole).count()
            roads_count = db.query(Road).count()
            answer = (
                f"I am the **RoadGuard Local Maintenance Assistant**, powered by local database queries.\n\n"
                f"Currently tracking **{total} potholes** across **{roads_count} municipal road segments**.\n\n"
                f"You can ask me questions such as:\n"
                f"- *'How many potholes are critical?'*\n"
                f"- *'Which road needs immediate repair?'*\n"
                f"- *'How many potholes were repaired?'*\n"
                f"- *'Show pending repairs'* \n"
                f"- *'Which locations have the highest priority near schools or hospitals?'*\n"
                f"- *'Summarize road conditions across the city'*"
            )
            return {
                "query": query_text,
                "intent": "general_help",
                "answer": answer,
                "data": None,
                "recommendations": [
                    "Try asking about critical potholes or high priority roads.",
                    "Review the GIS map for spatial cluster analysis."
                ]
            }

