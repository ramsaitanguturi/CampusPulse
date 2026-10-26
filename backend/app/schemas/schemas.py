from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ----------------- User Schemas -----------------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "STUDENT"
    department: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Building Schemas -----------------
class BuildingBase(BaseModel):
    code: str
    name: str
    floors: int = 4
    map_x: float
    map_y: float
    description: Optional[str] = None
    status: str = "OPERATIONAL"

class BuildingResponse(BuildingBase):
    id: int
    created_at: datetime
    total_rooms: int = 0
    available_rooms: int = 0
    occupied_rooms: int = 0
    maintenance_rooms: int = 0
    model_config = ConfigDict(from_attributes=True)


# ----------------- Room Schemas -----------------
class RoomBase(BaseModel):
    building_id: int
    room_number: str
    floor: int = 1
    capacity: int = Field(gt=0, description="Room capacity must be greater than zero")
    room_type: str = "CLASSROOM"
    status: str = "AVAILABLE"
    has_projector: bool = True
    has_ac: bool = True

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: int
    created_at: datetime
    building_code: Optional[str] = None
    building_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class RoomDetailResponse(RoomResponse):
    active_booking_title: Optional[str] = None
    active_booking_end: Optional[datetime] = None
    has_open_ticket: bool = False


# ----------------- Booking Schemas -----------------
class BookingCreate(BaseModel):
    room_id: int
    user_id: int
    title: str
    start_time: datetime
    end_time: datetime

class BookingResponse(BaseModel):
    id: int
    room_id: int
    room_number: Optional[str] = None
    building_name: Optional[str] = None
    building_code: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    title: str
    start_time: datetime
    end_time: datetime
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BookingCancelResponse(BaseModel):
    success: bool
    message: str
    booking_id: int


# ----------------- Maintenance Schemas -----------------
class MaintenanceTicketCreate(BaseModel):
    room_id: int
    user_id: Optional[int] = None
    title: str
    description: str
    priority: str = "MEDIUM"

class MaintenanceStatusUpdate(BaseModel):
    status: str = Field(pattern="^(OPEN|IN_PROGRESS|RESOLVED)$")

class MaintenanceTicketResponse(BaseModel):
    id: int
    room_id: int
    room_number: Optional[str] = None
    building_name: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    title: str
    description: str
    priority: str
    status: str
    reported_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ----------------- Event Schemas -----------------
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    building_id: int
    room_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    category: str = "ACADEMIC"

class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    building_id: int
    building_name: Optional[str] = None
    building_code: Optional[str] = None
    room_id: Optional[int] = None
    room_number: Optional[str] = None
    start_time: datetime
    end_time: datetime
    category: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ----------------- Dashboard Schemas -----------------
class DashboardStats(BaseModel):
    total_buildings: int
    total_rooms: int
    available_rooms: int
    occupied_rooms: int
    maintenance_rooms: int
    total_bookings: int
    active_bookings: int
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    upcoming_events: int

class BookingTrendItem(BaseModel):
    date: str
    day: str
    total_bookings: int
    confirmed_bookings: int

class BuildingOccupancyItem(BaseModel):
    building_id: int
    building_code: str
    building_name: str
    total_rooms: int
    available_rooms: int
    occupied_rooms: int
    maintenance_rooms: int
    occupancy_rate: float

class DashboardResponse(BaseModel):
    stats: DashboardStats
    booking_trends: List[BookingTrendItem]
    building_occupancy: List[BuildingOccupancyItem]
    recent_bookings: List[BookingResponse]
    recent_tickets: List[MaintenanceTicketResponse]
    upcoming_events: List[EventResponse]


# ----------------- DBMS Viva Showcase Schema -----------------
class QueryExecutionResult(BaseModel):
    title: str
    category: str
    description: str
    sql: str
    row_count: int
    execution_time_ms: float
    columns: List[str]
    data: List[dict]
