import QRCode from 'qrcode';
import { query } from '../../database/pool.js';
import { hashToken, generateSecureToken } from '../../utils/crypto.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getEventByToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const res = await query(
    `SELECT e.id, e.title, e.description, e.start_at, e.end_at, e.duration_minutes, e.status
     FROM events e
     WHERE e.access_token_hash = $1`,
    [tokenHash]
  );

  if (res.rowCount === 0) {
    throw new AppError('Invalid or revoked event QR access token', 404, 'INVALID_QR_TOKEN');
  }

  const event = res.rows[0];
  const now = new Date();

  let votingAvailability = 'upcoming';
  if (event.status === 'closed') {
    votingAvailability = 'closed';
  } else if (event.status === 'active' && event.end_at) {
    const end = new Date(event.end_at);
    if (now >= end) {
      votingAvailability = 'closed';
    } else {
      votingAvailability = 'open';
    }
  } else if (event.status === 'draft' || !event.start_at) {
    votingAvailability = 'upcoming';
  } else if (event.start_at && event.end_at) {
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    if (now >= end) {
      votingAvailability = 'closed';
    } else if (now >= start) {
      votingAvailability = 'open';
    } else {
      votingAvailability = 'upcoming';
    }
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      startAt: event.start_at,
      endAt: event.end_at,
      durationMinutes: event.duration_minutes || 5,
      status: event.status,
      votingAvailability,
      serverTime: now.toISOString(),
    },
  };
}

export async function getOrCreateEventToken(eventId) {
  const res = await query(
    `SELECT id, title, start_at, end_at, duration_minutes, status, raw_access_token, access_token_hash FROM events WHERE id = $1`,
    [eventId]
  );

  if (res.rowCount === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  const event = res.rows[0];

  // If already generated, return the existing fixed token
  if (event.raw_access_token) {
    return {
      rawToken: event.raw_access_token,
      title: event.title,
      event,
      isExisting: true,
    };
  }

  // Otherwise generate and store permanently
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  await query(
    `UPDATE events
     SET access_token_hash = $1, raw_access_token = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [tokenHash, rawToken, eventId]
  );

  return {
    rawToken,
    title: event.title,
    event: { ...event, raw_access_token: rawToken, access_token_hash: tokenHash },
    isExisting: false,
  };
}

export async function regenerateEventToken(eventId) {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  const res = await query(
    `UPDATE events
     SET access_token_hash = $1, raw_access_token = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING id, title`,
    [tokenHash, rawToken, eventId]
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

