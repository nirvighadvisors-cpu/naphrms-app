import rateLimit from 'express-rate-limit';

/**
 * Global API rate limiter — protects all endpoints from abuse.
 * 500 requests per 15-minute window per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable `X-RateLimit-*` headers
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
  },
});

/**
 * Strict auth rate limiter — protects login, forgot-password, activate, reset-password.
 * 15 requests per 15-minute window per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
  // Skip successful requests so they don't count against the limit
  skipSuccessfulRequests: true,
});
