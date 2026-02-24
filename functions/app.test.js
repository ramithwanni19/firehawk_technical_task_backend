const request = require("supertest");
const admin = require("firebase-admin");

const app = require("./service.js");

jest.mock("firebase-admin", () => {
  return {
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({ email: "john@test.com" }),
    })),
    firestore: Object.assign(
      jest.fn(() => ({
        collection: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 5 }),
          docs: [],
          exists: true,
        }),
        add: jest.fn().mockResolvedValue({ id: "mock-id-123" }),
      })),
      {
        FieldValue: { serverTimestamp: () => "2026-02-24" },
      }
    ),
  };
});

describe("Backend API Tests", () => {
  it("Should return 401 if no Authorization header is provided", async () => {
    const res = await request(app).get("/api/all-cars");
    expect(res.statusCode).toEqual(401);
    expect(res.text).toContain("No Token Provided");
  });

  it("Should create a new car record when authorized", async () => {
    const newCar = { make: "Ford", model: "Mustang" };
    const res = await request(app)
      .post("/api/add-car")
      .set("Authorization", "Bearer valid-mock-token")
      .send(newCar);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("id", "mock-id-123");
  });

  it("Should return 400 if Make or Model is missing", async () => {
    const res = await request(app)
      .post("/api/add-car")
      .set("Authorization", "Bearer valid-mock-token")
      .send({ mpg: 20 });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe("Make and Model are required fields.");
  });
});
