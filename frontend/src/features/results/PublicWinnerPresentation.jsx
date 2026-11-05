import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Award, Crown, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function PublicWinnerPresentation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      loadPublicResults();
    } else {
      setLoading(false);
      setError('Event QR access token required to view results.');
    }
  }, [token]);

  async function loadPublicResults() {
    setLoading(true);
    try {
      // First resolve event ID from token
      const accessData = await api.get(`/api/qr/access/${encodeURIComponent(token)}`);
      const eventId = accessData.event.id;

      // Then fetch public results
      const resData = await api.get(`/api/results/public/${eventId}?token=${encodeURIComponent(token)}`);
      setResultsData(resData);
    } catch (err) {
      setError(err.message || 'Results are currently sealed.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-canvas text-xs text-brand-secondary">
        Verifying official results...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-between p-6 max-w-md mx-auto text-center">
        <div className="pt-16 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-brand-gold mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">
            Results Not Yet Released
          </h2>
          <p className="text-xs text-brand-secondary leading-relaxed px-4">
            {error}
          </p>
        </div>
        <footer className="pb-8 text-[11px] text-brand-secondary">
          Official results will unlock immediately after voting concludes
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-5 max-w-md mx-auto">
      <header className="pt-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-brand-border">
          <Crown className="w-8 h-8 text-brand-gold" />
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-gold">
          Official Winners Announcement
        </div>
        <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-brand-charcoal">
          {resultsData.event.title}
        </h1>
        <p className="text-xs text-brand-secondary">
          Voter turnout: {resultsData.statistics.participationPercentage}% ({resultsData.statistics.ballotsCast} ballots cast)
        </p>
      </header>

      <main className="my-6 space-y-5">
        {resultsData.results.map((cat) => (
          <div
            key={cat.categoryId}
            className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                {cat.categoryName}
              </span>
              {cat.isJointWinner && (
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  Joint Winners
                </span>
              )}
            </div>

            {cat.hasVotes ? (
              <div className="space-y-3">
                {cat.winners.map((winner) => (
                  <div
                    key={winner.candidateId}
                    className="p-4 rounded-2xl bg-brand-canvas border border-brand-border flex items-center gap-3.5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-red text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                      {winner.candidateName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-base font-serif-title font-bold text-brand-charcoal">
                        {winner.candidateName}
                      </div>
                      <div className="text-xs text-brand-secondary">
                        <span className="font-semibold text-brand-red font-mono">
                          {winner.votes}
                        </span>{' '}
                        votes
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-brand-secondary font-medium">
                No votes recorded.
              </div>
            )}
          </div>
        ))}
      </main>

      <footer className="text-center pb-6 text-[11px] text-brand-secondary">
        Official Awards Event Results
      </footer>
    </div>
  );
}

