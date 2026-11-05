import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from '../hooks/useAdminAuth.jsx';
import AdminAuthPage from '../features/auth/AdminAuthPage.jsx';
import AdminPortal from '../features/admin/AdminPortal.jsx';
import MemberVotingFlow from '../features/voting/MemberVotingFlow.jsx';
import PublicWinnerPresentation from '../features/results/PublicWinnerPresentation.jsx';
import DisplayStage from '../features/admin/DisplayStage.jsx';
import { Award, QrCode } from 'lucide-react';

function AdminRouteGuard() {
  const { admin, loading, setupRequired } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-canvas text-xs text-brand-secondary">
        Verifying administrator session...
      </div>
    );
  }

  if (setupRequired || !admin) {
    return <AdminAuthPage />;
  }

  return <AdminPortal />;
}

function MemberLandingPlaceholder() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 max-w-md mx-auto text-center">
      <header className="pt-10 space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-brand-border">
          <Award className="w-8 h-8 text-brand-red" />
        </div>
        <h1 className="font-serif-title text-2xl font-bold text-brand-charcoal">
          Awards Evening
        </h1>
        <p className="text-xs text-brand-secondary">
          Premium Event Voting Experience
        </p>
      </header>

      <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm my-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-brand-canvas mx-auto flex items-center justify-center text-brand-gold">
          <QrCode className="w-6 h-6" />
        </div>
        <h2 className="font-serif-title text-base font-bold text-brand-charcoal">
          Scan Event QR Code
        </h2>
        <p className="text-xs text-brand-secondary leading-relaxed">
          Please scan the official event QR code displayed on tables or projected at your venue to cast your votes.
        </p>
        <div className="pt-2">
          <a
            href="/admin"
            className="inline-block py-2.5 px-4 rounded-xl bg-brand-canvas hover:bg-brand-border/60 text-xs font-medium text-brand-charcoal transition-colors"
          >
            Go to Admin Console →
          </a>
        </div>
      </div>

      <footer className="text-[11px] text-brand-secondary pb-4">
        Secured with confidential ballot architecture
      </footer>
    </main>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MemberLandingPlaceholder />} />
          <Route path="/vote" element={<MemberVotingFlow />} />
          <Route path="/results" element={<PublicWinnerPresentation />} />
          <Route path="/stage" element={<DisplayStage />} />
          <Route path="/admin/*" element={<AdminRouteGuard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
