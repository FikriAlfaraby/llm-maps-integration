const axios = require("axios");
const config = require("../config/config");
const logger = require("../utils/logger");

class LLMService {
  constructor() {
    this.provider = config.llm.provider;
    this.endpoint = config.llm.endpoint;
    this.model = config.llm.model;
    this.timeout = config.llm.timeout || 60000;
    this.defaultTemperature = config.llm.temperature ?? 0.7;
    this.defaultMaxTokens = config.llm.maxTokens ?? 500;
  }

  async generateResponse(prompt, systemPrompt = null, opts = {}) {
    try {
      // Normalize opts
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

      const data = response.data;

      let rawText = null;

      if (data?.message?.content) {
        rawText = data.message.content;
      } else if (Array.isArray(data?.messages)) {
        const assistant = data.messages.find((m) => m.role === "assistant");
        rawText = assistant ? assistant.content : data.messages[0]?.content;
      } else if (typeof data?.response === "string") {
        rawText = data.response;
      } else if (typeof data === "string") {
        rawText = data;
      } else {
        logger.error("Unexpected Ollama response format:", data);
        throw new Error("Invalid response shape from Ollama");
      }

      if (!rawText || typeof rawText !== "string") {
        throw new Error("Empty response from Ollama");
      }

      return rawText;
    } catch (error) {
      if (error.response) {
        logger.error("Ollama API error response:", {
          status: error.response.status,
          data: error.response.data,
        });
        if (error.response.status === 404) {
          throw new Error(
            `Model '${this.model}' not found on Ollama. Run: ollama pull ${this.model}`
          );
        } else if (error.response.status >= 500) {
          throw new Error("Ollama server error. Check Ollama logs.");
        }
      } else if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Cannot connect to Ollama. Ensure 'ollama serve' is running."
        );
      } else if (error.code === "ETIMEDOUT") {
        throw new Error("Ollama request timed out. Model may be loading.");
      }

