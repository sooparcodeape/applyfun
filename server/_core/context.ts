import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyToken, getUserById } from "../custom-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Use custom JWT auth only (no Manus OAuth fallback)
    const authToken = opts.req.cookies?.auth_token;
    if (authToken) {
      const payload = await verifyToken(authToken);
      if (payload && payload.userId) {
        const customUser = await getUserById(payload.userId as number);
        if (customUser) {
          user = customUser;
        }
      }
    }
    // No fallback to Manus OAuth - custom auth only
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
