import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter,
  X,
  ChevronDown
} from 'lucide-react';
import { MaintenanceTicket, Room, User } from '../types';
import { api } from '../services/api';

interface MaintenanceViewProps {
  rooms: Room[];
  users: User[];
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onRefreshData: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  rooms,
  users,
  isModalOpen,
  onCloseModal,
  onOpenModal,
  onRefreshData
}) => {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Ticket Form State
  const [roomId, setRoomId] = useState<number>(rooms[0]?.id || 1);
  const [userId, setUserId] = useState<number>(users[0]?.id || 1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getMaintenanceTickets({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      });
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch maintenance tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill out all required ticket fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createMaintenanceTicket({
        room_id: Number(roomId),
        user_id: Number(userId),
        title: title.trim(),
        description: description.trim(),
        priority,
      });

      setTitle('');
      setDescription('');
      onCloseModal();
      fetchTickets();
      onRefreshData();
    } catch (err: any) {
      alert(`Failed to log ticket: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    try {
      await api.updateTicketStatus(ticketId, newStatus);
      fetchTickets();
      onRefreshData();
    } catch (err) {
      alert('Failed to update ticket status.');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term) ||
      t.room_number?.toLowerCase().includes(term) ||
      t.building_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>Facility Telemetry & Maintenance Queue</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide mt-1">
            Campus Maintenance Operations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time facility ticket management. Setting CRITICAL priority automatically locks room into MAINTENANCE mode.
          </p>
        </div>

        <button
          id="btn-open-ticket-modal"
          onClick={onOpenModal}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-rose-500 hover:bg-rose-400 text-slate-950 transition-all glow-rose"
        >
          <Plus className="w-4 h-4" />
          <span>LOG NEW TICKET</span>
        </button>
      </div>

      {/* Filter Matrix */}
      <div className="p-4 rounded-2xl glass-panel flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                statusFilter === st
                  ? 'bg-rose-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Priority Filter + Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-400 text-[10px]">PRIORITY:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-16 text-rose-400 font-mono text-sm animate-pulse">
            Querying facility maintenance records...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="col-span-full text-center py-16 glass-panel rounded-2xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-base font-semibold text-slate-200">No active maintenance tickets</h4>
            <p className="text-xs text-slate-400">All facility systems operating within nominal parameters.</p>
          </div>
        ) : (
          filteredTickets.map((t) => {
            const priorityBadge = {
              LOW: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
              MEDIUM: 'bg-slate-800 text-slate-300 border-slate-700',
              HIGH: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/40 glow-rose',
            }[t.priority];

            const statusBadge = {
              OPEN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
              IN_PROGRESS: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              RESOLVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            }[t.status];

            return (
              <div
                key={t.id}
                className="p-5 rounded-2xl glass-panel border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${priorityBadge}`}>
                      {t.priority} PRIORITY
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{t.id} &bull; {new Date(t.reported_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3 leading-snug">
                    {t.title}
                  </h3>

                  <div className="mt-1 text-xs text-slate-400 font-mono">
                    {t.building_name} &bull; Room {t.room_number}
                  </div>

                  <p className="mt-2.5 text-xs text-slate-300 font-sans line-clamp-3">
                    {t.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusBadge}`}>
                    {t.status}
                  </span>

                  {/* Status Transition Control Dropdown */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono text-slate-400">SET:</span>
                    <select
                      value={t.status}
                      onChange={(e) => handleUpdateStatus(t.id, e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Log Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl glass-panel-glow p-6 border border-rose-500/40 relative space-y-4">
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/40 flex items-center justify-center glow-rose">
                <Wrench className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Log Facility Maintenance Ticket
                </h3>
                <p className="text-xs text-slate-400">
                  Direct database transaction. Critical priority will transition room to offline mode.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">ISSUE SUMMARY *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HVAC Thermostat Failure or Projector HDMI Fault"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">AFFECTED ROOM *</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.building_code || 'COMPLEX'}] Room {r.room_number} &bull; {r.room_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">PRIORITY LEVEL *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL (AUTO-LOCK ROOM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">REPORTING MEMBER *</label>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">DETAILED DESCRIPTION *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail symptoms, affected equipment, and potential safety or protocol hazards..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400 font-sans"
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
                  id="btn-submit-ticket"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-rose-500 hover:bg-rose-400 text-slate-950 transition-all glow-rose disabled:opacity-50"
                >
                  {submitting ? 'RECORDING TICKET...' : 'TRANSMIT TICKET'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
