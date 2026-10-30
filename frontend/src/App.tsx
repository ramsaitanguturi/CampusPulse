import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CampusMap } from './components/CampusMap';
import { RoomsView } from './components/RoomsView';
import { BookingsView } from './components/BookingsView';
import { MaintenanceView } from './components/MaintenanceView';
import { EventsView } from './components/EventsView';
import { DbmsStudioView } from './components/DbmsStudioView';
import { api } from './services/api';
import { DashboardData, Building, Room, User } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preselectedRoom, setPreselectedRoom] = useState<Room | null>(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, bldgs, rms, usrs] = await Promise.all([
        api.getDashboard(),
        api.getBuildings(),
        api.getRooms(),
        api.getUsers(),
      ]);
      setDashboardData(dash);
      setBuildings(bldgs);
      setRooms(rms);
      setUsers(usrs);
    } catch (err: any) {
      console.error('Initial data load error:', err);
      setError(err.message || 'Failed to connect to CampusPulse backend API. Ensure FastAPI server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenBookingForRoom = (room: Room) => {
    setPreselectedRoom(room);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar onRefresh={loadAllData} loading={loading} />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          stats={
            dashboardData
              ? {
                  totalRooms: dashboardData.stats.total_rooms,
                  availableRooms: dashboardData.stats.available_rooms,
                  openTickets: dashboardData.stats.open_tickets,
                }
              : undefined
          }
        />

        {/* Dynamic Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6 cyber-grid">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadAllData}
                className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/30 flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RETRY</span>
              </button>
            </div>
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              data={dashboardData}
              onNavigateTab={setCurrentTab}
              onOpenBookingModal={() => {
                setPreselectedRoom(null);
                setIsBookingModalOpen(true);
              }}
              onOpenMaintenanceModal={() => setIsMaintenanceModalOpen(true)}
              onOpenEventModal={() => setIsEventModalOpen(true)}
            />
          )}

          {currentTab === 'map' && (
            <CampusMap
              buildings={buildings}
              onOpenBookingModal={handleOpenBookingForRoom}
            />
          )}

          {currentTab === 'rooms' && (
            <RoomsView
              buildings={buildings}
              onOpenBookingModal={handleOpenBookingForRoom}
            />
          )}

          {currentTab === 'bookings' && (
            <BookingsView
              rooms={rooms}
              users={users}
              isModalOpen={isBookingModalOpen}
              preselectedRoom={preselectedRoom}
              onCloseModal={() => {
                setIsBookingModalOpen(false);
                setPreselectedRoom(null);
              }}
              onOpenModal={() => {
                setPreselectedRoom(null);
                setIsBookingModalOpen(true);
              }}
              onRefreshData={loadAllData}
            />
          )}

          {currentTab === 'maintenance' && (
            <MaintenanceView
              rooms={rooms}
              users={users}
              isModalOpen={isMaintenanceModalOpen}
              onCloseModal={() => setIsMaintenanceModalOpen(false)}
              onOpenModal={() => setIsMaintenanceModalOpen(true)}
              onRefreshData={loadAllData}
            />
          )}

          {currentTab === 'events' && (
            <EventsView
              buildings={buildings}
              rooms={rooms}
              isModalOpen={isEventModalOpen}
              onCloseModal={() => setIsEventModalOpen(false)}
              onOpenModal={() => setIsEventModalOpen(true)}
              onRefreshData={loadAllData}
            />
          )}

          {currentTab === 'dbms' && (
            <DbmsStudioView />
          )}
        </main>
      </div>

      {/* Persistent Quick Modals in other tabs if opened via dashboard */}
      {currentTab !== 'bookings' && isBookingModalOpen && (
        <BookingsView
          rooms={rooms}
          users={users}
          isModalOpen={isBookingModalOpen}
          preselectedRoom={preselectedRoom}
          onCloseModal={() => {
            setIsBookingModalOpen(false);
            setPreselectedRoom(null);
          }}
          onOpenModal={() => setIsBookingModalOpen(true)}
          onRefreshData={loadAllData}
        />
      )}

      {currentTab !== 'maintenance' && isMaintenanceModalOpen && (
        <MaintenanceView
          rooms={rooms}
          users={users}
          isModalOpen={isMaintenanceModalOpen}
          onCloseModal={() => setIsMaintenanceModalOpen(false)}
          onOpenModal={() => setIsMaintenanceModalOpen(true)}
          onRefreshData={loadAllData}
        />
      )}

      {currentTab !== 'events' && isEventModalOpen && (
        <EventsView
          buildings={buildings}
          rooms={rooms}
          isModalOpen={isEventModalOpen}
          onCloseModal={() => setIsEventModalOpen(false)}
          onOpenModal={() => setIsEventModalOpen(true)}
          onRefreshData={loadAllData}
        />
      )}
    </div>
  );
}

export default App;
