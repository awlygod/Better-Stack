import axios from "axios";
import { describe, expect, it, beforeAll } from "vitest";
import { BACKEND_URL } from "./config";

let jwt: string;

describe("Website endpoints", () => {
  beforeAll(async () => {
    const res = await axios.post(`${BACKEND_URL}/user/signin`, {
      username: Math.random().toString(),
      password: "password",
    });
    jwt = res.data.jwt;
  });

  it("Should create a website", async () => {
    const res = await axios.post(
      `${BACKEND_URL}/website`,
      { url: "https://example.com" },
      { headers: { Authorization: jwt } }
    );

    expect(res.status).toBe(200);
    expect(res.data.id).toBeDefined();
  });

  it("Should fetch all websites", async () => {
    const res = await axios.get(`${BACKEND_URL}/website/all`, {
      headers: { Authorization: jwt },
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});