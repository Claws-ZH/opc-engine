/**
 * config.ts — Centralised env reader.
 *
 * One place to read process.env. Throws early on misconfiguration so we never
 * boot a half-configured service. Feature code imports `config` directly.
 */
const required = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
};

const optional = (name: string, fallback = ''): string =>
  process.env[name] ?? fallback;

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '3000')),
  mongoUri: required('MONGODB_URI', 'mongodb://localhost:27017/opc'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  apiKey: {
    salt: required('OPC_API_KEY_SALT', 'change-me-in-prod'),
    // Comma-separated hex SHA1 hashes. Empty => dev bypass.
    allowedHashes: optional('OPC_API_KEY_HASHES')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  twitter: {
    clientId: optional('TWITTER_CLIENT_ID'),
    clientSecret: optional('TWITTER_CLIENT_SECRET'),
    redirectUri: optional(
      'TWITTER_REDIRECT_URI',
      'http://localhost:3000/oauth/twitter/callback',
    ),
  },

  scheduler: {
    enabled: optional('ENABLE_SCHEDULER', 'true') === 'true',
  },
} as const;

export type AppConfig = typeof config;
