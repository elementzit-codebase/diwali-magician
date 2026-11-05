import React, { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth.jsx';
import { ShieldCheck, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminAuthPage() {
  const { setupRequired, login, setup } = useAdminAuth();

  const [isSetup, setIsSetup] = useState(setupRequired);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (setupRequired || isSetup) {
        await setup(fullName, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-canvas">
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-border shadow-sm p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-red/5 border border-brand-red/10 text-brand-red mb-4">
            <ShieldCheck className="w-7 h-7 text-brand-red" />
          </div>
          <h1 className="font-serif-title text-2xl font-bold text-brand-charcoal">
            {setupRequired ? 'Initial Admin Setup' : 'Administrator Portal'}
          </h1>
          <p className="text-xs text-brand-secondary mt-1">
            {setupRequired
              ? 'Establish the master administrative account for this event system.'
              : 'Sign in to manage members, schedules, QR codes, and view results.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(setupRequired || isSetup) && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-brand-secondary absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:border-brand-red transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-brand-secondary absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exclusiveevent.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-brand-secondary absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:border-brand-red transition-colors"
              />
            </div>
            {(setupRequired || isSetup) && (
              <p className="text-[11px] text-brand-secondary mt-1">
                Must be at least 8 characters with uppercase, lowercase, and numeric digits.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 py-3 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              'Processing...'
            ) : (
              <>
                {setupRequired ? 'Complete Master Setup' : 'Access Portal'}{' '}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-brand-border text-center">
          <p className="text-[11px] text-brand-secondary">
            Private Event Management & Balloting System
          </p>
        </div>
      </div>
    </div>
  );
}

