import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("profile.get", () => {
  it("returns profile data for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.get();

    expect(result).toHaveProperty("profile");
    expect(result).toHaveProperty("workExperiences");
    expect(result).toHaveProperty("skills");
  });
});

describe("profile.update", () => {
  it("updates user profile successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.update({
      phone: "+1234567890",
      location: "San Francisco, CA",
      bio: "Test bio",
    });

    expect(result).toEqual({ success: true });
  });
});

describe("skills", () => {
  it("adds and lists skills", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Add a skill
    const addResult = await caller.skills.add({
      name: "Solidity",
      category: "Programming",
    });

    expect(addResult).toEqual({ success: true });

    // List skills
    const skills = await caller.skills.list();
    expect(Array.isArray(skills)).toBe(true);
  });
});
