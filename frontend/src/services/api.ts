import { 
  DashboardData, Building, Room, RoomDetail, Booking, 
  MaintenanceTicket, CampusEvent, User, QueryExecutionResult, QueryCatalogueItem 
} from '../types';

const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    const message = 
      typeof errorData?.detail === 'string'
        ? errorData.detail
        : errorData?.detail?.message || `HTTP ${response.status}: Request failed`;

    throw new ApiError(response.status, message, errorData?.detail || errorData);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Dashboard
  getDashboard: () => request<DashboardData>('/dashboard'),

  // Buildings
  getBuildings: () => request<Building[]>('/buildings'),
  getBuildingById: (id: number) => request<{ building: Building; rooms: Room[] }>(`/buildings/${id}`),

  // Rooms
  getRooms: (params?: { building_id?: number; room_type?: string; status?: string; min_capacity?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.building_id) query.append('building_id', params.building_id.toString());
    if (params?.room_type) query.append('room_type', params.room_type);
    if (params?.status) query.append('status', params.status);
    if (params?.min_capacity) query.append('min_capacity', params.min_capacity.toString());
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return request<Room[]>(`/rooms${qs ? `?${qs}` : ''}`);
  },

  getAvailableRooms: (startTime: string, endTime: string, minCapacity?: number, roomType?: string) => {
    const query = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
    });
    if (minCapacity) query.append('min_capacity', minCapacity.toString());
    if (roomType) query.append('room_type', roomType);
    return request<Room[]>(`/rooms/available?${query.toString()}`);
  },

  getRoomDetails: (id: number) => request<RoomDetail>(`/rooms/${id}`),

  // Bookings
  getBookings: (status?: string, roomId?: number, userId?: number) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (roomId) query.append('room_id', roomId.toString());
    if (userId) query.append('user_id', userId.toString());
    const qs = query.toString();
    return request<Booking[]>(`/bookings${qs ? `?${qs}` : ''}`);
  },

  createBooking: (data: { room_id: number; user_id: number; title: string; start_time: string; end_time: string }) =>
    request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelBooking: (id: number) =>
    request<{ success: boolean; message: string; booking_id: number }>(`/bookings/${id}/cancel`, {
      method: 'POST',
    }),

  // Maintenance
  getMaintenanceTickets: (params?: { status?: string; priority?: string; room_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.room_id) query.append('room_id', params.room_id.toString());
    const qs = query.toString();
    return request<MaintenanceTicket[]>(`/maintenance${qs ? `?${qs}` : ''}`);
  },

  createMaintenanceTicket: (data: { room_id: number; user_id?: number; title: string; description: string; priority: string }) =>
    request<MaintenanceTicket>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTicketStatus: (id: number, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') =>
    request<MaintenanceTicket>(`/maintenance/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Events
  getEvents: () => request<CampusEvent[]>('/events'),

  createEvent: (data: { title: string; description?: string; building_id: number; room_id?: number; start_time: string; end_time: string; category: string }) =>
    request<CampusEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users
  getUsers: () => request<User[]>('/users'),

  // DBMS Showcase
  getAnalyticsQueries: () => request<QueryCatalogueItem[]>('/analytics/queries'),
  executeAnalyticsQuery: (queryId: string) => request<QueryExecutionResult>(`/analytics/execute/${queryId}`, { method: 'POST' }),
};
