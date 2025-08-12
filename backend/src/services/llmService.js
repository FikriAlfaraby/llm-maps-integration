// llm-service.js
const axios = require("axios");
const config = require("../config/config");
const logger = require("../utils/logger");
const mapsService = require("../services/mapsService"); // Import mapsService

/**
 * @class LLMService
 * @description A service to interact with local LLMs and integrate with Google Maps APIs.
 * This version enhances the LLM prompt for structured output and implements a RAG-like approach.
 */
class LLMService {
  constructor() {
    // LLM Configuration
    this.provider = config.llm.provider;
    this.endpoint = config.llm.endpoint;
    this.model = config.llm.model;
    this.timeout = config.llm.timeout || 60000;
    this.defaultTemperature = config.llm.temperature ?? 0.7;
    this.defaultMaxTokens = config.llm.maxTokens ?? 500;

    // Google Maps Configuration (Note: mapsService is now a dependency)
    this.googleMapsApiKey = config.googleMaps.apiKey;
    if (!this.googleMapsApiKey) {
      logger.error(
        "GOOGLE_MAPS_API_KEY not found. Please set it as an environment variable."
      );
      throw new Error("Missing Google Maps API Key.");
    }
  }

  /**
   * Generates a response from the configured LLM provider.
   * @param {string} prompt The user's prompt.
   * @param {string | null} systemPrompt The system prompt to guide the LLM.
   * @param {object} opts Additional options for the LLM call.
   * @returns {Promise<string>} The raw text response from the LLM.
   */
  async generateResponse(prompt, systemPrompt = null, opts = {}) {
    try {
      const options = {
        temperature:
          typeof opts.temperature === "number"
            ? opts.temperature
            : this.defaultTemperature,
        maxTokens:
          typeof opts.maxTokens === "number"
            ? opts.maxTokens
            : this.defaultMaxTokens,
        strictJson: !!opts.strictJson,
        timeout: typeof opts.timeout === "number" ? opts.timeout : this.timeout,
      };

      switch (this.provider) {
        case "ollama":
          return await this.ollamaGenerate(prompt, systemPrompt, options);
        case "llamacpp":
          return await this.llamacppGenerate(prompt, systemPrompt, options);
        default:
          throw new Error(`Unknown LLM provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error("LLM generation failed:", error.message || error);
      throw error;
    }
  }

  /**
   * Sends a request to an Ollama server to generate a chat response.
   * @param {string} prompt The user's prompt.
   * @param {string | null} systemPrompt The system prompt.
   * @param {object} opts Options for the Ollama API call.
   * @returns {Promise<string>} The text response from Ollama.
   */
  async ollamaGenerate(prompt, systemPrompt, opts = {}) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const body = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: opts.temperature,
        num_predict: opts.maxTokens,
      },
    };

    try {
      logger.info(
        `Calling Ollama ${this.endpoint}/api/chat model=${this.model}`
      );

      const response = await axios.post(`${this.endpoint}/api/chat`, body, {
        timeout: opts.timeout,
        headers: { "Content-Type": "application/json" },
      });

      const rawText =
        response.data?.message?.content || response.data?.response;
      if (!rawText || typeof rawText !== "string") {
        throw new Error("Invalid response shape from Ollama");
      }
      return rawText;
    } catch (error) {
      // Improved error handling
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error(
            `Model '${this.model}' not found. Run: 'ollama pull ${this.model}'`
          );
        }
        throw new Error(
          `Ollama API error (${error.response.status}): ${JSON.stringify(error.response.data)}`
        );
      } else if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Cannot connect to Ollama. Ensure 'ollama serve' is running."
        );
      } else if (error.code === "ETIMEDOUT") {
        throw new Error(
          "Ollama request timed out. The model may be loading or the server is busy."
        );
      }
      throw new Error(
        `Failed to generate LLM response from Ollama: ${error.message}`
      );
    }
  }

  /**
   * Sends a request to a llama.cpp server to generate a completion.
   * @param {string} prompt The user's prompt.
   * @param {string | null} systemPrompt The system prompt.
   * @param {object} opts Options for the llama.cpp API call.
   * @returns {Promise<string>} The text response from llama.cpp.
   */
  async llamacppGenerate(prompt, systemPrompt, opts = {}) {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    try {
      const response = await axios.post(
        `${this.endpoint}/completion`,
        {
          prompt: fullPrompt,
          temperature: opts.temperature,
          max_tokens: opts.maxTokens,
          stop: ["\n\n", "User:", "Assistant:"],
        },
        { timeout: opts.timeout }
      );
      const rawText = response.data?.content || response.data?.response;
      if (!rawText) {
        throw new Error("Invalid response shape from llama.cpp");
      }
      return rawText;
    } catch (error) {
      throw new Error(
        `Failed to generate LLM response from Llama.cpp: ${error.message || error}`
      );
    }
  }

  /**
   * Implements a RAG (Retrieval-Augmented Generation) approach for recommendations.
   * 1. Extracts entities from the prompt.
   * 2. Searches for relevant places using mapsService.
   * 3. Creates a RAG prompt using the search results as context.
   * 4. Asks the LLM to generate a narrative from the context.
   * @param {string} userPrompt - The original prompt from the user.
   * @param {object} userLocation - The user's geographical location (optional).
   * @param {number} maxResults - The maximum number of search results to retrieve.
   * @returns {Promise<{llm_text: string, places: array}>}
   */
  async findPlacesAndGenerateNarrativeWithRAG(
    userPrompt,
    userLocation,
    maxResults = 5
  ) {
    try {
      logger.info(`Starting RAG process for prompt: "${userPrompt}"`);

      // Step 1: Entity Extraction
      const entities = await this.extractLocationEntities(userPrompt);
      logger.info("Extracted entities:", entities);

      const searchKeywords =
        entities.place_types?.length > 0
          ? entities.place_types.join(" ")
          : userPrompt;
      const searchLocation = entities.locations?.join(" ") || "";

      const mapsQuery = `${searchKeywords} ${searchLocation}`.trim();
      logger.info(`Maps Query: ${mapsQuery}`);

      // Step 2: Retrieval - Get data from Google Maps
      const userLocationStr = userLocation
        ? `${userLocation.lat},${userLocation.lng}`
        : null;

      const places = await mapsService.searchPlaces(
        mapsQuery,
        userLocationStr,
        null,
        null
      );

      // Handle no places found scenario
      if (!places || places.length === 0) {
        logger.warn(
          "No places found from Google Maps. Generating a friendly response."
        );
        const noResultsPrompt = `Berikan tanggapan yang ramah kepada pengguna bahwa tidak ada tempat yang ditemukan untuk permintaan mereka: "${userPrompt}".`;
        const noResultsNarrative = await this.generateResponse(
          noResultsPrompt,
          "Kamu adalah asisten rekomendasi yang ramah dan membantu."
        );
        return { llm_text: noResultsNarrative, places: [] };
      }

      const limitedPlaces = places.slice(0, maxResults);

      // Step 3: Augmentation - Add data to the LLM prompt
      // The prompt is optimized to provide interpretation, not just a narrative summary.
      const mapsSummaryPrompt = `
        Berdasarkan daftar tempat berikut, berikan ringkasan yang menarik dan singkat dalam Bahasa Indonesia.
        Fokus pada rekomendasi utama, mengapa tempat tersebut menonjol (misalnya, peringkat tinggi, banyak ulasan), atau hubungan antar tempat (misalnya, "ada beberapa pilihan kafe yang cocok untuk kerja").
        Jangan ulangi nama tempat, alamat, atau link. Cukup berikan ringkasan yang cerdas untuk membantu pengguna menafsirkan daftar di bawah ini.
        
        Daftar tempat:
        ${JSON.stringify(limitedPlaces, null, 2)}
      `;

      // Step 4: Generation - Ask the LLM to summarize and create a narrative
      const llmNarrative = await this.generateResponse(
        mapsSummaryPrompt,
        "You are a friendly and helpful Indonesian travel & food recommendation assistant."
      );

      return {
        llm_text: llmNarrative,
        places: limitedPlaces,
      };
    } catch (error) {
      logger.error("Failed to execute RAG process:", error.message || error);
      throw error;
    }
  }

  /**
   * Extracts location entities (place names, types, locations) from a user's text prompt.
   * @param {string} text - The user's prompt.
   * @returns {Promise<object>} A JSON object with extracted entities.
   */
  async extractLocationEntities(text) {
    const extractionSystem = `
You are a JSON extractor. You are excellent at extracting location and place information from user queries.
Your response MUST be a single, valid JSON object and nothing else.
The JSON object MUST have the following schema:
{
  "place_names": string[],  // An array of specific business or place names (e.g., "Warung MJS", "Aroma Kopi").
  "place_types": string[],  // An array of normalized place types, in English (e.g., "restaurant", "cafe", "park", "museum").
  "locations": string[]     // An array of city or area names (e.g., "Bandung", "Jakarta").
}

If no entities are found for a key, the array should be empty.
Use a deterministic style: temperature 0.0, short concise output.

Example User Prompt:
"Where can I find a good restaurant in Bandung? Maybe something like Warung MJS."

Example Output:
{"place_names":["Warung MJS"],"place_types":["restaurant"],"locations":["Bandung"]}

Return only the JSON object.
`.trim();

    const extractionPrompt = `Extract from: """${text}"""`;

    try {
      const llmRaw = await this.generateResponse(
        extractionPrompt,
        extractionSystem,
        {
          temperature: 0.0,
          maxTokens: 200,
          strictJson: true,
          timeout: 20000,
        }
      );

      const parsed = this._attemptParseJson(llmRaw);
      return this._normalizeEntities(parsed);
    } catch (err) {
      logger.warn(
        "extractLocationEntities: LLM extraction failed, using simple fallback:",
        err.message || err
      );
      // Simplified fallback logic
      return this._normalizeEntities({
        place_names: [],
        place_types: this.extractPlaceTypes(text),
        locations: this.extractLocations(text),
      });
    }
  }

  /**
   * Attempts to parse a JSON string, handling common LLM output issues like extra text or malformed JSON.
   * @param {string} str - The raw string from the LLM.
   * @returns {object} The parsed JSON object.
   * @private
   */
  _attemptParseJson(str) {
    if (!str || typeof str !== "string") {
      throw new Error("No string to parse");
    }

    let cleanedStr = str.trim();
    // Remove common markdown code block wrappers
    if (cleanedStr.startsWith("```json")) {
      cleanedStr = cleanedStr.slice(7);
    }
    if (cleanedStr.endsWith("```")) {
      cleanedStr = cleanedStr.slice(0, -3);
    }
    cleanedStr = cleanedStr.trim();

    try {
      return JSON.parse(cleanedStr);
    } catch (e) {
      // Fallback for simple parsing errors
      logger.warn("Initial JSON parse failed, attempting aggressive cleanup.");
      const aggressiveFix = cleanedStr
        .replace(/[\u2018\u2019]/g, "'") // Replace curly quotes with straight quotes
        .replace(/'/g, '"') // Replace all single quotes with double quotes
        .replace(/,\s*([}\]])/g, "$1"); // Remove trailing commas
      try {
        return JSON.parse(aggressiveFix);
      } catch (e2) {
        throw new Error(
          "Unable to parse JSON from LLM response even after aggressive cleanup."
        );
      }
    }
  }

  /**
   * Normalizes the extracted entities to ensure consistent data types and formats.
   * @param {object} raw - The raw entity object.
   * @returns {object} The normalized entity object.
   * @private
   */
  _normalizeEntities(raw) {
    const out = {
      place_names: [],
      place_types: [],
      locations: [],
    };
    if (!raw || typeof raw !== "object") return out;

    out.place_names = Array.isArray(raw.place_names)
      ? [
          ...new Set(
            raw.place_names.map((p) => String(p).trim()).filter(Boolean)
          ),
        ]
      : [];
    out.place_types = Array.isArray(raw.place_types)
      ? [
          ...new Set(
            raw.place_types
              .map((p) => this._normalizePlaceType(p))
              .filter(Boolean)
          ),
        ]
      : [];
    out.locations = Array.isArray(raw.locations)
      ? [
          ...new Set(
            raw.locations
              .map((l) => String(l).toLowerCase().trim())
              .filter(Boolean)
          ),
        ]
      : [];

    return out;
  }

  /**
   * Maps common Indonesian place types to a standardized English format.
   * @param {string} type - The raw place type string.
   * @returns {string | null} The normalized type or null if not found.
   * @private
   */
  _normalizePlaceType(type) {
    if (!type) return null;
    const t = type.toLowerCase().trim();
    const map = {
      restoran: "restaurant",
      "rumah makan": "restaurant",
      warung: "restaurant",
      resto: "restaurant",
      cafe: "cafe",
      kafe: "cafe",
      "coffee shop": "cafe",
      kedai: "cafe",
      hotel: "hotel",
      mall: "mall",
      taman: "park",
      "tempat wisata": "point_of_interest",
      co_working: "coworking_space",
    };
    return map[t] || t;
  }

  /**
   * Simple regex-based fallback to extract common place types from text.
   * @param {string} text - The input text.
   * @returns {string[]} An array of extracted place types.
   * @private
   */
  extractPlaceTypes(text) {
    const placeTypes = {
      restaurant: ["restaurant", "restoran", "rumah makan", "warung", "resto"],
      cafe: ["cafe", "kafe", "coffee shop", "kedai", "kedai kopi"],
      hotel: ["hotel"],
      mall: ["mall"],
      park: ["park", "taman"],
      point_of_interest: ["tempat wisata"],
      // Add other types as needed
    };
    const found = new Set();
    const textLower = text.toLowerCase();

    for (const type in placeTypes) {
      for (const keyword of placeTypes[type]) {
        if (textLower.includes(keyword)) {
          found.add(type);
          break;
        }
      }
    }
    return Array.from(found);
  }

  /**
   * Simple regex-based fallback to extract common city locations from text.
   * @param {string} text - The input text.
   * @returns {string[]} An array of extracted locations.
   * @private
   */
  extractLocations(text) {
    const locations = [
      "bandung",
      "jakarta",
      "surabaya",
      "yogyakarta",
      "jogja",
      "bali",
      "medan",
      "semarang",
      "makassar",
      "palembang",
      "tangerang",
      "depok",
      "bekasi",
      "bogor",
      "denpasar",
      "malang",
    ];
    const textLower = text.toLowerCase();
    const found = new Set();

    locations.forEach((location) => {
      if (textLower.includes(location)) {
        found.add(location);
      }
    });

    const cityRegex =
      /\b(?:kota|kabupaten|di|di kota)\s+([A-Za-z\u00C0-\u017F' -]{3,40})/gi;
    let match;
    while ((match = cityRegex.exec(textLower)) !== null) {
      found.add(match[1].trim());
    }

    return Array.from(found);
  }

  // Connection and model check methods remain the same
  async testConnection() {
    try {
      if (this.provider === "ollama") {
        const response = await axios.get(`${this.endpoint}/api/tags`, {
          timeout: 5000,
        });
        logger.info("Ollama connection test successful");
        logger.info(
          "Available models:",
          response.data.models?.map((m) => m.name).join(", ")
        );
        return true;
      }
      return false;
    } catch (error) {
      logger.error("LLM connection test failed:", error.message);
      return false;
    }
  }

  async checkModel() {
    try {
      if (this.provider === "ollama") {
        const response = await axios.get(`${this.endpoint}/api/tags`, {
          timeout: 5000,
        });
        const models = response.data.models || [];
        const modelExists = models.some((m) => m.name === this.model);
        if (!modelExists) {
          logger.warn(
            `Model '${this.model}' not found. Available models: ${models.map((m) => m.name).join(", ")}`
          );
          return false;
        }
        logger.info(`Model '${this.model}' is available`);
        return true;
      }
      return true;
    } catch (error) {
      logger.error("Failed to check model availability:", error.message);
      return false;
    }
  }
}

module.exports = new LLMService();
