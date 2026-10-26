from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.schemas import UserResponse
from ..services.campus_service import CampusService

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """
    List campus members for reservation and ticket assignments.
    """
    return CampusService.get_users(db)
