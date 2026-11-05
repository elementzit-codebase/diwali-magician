import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import CountdownTimer from '../../components/CountdownTimer.jsx';
import { Trophy, Crown, RefreshCw, Maximize2, Minimize2, Check } from 'lucide-react';

export default function DisplayStage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [eventData, setEventData] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [posterSrc, setPosterSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [winnersData, setWinnersData] = useState(null);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEventAndQR(eventId);
    }
  }, [eventId]);

  async function loadEventAndQR(id) {
    setLoading(true);
    try {
      const res = await api.get(`/api/qr/event/${id}`);
      setTokenData(res);
      if (res.event) {
        setEventData(res.event);
        checkAndFetchWinners(res.event);
      }
      if (res.qrDataUrl) {
        renderPosterWithQR(res.qrDataUrl, res.event);
      }
    } catch (err) {
      console.error('Failed to load display stage data:', err);
    } finally {
      setLoading(false);
    }
  }

  function checkAndFetchWinners(eventObj) {
    if (!eventObj) return;
    const now = Date.now();
    const isPast = eventObj.end_at && new Date(eventObj.end_at).getTime() <= now;
    if (eventObj.status === 'closed' || isPast) {
      fetchEventWinners(eventObj.id);
    }
  }

  async function fetchEventWinners(id) {
    setLoadingWinners(true);
    try {
      const res = await api.get(`/api/results/admin/${id}`);
      setWinnersData(res);
    } catch (err) {
      console.error('Failed to fetch winners:', err);
    } finally {
      setLoadingWinners(false);
    }
  }

  function renderPosterWithQR(qrDataUrl, eventObj) {
    if (!qrDataUrl) return;
    setGeneratingPoster(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const templateImg = new Image();
    templateImg.src = '/template-bni.png';

    templateImg.onload = () => {
      canvas.width = templateImg.naturalWidth; // 5962
      canvas.height = templateImg.naturalHeight; // 3358

      // Draw background poster template
      ctx.drawImage(templateImg, 0, 0);

      const qrImg = new Image();
      qrImg.src = qrDataUrl;

      qrImg.onload = () => {
        // Target frame geometry for Template BNI
        const boxX = 2570;
        const boxY = 310;
        const boxW = 2810;
        const boxH = 2800;

        const qrSize = 2200;
        const qrX = boxX + (boxW - qrSize) / 2;
        const qrY = boxY + (boxH - qrSize) / 2 - 40;

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        const title = eventObj?.title || '';
        if (title) {
          ctx.font = 'bold 72px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#252525';
          ctx.textAlign = 'center';
          ctx.fillText(title, boxX + boxW / 2, qrY + qrSize + 90);
        }

        ctx.font = '600 52px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#B99A65';
        ctx.textAlign = 'center';
        ctx.fillText('Scan with mobile camera to vote', boxX + boxW / 2, qrY + qrSize + 170);

        try {
          const dataUrl = canvas.toDataURL('image/png', 0.92);
          setPosterSrc(dataUrl);
        } catch (err) {
          console.error('Canvas export error:', err);
        } finally {
          setGeneratingPoster(false);
        }
      };

      qrImg.onerror = () => {
        setGeneratingPoster(false);
      };
    };

    templateImg.onerror = () => {
      setGeneratingPoster(false);
    };
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] text-sm text-brand-secondary">
        <RefreshCw className="w-5 h-5 animate-spin text-brand-gold mr-2" />
        Loading Stage Display...
      </div>
    );
  }

  const isVotingActive = eventData?.status === 'active' && eventData?.end_at && new Date(eventData.end_at).getTime() > Date.now();
  const isVotingConcluded = eventData?.status === 'closed' || (eventData?.end_at && new Date(eventData.end_at).getTime() <= Date.now());

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-brand-charcoal flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      {/* Top Floating Controls */}
      <header className="w-full flex items-center justify-between max-w-7xl mx-auto pb-4">
        <div className="text-left">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brand-gold">
            Live Presentation Screen
          </span>
          <h1 className="font-serif-title text-lg sm:text-xl font-bold text-brand-charcoal">
            {eventData?.title || 'Awards Voting'}
          </h1>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-brand-border text-xs font-medium text-brand-charcoal hover:bg-brand-canvas shadow-xs flex items-center gap-1.5 transition-colors"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Fullscreen Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Center Display Body */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full space-y-6">
        {/* Countdown Header */}
        <div className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-6 border border-brand-border shadow-sm text-center">
          {isVotingActive ? (
            <CountdownTimer
              targetDate={eventData.end_at}
              label="Active Voting Concludes In"
              variant="luxurious"
              onExpire={() => {
                if (eventId) {
                  fetchEventWinners(eventId);
                  loadEventAndQR(eventId);
                }
              }}
            />
          ) : isVotingConcluded ? (
            <div className="space-y-4 py-2">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <Check className="w-4 h-4" /> Voting Has Concluded
              </div>

              {loadingWinners ? (
                <div className="text-xs text-brand-secondary py-3 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" /> Loading official winners...
                </div>
              ) : winnersData?.categories ? (
                <div className="space-y-4 pt-2">
                  <div className="font-serif-title text-lg sm:text-xl font-bold text-brand-charcoal flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-brand-gold" /> Official Award Winners
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
                    {winnersData.categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-4 rounded-2xl bg-brand-canvas border border-brand-border shadow-xs space-y-2"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold">
                          {cat.name}
                        </span>
                        {cat.winners && cat.winners.length > 0 ? (
                          cat.winners.map((win) => (
                            <div key={win.memberId} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-brand-charcoal">
                                <Crown className="w-4 h-4 text-brand-gold" />
                                {win.fullName}
                              </div>
                              <span className="text-[11px] font-semibold text-brand-red bg-brand-red/10 px-2.5 py-0.5 rounded-md">
                                {win.voteCount} votes
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-brand-secondary italic">No votes cast</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => fetchEventWinners(eventId)}
                    className="px-5 py-2.5 rounded-xl bg-brand-gold text-white text-xs font-semibold hover:bg-brand-gold/90 transition-all shadow-sm"
                  >
                    Reveal Winners
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-brand-secondary">
              Awaiting host to activate voting countdown
            </div>
          )}
        </div>

        {/* Poster with Embedded QR Code (Clean, no switcher) */}
        <div className="w-full max-w-4xl flex justify-center">
          {generatingPoster ? (
            <div className="py-24 text-brand-secondary text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-gold" />
              Rendering official voting poster with live QR code...
            </div>
          ) : posterSrc ? (
            <div className="relative group max-w-4xl w-full">
              <img
                src={posterSrc}
                alt="Official BNI Festival Voting Poster"
                className="w-full h-auto rounded-3xl shadow-xl border border-brand-border/80 object-contain max-h-[68vh] mx-auto"
              />
            </div>
          ) : tokenData?.qrDataUrl ? (
            <div className="p-8 bg-white rounded-3xl shadow-lg border border-brand-border text-center space-y-3">
              <img
                src={tokenData.qrDataUrl}
                alt="Event Voting QR Code"
                className="w-80 h-80 mx-auto rounded-2xl"
              />
              <p className="text-xs text-brand-secondary">Scan with mobile camera to vote</p>
            </div>
          ) : null}
        </div>
      </main>

      {/* Stage Footer */}
      <footer className="text-center pt-4 text-[11px] text-brand-secondary max-w-7xl mx-auto w-full">
        Scan the QR code with your mobile camera to launch ballot • One vote per verified attendee
      </footer>
    </div>
  );
}

