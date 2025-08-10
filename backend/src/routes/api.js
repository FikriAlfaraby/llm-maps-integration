// backend/src/routes/api.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const llmService = require("../services/llmService");
const mapsService = require("../services/mapsService");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");

const router = express.Router();

// Validation middleware
const validateQuery = [
  body("prompt").isString().isLength({ min: 3, max: 500 }),
  body("user_location").optional().isObject(),
  body("user_location.lat").optional().isFloat({ min: -90, max: 90 }),
  body("user_location.lng").optional().isFloat({ min: -180, max: 180 }),
  body("max_results").optional().isInt({ min: 1, max: 10 }),
  body("use_cache").optional().isBoolean(),
];

// Main query endpoint
router.post("/query", validateQuery, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const startTime = Date.now();
  const requestId = `req_${Date.now()}`;

  try {
    const {
      prompt,
      user_location,
      max_results = 5,
      use_cache = true,
    } = req.body;

    // Check cache first
    if (use_cache) {
      const cacheKey = [prompt, JSON.stringify(user_location)];
      const cachedResult = await cacheService.get(...cacheKey);

      if (cachedResult) {
        return res.json({
          ...cachedResult,
          cached: true,
          request_id: requestId,
          processing_time: Date.now() - startTime,
        });
      }
    }

    // Generate LLM response
    logger.info(`Processing query: ${prompt}`);

    const systemPrompt = `
      You are a helpful assistant that recommends places in Indonesia.
      When users ask about places, provide helpful suggestions and context.
      Be specific about locations and provide useful details.
      Respond in the same language as the user's query.
    `;

    const llmResponse = await llmService.generateResponse(prompt, systemPrompt);

    // Extract location entities
    const entities = await llmService.extractLocationEntities(prompt);

    // Search for places
    let places = [];
    const userLocation = user_location
      ? `${user_location.lat},${user_location.lng}`
      : null;

    if (entities.place_types && entities.place_types.length > 0) {
      for (const placeType of entities.place_types.slice(0, 2)) {
        const searchQuery = `${placeType} ${entities.locations.join(" ")}`;
        const results = await mapsService.searchPlaces(
          searchQuery,
          userLocation,
          null,
          placeType
        );
        places.push(...results);
      }
    } else {
      const results = await mapsService.searchPlaces(prompt, userLocation);
      places.push(...results);
    }

    // Limit results
    places = places.slice(0, max_results);

    const responseData = {
      llm_text: llmResponse,
      places,
      request_id: requestId,
      cached: false,
      processing_time: Date.now() - startTime,
    };

    // Cache the result
    if (use_cache) {
      const cacheKey = [prompt, JSON.stringify(user_location)];
      await cacheService.set(responseData, 1800, ...cacheKey);
    }

    logger.info(`Query processed in ${responseData.processing_time}ms`);
    res.json(responseData);
  } catch (error) {
    logger.error("Query processing failed:", error);
    res.status(500).json({
      error: "Failed to process query",
      request_id: requestId,
    });
  }
});

// Get place details
router.get("/place/:placeId", async (req, res) => {
  try {
    const { placeId } = req.params;

    // Check cache
    const cachedDetails = await cacheService.get("place", placeId);
    if (cachedDetails) {
      return res.json(cachedDetails);
    }

    // Fetch from Google Maps
    const details = await mapsService.getPlaceDetails(placeId);

    if (!details) {
      return res.status(404).json({ error: "Place not found" });
    }

    // Cache the result
    await cacheService.set(details, 3600, "place", placeId);

    res.json(details);
  } catch (error) {
    logger.error("Failed to get place details:", error);
    res.status(500).json({ error: "Failed to get place details" });
  }
});

// Nearby search
router.post("/nearby", async (req, res) => {
  try {
    const { location, place_type, radius = 1000, keyword } = req.body;

    if (!location || !place_type) {
      return res
        .status(400)
        .json({ error: "Location and place_type are required" });
    }

    const results = await mapsService.nearbySearch(
      `${location.lat},${location.lng}`,
      place_type,
      radius,
      keyword
    );

    res.json({
      places: results,
      total: results.length,
    });
  } catch (error) {
    logger.error("Nearby search failed:", error);
    res.status(500).json({ error: "Nearby search failed" });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: Date.now(),
  });
});

module.exports = router;
