const redis = require("redis");
const crypto = require("crypto");
const config = require("../config/config");
const logger = require("../utils/logger");

class CacheService {
  constructor() {
    this.client = redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        reconnectStrategy: (retries) => {
          // Retry delay in ms, max 10s
          const delay = Math.min(retries * 100, 10000);
          logger.warn(`Redis reconnect attempt #${retries} in ${delay}ms`);
          return delay;
        },
      },
      password: config.redis.password || undefined,
    });

    this.defaultTTL = config.redis.ttl || 3600;

    this._setupEventListeners();

    // Langsung connect saat class dibuat
    this._connect();
  }

  _setupEventListeners() {
    this.client.on("error", (error) => {
      logger.error("Redis error:", error);
    });

    this.client.on("connect", () => {
      logger.info("Redis connected");
    });

    this.client.on("ready", () => {
      logger.info("Redis client ready for commands");
    });

    this.client.on("end", () => {
      logger.warn("Redis connection closed");
    });
  }

  async _connect() {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
    } catch (error) {
      logger.error("Redis initial connection failed:", error);
    }
  }

  generateKey(...args) {
    const keyString = args.join(":");
    return `llm_maps:${crypto.createHash("md5").update(keyString).digest("hex")}`;
  }

  async get(...args) {
    try {
      if (!this.client.isOpen) await this._connect();
      const key = this.generateKey(...args);
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error("Cache get error:", error);
      return null;
    }
  }

  async set(value, ttl = null, ...args) {
    try {
      if (!this.client.isOpen) await this._connect();
      const key = this.generateKey(...args);
      const expiry = ttl || this.defaultTTL;
      await this.client.setEx(key, expiry, JSON.stringify(value));
      logger.debug(`Cached key: ${key} with TTL: ${expiry}`);
      return true;
    } catch (error) {
      logger.error("Cache set error:", error);
      return false;
    }
  }

  async delete(...args) {
    try {
      if (!this.client.isOpen) await this._connect();
      const key = this.generateKey(...args);
      const result = await this.client.del(key);
      if (result) {
        logger.debug(`Deleted cache key: ${key}`);
      }
      return Boolean(result);
    } catch (error) {
      logger.error("Cache delete error:", error);
      return false;
    }
  }

  async increment(...args) {
    try {
      if (!this.client.isOpen) await this._connect();
      const key = this.generateKey(...args);
      const value = await this.client.incr(key);
      await this.client.expire(key, 60); // 1 minute expiry for counters
      return value;
    } catch (error) {
      logger.error("Cache increment error:", error);
      return 0;
    }
  }

  async quit() {
    try {
      if (this.client.isOpen) {
        await this.client.quit();
        logger.info("Redis connection closed by application");
      }
    } catch (error) {
      logger.error("Error closing Redis connection:", error);
    }
  }
}

module.exports = new CacheService();
