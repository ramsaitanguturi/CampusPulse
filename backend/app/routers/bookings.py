from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas.schemas import BookingCreate, BookingResponse, BookingCancelResponse
from ..services.campus_service import CampusService, ConflictError

router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.get("", response_model=List[BookingResponse])
def list_bookings(
    status: Optional[str] = Query(None, description="Filter by status (CONFIRMED, CANCELLED, COMPLETED)"),
    room_id: Optional[int] = Query(None, description="Filter by room ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    List bookings with room and user details.
    """
    return CampusService.get_bookings(db, status=status, room_id=room_id, user_id=user_id, limit=limit)

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    """
    Creates a new room booking with conflict-free enforcement.
    Rejects overlapping time intervals gracefully with HTTP 409 Conflict.
    """
    try:
        return CampusService.create_booking(db, data)
    except ConflictError as ce:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": ce.message,
                "conflicting_booking": ce.conflicting_booking
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Booking creation failed: {e}")

@router.post("/{booking_id}/cancel", response_model=BookingCancelResponse)
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    """
    Cancels an active booking.
    """
    success = CampusService.cancel_booking(db, booking_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Booking with ID {booking_id} not found.")
    return BookingCancelResponse(
        success=True,
        message=f"Booking #{booking_id} has been cancelled successfully.",
        booking_id=booking_id
    )
