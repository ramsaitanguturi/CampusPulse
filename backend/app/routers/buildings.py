from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.schemas import BuildingResponse
from ..services.campus_service import CampusService

router = APIRouter(prefix="/buildings", tags=["Buildings"])

@router.get("", response_model=List[BuildingResponse])
def list_buildings(db: Session = Depends(get_db)):
    """
    Returns all buildings with spatial coordinates and aggregated room counts.
    """
    return CampusService.get_buildings(db)

@router.get("/{building_id}")
def get_building(building_id: int, db: Session = Depends(get_db)):
    """
    Returns single building details along with its rooms.
    """
    data = CampusService.get_building_by_id(db, building_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Building with ID {building_id} not found.")
    return data
