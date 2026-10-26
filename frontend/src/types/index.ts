export interface User {
  id: number;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN' | 'STAFF';
  department?: string;
  created_at: string;
}

export interface Building {
  id: number;
  code: string;
  name: string;
  floors: number;
  map_x: number;
  map_y: number;
  description?: string;
  status: 'OPERATIONAL' | 'PARTIAL' | 'MAINTENANCE';
  created_at: string;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  maintenance_rooms: number;
}

export interface Room {
  id: number;
  building_id: number;
  room_number: string;
  floor: number;
  capacity: number;
  room_type: 'CLASSROOM' | 'LAB' | 'AUDITORIUM' | 'CONFERENCE' | 'STUDY_POD';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  has_projector: boolean;
  has_ac: boolean;
  created_at: string;
  building_code?: string;
  building_name?: string;
}

export interface RoomDetail extends Room {
  active_booking_title?: string;
  active_booking_end?: string;
  has_open_ticket: boolean;
  upcoming_bookings?: Array<{
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    user_name: string;
  }>;
}

export interface Booking {
  id: number;
  room_id: number;
  room_number?: string;
  building_name?: string;
  building_code?: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  title: string;
  start_time: string;
  end_time: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  created_at: string;
}

export interface MaintenanceTicket {
  id: number;
  room_id: number;
  room_number?: string;
  building_name?: string;
  user_id?: number;
  user_name?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  reported_at: string;
  resolved_at?: string;
}

export interface CampusEvent {
  id: number;
  title: string;
  description?: string;
  building_id: number;
  building_name?: string;
  building_code?: string;
  room_id?: number;
  room_number?: string;
  start_time: string;
  end_time: string;
  category: 'ACADEMIC' | 'TECH' | 'WORKSHOP' | 'CULTURAL' | 'ATHLETIC';
  created_at: string;
}

export interface DashboardStats {
  total_buildings: number;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  maintenance_rooms: number;
  total_bookings: number;
  active_bookings: number;
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  upcoming_events: number;
}

export interface BookingTrendItem {
  date: string;
  day: string;
  total_bookings: number;
  confirmed_bookings: number;
}

export interface BuildingOccupancyItem {
  building_id: number;
  building_code: string;
  building_name: string;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  maintenance_rooms: number;
  occupancy_rate: number;
}

export interface DashboardData {
  stats: DashboardStats;
  booking_trends: BookingTrendItem[];
  building_occupancy: BuildingOccupancyItem[];
  recent_bookings: Booking[];
  recent_tickets: MaintenanceTicket[];
  upcoming_events: CampusEvent[];
}

export interface QueryExecutionResult {
  title: string;
  category: string;
  description: string;
  sql: string;
  row_count: number;
  execution_time_ms: number;
  columns: string[];
  data: Record<string, any>[];
}

export interface QueryCatalogueItem {
  id: string;
  title: string;
  category: string;
  concept: string;
}
