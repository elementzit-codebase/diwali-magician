import React from 'react';
import { Award, Clock, ArrowRight, ShieldAlert, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import CountdownTimer from '../../components/CountdownTimer.jsx';

export default function QRLanding({ event, onStartVoting, onRefresh }) {
  const isAvailable = event.votingAvailability === 'open';
  const isFutureScheduled = Boolean(event.startAt && new Date(event.startAt).getTime() > Date.now());

  return (
    <div className="min-h-screen flex flex-col justify-between p-5 max-w-md mx-auto">
      {/* Header */}
      <header className="pt-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-brand-border">
          <Award className="w-8 h-8 text-brand-red" />
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-gold">
          Official Balloting
        </div>
        <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-brand-charcoal">
          {event.title}
        </h1>
        {event.description && (
          <p className="text-xs text-brand-secondary leading-relaxed px-4">
            {event.description}
          </p>
        )}
      </header>

      {/* Main Card */}
      <main className="bg-white rounded-3xl p-6 sm:p-7 border border-brand-border shadow-sm my-6 space-y-6 text-center">
        {isAvailable ? (
          <>
            <CountdownTimer
              targetDate={event.endAt}
              label="Voting Closes In"
              variant="compact"
            />

            {/* Voting Guide */}
            <div className="space-y-2.5 text-left bg-brand-canvas/70 rounded-2xl p-4 border border-brand-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> How To Vote
              </span>
              <ul className="text-xs text-brand-charcoal space-y-2 list-none pl-0 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-red text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Select your registered name from the guest directory.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-red text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Cast one vote for <strong>Best Dressing</strong> and one for{' '}
                    <strong>Best Speech</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-red text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Confirm and submit both selections together.</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onStartVoting}
              className="w-full py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.98] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
            >
              Start Voting <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : event.votingAvailability === 'upcoming' ? (
          <div className="py-2 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-canvas text-brand-gold mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif-title text-xl font-bold text-brand-charcoal">
                Voting Opens Soon
              </h3>
              <p className="text-xs text-brand-secondary mt-1">
                Scheduled for{' '}
                <strong className="text-brand-charcoal">
                  {new Date(event.startAt).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </strong>
              </p>
            </div>

            {/* Luxurious Countdown Display or Waiting Notice */}
            {isFutureScheduled ? (
              <div className="p-4 rounded-2xl bg-brand-canvas/60 border border-brand-border/80">
                <CountdownTimer
                  targetDate={event.startAt}
                  label="Countdown to Voting"
                  variant="luxurious"
                  onExpire={() => {
                    if (onRefresh) onRefresh();
                    else window.location.reload();
                  }}
                />
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-brand-canvas/60 border border-brand-border/80 text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Awaiting Host to Activate Voting
                </div>
                <p className="text-xs text-brand-secondary">
                  The event is scheduled and will unlock as soon as the administrator opens voting.
                </p>
                {onRefresh && (
                  <div>
                    <button
                      onClick={onRefresh}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-brand-border text-xs font-medium text-brand-charcoal hover:bg-brand-canvas shadow-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-brand-gold" />
                      Check Status
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step-by-Step Preview */}
            <div className="text-left bg-brand-canvas/50 rounded-2xl p-4 border border-brand-border/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary">
                How Voting Works
              </span>
              <p className="text-[11px] text-brand-charcoal leading-relaxed">
                When the countdown completes, the page unlocks automatically. You will select your name, review nominees, and cast your votes.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-3">
            <Clock className="w-10 h-10 text-brand-secondary mx-auto" />
            <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">
              Voting Has Concluded
            </h3>
            <p className="text-xs text-brand-secondary leading-relaxed">
              The voting window for this event has closed. The official awards announcement will follow shortly.
            </p>
          </div>
        )}

        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-left text-[11px] text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
          <span className="leading-snug">
            <strong>Trusted Event Protocol:</strong> Voters self-identify from the registered attendee list. No credentials or pins are required.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-4 text-[11px] text-brand-secondary">
        Secured with confidential ballot architecture
      </footer>
    </div>
  );
}
