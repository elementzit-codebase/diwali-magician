import React, { useState, useEffect, useRef } from 'react';
import { Clock, Sparkles } from 'lucide-react';

export default function CountdownTimer({
  targetDate,
  onExpire,
  label = 'Voting Closes In',
  variant = 'compact', // 'compact' | 'luxurious'
  badgeIcon = true,
}) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const hasTriggeredExpire = useRef(false);

  function calculateTimeLeft() {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds, expired: false };
  }

  useEffect(() => {
    // Check initially
    const initial = calculateTimeLeft();
    setTimeLeft(initial);

    // If already expired upon mounting, do not trigger onExpire
    // (Prevents infinite re-fetch loops if the target date is already in the past)
    if (initial.expired) {
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining.expired) {
        clearInterval(timer);
        if (!hasTriggeredExpire.current) {
          hasTriggeredExpire.current = true;
          if (onExpire) onExpire();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) {
    return (
      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse">
        <Sparkles className="w-4 h-4 text-emerald-600" /> Voting is Now Open! Unlocking...
      </div>
    );
  }

  // Luxurious Large Display (Used for "Voting Opens In" countdown)
  if (variant === 'luxurious') {
    return (
      <div className="flex flex-col items-center space-y-3 my-2 w-full">
        {label && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-gold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{label}</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-xs">
          {/* Days */}
          <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-brand-canvas/80 border border-brand-border shadow-xs">
            <span className="font-mono text-xl sm:text-2xl font-bold text-brand-charcoal">
              {String(timeLeft.days).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-secondary mt-0.5">
              Days
            </span>
          </div>

          {/* Hours */}
          <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-brand-canvas/80 border border-brand-border shadow-xs">
            <span className="font-mono text-xl sm:text-2xl font-bold text-brand-charcoal">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-secondary mt-0.5">
              Hours
            </span>
          </div>

          {/* Mins */}
          <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-brand-canvas/80 border border-brand-border shadow-xs">
            <span className="font-mono text-xl sm:text-2xl font-bold text-brand-charcoal">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-secondary mt-0.5">
              Mins
            </span>
          </div>

          {/* Secs (Clean, steady border without flashing the entire card) */}
          <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-brand-red/5 border border-brand-red/20 shadow-xs">
            <span className="font-mono text-xl sm:text-2xl font-bold text-brand-red">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-red mt-0.5">
              Secs
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Compact Pill Display
  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-gold mb-1">
          {label}
        </span>
      )}
      <div className="inline-flex items-center gap-2 font-mono text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-brand-border shadow-sm text-brand-charcoal">
        {badgeIcon && <Clock className="w-3.5 h-3.5 text-brand-red" />}
        <span>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
