import dotenv from 'dotenv';

dotenv.config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[Config] WARNING: ANTHROPIC_API_KEY is not set. Questions will be served from the fallback bank.');
}

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
};
