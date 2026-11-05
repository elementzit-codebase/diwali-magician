import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, ShieldCheck, Crown, Clock, Sparkles } from 'lucide-react';
import { api } from '../../services/api.js';
import CountdownTimer from '../../components/CountdownTimer.jsx';

export default function VotingSuccess({
  eventId,
  eventTitle,
  endAt,
  token,
  submittedAt,
  voterName,
}) {
  const [resultsData, setResultsData] = useState(null);
  const [votingEnded, setVotingEnded] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // Check if voting has ended based on endAt timestamp
  useEffect(() => {
    if (endAt) {
      const isPast = new Date(endAt).getTime() <= Date.now();
      if (isPast) {
        setVotingEnded(true);
        fetchWinners();
      }
    }
  }, [endAt]);

  async function fetchWinners() {
    if (!eventId || !token) return;
    setLoadingResults(true);
    try {
      const data = await api.get(`/api/results/public/${eventId}?token=${encodeURIComponent(token)}`);
      setResultsData(data);
    } catch (err) {
      // Results might still be sealing on server; retry once in 2 seconds
      setTimeout(async () => {
        try {
          const data = await api.get(`/api/results/public/${eventId}?token=${encodeURIComponent(token)}`);
          setResultsData(data);
        } catch (_) {}
      }, 2000);
    } finally {
      setLoadingResults(false);
    }
  }

  function handleCountdownComplete() {
    setVotingEnded(true);
    fetchWinners();
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-5 sm:p-6 max-w-md mx-auto text-center">
      <header className="pt-8 space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-gold">
          Ballot Recorded
        </div>
        <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-brand-charcoal">
          Thank You, {voterName}!
        </h1>
        <p className="text-xs text-brand-secondary leading-relaxed px-4">
          Your confidential ballot for <strong>{eventTitle}</strong> event has been securely logged.
        </p>
      </header>

      <main className="my-6 space-y-4">
        {/* Verification Card */}
        <div className="bg-white rounded-3xl p-5 border border-brand-border shadow-sm space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="w-4 h-4" /> Participation Verified
          </div>
          <p className="text-[11px] text-brand-secondary leading-relaxed">
            In accordance with our confidential ballot standard, your personal identity has been decoupled from the candidate votes recorded.
          </p>
          <div className="py-2 px-3 rounded-xl bg-brand-canvas text-[10px] text-brand-secondary font-mono">
            Submission Timestamp: {new Date(submittedAt || Date.now()).toLocaleTimeString()}
          </div>
        </div>

        {/* Live Finish Countdown or Winners Display */}
        {!votingEnded ? (
          <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-canvas text-brand-gold mx-auto flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-serif-title text-base font-bold text-brand-charcoal">
                Winners Announcement
              </h3>
              <p className="text-[11px] text-brand-secondary mt-0.5">
                Official awards will be revealed live as soon as voting finishes.
              </p>
            </div>

            {endAt && (
              <div className="pt-1">
                <CountdownTimer
                  targetDate={endAt}
                  label="Voting Finishes In"
                  variant="luxurious"
                  onExpire={handleCountdownComplete}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-brand-gold" />
                <h3 className="font-serif-title text-base font-bold text-brand-charcoal">
                  Official Winners
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Voting Concluded
              </span>
            </div>

            {loadingResults ? (
              <div className="py-8 text-center text-xs text-brand-secondary">
                Tabulating verified winners...
              </div>
            ) : resultsData?.results ? (
              <div className="space-y-4">
                {resultsData.results.map((cat) => (
                  <div
                    key={cat.categoryId}
                    className="p-4 rounded-2xl bg-brand-canvas/70 border border-brand-border space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold">
                        {cat.categoryName}
                      </span>
                      {cat.isJointWinner && (
                        <span className="text-[9px] font-semibold uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                          Joint Winners
                        </span>
                      )}
                    </div>

                    {cat.hasVotes ? (
                      <div className="space-y-2">
                        {cat.winners.map((winner) => (
                          <div
                            key={winner.candidateId}
                            className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-brand-border shadow-xs"
                          >
                            <div className="w-8 h-8 rounded-lg bg-brand-red text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {winner.candidateName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-brand-charcoal truncate">
                                {winner.candidateName}
                              </div>
                              <div className="text-[10px] text-brand-secondary font-mono">
                                {winner.memberCode}
                              </div>
                            </div>
                            <div className="text-xs font-mono font-bold text-brand-red">
                              {winner.votes} votes
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-brand-secondary italic">
                        No votes recorded.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <button
                  onClick={fetchWinners}
                  className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-semibold"
                >
                  Load Official Winners
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="pb-6 space-y-1 text-center">
       
        <div className="text-[10px] text-brand-secondary">
          Secured with confidential ballot architecture
        </div>
      </footer>
    </div>
  );
}
