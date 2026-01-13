import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("jobs.stats", () => {
  it("returns job statistics", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.stats();

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("active");
    expect(typeof result.total).toBe("number");
    expect(typeof result.active).toBe("number");
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.active).toBeGreaterThanOrEqual(0);
  });

  it("shows at least 15 jobs after seeding", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.stats();

    expect(result.active).toBeGreaterThanOrEqual(15);
  });
});

describe("jobs.list", () => {
  it("returns paginated job listings", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.list({ limit: 10, offset: 0 });

    expect(result).toHaveProperty("jobs");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  it("filters jobs by search term", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.list({ search: "Smart", limit: 50 });

    // Search should work if there are jobs in the database
    expect(result).toHaveProperty("jobs");
    expect(result).toHaveProperty("total");
    // If there are jobs with "Smart" in title/description, they should be returned
    if (result.jobs.length > 0) {
      const hasMatch = result.jobs.some(
        (job) =>
          job.title.toLowerCase().includes("smart") ||
          job.description?.toLowerCase().includes("smart") ||
          job.requirements?.toLowerCase().includes("smart")
      );
      expect(hasMatch).toBe(true);
    }
  });
});
