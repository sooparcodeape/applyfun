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
    // First try custom JWT auth
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

    // Fall back to Manus OAuth if no custom auth
    if (!user) {
      user = await sdk.authenticateRequest(opts.req);
    }
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
