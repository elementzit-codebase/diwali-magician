import React from 'react';
import { Award, Clock, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';
import CountdownTimer from '../../components/CountdownTimer.jsx';

export default function QRLanding({ event, onStartVoting }) {
  const isAvailable = event.votingAvailability === 'open';

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
            <CountdownTimer targetDate={event.endAt} />

            <div className="space-y-2 text-left bg-brand-canvas/60 rounded-2xl p-4 border border-brand-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary">
                Voting Instructions
              </span>
              <ul className="text-xs text-brand-charcoal space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>Select your registered name from the guest directory.</li>
                <li>Cast one vote for <strong>Best Dressing</strong> and one for <strong>Best Speech</strong>.</li>
                <li>Both selections are submitted together. Ballots cannot be modified once cast.</li>
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
          <div className="py-6 space-y-3">
            <Clock className="w-10 h-10 text-brand-gold mx-auto" />
            <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">
              Voting Opens Soon
            </h3>
            <p className="text-xs text-brand-secondary leading-relaxed">
              Voting will begin at{' '}
              {new Date(event.startAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}.
              Please check back when announced.
            </p>
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

