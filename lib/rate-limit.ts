// Simple in-memory rate limiter
// For production at scale, use Redis (Upstash) instead

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  // Max requests allowed in the window
  limit: number;
  // Time window in seconds
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check rate limit for a given identifier (usually IP or user ID)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  let entry = rateLimitMap.get(key);

  // If no entry or window expired, create new entry
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, entry);
    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: config.windowSeconds,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Get client IP from request headers
 * Works with Vercel's edge network
 */
export function getClientIP(request: Request): string {
  // Vercel sets this header
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Can be comma-separated list, get first IP
    return forwardedFor.split(",")[0].trim();
  }

  // Fallback headers
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  // Default fallback
  return "unknown";
}

// Preset configurations for different endpoint types
export const RATE_LIMITS = {
  // Public endpoints - strict limits
  PUBLIC_WRITE: { limit: 5, windowSeconds: 60 },      // 5 per minute (waitlist signup)
  PUBLIC_READ: { limit: 30, windowSeconds: 60 },      // 30 per minute (search)
  
  // Authenticated endpoints - more lenient
  AUTH_WRITE: { limit: 20, windowSeconds: 60 },       // 20 per minute
  AUTH_READ: { limit: 60, windowSeconds: 60 },        // 60 per minute
  
  // Sensitive operations - very strict
  KEY_OPERATIONS: { limit: 10, windowSeconds: 60 },   // 10 per minute (key validation/redemption)
  
  // Admin endpoints
  ADMIN: { limit: 100, windowSeconds: 60 },           // 100 per minute
} as const;
