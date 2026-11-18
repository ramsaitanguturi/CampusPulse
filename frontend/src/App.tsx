import React, { useState, useEffect } from 'react';
import Header, { TabType } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CampusMap } from './components/CampusMap';
import { RoomsView } from './components/RoomsView';
import { BookingsView } from './components/BookingsView';
import { MaintenanceView } from './components/MaintenanceView';
import { EventsView } from './components/EventsView';
import { DbmsStudioView } from './components/DbmsStudioView';
import { api } from './services/api';
import { DashboardData, Building, Room, User } from './types';

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
        api.getDashboard().catch((e) => { console.warn(e); return null; }),
        api.getBuildings().catch(() => []),
        api.getRooms().catch(() => []),
        api.getUsers().catch(() => []),
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
    <div className="min-h-screen bg-black text-white flex flex-col font-mono selection:bg-white selection:text-black">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeTicketsCount={dashboardData?.stats.open_tickets ?? 0}
        availableRoomsCount={dashboardData?.stats.available_rooms}
        loading={loading}
        onRefresh={loadAllData}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 font-mono space-y-6">
        {error && (
          <div className="p-3 bg-neutral-900 border border-neutral-700 text-xs text-white flex items-center justify-between">
            <div>
              <span className="text-neutral-400 font-bold mr-2">[SYSTEM ERROR]:</span>
              <span>{error}</span>
            </div>
            <button
              onClick={loadAllData}
              className="px-2.5 py-1 bg-black hover:bg-neutral-800 border border-neutral-600 text-xs text-white cursor-pointer ml-4 shrink-0"
            >
              [RETRY]
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

      {/* Global Quick Action Modals */}
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

      {/* Industrial Monochrome Footer */}
      <footer className="border-t border-neutral-900 bg-black py-4 px-6 text-center text-xs text-neutral-600 font-mono">
        <p>CampusPulse — Intelligent Campus Operations &amp; Facility Management System</p>
      </footer>
    </div>
  );
}

export default App;
