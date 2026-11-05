import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import CountdownTimer from '../../components/CountdownTimer.jsx';
import { Trophy, Crown, RefreshCw, Maximize2, Minimize2, Check, Sparkles } from 'lucide-react';

export default function DisplayStage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [eventData, setEventData] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [posterSrc, setPosterSrc] = useState(null);
  const [winnerPosterSrc, setWinnerPosterSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [generatingWinnerPoster, setGeneratingWinnerPoster] = useState(false);
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
      // Automatically render the official winner poster
      renderWinnerPoster(res);
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

  // Composite winner names dynamically onto Wiiner template.png
  function renderWinnerPoster(data) {
    if (!data) return;
    setGeneratingWinnerPoster(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const winnerImg = new Image();
    winnerImg.src = '/winner-template.png';

    winnerImg.onload = () => {
      canvas.width = winnerImg.naturalWidth || 5961;
      canvas.height = winnerImg.naturalHeight || 3357;

      ctx.drawImage(winnerImg, 0, 0);

      // Support both results shape: results array (from /api/results/admin/:id) or categories array
      const rawCategories = data.results || data.categories || [];

      // Identify categories: Best Dressing (Diwali Style Icon) and Best Speech (Sparkling Speaker)
      let dressingCat = rawCategories.find(c => {
        const name = (c.categoryName || c.name || '').toLowerCase();
        return name.includes('dress') || name.includes('style') || name.includes('icon');
      });
      let speechCat = rawCategories.find(c => {
        const name = (c.categoryName || c.name || '').toLowerCase();
        return name.includes('speech') || name.includes('speak');
      });

      // Fallbacks if named differently: use 1st for left, 2nd for right
      if (!dressingCat && rawCategories.length > 0) dressingCat = rawCategories[0];
      if (!speechCat && rawCategories.length > 1) speechCat = rawCategories[1];

      function extractWinners(cat) {
        if (!cat) return [];
        if (Array.isArray(cat.winners) && cat.winners.length > 0) {
          return cat.winners.map(w => ({
            name: w.candidateName || w.fullName || w.name || 'Winner',
            votes: w.votes || w.voteCount || 0,
            isJoint: w.isJointWinner || cat.winners.length > 1
          }));
        }
        return [];
      }

      const dressingWinners = extractWinners(dressingCat);
      const speechWinners = extractWinners(speechCat);

      // Card 1 (Left: Diwali Style Icon) geometry
      // In 5961 x 3357 template:
      // White box spans x: 1070 to 3230 (width ~ 2160, center X = 2150)
      // Empty area below the red header badge: y = 1800 to 2820 (height ~ 1020, center Y = 2310)
      const card1 = {
        centerX: 2150,
        centerY: 2310,
        maxWidth: 1850,
      };

      // Card 2 (Right: Sparkling Speaker) geometry
      // White box spans x: 3330 to 5540 (width ~ 2210, center X = 4435)
      // Empty area below the red header badge: y = 1800 to 2820 (height ~ 1020, center Y = 2310)
      const card2 = {
        centerX: 4435,
        centerY: 2310,
        maxWidth: 1850,
      };

      function drawWinnersList(winners, card) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (winners.length === 0) {
          ctx.font = 'italic 500 65px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#8C8C8C';
          ctx.fillText('No Votes Recorded', card.centerX, card.centerY);
          return;
        }

        // Combine all names with comma if tie: e.g. "Alwyn, Bhavya"
        const combinedNames = winners.map(w => w.name).join(', ');
        const votes = winners[0]?.votes ?? 0;
        const isTie = winners.length > 1;

        // Dynamically scale font size according to name string length
        let nameFontSize = 110;
        if (combinedNames.length > 35) {
          nameFontSize = 60;
        } else if (combinedNames.length > 25) {
          nameFontSize = 74;
        } else if (combinedNames.length > 18) {
          nameFontSize = 88;
        } else if (combinedNames.length > 12) {
          nameFontSize = 100;
        }

        ctx.font = `bold ${nameFontSize}px "Plus Jakarta Sans", "Cinzel", "Playfair Display", serif`;
        // Check text width against max box width
        let measuredWidth = ctx.measureText(combinedNames).width;
        if (measuredWidth > card.maxWidth) {
          const ratio = (card.maxWidth - 60) / measuredWidth;
          nameFontSize = Math.max(48, Math.floor(nameFontSize * ratio));
          ctx.font = `bold ${nameFontSize}px "Plus Jakarta Sans", "Cinzel", "Playfair Display", serif`;
        }

        // Vertical spacing: Name at centerY - offset, Vote Count clearly below it
        const gap = Math.max(45, Math.floor(nameFontSize * 0.75));
        const nameY = card.centerY - gap / 2;
        const countY = card.centerY + gap / 2 + 25;

        // Draw Winner Name(s)
        ctx.fillStyle = '#1A1A1A';
        ctx.fillText(combinedNames, card.centerX, nameY);

        // Draw Vote Count / Tie indicator with proper spacing & size
        const voteLabel = votes === 1 ? '1 vote' : `${votes} votes`;
        const countText = isTie
          ? `★ Joint Winner (${voteLabel}) ★`
          : `(${voteLabel})`;

        const countFontSize = Math.min(50, Math.max(38, Math.floor(nameFontSize * 0.45)));
        ctx.font = `bold ${countFontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#B32635'; // Luxury Red Accent
        ctx.fillText(countText, card.centerX, countY);
      }

      drawWinnersList(dressingWinners, card1);
      drawWinnersList(speechWinners, card2);

      try {
        const dataUrl = canvas.toDataURL('image/png', 0.95);
        setWinnerPosterSrc(dataUrl);
      } catch (err) {
        console.error('Canvas export error for winner poster:', err);
      } finally {
        setGeneratingWinnerPoster(false);
      }
    };

    winnerImg.onerror = (e) => {
      console.error('Failed to load /winner-template.png:', e);
      setGeneratingWinnerPoster(false);
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

  const isVotingActive =
    eventData?.status === 'active' &&
    eventData?.end_at &&
    new Date(eventData.end_at).getTime() > Date.now();

  const isVotingConcluded =
    eventData?.status === 'closed' ||
    (eventData?.end_at && new Date(eventData.end_at).getTime() <= Date.now());

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
            <div className="space-y-3 py-1">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold shadow-xs">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                Voting Concluded — Official Winners Revealed!
              </div>

              {loadingWinners && (
                <div className="text-xs text-brand-secondary py-1 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" /> Loading official winners...
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-brand-secondary">
              Awaiting host to activate voting countdown
            </div>
          )}
        </div>

        {/* Dynamic Poster Display: Switches Automatically from QR Poster to Winner Template Poster */}
        <div className="w-full max-w-5xl flex justify-center">
          {isVotingConcluded ? (
            generatingWinnerPoster ? (
              <div className="py-28 text-brand-secondary text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-brand-gold" />
                Composing official winner presentation poster...
              </div>
            ) : winnerPosterSrc ? (
              <div className="relative group max-w-5xl w-full animate-fade-in">
                <img
                  src={winnerPosterSrc}
                  alt="Official Award Winners"
                  className="w-full h-auto rounded-3xl shadow-2xl border border-brand-border/80 object-contain max-h-[70vh] mx-auto"
                />
              </div>
            ) : null
          ) : (
            generatingPoster ? (
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
            ) : null
          )}
        </div>
      </main>

      {/* Stage Footer */}
      <footer className="text-center pt-4 text-[11px] text-brand-secondary max-w-7xl mx-auto w-full">
        {isVotingConcluded
          ? '🎉 Congratulations to all our award winners! Official results verified.'
          : 'Scan the QR code with your mobile camera to launch ballot • One vote per verified attendee'}
      </footer>
    </div>
  );
}
