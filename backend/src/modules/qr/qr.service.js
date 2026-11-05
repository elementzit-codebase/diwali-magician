import QRCode from 'qrcode';
import { query } from '../../database/pool.js';
import { hashToken, generateSecureToken } from '../../utils/crypto.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getEventByToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const res = await query(
    `SELECT e.id, e.title, e.description, e.start_at, e.end_at, e.status
     FROM events e
     WHERE e.access_token_hash = $1`,
    [tokenHash]
  );

  if (res.rowCount === 0) {
    throw new AppError('Invalid or revoked event QR access token', 404, 'INVALID_QR_TOKEN');
  }

  const event = res.rows[0];
  const now = new Date();
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  let votingAvailability = 'open';
  if (event.status === 'closed' || now >= end) {
    votingAvailability = 'closed';
  } else if (now < start || event.status === 'scheduled') {
    votingAvailability = 'upcoming';
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      startAt: event.start_at,
      endAt: event.end_at,
      status: event.status,
      votingAvailability,
      serverTime: now.toISOString(),
    },
  };
}

export async function regenerateEventToken(eventId) {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  const res = await query(
    `UPDATE events
     SET access_token_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, title`,
    [tokenHash, eventId]
  );

  if (res.rowCount === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  return { rawToken };
}

export async function revokeEventToken(eventId) {
  // Overwrite token hash with a dead random hash so existing QR codes immediately fail
  const deadToken = generateSecureToken(32);
  const deadHash = hashToken(deadToken);

  const res = await query(
    `UPDATE events
     SET access_token_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id`,
    [deadHash, eventId]
  );

  if (res.rowCount === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  return { revoked: true };
}

export async function generateQrDataUrl(accessUrl) {
  return QRCode.toDataURL(accessUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    color: {
      dark: '#B32635', // Luxury brand red
      light: '#FFFFFF',
    },
    width: 400,
  });
}

