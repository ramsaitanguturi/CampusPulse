import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  MapPin, 
  X,
  DoorClosed, 
  Clock 
} from 'lucide-react';
import { CampusEvent, Building, Room } from '../types';
import { api } from '../services/api';

interface EventsViewProps {
  buildings: Building[];
  rooms: Room[];
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onRefreshData: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  buildings,
  rooms,
  isModalOpen,
  onCloseModal,
  onOpenModal,
  onRefreshData
}) => {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [buildingId, setBuildingId] = useState<number>(buildings[0]?.id || 1);
  const [roomId, setRoomId] = useState<number | ''>('');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('15:00');
  const [category, setCategory] = useState<string>('TECH');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Event title is required.');
      return;
    }

    if (endTime <= startTime) {
      alert('Event end time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const startIso = `${eventDate}T${startTime}:00Z`;
      const endIso = `${eventDate}T${endTime}:00Z`;

      await api.createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        building_id: Number(buildingId),
        room_id: roomId ? Number(roomId) : undefined,
        start_time: startIso,
        end_time: endIso,
        category,
      });

      setTitle('');
      setDescription('');
      onCloseModal();
      fetchEvents();
      onRefreshData();
    } catch (err: any) {
      alert(`Failed to create event: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = events.filter(ev => {
    if (categoryFilter === 'ALL') return true;
    return ev.category === categoryFilter;
  });

  const availableRoomsForBuilding = rooms.filter(r => r.building_id === Number(buildingId));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1B24] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Campus Events & Assemblies
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Lectures, symposiums, and student activities scheduled across university spaces.
          </p>
        </div>

        <button
          id="btn-open-event-modal"
          onClick={onOpenModal}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Event</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="surface-card p-3 rounded-xl flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-zinc-400 font-medium mr-2">Category:</span>
        {['ALL', 'TECH', 'ACADEMIC', 'WORKSHOP', 'CULTURAL'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              categoryFilter === cat
                ? 'bg-violet-600 text-white font-semibold'
                : 'bg-[#12111A] text-zinc-300 hover:text-white border border-[#22212E]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-16 text-zinc-400 text-sm">
            Loading upcoming campus events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full text-center py-16 surface-card rounded-xl space-y-2">
            <Sparkles className="w-8 h-8 text-zinc-500 mx-auto" />
            <h4 className="text-base font-semibold text-zinc-200">No events found</h4>
            <p className="text-xs text-zinc-400">Schedule the next seminar or workshop.</p>
          </div>
        ) : (
          filteredEvents.map(ev => {
            const catColors: Record<CampusEvent['category'], string> = {
              TECH: 'bg-violet-950/50 text-violet-300 border-violet-800/50',
              ACADEMIC: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40',
              WORKSHOP: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
              CULTURAL: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
              ATHLETIC: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
            };

            return (
              <div
                key={ev.id}
                className="surface-card p-5 rounded-xl hover:border-violet-500/40 transition-colors flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded border uppercase font-medium ${catColors[ev.category] || 'bg-zinc-800 text-zinc-300 border-zinc-700/60'}`}>
                      {ev.category}
                    </span>
                    <span className="text-xs text-zinc-400 tabular-nums">
                      {new Date(ev.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white mt-3 leading-snug">
                    {ev.title}
                  </h3>

                  <p className="mt-2 text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                    {ev.description || 'Campus-wide assembly and seminar.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1C1B24] space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span>{ev.building_name} ({ev.building_code})</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 flex items-center space-x-1">
                      <DoorClosed className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{ev.room_number ? `Room ${ev.room_number}` : 'Central Complex Hall'}</span>
                    </span>

                    <span className="text-zinc-400 flex items-center space-x-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Schedule Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl surface-elevated p-6 border border-[#2D273F] relative space-y-4">
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-violet-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Schedule Campus Event
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Publish a lecture, workshop, or symposium to the university calendar.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Autonomous Systems Symposium"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="TECH">Technology / Engineering</option>
                  <option value="ACADEMIC">Academic Colloquium</option>
                  <option value="WORKSHOP">Practical Workshop</option>
                  <option value="CULTURAL">Cultural Event</option>
                </select>
              </div>

              {/* Building & Room Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Host Building *</label>
                  <select
                    value={buildingId}
                    onChange={(e) => {
                      setBuildingId(Number(e.target.value));
                      setRoomId('');
                    }}
                    className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Room (Optional)</label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="">Complex Main Auditorium / Hall</option>
                    {availableRoomsForBuilding.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} &bull; Floor {r.floor} ({r.room_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
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

              {/* Description */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Outline speakers, keynote topics, prerequisites, or target audience..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#1C1B24]">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Scheduling...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
