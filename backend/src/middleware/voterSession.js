import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';

export function createVoterSessionCookie(res, { eventId, memberId, memberName }) {
  const token = jwt.sign(
    {
      eventId,
      memberId,
      memberName,
      type: 'voter_session',
    },
    config.session.secret,
    { expiresIn: '30m' } // 30 minutes active window
  );

  res.cookie(config.session.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: config.session.maxAge,
    path: '/',
  });

  return token;
}

export function clearVoterSessionCookie(res) {
  res.clearCookie(config.session.cookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

export function requireVoterSession(req, res, next) {
  const token = req.cookies?.[config.session.cookieName];

  if (!token) {
    return next(
      new AppError(
        'No active voting session found. Please select your name again.',
        401,
        'SESSION_EXPIRED'
      )
    );
  }

  try {
    const decoded = jwt.verify(token, config.session.secret);
    if (decoded.type !== 'voter_session' || !decoded.eventId || !decoded.memberId) {
      return next(new AppError('Invalid voting session format', 401, 'INVALID_SESSION'));
    }

    req.voterSession = {
      eventId: decoded.eventId,
      memberId: decoded.memberId,
      memberName: decoded.memberName,
    };
    next();
  } catch (err) {
    return next(
      new AppError(
        'Your voting session has expired. Please select your name again to continue.',
        401,
        'SESSION_EXPIRED'
      )
    );
  }
}

