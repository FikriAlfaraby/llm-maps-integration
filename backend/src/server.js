const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ path: "../.env" });

const config = require("./config/config");
const logger = require("./utils/logger");
const apiRoutes = require("./routes/queryRoutes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: config.security.corsOrigin,
    credentials: true,
  })
);

app.use(compression());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: "Too many requests, please try again later.",
});

app.use("/api/", limiter);

app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`LLM Provider: ${config.llm.provider}`);
  logger.info(`LLM Model: ${config.llm.model}`);
});

module.exports = app;
