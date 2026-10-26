from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.schemas import EventCreate, EventResponse
from ..services.campus_service import CampusService

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[EventResponse])
def list_events(limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    """
    List upcoming campus events with building and room associations.
    """
    return CampusService.get_events(db, limit=limit)

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(data: EventCreate, db: Session = Depends(get_db)):
    """
    Creates a new campus event.
    """
    try:
        return CampusService.create_event(db, data)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Event creation failed: {e}")
