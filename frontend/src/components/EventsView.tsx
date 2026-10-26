import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  X,
  Tag,
  DoorClosed
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

  useEffect(() => {
    fetchEvents();
  }, []);

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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Campus Programs & Academic Timeline</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide mt-1">
            Upcoming Campus Events
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Keynotes, autonomous hackathons, and cultural symposiums synchronized across facility complexes.
          </p>
        </div>

        <button
          id="btn-open-event-modal"
          onClick={onOpenModal}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all glow-amber"
        >
          <Plus className="w-4 h-4" />
          <span>SCHEDULE EVENT</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap p-3 rounded-2xl glass-panel text-xs font-mono">
        <span className="text-slate-400 text-[10px] mr-1 uppercase">CATEGORY:</span>
        {['ALL', 'TECH', 'ACADEMIC', 'WORKSHOP', 'CULTURAL'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              categoryFilter === cat
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-16 text-amber-400 font-mono text-sm animate-pulse">
            Loading upcoming campus events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full text-center py-16 glass-panel rounded-2xl space-y-2">
            <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-base font-semibold text-slate-200">No events found</h4>
            <p className="text-xs text-slate-400">Schedule the next symposium or hackathon.</p>
          </div>
        ) : (
          filteredEvents.map(ev => {
            const catColors = {
              TECH: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              ACADEMIC: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
              WORKSHOP: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              CULTURAL: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
              ATHLETIC: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
            }[ev.category] || 'bg-slate-800 text-slate-300 border-slate-700';

            return (
              <div
                key={ev.id}
                className="p-5 rounded-2xl glass-panel border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${catColors}`}>
                      {ev.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(ev.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mt-3 leading-snug group-hover:text-amber-300 transition-colors">
                    {ev.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-400 font-sans line-clamp-3">
                    {ev.description || 'Campus-wide assembly and seminar.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{ev.building_name} ({ev.building_code})</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-300 flex items-center space-x-1">
                      <DoorClosed className="w-3.5 h-3.5" />
                      <span>{ev.room_number ? `Room ${ev.room_number}` : 'Central Complex Hall'}</span>
                    </span>

                    <span className="text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl glass-panel-glow p-6 border border-amber-500/40 relative space-y-4">
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center glow-amber">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Schedule Campus Event
                </h3>
                <p className="text-xs text-slate-400">
                  Broadcast university symposia and workshops across the smart campus digital twin.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">EVENT TITLE *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Autonomous Systems Hackathon 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">HOST BUILDING *</label>
                  <select
                    value={buildingId}
                    onChange={(e) => setBuildingId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">EVENT CATEGORY *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="TECH">TECH</option>
                    <option value="ACADEMIC">ACADEMIC</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="CULTURAL">CULTURAL</option>
                    <option value="ATHLETIC">ATHLETIC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">HOST ROOM (OPTIONAL)</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Main Complex Area / Pavilion Plaza</option>
                  {availableRoomsForBuilding.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} &bull; {r.room_type} (Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">DATE *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">START (UTC) *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">END (UTC) *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">EVENT OVERVIEW</label>
                <textarea
                  rows={2}
                  placeholder="Keynote topics, registration requirements, schedule notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-sans"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors"
                >
                  CANCEL
                </button>
                <button
                  id="btn-submit-event"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all glow-amber disabled:opacity-50"
                >
                  {submitting ? 'SCHEDULING...' : 'PUBLISH EVENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
