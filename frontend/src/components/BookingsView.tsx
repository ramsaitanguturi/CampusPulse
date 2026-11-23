import React, { useState, useEffect } from 'react';
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
    } catch {
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

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) return;
    const headers = ["ID", "Title", "Room", "Building", "User", "Start", "End", "Status"];
    const rows = filteredBookings.map(b => [
      b.id,
      `"${b.title}"`,
      b.room_number,
      `"${b.building_name}"`,
      `"${b.user_name}"`,
      b.start_time,
      b.end_time,
      b.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CampusPulse_Reservations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h1 className="text-base font-bold text-white uppercase tracking-wider">
            Room Reservations &amp; Schedule
          </h1>
          <p className="text-xs text-neutral-500">
            Collision-free space allocations backed by transactional Oracle 21c integrity checks
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            className="px-2.5 py-1 bg-black hover:bg-neutral-900 border border-neutral-700 text-neutral-300 cursor-pointer disabled:opacity-40"
          >
            [EXPORT CSV]
          </button>
          <button
            id="btn-open-booking-modal"
            onClick={onOpenModal}
            className="px-3 py-1 bg-white text-black hover:bg-neutral-200 font-bold transition cursor-pointer"
          >
            [NEW RESERVATION]
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black border border-neutral-800 p-3">
        {/* Status Filter Pills */}
        <div className="flex items-center space-x-1 text-xs">
          {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-1 text-[11px] font-mono transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              [{st}]
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="SEARCH BY SESSION, ROOM, USER..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 bg-black border border-neutral-700 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-black border border-neutral-800 font-mono">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Allocations Dossier ({filteredBookings.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-500 text-[11px] border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3">RESERVATION TITLE</th>
                <th className="py-2.5 px-3">LOCATION &amp; ROOM</th>
                <th className="py-2.5 px-3">BOOKED BY</th>
                <th className="py-2.5 px-3">INTERVAL WINDOW</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-500">
                    FETCHING ACTIVE RESERVATIONS...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-500">
                    NO RESERVATIONS MATCHING ACTIVE FILTER.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-950 transition-colors">
                    <td className="py-2.5 px-3 text-white font-bold">
                      {b.title}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="text-white">
                        Room #{b.room_number}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {b.building_name} ({b.building_code})
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="text-neutral-300">{b.user_name}</div>
                      <div className="text-[10px] text-neutral-500">{b.user_email}</div>
                    </td>

                    <td className="py-2.5 px-3 tabular-nums text-[11px]">
                      <div className="text-white">
                        {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-neutral-500 text-[10px]">
                        {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr;{' '}
                        {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`border px-1.5 py-0.5 text-[10px] ${
                        b.status === 'CONFIRMED' ? 'border-neutral-500 text-white bg-neutral-900' :
                        b.status === 'COMPLETED' ? 'border-neutral-800 text-neutral-400' :
                        'border-neutral-900 text-neutral-600'
                      }`}>
                        [{b.status}]
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="text-neutral-400 hover:text-white cursor-pointer text-[11px]"
                          title="Cancel booking"
                        >
                          [CANCEL]
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 font-mono"
          onClick={onCloseModal}
        >
          <div 
            className="w-full max-w-xl bg-black border border-neutral-700 p-5 relative space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  SCHEDULE SPACE RESERVATION
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Transactional verification ensures collision-free reservations
                </p>
              </div>
              <button
                onClick={onCloseModal}
                className="text-neutral-500 hover:text-white text-xs cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            {/* Error / Conflict Alert Box */}
            {formError && (
              <div className="p-3 bg-neutral-900 border border-neutral-600 text-xs text-white space-y-1.5">
                <div className="font-bold">
                  [RESERVATION CONFLICT]: {formError}
                </div>

                {conflictDetails && (
                  <div className="p-2 bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 space-y-0.5 mt-2">
                    <div>CONFLICTING SESSION: {conflictDetails.title}</div>
                    <div>RESERVED BY: {conflictDetails.user_name}</div>
                    <div>
                      TIME WINDOW: {new Date(conflictDetails.start_time).toLocaleTimeString()} - {new Date(conflictDetails.end_time).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-3 text-xs font-mono">
              {/* Title */}
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Lab or Capstone Team Sync"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Select Room *
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none cursor-pointer"
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
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Reserving User *
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none cursor-pointer"
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
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-3 py-1.5 bg-black border border-neutral-700 text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  [DISMISS]
                </button>
                <button
                  id="btn-submit-booking"
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold transition cursor-pointer disabled:opacity-40"
                >
                  {submitting ? '[CONFIRMING...]' : '[CONFIRM RESERVATION]'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
