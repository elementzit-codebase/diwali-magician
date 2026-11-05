import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import {
  Calendar,
  Clock,
  Plus,
  Users,
  Award,
  AlertCircle,
  StopCircle,
  CheckCircle,
} from 'lucide-react';

export default function EventManagement({ onSelectEventForQR }) {
  const [events, setEvents] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Active targets
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
    loadAllMembers();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const data = await api.get('/api/events');
      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllMembers() {
    try {
      const data = await api.get('/api/members?limit=200');
      setAllMembers(data.members || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/events', {
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        categories: ['Best Dressing', 'Best Speech'],
      });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setStartAt('');
      setEndAt('');
      loadEvents();
    } catch (err) {
      setError(err.message || 'Failed to create event');
    }
  }

  async function handleCloseEarly(eventId) {
    if (!window.confirm('Are you sure you want to close voting early for this event?')) return;
    try {
      await api.post(`/api/events/${eventId}/close`);
      loadEvents();
    } catch (err) {
      alert(err.message || 'Failed to close voting');
    }
  }

  async function openEnrollModal(event) {
    setSelectedEvent(event);
    try {
      const res = await api.get(`/api/events/${event.id}/members`);
      const enrolled = new Set(res.members.map((m) => m.id));
      setSelectedMemberIds(enrolled);
      setIsEnrollOpen(true);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveEnrollment() {
    try {
      await api.post(`/api/events/${selectedEvent.id}/members`, {
        memberIds: Array.from(selectedMemberIds),
        isEligible: true,
      });
      setIsEnrollOpen(false);
      loadEvents();
    } catch (err) {
      alert(err.message || 'Failed to update member eligibility');
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    try {
      await api.post(`/api/events/${selectedEvent.id}/categories`, { name: categoryName });
      setIsCategoryOpen(false);
      setCategoryName('');
      loadEvents();
    } catch (err) {
      alert(err.message || 'Failed to add category');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">Events & Voting Schedules</h2>
          <p className="text-xs text-brand-secondary mt-0.5">
            Configure event dates, categories, member candidacy, and early closing controls.
          </p>
        </div>
        <button
          onClick={() => {
            setError('');
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-2 text-center py-10 text-brand-secondary text-xs">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-brand-border text-brand-secondary text-xs">
            No events scheduled. Click "Create Event" to schedule your gala awards.
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-2xl border border-brand-border shadow-sm p-6 space-y-4 hover:border-brand-gold/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">{evt.title}</h3>
                  <p className="text-xs text-brand-secondary mt-1 line-clamp-2">
                    {evt.description || 'No description provided.'}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    evt.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : evt.status === 'closed'
                      ? 'bg-gray-100 text-gray-600 border border-gray-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {evt.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-brand-border/60">
                <div className="space-y-1">
                  <div className="text-brand-secondary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-gold" /> Start Time:
                  </div>
                  <div className="font-medium text-brand-charcoal">
                    {new Date(evt.start_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-brand-secondary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-red" /> End Time:
                  </div>
                  <div className="font-medium text-brand-charcoal">
                    {new Date(evt.end_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-brand-border/60 text-brand-secondary">
                <div>
                  Eligible Members: <span className="font-semibold text-brand-charcoal">{evt.total_members}</span>
                </div>
                <div>
                  Ballots Submitted: <span className="font-semibold text-brand-charcoal">{evt.submitted_ballots}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => openEnrollModal(evt)}
                  className="px-3 py-1.5 rounded-lg border border-brand-border hover:bg-brand-canvas text-xs font-medium text-brand-charcoal transition-colors flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-brand-secondary" /> Enrolled Members
                </button>
                <button
                  onClick={() => {
                    setSelectedEvent(evt);
                    setIsCategoryOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-brand-border hover:bg-brand-canvas text-xs font-medium text-brand-charcoal transition-colors flex items-center gap-1"
                >
                  <Award className="w-3.5 h-3.5 text-brand-gold" /> Add Category
                </button>
                <button
                  onClick={() => onSelectEventForQR(evt.id)}
                  className="px-3 py-1.5 rounded-lg bg-brand-canvas hover:bg-brand-border/60 text-xs font-medium text-brand-charcoal transition-colors"
                >
                  Manage QR
                </button>
                {evt.status === 'active' && (
                  <button
                    onClick={() => handleCloseEarly(evt.id)}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-xs font-medium text-red-700 transition-colors flex items-center gap-1"
                  >
                    <StopCircle className="w-3.5 h-3.5" /> Close Early
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Event Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Voting Event">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1">
              Event Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Gala Awards Evening"
              className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1">
              Description
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief details about the celebration..."
              className="w-full p-3 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-red"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-red"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                required
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>
          <p className="text-[11px] text-brand-secondary">
            Default categories: <strong>Best Dressing</strong> and <strong>Best Speech</strong>. Additional categories can be added once created.
          </p>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium transition-all shadow-sm"
          >
            Create Event & Generate Access Token
          </button>
        </form>
      </Modal>

      {/* Member Enrollment Modal */}
      <Modal
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        title={`Enroll Members — ${selectedEvent?.title}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-brand-secondary">
            Select members who are eligible to vote and receive nominations for this event:
          </p>
          <div className="max-h-60 overflow-y-auto divide-y divide-brand-border border border-brand-border rounded-xl">
            {allMembers.map((m) => {
              const isChecked = selectedMemberIds.has(m.id);
              return (
                <label
                  key={m.id}
                  className="flex items-center justify-between p-3 hover:bg-brand-canvas cursor-pointer text-xs"
                >
                  <span className="font-medium text-brand-charcoal">{m.full_name}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const next = new Set(selectedMemberIds);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      setSelectedMemberIds(next);
                    }}
                    className="rounded border-brand-border text-brand-red focus:ring-brand-red"
                  />
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setSelectedMemberIds(new Set(allMembers.map((m) => m.id)))}
              className="text-xs text-brand-red hover:underline font-medium"
            >
              Select All Members
            </button>
            <button
              onClick={handleSaveEnrollment}
              className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium shadow-sm transition-all"
            >
              Save Eligibility ({selectedMemberIds.size} Enrolled)
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={isCategoryOpen} onClose={() => setIsCategoryOpen(false)} title="Add Voting Category">
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1">
              Category Name
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Best Contributor, Most Congenial"
              className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-red"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium transition-all shadow-sm"
          >
            Add Category & Link Candidates
          </button>
        </form>
      </Modal>
    </div>
  );
}

