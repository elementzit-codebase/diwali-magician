import React from 'react';
import { Award, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function VotingSuccess({ eventTitle, submittedAt, voterName }) {
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 max-w-md mx-auto text-center">
      <header className="pt-12 space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-gold">
          Ballot Recorded
        </div>
        <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-brand-charcoal">
          Thank You, {voterName}!
        </h1>
        <p className="text-xs text-brand-secondary leading-relaxed px-4">
          Your confidential ballot for <strong>{eventTitle}</strong> has been securely logged.
        </p>
      </header>

      <main className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm my-6 space-y-4">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="w-4 h-4" /> Participation Verified
        </div>
        <p className="text-xs text-brand-secondary leading-relaxed">
          In accordance with our confidential ballot standard, your personal identity has been decoupled from the candidate votes recorded.
        </p>
        <div className="py-2.5 px-4 rounded-xl bg-brand-canvas text-[11px] text-brand-secondary font-mono">
          Submission Timestamp: {new Date(submittedAt || Date.now()).toLocaleTimeString()}
        </div>
      </main>

      <footer className="pb-6 space-y-2">
        <div className="text-[11px] text-brand-secondary">
          Awards will be revealed once the voting schedule completes.
        </div>
        <div className="text-[10px] text-brand-gold font-serif-title font-semibold">
          Enjoy the Gala Evening
        </div>
      </footer>
    </div>
  );
}

