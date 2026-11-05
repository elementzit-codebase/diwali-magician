import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import QRLanding from './QRLanding.jsx';
import NameSelection from './NameSelection.jsx';
import CandidateSelection from './CandidateSelection.jsx';
import BallotReview from './BallotReview.jsx';
import VotingSuccess from './VotingSuccess.jsx';
import { AlertCircle, QrCode } from 'lucide-react';

export default function MemberVotingFlow() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Step state: 'landing' | 'name-select' | 'voting' | 'review' | 'success' | 'already-voted' | 'error'
  const [step, setStep] = useState('landing');
  const [eventData, setEventData] = useState(null);
  const [voterSession, setVoterSession] = useState(null);
  const [ballotContext, setBallotContext] = useState(null);
  const [selections, setSelections] = useState({});
  const [submissionInfo, setSubmissionInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      loadEventFromToken(token);
    } else {
      setLoading(false);
      setStep('error');
      setErrorMessage('No event QR access token provided. Please scan the official event QR code.');
    }
  }, [token]);

  async function loadEventFromToken(rawToken) {
    setLoading(true);
    try {
      const data = await api.get(`/api/qr/access/${encodeURIComponent(rawToken)}`);
      setEventData(data.event);
      setStep('landing');
    } catch (err) {
      setStep('error');
      setErrorMessage(err.message || 'Invalid or expired event QR code');
    } finally {
      setLoading(false);
    }
  }

  // Step 2 & 3: Member confirms name -> establish server-side voting session
  async function handleConfirmName(member) {
    setLoading(true);
    setErrorMessage('');
    try {
      const sessionRes = await api.post('/api/voting/session', {
        eventId: eventData.id,
        memberId: member.id,
        token,
      });

      setVoterSession(sessionRes.session);

      // Fetch candidates excluding this member (Rule 2.3 #5)
      const contextRes = await api.get('/api/voting/ballot-context');
      setBallotContext(contextRes);
      setStep('voting');
    } catch (err) {
      if (err.code === 'ALREADY_VOTED') {
        setStep('already-voted');
      } else {
        alert(err.message || 'Failed to establish voting session');
      }
    } finally {
      setLoading(false);
    }
  }

  // Step 5 -> Step 6: Review
  function handleProceedToReview(collectedSelections) {
    setSelections(collectedSelections);
    setStep('review');
  }

  // Step 7: Final Atomic Submit
  async function handleSubmitBallot() {
    setSubmitting(true);
    setErrorMessage('');
    try {
      const choicesArray = Object.entries(selections).map(([categoryId, candidateMemberId]) => ({
        categoryId,
        candidateMemberId,
      }));

      const res = await api.post('/api/voting/submit', {
        choices: choicesArray,
      });

      setSubmissionInfo(res);
      setStep('success');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record ballot');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSession() {
    try {
      await api.post('/api/voting/abandon');
    } catch (_) {}
    setVoterSession(null);
    setStep('landing');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-canvas text-xs text-brand-secondary">
        Validating event access...
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex flex-col justify-between p-6 max-w-md mx-auto text-center">
        <div className="pt-16 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 text-brand-red mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">
            Event Access Error
          </h2>
          <p className="text-xs text-brand-secondary leading-relaxed px-4">
            {errorMessage}
          </p>
        </div>
        <footer className="pb-8 text-[11px] text-brand-secondary">
          Please rescan the official event QR code at your venue
        </footer>
      </div>
    );
  }

  if (step === 'already-voted') {
    return (
      <div className="min-h-screen flex flex-col justify-between p-6 max-w-md mx-auto text-center">
        <div className="pt-16 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">
            Ballot Already Cast
          </h2>
          <p className="text-xs text-brand-secondary leading-relaxed px-4">
            A ballot has already been submitted for this registered member in {eventData?.title}. Each attendee may only vote once per event.
          </p>
        </div>
        <div className="pb-8">
          <button
            onClick={() => setStep('landing')}
            className="py-3 px-6 rounded-2xl bg-brand-canvas border border-brand-border text-xs font-medium text-brand-charcoal hover:bg-brand-border/40"
          >
            ← Return to Event Screen
          </button>
        </div>
      </div>
    );
  }

  if (step === 'landing') {
    return (
      <QRLanding
        event={eventData}
        onStartVoting={() => setStep('name-select')}
      />
    );
  }

  if (step === 'name-select') {
    return (
      <NameSelection
        eventId={eventData.id}
        token={token}
        onSelectName={handleConfirmName}
        onBack={() => setStep('landing')}
      />
    );
  }

  if (step === 'voting') {
    return (
      <CandidateSelection
        categories={ballotContext.categories}
        voterName={voterSession.memberName}
        onProceedToReview={handleProceedToReview}
        onCancelSession={handleCancelSession}
      />
    );
  }

  if (step === 'review') {
    return (
      <BallotReview
        categories={ballotContext.categories}
        selections={selections}
        voterName={voterSession.memberName}
        submitting={submitting}
        error={errorMessage}
        onEditSelection={() => setStep('voting')}
        onSubmitBallot={handleSubmitBallot}
      />
    );
  }

  if (step === 'success') {
    return (
      <VotingSuccess
        eventTitle={eventData.title}
        submittedAt={submissionInfo?.submittedAt}
        voterName={voterSession?.memberName}
      />
    );
  }

  return null;
}

