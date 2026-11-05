import React from 'react';
import { Award, ShieldCheck, QrCode } from 'lucide-react';

export default function App() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-8 max-w-md mx-auto">
      <header className="text-center pt-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-sm border border-brand-border mb-4">
          <Award className="w-7 h-7 text-brand-red" />
        </div>
        <h1 className="font-serif-title text-2xl sm:text-3xl font-bold tracking-tight text-brand-charcoal">
          Annual Gala Awards
        </h1>
        <p className="text-sm text-brand-secondary mt-1">
          Exclusive Event Voting
        </p>
      </header>

      <section className="bg-white rounded-2xl p-6 border border-brand-border shadow-sm my-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-brand-gold">
          <ShieldCheck className="w-4 h-4" /> Single-Port Architecture Active
        </div>
        <p className="text-sm text-brand-charcoal mb-6 leading-relaxed">
          Welcome to the mobile voting experience. Scan the event QR code or access the administrator portal.
        </p>
        <div className="space-y-3">
          <a
            href="/admin"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.98] text-white font-medium text-sm transition-all shadow-sm"
          >
            Administrator Portal
          </a>
          <button
            onClick={async () => {
              const res = await fetch('/api/health');
              const data = await res.json();
              alert(`Backend Health: ${data.status} | Mode: ${data.mode}`);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-brand-border hover:bg-brand-canvas active:scale-[0.98] text-brand-charcoal font-medium text-sm transition-all"
          >
            <QrCode className="w-4 h-4 text-brand-secondary" /> Test Single-Port Backend API
          </button>
        </div>
      </section>

      <footer className="text-center pb-6 text-xs text-brand-secondary">
        Secured with confidential ballot architecture
      </footer>
    </main>
  );
}

