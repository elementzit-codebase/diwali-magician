import React, { useState } from 'react';
import { Award, Check, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export default function CandidateSelection({
  categories,
  voterName,
  onProceedToReview,
  onCancelSession,
}) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  // Store selections as { categoryId: candidateMemberId }
  const [selections, setSelections] = useState({});
  const [error, setError] = useState('');

  const currentCategory = categories[activeCategoryIndex];
  const isLastCategory = activeCategoryIndex === categories.length - 1;

  function handleSelectCandidate(categoryId, candidateId) {
    setError('');
    setSelections((prev) => ({
      ...prev,
      [categoryId]: candidateId,
    }));
  }

  function handleNextCategory() {
    const currentSelected = selections[currentCategory.id];
    if (!currentSelected) {
      setError(`Please select a candidate for ${currentCategory.name}`);
      return;
    }

    if (!isLastCategory) {
      setActiveCategoryIndex((prev) => prev + 1);
    } else {
      // Validate all categories have a selection
      const missing = categories.find((c) => !selections[c.id]);
      if (missing) {
        setError(`Please make a selection for ${missing.name}`);
        return;
      }
      onProceedToReview(selections);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-5 max-w-md mx-auto">
      <div>
        {/* Header Metadata */}
        <div className="flex items-center justify-between pt-4 mb-4">
          <button
            onClick={onCancelSession}
            className="text-xs text-brand-secondary hover:text-brand-charcoal transition-colors py-1 px-2"
          >
            Cancel
          </button>
          <div className="text-right">
            <span className="text-[10px] text-brand-secondary block">Voting as</span>
            <span className="text-xs font-semibold text-brand-charcoal">{voterName}</span>
          </div>
        </div>

        {/* Category Step Indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          {categories.map((cat, idx) => {
            const isCompleted = Boolean(selections[cat.id]);
            const isCurrent = idx === activeCategoryIndex;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryIndex(idx)}
                className={`flex-1 py-2 px-2 rounded-xl text-center transition-all ${
                  isCurrent
                    ? 'bg-brand-red text-white shadow-sm'
                    : isCompleted
                    ? 'bg-brand-gold/15 text-brand-gold font-medium'
                    : 'bg-brand-canvas text-brand-secondary'
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider truncate">
                  {cat.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Category Heading */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-brand-gold text-[10px] font-bold uppercase tracking-wider mb-1">
            <Award className="w-3.5 h-3.5" /> Category {activeCategoryIndex + 1} of{' '}
            {categories.length}
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">
            {currentCategory?.name}
          </h2>
          <p className="text-xs text-brand-secondary mt-0.5">
            Select one nominee below. (Your own name has been excluded automatically).
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Candidate Cards Grid */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {currentCategory?.candidates.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-brand-border text-brand-secondary text-xs">
              No eligible candidates found for this category.
            </div>
          ) : (
            currentCategory?.candidates.map((cand) => {
              const isSelected = selections[currentCategory.id] === cand.id;
              return (
                <button
                  key={cand.id}
                  onClick={() => handleSelectCandidate(currentCategory.id, cand.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 active:scale-[0.99] ${
                    isSelected
                      ? 'bg-white border-brand-gold ring-2 ring-brand-gold/30 shadow-md'
                      : 'bg-white border-brand-border hover:border-brand-border/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-colors ${
                        isSelected
                          ? 'bg-brand-red text-white'
                          : 'bg-brand-canvas text-brand-secondary'
                      }`}
                    >
                      {cand.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-brand-charcoal">
                        {cand.fullName}
                      </div>
                      <div className="text-[10px] text-brand-secondary font-mono">
                        {cand.memberCode}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-brand-gold border-brand-gold text-white'
                        : 'border-brand-border bg-brand-canvas'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="pt-4 border-t border-brand-border/60">
        <button
          onClick={handleNextCategory}
          className="w-full py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.98] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
        >
          {isLastCategory ? 'Review Ballot' : 'Next Category'}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

