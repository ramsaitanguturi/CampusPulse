from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas.schemas import MaintenanceTicketCreate, MaintenanceTicketResponse, MaintenanceStatusUpdate
from ..services.campus_service import CampusService

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("", response_model=List[MaintenanceTicketResponse])
def list_tickets(
    status: Optional[str] = Query(None, description="Filter by status (OPEN, IN_PROGRESS, RESOLVED)"),
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)"),
    room_id: Optional[int] = Query(None, description="Filter by room ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    List maintenance tickets with status and priority filters.
    """
    return CampusService.get_maintenance_tickets(
        db, status=status, priority=priority, room_id=room_id, limit=limit
    )

@router.post("", response_model=MaintenanceTicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(data: MaintenanceTicketCreate, db: Session = Depends(get_db)):
    """
    Creates a new maintenance ticket. If priority is CRITICAL, marks the room as MAINTENANCE.
    """
    try:
        return CampusService.create_maintenance_ticket(db, data)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ticket creation failed due to an internal server error."
        )

@router.patch("/{ticket_id}/status", response_model=MaintenanceTicketResponse)
def update_ticket_status(ticket_id: int, body: MaintenanceStatusUpdate, db: Session = Depends(get_db)):
    """
    Updates the status of a maintenance ticket (OPEN, IN_PROGRESS, RESOLVED).
    When resolved, restores room status if no other active tickets remain.
    """
    updated = CampusService.update_ticket_status(db, ticket_id, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Maintenance ticket #{ticket_id} not found.")
    return updated
