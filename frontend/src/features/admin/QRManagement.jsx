import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  QrCode,
  Copy,
  RefreshCw,
  Slash,
  Check,
  Download,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export default function QRManagement({ preselectedEventId }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [tokenData, setTokenData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (preselectedEventId) {
      setSelectedEventId(preselectedEventId);
    }
  }, [preselectedEventId]);

  async function loadEvents() {
    try {
      const data = await api.get('/api/events');
      setEvents(data.events || []);
      if (!selectedEventId && data.events?.length > 0) {
        setSelectedEventId(data.events[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRegenerate() {
    if (!selectedEventId) return;
    if (!window.confirm('Regenerating this QR code will immediately invalidate all existing printed or displayed QR codes for this event. Continue?')) {
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await api.post(`/api/qr/regenerate/${selectedEventId}`);
      setTokenData(res);
      setMessage('New QR code generated successfully. Previous tokens revoked.');
    } catch (err) {
      alert(err.message || 'Failed to regenerate QR code');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!selectedEventId) return;
    if (!window.confirm('Revoking access will immediately prevent anyone from loading the voting page via this QR code. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/qr/revoke/${selectedEventId}`);
      setTokenData(null);
      setMessage('Event QR access has been permanently revoked.');
    } catch (err) {
      alert(err.message || 'Failed to revoke QR code');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (tokenData?.accessUrl) {
      navigator.clipboard.writeText(tokenData.accessUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">QR Code & Event Access</h2>
        <p className="text-xs text-brand-secondary mt-0.5">
          Generate, download, or revoke the common event QR code scanned by attendees.
        </p>
      </div>

      {/* Select Event */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1.5">
            Select Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setTokenData(null);
              setMessage('');
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs bg-brand-canvas/30 focus:outline-none focus:border-brand-red"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.status})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={handleRegenerate}
            disabled={loading || !selectedEventId}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {tokenData ? 'Regenerate New Token' : 'Generate / Reveal QR Code'}
          </button>
          <button
            onClick={handleRevoke}
            disabled={loading || !selectedEventId}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium transition-colors"
          >
            <Slash className="w-3.5 h-3.5" /> Revoke QR Access
          </button>
        </div>

        {message && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            {message}
          </div>
        )}
      </div>

      {/* QR Display Card */}
      {tokenData && (
        <div className="bg-white rounded-2xl border border-brand-border p-8 shadow-sm text-center space-y-6 animate-fade-in">
          <div className="inline-block p-4 bg-brand-canvas rounded-2xl border border-brand-border">
            <img
              src={tokenData.qrDataUrl}
              alt="Event Voting QR Code"
              className="w-64 h-64 mx-auto rounded-xl shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
              Common Event Access URL
            </div>
            <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
              <input
                type="text"
                readOnly
                value={tokenData.accessUrl}
                className="w-full text-xs font-mono py-2 px-3 bg-brand-canvas rounded-xl border border-brand-border text-brand-charcoal"
              />
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-brand-canvas border border-brand-border hover:bg-brand-border/40 text-brand-charcoal text-xs transition-colors shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href={tokenData.qrDataUrl}
              download="event-voting-qr.png"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-brand-border hover:bg-brand-canvas text-xs font-medium text-brand-charcoal transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-brand-secondary" /> Download PNG
            </a>
            <a
              href={tokenData.accessUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-canvas border border-brand-border hover:bg-brand-border/40 text-xs font-medium text-brand-charcoal transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-secondary" /> Test QR Link
            </a>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-left text-[11px] leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Security & Identity Limitation:</strong> The QR code contains an unguessable token validating event access. Once scanned, voters identify themselves via self-selection. Possession of the QR does not verify genuine identity.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

