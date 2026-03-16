from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from backend.db.database import get_db
from backend.models.user import User
from backend.models.result import Result
from backend.core.security import get_current_active_user, require_admin
# Database Models (Nirojini's addition)
from backend.models.patient import Patient
from backend.models.audit_log import AuditLog

# API Routers (Shameeha's addition)
from backend.routers import auth, results, patients, dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"]) 


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Total users breakdown
    total_counts = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    total_users_by_role = {role: count for role, count in total_counts}
    
    # Active sessions breakdown (approximate by recent results)
    since = datetime.utcnow() - timedelta(hours=24)
    active_counts = db.query(User.role, func.count(Result.id)).join(User).filter(Result.created_at >= since).group_by(User.role).all()
    active_sessions_by_role = {role: count for role, count in active_counts}

    # Medical breakdown
    total_patients = db.query(Patient).count()
    active_patients = db.query(Patient).filter(Patient.discharge_date == 'Pending').count()
    total_scans = db.query(Result).count()
    
    tumour_counts = db.query(Patient.tumour_type, func.count(Patient.id)).group_by(Patient.tumour_type).all()
    tumour_breakdown = {t_type: count for t_type, count in tumour_counts}

    return {
        "total_users": total_users_by_role,
        "active_sessions": active_sessions_by_role,
        "total_patients": total_patients,
        "active_patients": active_patients,
        "total_scans": total_scans,
        "tumour_breakdown": tumour_breakdown,
        "pending_approvals": 0, # Deprecated
    }


@router.get("/audit-logs")
def audit_logs(limit: int = 10, status: str = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):

    query = db.query(AuditLog)
    if status and status != "All":
        query = query.filter(AuditLog.status == status)
    
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    # Return in format frontend expects
    return [{
        "id": l.id,
        "action": l.action,
        "user": l.user,
        "role": l.role,
        "ip": l.ip,
        "status": l.status,
        "timestamp": l.timestamp.isoformat(),
        "details": l.details,
        "message": f"{l.user}: {l.action}" # Legacy support
    } for l in logs]


@router.get("/user-roles")
def user_roles(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):

    role_counts = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    return [{"role": role, "count": count} for role, count in role_counts]
