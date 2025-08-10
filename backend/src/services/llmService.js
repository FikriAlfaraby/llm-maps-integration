// backend/src/services/llmService.js
const axios = require("axios");
const config = require("../config/config");
const logger = require("../utils/logger");

class LLMService {
  constructor() {
    this.provider = config.llm.provider;
    this.endpoint = config.llm.endpoint;
    this.model = config.llm.model;
    this.timeout = config.llm.timeout;
  }

  async generateResponse(prompt, systemPrompt = null) {
    try {
      switch (this.provider) {
        case "ollama":
          return await this.ollamaGenerate(prompt, systemPrompt);
        case "llamacpp":
          return await this.llamacppGenerate(prompt, systemPrompt);
        default:
          throw new Error(`Unknown LLM provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error("LLM generation failed:", error);
      throw error;
    }
  }

  async ollamaGenerate(prompt, systemPrompt) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    try {
      const response = await axios.post(
        `${this.endpoint}/api/chat`,
        {
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: config.llm.temperature,
            max_tokens: config.llm.maxTokens,
          },
        },
        { timeout: this.timeout }
      );

      return response.data.message.content;
    } catch (error) {
      logger.error("Ollama API error:", error.message);
      throw new Error("Failed to generate LLM response");
    }
  }

  async llamacppGenerate(prompt, systemPrompt) {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    try {
      const response = await axios.post(
        `${this.endpoint}/completion`,
        {
          prompt: fullPrompt,
          temperature: config.llm.temperature,
          max_tokens: config.llm.maxTokens,
          stop: ["\n\n", "User:", "Assistant:"],
        },
        { timeout: this.timeout }
      );

      return response.data.content;
    } catch (error) {
      logger.error("Llama.cpp API error:", error.message);
      throw new Error("Failed to generate LLM response");
    }
  }

  async extractLocationEntities(text) {
    const extractionPrompt = `
      Extract location information from this text: "${text}"
      
      Return as JSON with these keys:
      - place_names: list of specific place names
      - place_types: list of place types (restaurant, cafe, etc)
      - locations: list of area/city names
      
      Only return valid JSON, no explanation.
    `;

    try {
      const response = await this.generateResponse(extractionPrompt);

      // Clean and parse JSON
      let jsonStr = response.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      logger.warn("Failed to extract entities, using fallback");
      return {
        place_names: [],
        place_types: this.extractPlaceTypes(text),
        locations: this.extractLocations(text),
      };
    }
  }

  extractPlaceTypes(text) {
    const placeTypes = [
      "restaurant",
      "cafe",
      "coffee shop",
      "warung",
      "hotel",
      "mall",
      "park",
      "museum",
      "temple",
      "beach",
      "mountain",
      "lake",
      "market",
      "store",
    ];

    const textLower = text.toLowerCase();
    return placeTypes.filter((type) => textLower.includes(type));
  }

  extractLocations(text) {
    const locations = [
      "jakarta",
      "bandung",
      "surabaya",
      "medan",
      "semarang",
      "makassar",
      "palembang",
      "tangerang",
      "depok",
      "bekasi",
      "bogor",
      "yogyakarta",
      "bali",
    ];

    const textLower = text.toLowerCase();
    return locations.filter((loc) => textLower.includes(loc));
  }
}

module.exports = new LLMService();
