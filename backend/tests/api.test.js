// backend/tests/api.test.js
const request = require("supertest");
const app = require("../src/server");

describe("API Endpoints", () => {
  test("GET /api/health should return healthy status", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("healthy");
  });

  test("POST /api/query should process valid request", async () => {
    const response = await request(app).post("/api/query").send({
      prompt: "Find coffee shops in Jakarta",
      max_results: 3,
      use_cache: false,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("llm_text");
    expect(response.body).toHaveProperty("places");
    expect(response.body).toHaveProperty("request_id");
  }, 30000); // 30 second timeout for LLM

  test("POST /api/query should reject invalid request", async () => {
    const response = await request(app).post("/api/query").send({
      prompt: "", // Empty prompt
      max_results: 5,
    });

    expect(response.status).toBe(400);
  });
});
