from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey, 
    CheckConstraint, UniqueConstraint, func, Identity
)
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, Identity(start=1, increment=1), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    role = Column(String(30), default="STUDENT", nullable=False)  # STUDENT, FACULTY, ADMIN, STAFF
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    maintenance_tickets = relationship("MaintenanceTicket", back_populates="user")


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, Identity(start=1, increment=1), primary_key=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    floors = Column(Integer, default=4, nullable=False)
    map_x = Column(Float, nullable=False)  # SVG/Map coordinate X (0-100)
    map_y = Column(Float, nullable=False)  # SVG/Map coordinate Y (0-100)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="OPERATIONAL", nullable=False)  # OPERATIONAL, PARTIAL, MAINTENANCE
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    rooms = relationship("Room", back_populates="building", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="building", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, Identity(start=1, increment=1), primary_key=True)
    building_id = Column(Integer, ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    room_number = Column(String(20), nullable=False)
    floor = Column(Integer, default=1, nullable=False)
    capacity = Column(Integer, nullable=False)
    room_type = Column(String(30), default="CLASSROOM", nullable=False)  # CLASSROOM, LAB, AUDITORIUM, CONFERENCE, STUDY_POD
    status = Column(String(30), default="AVAILABLE", nullable=False)  # AVAILABLE, OCCUPIED, MAINTENANCE
    has_projector = Column(Boolean, default=True, nullable=False)
    has_ac = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("capacity > 0", name="chk_room_capacity_positive"),
        UniqueConstraint("building_id", "room_number", name="uq_building_room_number"),
    )

    building = relationship("Building", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room", cascade="all, delete-orphan")
    maintenance_tickets = relationship("MaintenanceTicket", back_populates="room", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="room")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, Identity(start=1, increment=1), primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(30), default="CONFIRMED", nullable=False)  # CONFIRMED, CANCELLED, COMPLETED
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="chk_booking_times_valid"),
    )

    room = relationship("Room", back_populates="bookings")
    user = relationship("User", back_populates="bookings")


class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, Identity(start=1, increment=1), primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(20), default="OPEN", nullable=False)  # OPEN, IN_PROGRESS, RESOLVED
    reported_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    room = relationship("Room", back_populates="maintenance_tickets")
    user = relationship("User", back_populates="maintenance_tickets")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, Identity(start=1, increment=1), primary_key=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    building_id = Column(Integer, ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    category = Column(String(40), default="ACADEMIC", nullable=False)  # ACADEMIC, TECH, WORKSHOP, CULTURAL, ATHLETIC
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="chk_event_times_valid"),
    )

    building = relationship("Building", back_populates="events")
    room = relationship("Room", back_populates="events")
