import { describe, it, expect, beforeAll, afterAll } from "vitest";
import axios from "axios";
import { prismaClient } from "store/client";

const API_URL = "http://localhost:3001";
let jwt: string;
let userId: string;
let websiteId: string;

describe("BetterUptime API", () => {
  beforeAll(async () => {
    // Cleanup before tests
    await prismaClient.user.deleteMany({});
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  it("should signup a user", async () => {
    const res = await axios.post(`${API_URL}/user/signup`, {
      username: "testuser",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.data.id).toBeDefined();
    userId = res.data.id;
  });

  it("should signin a user", async () => {
    const res = await axios.post(`${API_URL}/user/signin`, {
      username: "testuser",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.data.jwt).toBeDefined();
    jwt = res.data.jwt;
  });

  it("should create a website", async () => {
    const res = await axios.post(
      `${API_URL}/website`,
      { url: "https://example.com" },
      { headers: { Authorization: jwt } }
    );
    expect(res.status).toBe(200);
    expect(res.data.id).toBeDefined();
    websiteId = res.data.id;
  });

  it("should fetch all websites", async () => {
    const res = await axios.get(`${API_URL}/website/all`, {
      headers: { Authorization: jwt },
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("should fetch website status", async () => {
    const res = await axios.get(`${API_URL}/status/${websiteId}`, {
      headers: { Authorization: jwt },
    });
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(websiteId);
  });
});