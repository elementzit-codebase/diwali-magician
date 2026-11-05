import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Search,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export default function NameSelection({ eventId, token, onSelectName, onBack }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [confirmingMember, setConfirmingMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEligibleMembers();
  }, [search]);

  async function loadEligibleMembers() {
    setLoading(true);
    try {
      const data = await api.get(
        `/api/public/events/${eventId}/eligible-members?token=${encodeURIComponent(
          token
        )}&search=${encodeURIComponent(search)}`
      );
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || 'Failed to load guest list');
    } finally {
      setLoading(false);
    }
  }

  function handleInitiateSelection(member) {
    if (member.has_voted) return;
    setConfirmingMember(member);
  }

  return (
    <div className="min-h-dvh flex flex-col justify-between p-4 sm:p-5 max-w-md mx-auto">
      <div>
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pt-2 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-brand-secondary hover:text-brand-charcoal transition-colors py-1 px-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-gold">
            Step 1 of 3
          </span>
        </div>

        {/* Heading */}
        <header className="space-y-1 mb-4">
          <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-brand-charcoal">
            Select Your Name
          </h2>
          <p className="text-xs text-brand-secondary leading-relaxed">
            Please locate and confirm your registered name to proceed to the voting ballot.
          </p>
        </header>

        {/* Sticky Mobile Search Input */}
        <div className="relative mb-3 sticky top-2 z-10">
          <Search className="w-4 h-4 text-brand-secondary absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type your name or member code..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-brand-border bg-white text-xs shadow-sm focus:outline-none focus:border-brand-red transition-all"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3.5 text-brand-secondary hover:text-brand-charcoal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 mb-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Guest List */}
        <div className="space-y-2 pb-4">
          {loading ? (
            <div className="text-center py-10 text-brand-secondary text-xs">
              Loading guest directory...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-brand-border text-brand-secondary text-xs">
              No matching guests found.
            </div>
          ) : (
            members.map((m) => {
              const hasVoted = m.has_voted;
              return (
                <button
                  key={m.id}
                  disabled={hasVoted}
                  onClick={() => handleInitiateSelection(m)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    hasVoted
                      ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-brand-border hover:border-brand-gold active:scale-[0.99] shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                        hasVoted
                          ? 'bg-gray-200 text-gray-500'
                          : 'bg-brand-canvas text-brand-charcoal'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-brand-charcoal">
                        {m.full_name}
                      </div>
                      <div className="text-[10px] text-brand-secondary font-mono">
                        {m.member_code}
                      </div>
                    </div>
                  </div>

                  {hasVoted ? (
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      Already Voted
                    </span>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-brand-secondary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Bottom-Sheet / Dialog (Step 3) */}
      {confirmingMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-charcoal/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl border border-brand-border p-5 sm:p-6 shadow-2xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-brand-canvas text-brand-gold mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">
                Identity Confirmation
              </h3>
              <p className="text-xs text-brand-secondary">
                Are you ready to continue as:
              </p>
              <div className="py-2 px-4 rounded-xl bg-brand-canvas font-serif-title text-base font-bold text-brand-charcoal">
                {confirmingMember.full_name}
              </div>
              <p className="text-[11px] text-brand-secondary pt-1">
                Once confirmed, a secure temporary voting session will be established for this ballot.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const m = confirmingMember;
                  setConfirmingMember(null);
                  onSelectName(m);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all"
              >
                Yes, Continue to Ballot
              </button>
              <button
                onClick={() => setConfirmingMember(null)}
                className="w-full py-3 px-4 rounded-xl border border-brand-border hover:bg-brand-canvas text-xs font-medium text-brand-charcoal transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] text-brand-secondary">
        Select your registered name to proceed
      </footer>
    </div>
  );
}

