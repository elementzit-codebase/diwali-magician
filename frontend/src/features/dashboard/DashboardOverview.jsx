import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Users,
  CheckCircle,
  Clock,
  QrCode,
  Award,
  Vote,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export default function DashboardOverview({ onNavigate }) {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    eventsCount: 0,
    activeEvent: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [membersRes, eventsRes] = await Promise.all([
        api.get('/api/members?limit=200'),
        api.get('/api/events'),
      ]);

      const members = membersRes.members || [];
      const activeMembers = members.filter((m) => m.is_active);
      const events = eventsRes.events || [];
      const activeEvt = events.find((e) => e.status === 'active') || events[0] || null;

      setStats({
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        eventsCount: events.length,
        activeEvent: activeEvt,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const activeEvent = stats.activeEvent;
  const participationRate =
    activeEvent && activeEvent.total_members > 0
      ? Math.round((activeEvent.submitted_ballots / activeEvent.total_members) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">Executive Dashboard</h2>
        <p className="text-xs text-brand-secondary mt-0.5">
          High-level overview of event participation and voting operations.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-brand-secondary">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Members</span>
            <Users className="w-4 h-4 text-brand-gold" />
          </div>
          <div className="font-serif-title text-2xl font-bold text-brand-charcoal">
            {stats.totalMembers}
          </div>
          <p className="text-[11px] text-brand-secondary">
            {stats.activeMembers} active registered voters
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-brand-secondary">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Event</span>
            <Calendar className="w-4 h-4 text-brand-red" />
          </div>
          <div className="font-serif-title text-lg font-bold text-brand-charcoal truncate">
            {activeEvent ? activeEvent.title : 'No active events'}
          </div>
          <p className="text-[11px] text-brand-secondary">
            Status: <span className="font-semibold uppercase">{activeEvent?.status || 'idle'}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-brand-secondary">
            <span className="text-xs font-semibold uppercase tracking-wider">Ballots Cast</span>
            <Vote className="w-4 h-4 text-brand-gold" />
          </div>
          <div className="font-serif-title text-2xl font-bold text-brand-charcoal">
            {activeEvent ? activeEvent.submitted_ballots : 0}
          </div>
          <p className="text-[11px] text-brand-secondary">
            Out of {activeEvent ? activeEvent.total_members : 0} eligible voters
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-brand-secondary">
            <span className="text-xs font-semibold uppercase tracking-wider">Turnout Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif-title text-2xl font-bold text-brand-charcoal">
            {participationRate}%
          </div>
          <div className="w-full bg-brand-border h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-brand-red h-full rounded-full transition-all duration-500"
              style={{ width: `${participationRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Event Operations Box */}
      {activeEvent && (
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/60 pb-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-gold">
                Active Event
              </span>
              <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">
                {activeEvent.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('qr', activeEvent.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-brand-border hover:bg-brand-canvas text-xs font-medium text-brand-charcoal transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-brand-red" /> View QR Code
              </button>
              <button
                onClick={() => onNavigate('events')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium transition-colors shadow-sm"
              >
                Manage Schedule
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-brand-canvas/60 space-y-1">
              <span className="text-brand-secondary font-medium">Voting Period:</span>
              <div className="font-medium text-brand-charcoal">
                {new Date(activeEvent.start_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} —{' '}
                {new Date(activeEvent.end_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-brand-canvas/60 space-y-1">
              <span className="text-brand-secondary font-medium">Ballot Secrecy Guarantee:</span>
              <div className="text-brand-charcoal leading-relaxed">
                Ballot choices remain confidential. Individual voter selections and live candidate tallies are strictly sealed while voting is in progress.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

