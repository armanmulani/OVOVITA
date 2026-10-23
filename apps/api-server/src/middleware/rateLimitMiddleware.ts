import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * In-memory sliding window rate limiter
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const routeKey = `${ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    const record = rateLimitStore.get(routeKey);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(routeKey, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', options.max - 1);
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests. Please try again later.',
          retryAfterSeconds,
        },
      });
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', options.max - record.count);
    return next();
  };
};

// Standard presets
export const otpRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 100 : 5,
  message: 'Too many OTP requests from this device. Please wait 1 minute before retrying.',
});

export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many login attempts. Please wait 1 minute.',
});

/**
 * Limits attempts per *subject* (e.g. one phone number) rather than per IP.
 *
 * The per-IP limiter is not the control that matters for OTP guessing: a
 * single attacker can rotate source addresses, but they are still guessing
 * against one account. Keying on the number being verified means a 6-digit
 * code cannot be brute-forced by simply re-requesting an OTP and retrying.
 */
export const createSubjectRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  subject: (req: Request) => string;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const subject = options.subject(req);
    if (!subject) return next();

    const routeKey = `subject:${subject}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    const record = rateLimitStore.get(routeKey);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(routeKey, { count: 1, resetTime: now + options.windowMs });
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', options.max - 1);
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many attempts. Please wait before retrying.',
          retryAfterSeconds,
        },
      });
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', options.max - record.count);
    return next();
  };
};

/**
 * Reduces a phone number to its bare national form so the same person cannot
 * sidestep a per-number limit by toggling between `9876543210` and
 * `+919876543210`.
 */
const nationalSubject = (req: Request): string => {
  const raw = (req.body as any)?.phoneNumber;
  if (typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

/**
 * Caps how many OTP codes may be *verified* for one phone number in a
 * 15-minute window. Ten is generous for a human who mistypes a code, and
 * tight enough that a 6-digit space cannot be walked.
 */
export const otpVerifySubjectLimiter = createSubjectRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    'Too many verification attempts for this number. Please request a new code and try again.',
  subject: nationalSubject,
});

/**
 * Caps PIN attempts for one staff account, so a stolen phone number cannot be
 * brute-forced from many addresses.
 */
export const staffLoginSubjectLimiter = createSubjectRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many PIN attempts for this account. Please wait before trying again.',
  subject: nationalSubject,
});
