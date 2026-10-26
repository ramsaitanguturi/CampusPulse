from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas.schemas import RoomResponse, RoomDetailResponse
from ..services.campus_service import CampusService

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("", response_model=List[RoomResponse])
def list_rooms(
    building_id: Optional[int] = Query(None, description="Filter by building ID"),
    room_type: Optional[str] = Query(None, description="Filter by room type"),
    status: Optional[str] = Query(None, description="Filter by status (AVAILABLE, OCCUPIED, MAINTENANCE)"),
    min_capacity: Optional[int] = Query(None, description="Minimum seating capacity"),
    search: Optional[str] = Query(None, description="Search term for room number or building"),
    db: Session = Depends(get_db)
):
    """
    Search and filter rooms across the campus.
    """
    return CampusService.get_rooms(
        db,
        building_id=building_id,
        room_type=room_type,
        status=status,
        min_capacity=min_capacity,
        search=search
    )

@router.get("/available", response_model=List[RoomResponse])
def get_available_rooms(
    start_time: datetime = Query(..., description="Desired booking start ISO datetime"),
    end_time: datetime = Query(..., description="Desired booking end ISO datetime"),
    min_capacity: Optional[int] = Query(None, description="Minimum capacity"),
    room_type: Optional[str] = Query(None, description="Room type filter"),
    db: Session = Depends(get_db)
):
    """
    Uses SQL NOT EXISTS subquery to retrieve conflict-free rooms for a specific time interval.
    """
    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time.")
    return CampusService.get_available_rooms_for_slot(
        db,
        start_time=start_time,
        end_time=end_time,
        min_capacity=min_capacity,
        room_type=room_type
    )

@router.get("/{room_id}", response_model=RoomDetailResponse)
def get_room_details(room_id: int, db: Session = Depends(get_db)):
    """
    Retrieves full room metadata, active booking, upcoming schedule, and ticket status.
    """
    data = CampusService.get_room_details(db, room_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Room with ID {room_id} not found.")
    return data
