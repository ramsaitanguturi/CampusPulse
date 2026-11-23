import React, { useState, useEffect } from 'react';
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
    } catch {
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

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) return;
    const headers = ["ID", "Title", "Room", "Building", "Priority", "Status", "ReportedAt", "Description"];
    const rows = filteredTickets.map(t => [
      t.id,
      `"${t.title}"`,
      t.room_number,
      `"${t.building_name}"`,
      t.priority,
      t.status,
      t.reported_at,
      `"${t.description.replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CampusPulse_Maintenance_${Date.now()}.csv`);
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
            Facilities Maintenance &amp; Work Orders
          </h1>
          <p className="text-xs text-neutral-500">
            Defect triage, technician dispatch, and automated room offline safety mechanisms
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={handleExportCSV}
            disabled={filteredTickets.length === 0}
            className="px-2.5 py-1 bg-black hover:bg-neutral-900 border border-neutral-700 text-neutral-300 cursor-pointer disabled:opacity-40"
          >
            [EXPORT CSV]
          </button>
          <button
            id="btn-open-ticket-modal"
            onClick={onOpenModal}
            className="px-3 py-1 bg-white text-black hover:bg-neutral-200 font-bold transition cursor-pointer"
          >
            [LOG WORK ORDER]
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black border border-neutral-800 p-3">
        {/* Status Filter Pills */}
        <div className="flex items-center space-x-1 text-xs flex-wrap gap-y-1">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-1 text-[11px] font-mono transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              [{st.replace('_', ' ')}]
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Priority dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-black border border-neutral-700 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono cursor-pointer"
          >
            <option value="ALL">ALL PRIORITIES</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          {/* Search */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="SEARCH WORK ORDERS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 bg-black border border-neutral-700 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-black border border-neutral-800 font-mono">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Dispatch Queue ({filteredTickets.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-500 text-[11px] border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3">TICKET ID</th>
                <th className="py-2.5 px-3">PRIORITY</th>
                <th className="py-2.5 px-3">ISSUE &amp; SUMMARY</th>
                <th className="py-2.5 px-3">LOCATION</th>
                <th className="py-2.5 px-3">REPORTED</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">DISPATCH ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-neutral-500">
                    FETCHING WORK ORDERS...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-neutral-500">
                    NO WORK ORDERS RECORDED IN CURRENT SCOPE.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-950 transition-colors">
                    <td className="py-2.5 px-3 text-neutral-400 font-bold">
                      #{t.id}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`border px-1.5 py-0.5 text-[10px] ${
                        t.priority === 'CRITICAL' ? 'border-white bg-white text-black font-bold' :
                        t.priority === 'HIGH' ? 'border-neutral-500 bg-neutral-900 text-white' :
                        'border-neutral-700 text-neutral-400'
                      }`}>
                        [{t.priority}]
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="text-white font-bold">{t.title}</div>
                      <div className="text-[10px] text-neutral-500 truncate max-w-xs">{t.description}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="text-neutral-300">Room #{t.room_number}</div>
                      <div className="text-[10px] text-neutral-500">{t.building_name}</div>
                    </td>

                    <td className="py-2.5 px-3 tabular-nums text-[11px] text-neutral-400">
                      {new Date(t.reported_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 bg-neutral-950">
                        [{t.status.replace('_', ' ')}]
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <select
                        value={t.status}
                        onChange={(e) => handleUpdateStatus(t.id, e.target.value as any)}
                        className="bg-black border border-neutral-700 text-white text-[11px] px-2 py-1 font-mono focus:outline-none cursor-pointer"
                      >
                        <option value="OPEN">[SET OPEN]</option>
                        <option value="IN_PROGRESS">[IN PROGRESS]</option>
                        <option value="RESOLVED">[RESOLVED]</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Ticket Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 font-mono"
          onClick={onCloseModal}
        >
          <div 
            className="w-full max-w-lg bg-black border border-neutral-700 p-5 relative space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  LOG FACILITY ISSUE / WORK ORDER
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Report equipment defects, AC failures, or hardware repairs
                </p>
              </div>
              <button
                onClick={onCloseModal}
                className="text-neutral-500 hover:text-white text-xs cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs font-mono">
              {/* Room Select */}
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Room Location *
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none cursor-pointer"
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
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Reporting Staff *
                </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none cursor-pointer"
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
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Priority Severity *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none cursor-pointer"
                >
                  <option value="LOW">LOW - Minor cosmetic or non-blocking</option>
                  <option value="MEDIUM">MEDIUM - Standard equipment fault</option>
                  <option value="HIGH">HIGH - Class/session blocking defect</option>
                  <option value="CRITICAL">CRITICAL - Safety hazard / locks room</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Issue Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector HDMI port broken or AC leaking"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe failure symptoms, specific equipment model, or safety concerns..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-3 py-1.5 bg-black border border-neutral-700 text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  [DISMISS]
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold transition cursor-pointer disabled:opacity-40"
                >
                  {submitting ? '[SUBMITTING...]' : '[SUBMIT WORK ORDER]'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
