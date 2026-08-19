const { describe, it, expect } = require("vitest");
const app = require("./challenge_express_server_template.js");
const request = require("supertest");

describe("challenge-dealer-service-efficiency Express starter", () => {
  it("responds with healthy status and metadata on GET /health", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "healthy",
      repository: "challenge-dealer-service-efficiency",
      organization: "Inflexcvi",
    });
    expect(response.body.timestamp).toBeTypeOf("string");
  });
});
