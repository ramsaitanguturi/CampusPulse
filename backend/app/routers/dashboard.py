from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.schemas import DashboardResponse
from ..services.campus_service import CampusService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns live statistics, occupancy rates, booking trends,
    and recent activity derived dynamically from SQL queries.
    """
    return CampusService.get_dashboard_data(db)
