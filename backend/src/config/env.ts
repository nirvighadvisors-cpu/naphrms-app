import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiry: process.env.JWT_EXPIRY || '8h',

  // Email (Resend)
  resendApiKey: process.env.RESEND_API_KEY!,
  emailFrom: process.env.EMAIL_FROM || 'NAP HRMS <noreply@nirvighadvisors.com>',

  // Supabase Storage
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,

  // Security
  encryptionKey: process.env.ENCRYPTION_KEY!,

  // Redis (optional in dev)
  redisUrl: process.env.REDIS_URL || '',

  // Web Push (VAPID)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:hr@nirvighadvisors.com',

  // App
  appUrl: process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  inviteTokenExpiryHours: 72,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  bcryptSaltRounds: 12,

  // Cookie (production cross-subdomain support)
  cookieDomain: process.env.COOKIE_DOMAIN || '',

  // Render self-ping
  renderExternalUrl: process.env.RENDER_EXTERNAL_URL || '',
} as const;

// Validate required env vars on startup
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'RESEND_API_KEY', 'ENCRYPTION_KEY'];

export function validateEnv(): void {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
