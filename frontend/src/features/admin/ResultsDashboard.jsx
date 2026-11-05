import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Award,
  Crown,
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

export default function ResultsDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadResults(selectedEventId);
    }
  }, [selectedEventId]);

  async function loadEvents() {
    try {
      const data = await api.get('/api/events');
      setEvents(data.events || []);
      if (data.events?.length > 0) {
        setSelectedEventId(data.events[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadResults(eventId) {
    setLoading(true);
    setError('');
    setResultsData(null);
    try {
      const data = await api.get(`/api/results/admin/${eventId}`);
      setResultsData(data);
    } catch (err) {
      setError(err.message || 'Unable to retrieve event results');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">
            Official Results & Tally
          </h2>
          <p className="text-xs text-brand-secondary mt-0.5">
            Verified candidate totals, joint winner tie determinations, and turnout statistics.
          </p>
        </div>

        {events.length > 0 && (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-brand-border bg-white text-xs text-brand-charcoal focus:outline-none focus:border-brand-red font-medium"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-brand-secondary text-xs">
          Tabulating final results...
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-white border border-brand-border text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-brand-gold mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">
            Results Sealed
          </h3>
          <p className="text-xs text-brand-secondary max-w-md mx-auto leading-relaxed">
            {error}
          </p>
        </div>
      ) : resultsData ? (
        <div className="space-y-6 animate-fade-in">
          {/* Turnout Statistics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-secondary">
                Eligible Attendees
              </span>
              <div className="font-serif-title text-2xl font-bold text-brand-charcoal">
                {resultsData.statistics.totalEligible}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-secondary">
                Submitted Ballots
              </span>
              <div className="font-serif-title text-2xl font-bold text-brand-charcoal">
                {resultsData.statistics.ballotsCast}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-secondary">
                Participation Turnout
              </span>
              <div className="font-serif-title text-2xl font-bold text-brand-red">
                {resultsData.statistics.participationPercentage}%
              </div>
            </div>
          </div>

          {/* Categories Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {resultsData.results.map((cat) => (
              <div
                key={cat.categoryId}
                className="bg-white rounded-3xl border border-brand-border shadow-sm p-6 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-brand-gold/15 text-brand-gold flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">
                        {cat.categoryName}
                      </h3>
                      <span className="text-[10px] text-brand-secondary">
                        {cat.hasVotes ? `${cat.totalVotes} total votes cast` : 'No ballots cast'}
                      </span>
                    </div>
                  </div>
                  {cat.isJointWinner && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      Joint Winners
                    </span>
                  )}
                </div>

                {/* Winners Spotlight */}
                {cat.hasVotes ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-brand-gold" />{' '}
                      {cat.isJointWinner ? 'Joint Winners' : 'Category Winner'}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cat.winners.map((winner) => (
                        <div
                          key={winner.candidateId}
                          className="p-4 rounded-2xl bg-brand-canvas/70 border border-brand-border flex items-center gap-3 shadow-xs"
                        >
                          <div className="w-10 h-10 rounded-xl bg-brand-red text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {winner.candidateName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-brand-charcoal">
                              {winner.candidateName}
                            </div>
                            <div className="text-[11px] text-brand-secondary">
                              <span className="font-semibold text-brand-red font-mono">
                                {winner.votes}
                              </span>{' '}
                              votes ({winner.memberCode})
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-brand-canvas text-center text-xs text-brand-secondary font-medium">
                    No votes recorded.
                  </div>
                )}

                {/* Full Breakdown Table */}
                {cat.hasVotes && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary">
                      Full Category Breakdown
                    </span>
                    <div className="rounded-xl border border-brand-border overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-brand-canvas text-brand-secondary font-semibold text-[10px] uppercase">
                          <tr>
                            <th className="py-2 px-4">Rank</th>
                            <th className="py-2 px-4">Candidate</th>
                            <th className="py-2 px-4 text-right">Votes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                          {cat.tallies.map((tally) => (
                            <tr
                              key={tally.candidateId}
                              className={tally.rank === 1 ? 'bg-amber-50/40 font-semibold' : ''}
                            >
                              <td className="py-2.5 px-4 font-mono text-brand-secondary">
                                #{tally.rank}
                              </td>
                              <td className="py-2.5 px-4 text-brand-charcoal">
                                {tally.candidateName}
                                <span className="text-[10px] text-brand-secondary font-mono ml-1.5">
                                  ({tally.memberCode})
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-medium text-brand-charcoal">
                                {tally.votes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

