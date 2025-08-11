const llmService = require("../services/llmService");
const mapsService = require("../services/mapsService");
const cacheService = require("../services/cacheService");
const logger = require("../utils/logger");

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
        return res.json({
          ...cachedResult,
          cached: true,
          request_id: requestId,
          processing_time: Date.now() - startTime,
        });
      }
    }

    logger.info(`[${requestId}] Parsing prompt dengan LLM: "${prompt}"`);

    const entities = await llmService.extractLocationEntities(prompt);
    const searchKeywords =
      entities.place_types?.length > 0
        ? entities.place_types.join(" ")
        : prompt;
    const searchLocation = entities.locations?.join(" ") || "";

    const mapsQuery = `${searchKeywords} ${searchLocation}`.trim();
    logger.info(`[${requestId}] Query Maps: ${mapsQuery}`);

    const userLocationStr = user_location
      ? `${user_location.lat},${user_location.lng}`
      : null;

    const places = await mapsService.searchPlaces(
      mapsQuery,
      userLocationStr,
      null,
      null
    );

    if (!places || places.length === 0) {
      return res.status(404).json({
        error: "No places found",
        request_id: requestId,
      });
    }

    const limitedPlaces = places.slice(0, max_results);

    const mapsSummaryPrompt = `
      Buat deskripsi singkat yang ramah dan informatif untuk user, berdasarkan daftar tempat berikut:
      ${JSON.stringify(limitedPlaces, null, 2)}
      Gunakan bahasa yang sama dengan query asli.
      Jangan menambahkan tempat baru yang tidak ada di daftar.
    `;
    const llmNarrative = await llmService.generateResponse(
      mapsSummaryPrompt,
      "You are a friendly travel & food recommendation assistant."
    );

    const responseData = {
      llm_text: llmNarrative,
      places: limitedPlaces,
      request_id: requestId,
      cached: false,
      processing_time: Date.now() - startTime,
    };

    if (use_cache) {
      await cacheService.set(responseData, 1800, ...cacheKey);
    }

    logger.info(
      `[${requestId}] Selesai dalam ${responseData.processing_time}ms`
    );
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
