import React from 'react';
import { Award, ArrowLeft, Send, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function BallotReview({
  categories,
  selections,
  voterName,
  submitting,
  error,
  onEditSelection,
  onSubmitBallot,
}) {
  return (
    <div className="min-h-dvh flex flex-col justify-between max-w-md mx-auto p-4 sm:p-5">
      <div className="space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 mb-2">
          <button
            onClick={onEditSelection}
            disabled={submitting}
            className="flex items-center gap-1 text-xs text-brand-secondary hover:text-brand-charcoal transition-colors py-1 px-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Edit Selections
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-gold">
            Step 3 of 3
          </span>
        </div>

        {/* Heading */}
        <header className="space-y-1 mb-3">
          <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-brand-charcoal">
            Review Your Ballot
          </h2>
          <p className="text-xs text-brand-secondary">
            Please review your nominations before casting your final confidential ballot.
          </p>
        </header>

        {error && (
          <div className="p-3 mb-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Selections Review Cards */}
        <div className="space-y-3">
          {categories.map((cat) => {
            const selectedCandidateId = selections[cat.id];
            const candidate = cat.candidates.find((c) => c.id === selectedCandidateId);

            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-brand-border p-4 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold">
                    {cat.name}
                  </span>
                  <button
                    onClick={onEditSelection}
                    className="text-[11px] text-brand-red hover:underline font-medium"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center font-bold text-sm">
                    {candidate ? candidate.fullName.charAt(0) : '?'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-charcoal">
                      {candidate ? candidate.fullName : 'No selection'}
                    </div>
                    {candidate && (
                      <div className="text-[10px] text-brand-secondary font-mono">
                        {candidate.memberCode}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3.5 rounded-2xl bg-brand-canvas border border-brand-border/60 text-[11px] text-brand-secondary space-y-1">
          <div className="font-semibold text-brand-charcoal flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Irrevocable Submission
          </div>
          <p className="leading-relaxed">
            Both selections will be submitted simultaneously in an atomic transaction. Once cast, your ballot cannot be revised.
          </p>
        </div>
      </div>

      {/* Commit Button - Docked cleanly with safe-area spacing */}
      <div className="sticky bottom-0 z-20 bg-brand-canvas/95 backdrop-blur-md pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-brand-border/60 mt-4">
        <button
          onClick={onSubmitBallot}
          disabled={submitting}
          className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.98] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {submitting ? (
            'Recording Ballot...'
          ) : (
            <>
              Confirm & Submit Ballot <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

