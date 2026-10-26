import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import text, and_, or_, not_, func, case
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..models.entities import User, Building, Room, Booking, MaintenanceTicket, Event
from ..schemas.schemas import (
    BookingCreate, MaintenanceTicketCreate, EventCreate,
    DashboardStats, BookingTrendItem, BuildingOccupancyItem
)

class CampusService:
    @staticmethod
    def get_dashboard_data(db: Session) -> Dict[str, Any]:
        """
        Derives all dashboard statistics and trends from the actual database
        using multi-table aggregation, conditional counting, and joins.
        """
        now = datetime.now(timezone.utc)

        # 1. Basic counts
        total_buildings = db.query(func.count(Building.id)).scalar() or 0
        total_rooms = db.query(func.count(Room.id)).scalar() or 0
        available_rooms = db.query(func.count(Room.id)).filter(Room.status == "AVAILABLE").scalar() or 0
        occupied_rooms = db.query(func.count(Room.id)).filter(Room.status == "OCCUPIED").scalar() or 0
        maintenance_rooms = db.query(func.count(Room.id)).filter(Room.status == "MAINTENANCE").scalar() or 0

        # 2. Bookings stats
        total_bookings = db.query(func.count(Booking.id)).scalar() or 0
        active_bookings = db.query(func.count(Booking.id)).filter(
            Booking.status == "CONFIRMED",
            Booking.start_time <= now,
            Booking.end_time >= now
        ).scalar() or 0

        # 3. Tickets stats
        total_tickets = db.query(func.count(MaintenanceTicket.id)).scalar() or 0
        open_tickets = db.query(func.count(MaintenanceTicket.id)).filter(MaintenanceTicket.status == "OPEN").scalar() or 0
        in_progress_tickets = db.query(func.count(MaintenanceTicket.id)).filter(MaintenanceTicket.status == "IN_PROGRESS").scalar() or 0
        resolved_tickets = db.query(func.count(MaintenanceTicket.id)).filter(MaintenanceTicket.status == "RESOLVED").scalar() or 0

        # 4. Upcoming events
        upcoming_events_count = db.query(func.count(Event.id)).filter(Event.end_time >= now).scalar() or 0

        stats = DashboardStats(
            total_buildings=total_buildings,
            total_rooms=total_rooms,
            available_rooms=available_rooms,
            occupied_rooms=occupied_rooms,
            maintenance_rooms=maintenance_rooms,
            total_bookings=total_bookings,
            active_bookings=active_bookings,
            total_tickets=total_tickets,
            open_tickets=open_tickets,
            in_progress_tickets=in_progress_tickets,
            resolved_tickets=resolved_tickets,
            upcoming_events=upcoming_events_count
        )

        # 5. Building occupancy aggregation via JOIN and GROUP BY
        building_occupancy_rows = db.query(
            Building.id,
            Building.code,
            Building.name,
            func.count(Room.id).label("total_rooms"),
            func.coalesce(func.sum(case((Room.status == 'AVAILABLE', 1), else_=0)), 0).label("available_rooms"),
            func.coalesce(func.sum(case((Room.status == 'OCCUPIED', 1), else_=0)), 0).label("occupied_rooms"),
            func.coalesce(func.sum(case((Room.status == 'MAINTENANCE', 1), else_=0)), 0).label("maintenance_rooms")
        ).outerjoin(Room, Building.id == Room.building_id)\
         .group_by(Building.id, Building.code, Building.name)\
         .order_by(Building.id).all()


        building_occupancy = []
        for r in building_occupancy_rows:
            tot = r.total_rooms or 0
            occ = int(r.occupied_rooms or 0)
            rate = round((occ / tot * 100), 1) if tot > 0 else 0.0
            building_occupancy.append(BuildingOccupancyItem(
                building_id=r.id,
                building_code=r.code,
                building_name=r.name,
                total_rooms=tot,
                available_rooms=int(r.available_rooms or 0),
                occupied_rooms=occ,
                maintenance_rooms=int(r.maintenance_rooms or 0),
                occupancy_rate=rate
            ))

        # 6. Booking trends over days of the week
        days_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        trends_map = {d: {"total": 0, "confirmed": 0} for d in days_names}
        
        all_bookings = db.query(Booking).all()
        for b in all_bookings:
            d_name = b.start_time.strftime("%a")
            if d_name in trends_map:
                trends_map[d_name]["total"] += 1
                if b.status == "CONFIRMED":
                    trends_map[d_name]["confirmed"] += 1

        booking_trends = [
            BookingTrendItem(
                date=f"Day {idx+1}",
                day=day,
                total_bookings=trends_map[day]["total"],
                confirmed_bookings=trends_map[day]["confirmed"]
            )
            for idx, day in enumerate(days_names)
        ]

        # 7. Recent bookings
        recent_bookings = CampusService.get_bookings(db, limit=5)

        # 8. Recent maintenance tickets
        recent_tickets = CampusService.get_maintenance_tickets(db, limit=5)

        # 9. Upcoming events
        upcoming_events = CampusService.get_events(db, limit=5)

        return {
            "stats": stats,
            "booking_trends": booking_trends,
            "building_occupancy": building_occupancy,
            "recent_bookings": recent_bookings,
            "recent_tickets": recent_tickets,
            "upcoming_events": upcoming_events
        }

    @staticmethod
    def get_buildings(db: Session) -> List[Dict[str, Any]]:
        """
        Retrieves buildings alongside aggregated room counts by status.
        Aggregates rooms by building_id to avoid Oracle CLOB in GROUP BY.
        """
        buildings = db.query(Building).order_by(Building.id).all()
        
        # Aggregate rooms by building_id
        room_stats = db.query(
            Room.building_id,
            func.count(Room.id).label("total_rooms"),
            func.coalesce(func.sum(case((Room.status == 'AVAILABLE', 1), else_=0)), 0).label("available_rooms"),
            func.coalesce(func.sum(case((Room.status == 'OCCUPIED', 1), else_=0)), 0).label("occupied_rooms"),
            func.coalesce(func.sum(case((Room.status == 'MAINTENANCE', 1), else_=0)), 0).label("maintenance_rooms")
        ).group_by(Room.building_id).all()

        stats_map = {
            r.building_id: {
                "total": r.total_rooms or 0,
                "avail": int(r.available_rooms or 0),
                "occup": int(r.occupied_rooms or 0),
                "maint": int(r.maintenance_rooms or 0),
            }
            for r in room_stats
        }

        buildings_list = []
        for b in buildings:
            st = stats_map.get(b.id, {"total": 0, "avail": 0, "occup": 0, "maint": 0})
            buildings_list.append({
                "id": b.id,
                "code": b.code,
                "name": b.name,
                "floors": b.floors,
                "map_x": b.map_x,
                "map_y": b.map_y,
                "description": b.description,
                "status": b.status,
                "created_at": b.created_at,
                "total_rooms": st["total"],
                "available_rooms": st["avail"],
                "occupied_rooms": st["occup"],
                "maintenance_rooms": st["maint"],
            })
        return buildings_list



    @staticmethod
    def get_building_by_id(db: Session, building_id: int) -> Optional[Dict[str, Any]]:
        building = db.query(Building).filter(Building.id == building_id).first()
        if not building:
            return None
        rooms = db.query(Room).filter(Room.building_id == building_id).order_by(Room.floor, Room.room_number).all()
        return {
            "building": building,
            "rooms": rooms
        }

    @staticmethod
    def get_rooms(
        db: Session,
        building_id: Optional[int] = None,
        room_type: Optional[str] = None,
        status: Optional[str] = None,
        min_capacity: Optional[int] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lists rooms joined with their building details and filtered by criteria.
        """
        query = db.query(Room, Building).join(Building, Room.building_id == Building.id)

        if building_id:
            query = query.filter(Room.building_id == building_id)
        if room_type:
            query = query.filter(Room.room_type == room_type)
        if status:
            query = query.filter(Room.status == status)
        if min_capacity:
            query = query.filter(Room.capacity >= min_capacity)
        if search:
            search_fmt = f"%{search}%"
            query = query.filter(
                or_(
                    Room.room_number.ilike(search_fmt),
                    Building.name.ilike(search_fmt),
                    Building.code.ilike(search_fmt),
                    Room.room_type.ilike(search_fmt)
                )
            )

        rows = query.order_by(Building.name, Room.room_number).all()
        result = []
        for r, b in rows:
            result.append({
                "id": r.id,
                "building_id": r.building_id,
                "room_number": r.room_number,
                "floor": r.floor,
                "capacity": r.capacity,
                "room_type": r.room_type,
                "status": r.status,
                "has_projector": r.has_projector,
                "has_ac": r.has_ac,
                "created_at": r.created_at,
                "building_code": b.code,
                "building_name": b.name
            })
        return result

    @staticmethod
    def get_available_rooms_for_slot(
        db: Session,
        start_time: datetime,
        end_time: datetime,
        min_capacity: Optional[int] = None,
        room_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        DBMS NOT EXISTS Query Demonstration:
        Finds rooms where NOT EXISTS any overlapping CONFIRMED booking,
        and room status is not MAINTENANCE.
        """
        where_clauses = ["r.status != 'MAINTENANCE'"]
        params: Dict[str, Any] = {
            "start_t": start_time,
            "end_t": end_time
        }

        if min_capacity is not None:
            where_clauses.append("r.capacity >= :min_cap")
            params["min_cap"] = min_capacity

        if room_type:
            where_clauses.append("r.room_type = :r_type")
            params["r_type"] = room_type

        where_sql = " AND ".join(where_clauses)

        sql = text(f"""
            SELECT 
                r.id, r.room_number, r.floor, r.capacity, r.room_type, r.status,
                r.has_projector, r.has_ac, r.created_at,
                b.id AS building_id, b.code AS building_code, b.name AS building_name
            FROM rooms r
            JOIN buildings b ON r.building_id = b.id
            WHERE {where_sql}
              AND NOT EXISTS (
                  SELECT 1 
                  FROM bookings bk 
                  WHERE bk.room_id = r.id 
                    AND bk.status = 'CONFIRMED'
                    AND NOT (bk.end_time <= :start_t OR bk.start_time >= :end_t)
              )
            ORDER BY b.code, r.room_number
        """)

        res = db.execute(sql, params).mappings().all()
        return [dict(row) for row in res]


    @staticmethod
    def get_room_details(db: Session, room_id: int) -> Optional[Dict[str, Any]]:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            return None

        now = datetime.now(timezone.utc)
        building = db.query(Building).filter(Building.id == room.building_id).first()

        # Active booking
        active_booking = db.query(Booking).filter(
            Booking.room_id == room_id,
            Booking.status == "CONFIRMED",
            Booking.start_time <= now,
            Booking.end_time >= now
        ).first()

        # Active open ticket
        has_open_ticket = db.query(MaintenanceTicket).filter(
            MaintenanceTicket.room_id == room_id,
            MaintenanceTicket.status.in_(["OPEN", "IN_PROGRESS"])
        ).first() is not None

        # Upcoming bookings
        upcoming_bookings = db.query(Booking, User).join(User, Booking.user_id == User.id)\
            .filter(
                Booking.room_id == room_id,
                Booking.status == "CONFIRMED",
                Booking.end_time > now
            ).order_by(Booking.start_time).limit(5).all()

        upcoming_list = []
        for bk, u in upcoming_bookings:
            upcoming_list.append({
                "id": bk.id,
                "title": bk.title,
                "start_time": bk.start_time,
                "end_time": bk.end_time,
                "user_name": u.name
            })

        return {
            "id": room.id,
            "building_id": room.building_id,
            "building_name": building.name if building else "",
            "building_code": building.code if building else "",
            "room_number": room.room_number,
            "floor": room.floor,
            "capacity": room.capacity,
            "room_type": room.room_type,
            "status": room.status,
            "has_projector": room.has_projector,
            "has_ac": room.has_ac,
            "created_at": room.created_at,
            "active_booking_title": active_booking.title if active_booking else None,
            "active_booking_end": active_booking.end_time if active_booking else None,
            "has_open_ticket": has_open_ticket,
            "upcoming_bookings": upcoming_list
        }

    @staticmethod
    def create_booking(db: Session, data: BookingCreate) -> Dict[str, Any]:
        """
        Creates a room booking with strict conflict prevention at both
        application transaction level and PostgreSQL exclusion constraint level.
        Handles conflicts gracefully and returns informative API errors.
        """
        # 1. Interval validity validation
        if data.end_time <= data.start_time:
            raise ValueError("Invalid time interval: End time must be strictly after start time.")

        # 2. Check room exists and is not under maintenance
        room = db.query(Room).filter(Room.id == data.room_id).first()
        if not room:
            raise ValueError(f"Room with ID {data.room_id} does not exist.")
        if room.status == "MAINTENANCE":
            raise ValueError(f"Room {room.room_number} is currently offline for MAINTENANCE and cannot be booked.")

        # 3. Check user exists
        user = db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise ValueError(f"User with ID {data.user_id} does not exist.")

        # 4. Transactional check for overlapping booking
        # Mathematical interval overlap condition: NOT (existing.end_time <= new.start_time OR existing.start_time >= new.end_time)
        conflict_query = db.query(Booking, User).join(User, Booking.user_id == User.id).filter(
            Booking.room_id == data.room_id,
            Booking.status == "CONFIRMED",
            not_(
                or_(
                    Booking.end_time <= data.start_time,
                    Booking.start_time >= data.end_time
                )
            )
        )
        conflicting = conflict_query.first()

        if conflicting:
            conf_bk, conf_user = conflicting
            start_str = conf_bk.start_time.strftime("%Y-%m-%d %H:%M")
            end_str = conf_bk.end_time.strftime("%H:%M")
            raise ConflictError(
                f"Booking conflict: Room {room.room_number} is already booked for '{conf_bk.title}' "
                f"by {conf_user.name} from {start_str} to {end_str}.",
                conflicting_booking={
                    "id": conf_bk.id,
                    "title": conf_bk.title,
                    "user_name": conf_user.name,
                    "start_time": conf_bk.start_time.isoformat(),
                    "end_time": conf_bk.end_time.isoformat(),
                }
            )

        # 5. Insert booking into database (exclusion constraint will also catch in Postgres)
        new_booking = Booking(
            room_id=data.room_id,
            user_id=data.user_id,
            title=data.title.strip(),
            start_time=data.start_time,
            end_time=data.end_time,
            status="CONFIRMED"
        )
        try:
            db.add(new_booking)
            db.commit()
            db.refresh(new_booking)
        except IntegrityError as ie:
            db.rollback()
            # PostgreSQL exclusion constraint violation catch
            err_msg = str(ie.orig).lower()
            if "no_overlapping_bookings" in err_msg or "exclusion" in err_msg:
                raise ConflictError(
                    f"Database exclusion constraint triggered: Room {room.room_number} has an overlapping booking during the requested time window.",
                    conflicting_booking=None
                )
            raise ValueError(f"Database constraint error: {ie}")

        building = db.query(Building).filter(Building.id == room.building_id).first()
        return {
            "id": new_booking.id,
            "room_id": new_booking.room_id,
            "room_number": room.room_number,
            "building_name": building.name if building else "",
            "building_code": building.code if building else "",
            "user_id": user.id,
            "user_name": user.name,
            "user_email": user.email,
            "title": new_booking.title,
            "start_time": new_booking.start_time,
            "end_time": new_booking.end_time,
            "status": new_booking.status,
            "created_at": new_booking.created_at
        }

    @staticmethod
    def get_bookings(
        db: Session,
        status: Optional[str] = None,
        room_id: Optional[int] = None,
        user_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Multi-table join across Bookings, Rooms, Buildings, and Users.
        """
        query = db.query(Booking, Room, Building, User)\
            .join(Room, Booking.room_id == Room.id)\
            .join(Building, Room.building_id == Building.id)\
            .join(User, Booking.user_id == User.id)

        if status:
            query = query.filter(Booking.status == status)
        if room_id:
            query = query.filter(Booking.room_id == room_id)
        if user_id:
            query = query.filter(Booking.user_id == user_id)

        rows = query.order_by(Booking.start_time.desc()).limit(limit).all()
        result = []
        for bk, r, b, u in rows:
            result.append({
                "id": bk.id,
                "room_id": bk.room_id,
                "room_number": r.room_number,
                "building_name": b.name,
                "building_code": b.code,
                "user_id": u.id,
                "user_name": u.name,
                "user_email": u.email,
                "title": bk.title,
                "start_time": bk.start_time,
                "end_time": bk.end_time,
                "status": bk.status,
                "created_at": bk.created_at
            })
        return result

    @staticmethod
    def cancel_booking(db: Session, booking_id: int) -> bool:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            return False
        booking.status = "CANCELLED"
        db.commit()
        return True

    @staticmethod
    def get_maintenance_tickets(
        db: Session,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        room_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query = db.query(MaintenanceTicket, Room, Building, User)\
            .join(Room, MaintenanceTicket.room_id == Room.id)\
            .join(Building, Room.building_id == Building.id)\
            .outerjoin(User, MaintenanceTicket.user_id == User.id)

        if status:
            query = query.filter(MaintenanceTicket.status == status)
        if priority:
            query = query.filter(MaintenanceTicket.priority == priority)
        if room_id:
            query = query.filter(MaintenanceTicket.room_id == room_id)

        rows = query.order_by(MaintenanceTicket.reported_at.desc()).limit(limit).all()
        result = []
        for t, r, b, u in rows:
            result.append({
                "id": t.id,
                "room_id": t.room_id,
                "room_number": r.room_number,
                "building_name": b.name,
                "user_id": u.id if u else None,
                "user_name": u.name if u else "Facility Automation",
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "status": t.status,
                "reported_at": t.reported_at,
                "resolved_at": t.resolved_at
            })
        return result

    @staticmethod
    def create_maintenance_ticket(db: Session, data: MaintenanceTicketCreate) -> Dict[str, Any]:
        room = db.query(Room).filter(Room.id == data.room_id).first()
        if not room:
            raise ValueError(f"Room with ID {data.room_id} does not exist.")

        ticket = MaintenanceTicket(
            room_id=data.room_id,
            user_id=data.user_id,
            title=data.title.strip(),
            description=data.description.strip(),
            priority=data.priority,
            status="OPEN"
        )
        db.add(ticket)

        # If CRITICAL priority, automatically mark room as MAINTENANCE
        if data.priority == "CRITICAL":
            room.status = "MAINTENANCE"

        db.commit()
        db.refresh(ticket)

        building = db.query(Building).filter(Building.id == room.building_id).first()
        user = db.query(User).filter(User.id == data.user_id).first() if data.user_id else None

        return {
            "id": ticket.id,
            "room_id": ticket.room_id,
            "room_number": room.room_number,
            "building_name": building.name if building else "",
            "user_id": user.id if user else None,
            "user_name": user.name if user else "Facility Automation",
            "title": ticket.title,
            "description": ticket.description,
            "priority": ticket.priority,
            "status": ticket.status,
            "reported_at": ticket.reported_at,
            "resolved_at": ticket.resolved_at
        }

    @staticmethod
    def update_ticket_status(db: Session, ticket_id: int, new_status: str) -> Optional[Dict[str, Any]]:
        ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
        if not ticket:
            return None

        ticket.status = new_status
        if new_status == "RESOLVED":
            ticket.resolved_at = datetime.now(timezone.utc)
            # Check if any other open tickets exist for this room
            other_open = db.query(MaintenanceTicket).filter(
                MaintenanceTicket.room_id == ticket.room_id,
                MaintenanceTicket.id != ticket.id,
                MaintenanceTicket.status.in_(["OPEN", "IN_PROGRESS"])
            ).count()
            if other_open == 0:
                room = db.query(Room).filter(Room.id == ticket.room_id).first()
                if room and room.status == "MAINTENANCE":
                    room.status = "AVAILABLE"
        else:
            ticket.resolved_at = None

        db.commit()
        db.refresh(ticket)

        room = db.query(Room).filter(Room.id == ticket.room_id).first()
        building = db.query(Building).filter(Building.id == room.building_id).first() if room else None
        user = db.query(User).filter(User.id == ticket.user_id).first() if ticket.user_id else None

        return {
            "id": ticket.id,
            "room_id": ticket.room_id,
            "room_number": room.room_number if room else "",
            "building_name": building.name if building else "",
            "user_id": user.id if user else None,
            "user_name": user.name if user else "Facility Automation",
            "title": ticket.title,
            "description": ticket.description,
            "priority": ticket.priority,
            "status": ticket.status,
            "reported_at": ticket.reported_at,
            "resolved_at": ticket.resolved_at
        }

    @staticmethod
    def get_events(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        query = db.query(Event, Building, Room)\
            .join(Building, Event.building_id == Building.id)\
            .outerjoin(Room, Event.room_id == Room.id)\
            .order_by(Event.start_time.asc()).limit(limit)

        rows = query.all()
        result = []
        for ev, b, r in rows:
            result.append({
                "id": ev.id,
                "title": ev.title,
                "description": ev.description,
                "building_id": ev.building_id,
                "building_name": b.name,
                "building_code": b.code,
                "room_id": ev.room_id,
                "room_number": r.room_number if r else "Main Complex Area",
                "start_time": ev.start_time,
                "end_time": ev.end_time,
                "category": ev.category,
                "created_at": ev.created_at
            })
        return result

    @staticmethod
    def create_event(db: Session, data: EventCreate) -> Dict[str, Any]:
        if data.end_time <= data.start_time:
            raise ValueError("Event end time must be after start time.")

        building = db.query(Building).filter(Building.id == data.building_id).first()
        if not building:
            raise ValueError(f"Building with ID {data.building_id} does not exist.")

        room = None
        if data.room_id:
            room = db.query(Room).filter(Room.id == data.room_id).first()
            if not room:
                raise ValueError(f"Room with ID {data.room_id} does not exist.")

        new_event = Event(
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            building_id=data.building_id,
            room_id=data.room_id,
            start_time=data.start_time,
            end_time=data.end_time,
            category=data.category
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)

        return {
            "id": new_event.id,
            "title": new_event.title,
            "description": new_event.description,
            "building_id": new_event.building_id,
            "building_name": building.name,
            "building_code": building.code,
            "room_id": new_event.room_id,
            "room_number": room.room_number if room else "Main Complex Area",
            "start_time": new_event.start_time,
            "end_time": new_event.end_time,
            "category": new_event.category,
            "created_at": new_event.created_at
        }

    @staticmethod
    def get_users(db: Session) -> List[User]:
        return db.query(User).order_by(User.name).all()

    @staticmethod
    def execute_analytics_query(db: Session, query_id: str) -> Dict[str, Any]:
        """
        Executes DBMS Semester Project showcase queries with timing measurement
        and returns columns and data records across Oracle SQL and PostgreSQL.
        """
        is_oracle = "oracle" in str(db.bind.url)
        limit_clause = "FETCH FIRST 10 ROWS ONLY" if is_oracle else "LIMIT 10"

        queries = {
            "multi_table_join": {
                "title": "Multi-Table 4-Way Join",
                "category": "JOINS",
                "description": "Joins Bookings, Rooms, Buildings, and Users with filter on confirmed bookings.",
                "sql": f"""
SELECT 
    b.id AS booking_id,
    b.title AS session_title,
    u.name AS reserved_by,
    u.role AS user_role,
    u.department,
    r.room_number,
    r.room_type,
    bld.name AS building_name,
    b.start_time,
    b.end_time
FROM bookings b
JOIN rooms r ON b.room_id = r.id
JOIN buildings bld ON r.building_id = bld.id
JOIN users u ON b.user_id = u.id
WHERE b.status = 'CONFIRMED'
ORDER BY b.start_time DESC
{limit_clause}
                """.strip()
            },
            "aggregation_groupby": {
                "title": "Aggregation & GROUP BY with HAVING",
                "category": "AGGREGATION",
                "description": "Calculates total room capacity, room count, and active ticket count per building.",
                "sql": """
SELECT 
    b.code AS building_code,
    b.name AS building_name,
    COUNT(r.id) AS total_rooms,
    SUM(r.capacity) AS total_capacity,
    ROUND(AVG(r.capacity), 1) AS avg_room_capacity,
    COUNT(mt.id) AS active_tickets
FROM buildings b
JOIN rooms r ON b.id = r.building_id
LEFT JOIN maintenance_tickets mt ON r.id = mt.room_id AND mt.status IN ('OPEN', 'IN_PROGRESS')
GROUP BY b.id, b.code, b.name
HAVING COUNT(r.id) > 0
ORDER BY total_capacity DESC
                """.strip()
            },
            "not_exists_availability": {
                "title": "Subquery with NOT EXISTS (Room Availability)",
                "category": "SUBQUERIES",
                "description": "Finds all rooms that currently have ZERO overlapping confirmed bookings.",
                "sql": """
SELECT 
    r.room_number,
    b.name AS building_name,
    r.room_type,
    r.capacity,
    r.status AS configured_status
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.status != 'MAINTENANCE'
  AND NOT EXISTS (
      SELECT 1 
      FROM bookings bk 
      WHERE bk.room_id = r.id 
        AND bk.status = 'CONFIRMED'
        AND CURRENT_TIMESTAMP BETWEEN bk.start_time AND bk.end_time
  )
ORDER BY r.capacity DESC
                """.strip()
            },
            "correlated_subquery": {
                "title": "Correlated Subquery",
                "category": "SUBQUERIES",
                "description": "Finds rooms whose capacity is greater than the average capacity of all rooms in that exact building.",
                "sql": """
SELECT 
    r.room_number,
    r.room_type,
    r.capacity,
    b.name AS building_name
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.capacity > (
    SELECT AVG(inner_r.capacity)
    FROM rooms inner_r
    WHERE inner_r.building_id = r.building_id
)
ORDER BY b.name, r.capacity DESC
                """.strip()
            },
            "view_query": {
                "title": "SQL View Query (v_dashboard_summary)",
                "category": "VIEWS",
                "description": "Queries the normalized database view v_dashboard_summary created during DDL initialization.",
                "sql": """
SELECT 
    building_code,
    building_name,
    total_rooms,
    available_rooms,
    occupied_rooms,
    maintenance_rooms,
    occupancy_rate
FROM v_dashboard_summary
ORDER BY occupancy_rate DESC
                """.strip()
            }
        }


        query_info = queries.get(query_id, queries["multi_table_join"])
        sql_statement = query_info["sql"]

        start_t = time.perf_counter()
        result = db.execute(text(sql_statement))
        elapsed_ms = round((time.perf_counter() - start_t) * 1000, 2)

        keys = list(result.keys())
        rows = [dict(zip(keys, [str(val) if isinstance(val, (datetime,)) else val for val in row])) for row in result.fetchall()]

        return {
            "title": query_info["title"],
            "category": query_info["category"],
            "description": query_info["description"],
            "sql": sql_statement,
            "row_count": len(rows),
            "execution_time_ms": elapsed_ms,
            "columns": keys,
            "data": rows
        }


class ConflictError(Exception):
    def __init__(self, message: str, conflicting_booking: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.conflicting_booking = conflicting_booking
