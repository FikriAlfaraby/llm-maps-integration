// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
require("dotenv").config();

const config = require("./config/config");
const logger = require("./utils/logger");
const apiRoutes = require("./routes/queryRoutes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: config.security.corsOrigin,
    credentials: true,
    optionsSuccessStatus: 200,
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
  message: {
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});
app.use("/api/", limiter);

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LLM Maps Integration API",
      version: "1.0.0",
      description: "API documentation for the LLM Maps Integration backend.",
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
      },
    ],
  },
  apis: ["./src/routes/queryRoutes.js"],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", apiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  const response = {
    error: "Internal server error",
  };
  if (process.env.NODE_ENV === "development") {
    response.message = err.message;
    response.stack = err.stack;
  }
  res.status(500).json(response);
});

const PORT = config.port || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(
    `Environment: ${config.nodeEnv || process.env.NODE_ENV || "unknown"}`
  );
  logger.info(`LLM Provider: ${config.llm?.provider || "not configured"}`);
  logger.info(`LLM Model: ${config.llm?.model || "not configured"}`);
  logger.info(
    `API Documentation available at http://localhost:${PORT}/api-docs`
  );
});

module.exports = app;