      logger.error("Ollama error:", error.message || error);
      throw new Error(
        `Failed to generate LLM response: ${error.message || error}`
      );
    }
  }

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

      if (response?.data?.content) return response.data.content;
      if (response?.data?.response) return response.data.response;
      return typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);
    } catch (error) {
      logger.error("Llama.cpp API error:", error.message || error);
      throw new Error("Failed to generate LLM response from Llama.cpp");
    }
  }

  _findBalancedJsonBlocks(text) {
    const results = [];
    if (!text || typeof text !== "string") return results;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "{") {
        let depth = 0;
        for (let j = i; j < text.length; j++) {
          if (text[j] === "{") depth++;
          else if (text[j] === "}") depth--;

          if (depth === 0) {
            const candidate = text.slice(i, j + 1);
            results.push(candidate);
            break;
          }
        }
      }
    }
    return results;
  }

  _attemptParseJson(str) {
    if (!str || typeof str !== "string") throw new Error("No string to parse");

    let s = str.replace(/[\u2018\u2019\u201C\u201D]/g, '"').trim();

    s = s
      .replace(/```json\s*/i, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(s);
    } catch (_) {
      const blocks = this._findBalancedJsonBlocks(s);
      if (blocks.length > 0) {
        blocks.sort((a, b) => b.length - a.length);
        for (const block of blocks) {
          try {
            return JSON.parse(block);
          } catch (e) {
            const fix1 = block.replace(/'/g, '"');
            try {
              return JSON.parse(fix1);
            } catch (e2) {
              const fix2 = fix1.replace(/,\s*([}\]])/g, "$1");
              try {
                return JSON.parse(fix2);
              } catch (e3) {}
            }
          }
        }
      }

      try {
        let aggressive = s.replace(/'/g, '"').replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(aggressive);
      } catch (err) {
        throw new Error("Unable to parse JSON from LLM response");
      }
    }
  }

  _normalizeEntities(raw) {
    const out = {
      place_names: [],
      place_types: [],
      locations: [],
    };

    if (!raw || typeof raw !== "object") return out;

    if (Array.isArray(raw.place_names)) {
      out.place_names = raw.place_names
        .map((p) => String(p).trim())
        .filter(Boolean);
    }
    if (Array.isArray(raw.place_types)) {
      out.place_types = raw.place_types
        .map((p) => String(p).toLowerCase().trim())
        .map((p) => this._normalizePlaceType(p))
        .filter(Boolean);
    }
    if (Array.isArray(raw.locations)) {
      out.locations = raw.locations
        .map((l) => String(l).toLowerCase().trim())
        .filter(Boolean);
    }

    out.place_names = [...new Set(out.place_names)];
    out.place_types = [...new Set(out.place_types)];
    out.locations = [...new Set(out.locations)];

    return out;
  }

  _normalizePlaceType(type) {
    if (!type) return null;
    const t = type.toLowerCase();
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
    };
    return map[t] || t;
  }

  async extractLocationEntities(text) {
    const extractionSystem = `
You are a JSON extractor. Extract location information from the user's text and return ONLY valid JSON (no extra commentary).
Requirements:
- Output must be a single JSON object with keys: place_names, place_types, locations.
- Each key must be an array (can be empty).
- place_names: specific place names (e.g., "Warung MJS", "One Eighty Coffee").
- place_types: normalized place types (english if possible, e.g., "restaurant", "cafe", "park").
- locations: city/area names (lowercase).
- Use deterministic style: temperature 0, short concise output.

Example:
{"place_names":["Warung MJS"],"place_types":["restaurant"],"locations":["bandung"]}

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

      let parsed = null;
      try {
        parsed = this._attemptParseJson(llmRaw);
      } catch (err) {
        logger.warn(
          "LLM returned non-parseable JSON, will fallback:",
          err.message
        );
        throw err;
      }

      const norm = this._normalizeEntities(parsed);
      return norm;
    } catch (err) {
      logger.warn(
        "extractLocationEntities: fallback active:",
        err.message || err
      );

      const fallbackPlaceTypes = this.extractPlaceTypes(text);

      const fallbackLocations = this.extractLocations(text);

      const placeNames = [];
      const placeNameRegex = /\b([A-Z][\w-']+(?:\s+[A-Z][\w-']+){1,4})\b/g;
      let m;
      while ((m = placeNameRegex.exec(text)) !== null) {
        const candidate = m[1].trim();
        if (!fallbackLocations.includes(candidate.toLowerCase())) {
          placeNames.push(candidate);
        }
      }

      const result = {
        place_names: [...new Set(placeNames)].slice(0, 6),
        place_types: fallbackPlaceTypes,
        locations: fallbackLocations,
      };

      return this._normalizeEntities(result);
    }
  }

  extractPlaceTypes(text) {
    const placeTypes = [
      "restaurant",
      "restoran",
      "cafe",
      "kafe",
      "coffee shop",
      "kedai kopi",
      "warung",
      "rumah makan",
      "hotel",
      "mall",
      "park",
      "taman",
      "museum",
      "temple",
      "candi",
      "beach",
      "pantai",
      "mountain",
      "gunung",
      "lake",
      "danau",
      "market",
      "pasar",
      "store",
      "toko",
      "ramen",
      "sate",
      "bakso",
      "seafood",
      "co-working",
      "coworking",
      "bakery",
    ];

    const textLower = text.toLowerCase();
    const found = [];

    for (const type of placeTypes) {
      if (textLower.includes(type) && !found.includes(type)) {
        if (["restoran", "rumah makan", "warung", "resto"].includes(type)) {
          found.push("restaurant");
        } else if (
          ["kafe", "kedai kopi", "coffee shop", "kedai"].includes(type)
        ) {
          found.push("cafe");
        } else if (type === "taman") {
          found.push("park");
        } else if (type === "pantai") {
          found.push("beach");
        } else {
          found.push(type);
        }
      }
    }

    return [...new Set(found)];
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
      "jogja",
      "bali",
      "denpasar",
      "malang",
      "solo",
      "surakarta",
      "pekanbaru",
      "batam",
      "bandar lampung",
      "padang",
      "manado",
      "pontianak",
      "balikpapan",
      "majene",
      "cilacap",
      "cirebon",
      "tasikmalaya",
    ];

    const textLower = text.toLowerCase();
    const found = [];

    for (const location of locations) {
      if (textLower.includes(location) && !found.includes(location)) {
        found.push(location);
      }
    }

    const cityRegex =
      /\b(?:kota|kabupaten|di|di kota|di kabupaten)\s+([A-Za-z\u00C0-\u017F' -]{3,40})/gi;
    let m;
    while ((m = cityRegex.exec(text)) !== null) {
      const cand = m[1].toLowerCase().trim();
      if (!found.includes(cand)) found.push(cand);
    }

    return found;
  }

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
            `Model '${this.model}' not found. Available models: ${models
              .map((m) => m.name)
              .join(", ")}`
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
