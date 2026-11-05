import React, { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth.jsx';
import DashboardOverview from '../dashboard/DashboardOverview.jsx';
import MemberManagement from './MemberManagement.jsx';
import EventManagement from './EventManagement.jsx';
import QRManagement from './QRManagement.jsx';
import {
  Award,
  Users,
  Calendar,
  QrCode,
  LogOut,
  LayoutDashboard,
  Shield,
  Menu,
  X,
} from 'lucide-react';

export default function AdminPortal() {
  const { admin, logout } = useAdminAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [targetEventId, setTargetEventId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleNavigate(tab, eventId = null) {
    if (eventId) setTargetEventId(eventId);
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'events', label: 'Events & Schedules', icon: Calendar },
    { id: 'qr', label: 'QR Management', icon: QrCode },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-canvas">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-brand-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center text-white">
            <Award className="w-4 h-4" />
          </div>
          <span className="font-serif-title font-bold text-sm text-brand-charcoal">
            Awards Admin
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-brand-secondary hover:text-brand-charcoal hover:bg-brand-canvas"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-white border-r border-brand-border flex-shrink-0 z-30 md:min-h-screen flex flex-col justify-between p-4`}
      >
        <div className="space-y-6">
          <div className="hidden md:flex items-center gap-3 px-2 py-3 border-b border-brand-border/60">
            <div className="w-9 h-9 rounded-xl bg-brand-red flex items-center justify-center text-white shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif-title font-bold text-sm text-brand-charcoal">Gala Awards</div>
              <div className="text-[10px] text-brand-gold font-semibold uppercase tracking-wider">
                Admin Console
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-red text-white shadow-sm'
                      : 'text-brand-secondary hover:text-brand-charcoal hover:bg-brand-canvas'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-brand-border/60 space-y-3">
          <div className="px-2">
            <div className="text-[11px] font-medium text-brand-charcoal truncate">
              {admin?.fullName}
            </div>
            <div className="text-[10px] text-brand-secondary truncate">{admin?.email}</div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
        {currentTab === 'dashboard' && <DashboardOverview onNavigate={handleNavigate} />}
        {currentTab === 'members' && <MemberManagement />}
        {currentTab === 'events' && (
          <EventManagement onSelectEventForQR={(id) => handleNavigate('qr', id)} />
        )}
        {currentTab === 'qr' && <QRManagement preselectedEventId={targetEventId} />}
      </main>
    </div>
  );
}

