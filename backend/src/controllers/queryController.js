const llmService = require("../services/llmService");
const mapsService = require("../services/mapsService");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");

/**
 * Handles the main query processing flow using a RAG (Retrieval-Augmented Generation) approach.
 * It extracts entities from the prompt, retrieves relevant data, and uses an LLM to generate a narrative.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
const processQuery = async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}`;

  try {
    const {
      prompt,
      user_location,
      max_results = 5,
      use_cache = true,
    } = req.body;

    const cacheKey = [prompt, JSON.stringify(user_location)];
    if (use_cache) {
      const cachedResult = await cacheService.get(...cacheKey);
      if (cachedResult) {
        logger.info(`[${requestId}] Using cached result.`);
        return res.json({
          ...cachedResult,
          cached: true,
          request_id: requestId,
          processing_time: Date.now() - startTime,
        });
      }
    }

    logger.info(
      `[${requestId}] Processing query with RAG approach: "${prompt}"`
    );

    // Replace the entire extraction, search, and summary flow with a single RAG call.
    const recommendation =
      await llmService.findPlacesAndGenerateNarrativeWithRAG(
        prompt,
        user_location,
        max_results
      );

    if (!recommendation) {
      return res.status(404).json({
        error: "No recommendations found.",
        request_id: requestId,
      });
    }

    const responseData = {
      llm_text: recommendation.llm_text,
      places: recommendation.places,
      request_id: requestId,
      cached: false,
      processing_time: Date.now() - startTime,
    };

    if (use_cache) {
      await cacheService.set(responseData, 1800, ...cacheKey);
    }

    logger.info(`[${requestId}] Finished in ${responseData.processing_time}ms`);
    res.json(responseData);
  } catch (error) {
    logger.error(`[${requestId}] Query processing failed:`, error);
    res.status(500).json({
      error: "Failed to process query",
      request_id: requestId,
    });
  }
};

const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;

    const cachedDetails = await cacheService.get("place", placeId);
    if (cachedDetails) {
      return res.json(cachedDetails);
    }

    const details = await mapsService.getPlaceDetails(placeId);

    if (!details) {
      return res.status(404).json({ error: "Place not found" });
    }

    await cacheService.set(details, 3600, "place", placeId);

    res.json(details);
  } catch (error) {
    logger.error("Failed to get place details:", error);
    res.status(500).json({ error: "Failed to get place details" });
  }
};

const nearbySearch = async (req, res) => {
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
};

const healthCheck = (req, res) => {
  res.json({
    status: "healthy",
    timestamp: Date.now(),
  });
};

module.exports = {
  processQuery,
  getPlaceDetails,
  nearbySearch,
  healthCheck,
};
