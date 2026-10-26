import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  Plus, 
  Search, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User as UserIcon,
  DoorClosed,
  Trash2
} from 'lucide-react';
import { Booking, Room, User } from '../types';
import { api, ApiError } from '../services/api';

interface BookingsViewProps {
  rooms: Room[];
  users: User[];
  isModalOpen: boolean;
  preselectedRoom?: Room | null;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onRefreshData: () => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  rooms,
  users,
  isModalOpen,
  preselectedRoom,
  onCloseModal,
  onOpenModal,
  onRefreshData
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Booking Form State
  const [selectedRoomId, setSelectedRoomId] = useState<number>(preselectedRoom?.id || rooms[0]?.id || 1);
  const [selectedUserId, setSelectedUserId] = useState<number>(users[0]?.id || 1);
  const [title, setTitle] = useState('');
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<any | null>(null);

  useEffect(() => {
    if (preselectedRoom) {
      setSelectedRoomId(preselectedRoom.id);
    }
  }, [preselectedRoom]);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getBookings(statusFilter !== 'ALL' ? statusFilter : undefined);
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setConflictDetails(null);

    if (!title.trim()) {
      setFormError('Please provide a booking session title.');
      return;
    }

    if (endTime <= startTime) {
      setFormError('Invalid interval: End time must be strictly after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const startIso = `${bookingDate}T${startTime}:00Z`;
      const endIso = `${bookingDate}T${endTime}:00Z`;

      await api.createBooking({
        room_id: Number(selectedRoomId),
        user_id: Number(selectedUserId),
        title: title.trim(),
        start_time: startIso,
        end_time: endIso,
      });

      // Reset form and close
      setTitle('');
      onCloseModal();
      fetchBookings();
      onRefreshData();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError(err.message);
        setConflictDetails(err.data?.conflicting_booking || null);
      } else {
        setFormError(err.message || 'Failed to create booking.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm(`Are you sure you want to cancel booking #${bookingId}?`)) {
      return;
    }

    try {
      await api.cancelBooking(bookingId);
      fetchBookings();
      onRefreshData();
    } catch (err) {
      alert('Failed to cancel booking.');
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(term) ||
      b.room_number?.toLowerCase().includes(term) ||
      b.building_name?.toLowerCase().includes(term) ||
      b.user_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Conflict-Free Room Scheduling Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide mt-1">
            Campus Room Reservations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Powered by PostgreSQL engine exclusion constraints (`EXCLUDE USING gist`) to eliminate double bookings.
          </p>
        </div>

        <button
          id="btn-open-booking-modal"
          onClick={onOpenModal}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all glow-cyan"
        >
          <Plus className="w-4 h-4" />
          <span>NEW RESERVATION</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search bookings by session, room, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>
      </div>

      {/* Bookings Table / List */}
      <div className="rounded-2xl glass-panel overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Reservation Title</th>
                <th className="py-3 px-4">Location & Room</th>
                <th className="py-3 px-4">Booked By</th>
                <th className="py-3 px-4">Time Interval</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 animate-pulse">
                    Loading reservation logs from database...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No reservations matching current filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-white">
                      {b.title}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200">
                        Room {b.room_number}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {b.building_name} ({b.building_code})
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200">{b.user_name}</div>
                      <div className="text-[10px] text-slate-400">{b.user_email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200">
                        {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-cyan-300">
                        {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr;{' '}
                        {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center space-x-1 ${
                        b.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        b.status === 'COMPLETED' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        <span>{b.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-2.5 py-1 text-[11px] font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 rounded-lg transition-colors"
                          title="Cancel booking"
                        >
                          CANCEL
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Booking Modal with Conflict Prevention */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl glass-panel-glow p-6 border border-cyan-500/40 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center glow-cyan">
                <CalendarClock className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Schedule Room Reservation
                </h3>
                <p className="text-xs text-slate-400">
                  SQL Exclusion Engine actively verifies time conflicts before transaction commit.
                </p>
              </div>
            </div>

            {/* Error / Conflict Alert Box */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs space-y-2 animate-shake">
                <div className="flex items-start space-x-2 font-bold font-mono">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>

                {conflictDetails && (
                  <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/30 font-mono text-[11px] text-rose-200 space-y-1">
                    <div><strong>Conflicting Session:</strong> {conflictDetails.title}</div>
                    <div><strong>Reserved By:</strong> {conflictDetails.user_name}</div>
                    <div>
                      <strong>Window:</strong> {new Date(conflictDetails.start_time).toLocaleTimeString()} - {new Date(conflictDetails.end_time).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs font-mono">
              {/* Title */}
              <div>
                <label className="block text-slate-300 mb-1">SESSION / EVENT TITLE *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Deep Learning Workshop or Robotics Lab Session"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-slate-300 mb-1">SELECT ROOM *</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  {rooms.filter(r => r.status !== 'MAINTENANCE').map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.building_code || 'CMP'}] Room {r.room_number} &bull; {r.room_type} (Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              {/* User Selector */}
              <div>
                <label className="block text-slate-300 mb-1">RESERVING USER / MEMBER *</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role} - {u.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">DATE *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">START TIME (UTC) *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">END TIME (UTC) *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors"
                >
                  CANCEL
                </button>
                <button
                  id="btn-submit-booking"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all glow-cyan disabled:opacity-50"
                >
                  {submitting ? 'COMMITTING TX...' : 'CONFIRM RESERVATION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
