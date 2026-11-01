import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  Plus, 
  Search, 
  X,
  AlertTriangle
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

  useEffect(() => {
    if (preselectedRoom) {
      setSelectedRoomId(preselectedRoom.id);
    }
  }, [preselectedRoom]);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

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
    } catch (_err) {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1B24] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Room Reservations & Schedule
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Conflict-free room reservation engine with transactional overlap verification.
          </p>
        </div>

        <button
          id="btn-open-booking-modal"
          onClick={onOpenModal}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-card p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-[#12111A] text-zinc-300 hover:text-white border border-[#22212E]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by session, room, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-black border border-[#272635] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1C1B24] bg-[#0A0A0E] text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Reservation Title</th>
                <th className="py-3.5 px-4">Location & Room</th>
                <th className="py-3.5 px-4">Booked By</th>
                <th className="py-3.5 px-4">Time Interval</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1B24]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400">
                    Loading reservations...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400">
                    No reservations matching current filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#12111A] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {b.title}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-zinc-200 font-medium">
                        Room {b.room_number}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {b.building_name} ({b.building_code})
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-zinc-200 font-medium">{b.user_name}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{b.user_email}</div>
                    </td>

                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="text-zinc-200 font-medium">
                        {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr;{' '}
                        {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded border inline-flex items-center font-medium ${
                        b.status === 'CONFIRMED' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                        b.status === 'COMPLETED' ? 'bg-[#161522] text-zinc-300 border-[#252433]' :
                        'bg-[#161522] text-zinc-400 border-[#252433]'
                      }`}>
                        <span>{b.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-800/40 rounded-md transition-colors cursor-pointer"
                          title="Cancel booking"
                        >
                          Cancel
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

      {/* Create Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl surface-elevated p-6 border border-[#2D273F] relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-violet-400">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Schedule Room Reservation
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Transactional verification ensures collision-free reservations.
                </p>
              </div>
            </div>

            {/* Error / Conflict Alert Box */}
            {formError && (
              <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs space-y-2">
                <div className="flex items-start space-x-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>

                {conflictDetails && (
                  <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800/30 text-xs text-rose-200 space-y-1">
                    <div><strong>Conflicting Session:</strong> {conflictDetails.title}</div>
                    <div><strong>Reserved By:</strong> {conflictDetails.user_name}</div>
                    <div>
                      <strong>Window:</strong> {new Date(conflictDetails.start_time).toLocaleTimeString()} - {new Date(conflictDetails.end_time).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Lab or Capstone Team Sync"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Select Room *</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  {rooms.filter(r => r.status !== 'MAINTENANCE').map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.building_code || 'CMP'}] Room {r.room_number} &bull; {r.room_type} ({r.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              {/* User Selector */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Reserving User *</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
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
                  <label className="block text-zinc-300 mb-1 font-medium">Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">End Time *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#1C1B24]">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-booking"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Confirming...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
