import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  CheckCircle2, 
  X
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

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1B24] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Facilities Maintenance & Repairs
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Log room issues, track technician work orders, and manage equipment status.
          </p>
        </div>

        <button
          id="btn-open-ticket-modal"
          onClick={onOpenModal}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Ticket</span>
        </button>
      </div>

      {/* Filter Matrix */}
      <div className="surface-card p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'bg-[#12111A] text-zinc-300 hover:text-white border border-[#22212E]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Priority Filter + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-zinc-400 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-black border border-[#272635] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-black border border-[#272635] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-16 text-zinc-400 text-sm">
            Loading maintenance work orders...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="col-span-full text-center py-16 surface-card rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-base font-semibold text-zinc-200">No active maintenance tickets</h4>
            <p className="text-xs text-zinc-400">All facility equipment operating within normal conditions.</p>
          </div>
        ) : (
          filteredTickets.map((t) => {
            const priorityBadge = {
              LOW: 'bg-zinc-800 text-zinc-300 border-zinc-700/60',
              MEDIUM: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
              HIGH: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
              CRITICAL: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
            }[t.priority];

            const statusBadge = {
              OPEN: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
              IN_PROGRESS: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
              RESOLVED: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
            }[t.status];

            return (
              <div
                key={t.id}
                className="surface-card p-5 rounded-xl hover:border-violet-500/40 transition-colors flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded border uppercase font-medium ${priorityBadge}`}>
                      {t.priority}
                    </span>
                    <span className="text-xs text-zinc-400 tabular-nums">
                      #{t.id} &bull; {new Date(t.reported_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white mt-3 leading-snug">
                    {t.title}
                  </h3>

                  <div className="mt-1 text-xs text-zinc-400">
                    {t.building_name} &bull; Room {t.room_number}
                  </div>

                  <p className="mt-2.5 text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1C1B24] flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusBadge}`}>
                    {t.status.replace('_', ' ')}
                  </span>

                  {/* Status Dropdown */}
                  <div className="relative group">
                    <select
                      value={t.status}
                      onChange={(e) => handleUpdateStatus(t.id, e.target.value as any)}
                      className="text-xs bg-[#12111A] text-zinc-300 border border-[#272635] rounded-md px-2 py-1 focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="OPEN">Mark Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl surface-elevated p-6 border border-[#2D273F] relative space-y-4">
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Log Facility Issue
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Report equipment defects, AC failures, or hardware repairs.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              {/* Room Select */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Room Location *</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(Number(e.target.value))}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.building_code || 'CMP'}] Room {r.room_number} &bull; Floor {r.floor}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Select */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Reported By *</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(Number(e.target.value))}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role} - {u.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Priority Level *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="LOW">Low &bull; Minor cosmetic or non-blocking</option>
                  <option value="MEDIUM">Medium &bull; Standard equipment failure</option>
                  <option value="HIGH">High &bull; Class/event blocking issue</option>
                  <option value="CRITICAL">Critical &bull; Safety hazard / Locks room</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Issue Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector HDMI port broken or AC leaking"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the failure symptoms, specific equipment model, or safety concerns..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 transition-colors"
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
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
