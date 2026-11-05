import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

export default function QRManagement({ preselectedEventId }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [tokenData, setTokenData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Template feature states
  const [useTemplate, setUseTemplate] = useState(false);
  const [templatedImageSrc, setTemplatedImageSrc] = useState(null);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (preselectedEventId) {
      setSelectedEventId(preselectedEventId);
    }
  }, [preselectedEventId]);

  // Automatically load the fixed QR code when the selected event changes
  useEffect(() => {
    if (selectedEventId) {
      loadEventQR(selectedEventId);
    }
  }, [selectedEventId]);

  // When QR code is generated or toggled, render template if enabled
  useEffect(() => {
    if (useTemplate && tokenData?.qrDataUrl) {
      renderTemplateImage(tokenData.qrDataUrl);
    } else {
      setTemplatedImageSrc(null);
    }
  }, [useTemplate, tokenData]);

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

  async function loadEventQR(eventId) {
    if (!eventId) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.get(`/api/qr/event/${eventId}`);
      setTokenData(res);
    } catch (err) {
      console.error('Failed to load QR code:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleForceRegenerate() {
    if (!selectedEventId) return;
    if (
      !window.confirm(
        'WARNING: Regenerating this QR code will permanently invalidate all previously printed posters and badges for this event! Are you sure you want to replace it?'
      )
    ) {
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
    if (
      !window.confirm(
        'Revoking access will immediately prevent anyone from loading the voting page via this QR code. Continue?'
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/qr/revoke/${selectedEventId}`);
      setTokenData(null);
      setTemplatedImageSrc(null);
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

  // Composite QR code inside the golden white frame of Template BNI
  function renderTemplateImage(qrDataUrl) {
    setGeneratingTemplate(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const templateImg = new Image();
    templateImg.crossOrigin = 'anonymous';
    templateImg.src = '/template-bni.png';

    templateImg.onload = () => {
      canvas.width = templateImg.naturalWidth; // 5962
      canvas.height = templateImg.naturalHeight; // 3358

      // Draw background template
      ctx.drawImage(templateImg, 0, 0);

      // Load QR code image
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = qrDataUrl;

      qrImg.onload = () => {
        // Target box geometry calibrated for Template BNI.png:
        // Golden rounded frame spans from x ~ 2570 to ~ 5380 (width ~ 2810), y ~ 310 to ~ 3110 (height ~ 2800)
        // Center the QR code nicely inside with comfortable margin
        const boxX = 2570;
        const boxY = 310;
        const boxW = 2810;
        const boxH = 2800;

        const qrSize = 2200; // Large crisp QR code
        const qrX = boxX + (boxW - qrSize) / 2;
        const qrY = boxY + (boxH - qrSize) / 2 - 40;

        // Draw crisp QR code
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Add subtle event helper subtitle below QR
        const activeEvent = events.find((e) => e.id === selectedEventId);
        if (activeEvent?.title) {
          ctx.font = 'bold 72px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#252525';
          ctx.textAlign = 'center';
          ctx.fillText(activeEvent.title, boxX + boxW / 2, qrY + qrSize + 90);
        }

        ctx.font = '600 52px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#B99A65';
        ctx.textAlign = 'center';
        ctx.fillText('Scan with mobile camera to vote', boxX + boxW / 2, qrY + qrSize + 170);

        const dataUrl = canvas.toDataURL('image/png', 1.0);
        setTemplatedImageSrc(dataUrl);
        setGeneratingTemplate(false);
      };

      qrImg.onerror = () => {
        setGeneratingTemplate(false);
      };
    };

    templateImg.onerror = () => {
      console.error('Failed to load /template-bni.png');
      setGeneratingTemplate(false);
    };
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-serif-title text-2xl font-bold text-brand-charcoal">
          QR Code & Event Access
        </h2>
        <p className="text-xs text-brand-secondary mt-0.5">
          Generate, download, or revoke the common event QR code scanned by attendees.
        </p>
      </div>

      {/* Select Event & Main Controls */}
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
              setTemplatedImageSrc(null);
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-brand-border/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadEventQR(selectedEventId)}
              disabled={loading || !selectedEventId}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              Display QR Code
            </button>
            <button
              onClick={handleRevoke}
              disabled={loading || !selectedEventId}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium transition-colors"
            >
              <Slash className="w-3.5 h-3.5" /> Revoke QR Access
            </button>
          </div>

          <button
            onClick={handleForceRegenerate}
            disabled={loading || !selectedEventId}
            title="Only use if your current QR is compromised. Printed physical QR codes will stop working."
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] text-brand-secondary hover:text-red-700 hover:bg-red-50/50 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Regenerate New Token (Emergency Only)
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
        <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-sm text-center space-y-6 animate-fade-in">
          {/* Template Switch Button */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-brand-canvas border border-brand-border/80">
            <div className="flex items-center gap-3 text-left">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  useTemplate
                    ? 'bg-brand-red text-white'
                    : 'bg-white border border-brand-border text-brand-gold'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-brand-charcoal flex items-center gap-1.5">
                  Use BNI Diwali Festival Template
                  {useTemplate && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-brand-secondary">
                  Embeds the QR code seamlessly into the official celebration poster template.
                </div>
              </div>
            </div>

            <button
              onClick={() => setUseTemplate(!useTemplate)}
              className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                useTemplate
                  ? 'bg-brand-charcoal text-white hover:bg-black'
                  : 'bg-brand-red text-white hover:bg-brand-darkRed'
              }`}
            >
              {useTemplate ? 'Use Standalone QR' : 'Apply Poster Template'}
            </button>
          </div>

          {/* QR Display / Poster Display */}
          <div className="inline-block p-4 bg-brand-canvas rounded-2xl border border-brand-border w-full max-w-xl">
            {useTemplate ? (
              generatingTemplate ? (
                <div className="py-24 text-brand-secondary text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-brand-gold" />
                  Generating high-resolution poster with QR code...
                </div>
              ) : templatedImageSrc ? (
                <div className="space-y-2">
                  <img
                    src={templatedImageSrc}
                    alt="BNI Festival Voting Poster"
                    className="w-full h-auto rounded-xl shadow-md border border-brand-border"
                  />
                  <div className="text-[11px] text-brand-secondary">
                    Ultra-High Resolution (5962 × 3358) Ready for Print & Display
                  </div>
                </div>
              ) : null
            ) : (
              <div className="space-y-3">
                <img
                  src={tokenData.qrDataUrl}
                  alt="Event Voting QR Code"
                  className="w-64 h-64 mx-auto rounded-xl shadow-sm bg-white p-2"
                />
                <div className="text-[11px] text-brand-secondary">
                  Standalone High-Resolution QR Code
                </div>
              </div>
            )}
          </div>

          {/* URL Bar */}
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

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={useTemplate && templatedImageSrc ? templatedImageSrc : tokenData.qrDataUrl}
              download={
                useTemplate
                  ? 'bni-festival-voting-poster.png'
                  : 'event-voting-qr.png'
              }
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white text-xs font-semibold transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />{' '}
              {useTemplate ? 'Download Complete Poster (PNG)' : 'Download Standalone QR (PNG)'}
            </a>
            <a
              href={tokenData.accessUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-canvas border border-brand-border hover:bg-brand-border/40 text-xs font-medium text-brand-charcoal transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-secondary" /> Test Voting Page
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
