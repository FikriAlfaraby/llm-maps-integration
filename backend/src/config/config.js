require("dotenv").config();

module.exports = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  // Google Maps
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    defaultRegion: process.env.MAPS_DEFAULT_REGION || "ID",
    defaultLanguage: process.env.MAPS_DEFAULT_LANGUAGE || "id",
    defaultLocation: {
      lat: parseFloat(process.env.MAPS_DEFAULT_LAT) || -6.9667,
      lng: parseFloat(process.env.MAPS_DEFAULT_LNG) || 107.6073,
    },
    searchRadius: 5000,
  },

  // LLM
  llm: {
    provider: process.env.LLM_PROVIDER || "ollama",
    endpoint: process.env.LLM_ENDPOINT || "http://localhost:11434",
    model: process.env.LLM_MODEL || "mistral:7b-instruct-q4_0",
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 500,
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
    timeout: parseInt(process.env.LLM_TIMEOUT) || 1000000,
    keepAlive: "5m",
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || "",
    ttl: parseInt(process.env.CACHE_TTL) || 1800,
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || "default-secret-change-this",
    sessionSecret: process.env.SESSION_SECRET || "default-session-secret",
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  },
};
