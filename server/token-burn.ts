import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import axios from "axios";
import { getDb } from "./db";
import { tokenBurns, type InsertTokenBurn } from "../drizzle/schema";
import { addCredits } from "./db-credits";
import { eq } from "drizzle-orm";

// Sol Incinerator address
const INCINERATOR_ADDRESS = "1nc1nerator11111111111111111111111111111111";

// Solana RPC endpoint (using public endpoint, can be upgraded to paid for production)
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

/**
 * Get token price from DexScreener
 */
async function getTokenPrice(tokenAddress: string): Promise<number> {
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    
    if (response.data?.pairs && response.data.pairs.length > 0) {
      // Get the pair with highest liquidity
      const sortedPairs = response.data.pairs.sort(
        (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      return parseFloat(sortedPairs[0].priceUsd || "0");
    }
    
    throw new Error("No price data found");
  } catch (error) {
    console.error("[TokenBurn] Error fetching price from DexScreener:", error);
    throw new Error("Failed to fetch token price");
  }
}

/**
 * Verify Solana burn transaction
 */
async function verifyBurnTransaction(
  txSignature: string,
  expectedTokenAddress: string,
  expectedUserId: number
): Promise<{
  valid: boolean;
  tokenAmount?: string;
  error?: string;
}> {
  try {
    const connection = new Connection(SOLANA_RPC, "confirmed");
    
    // Fetch transaction
    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) {
      return { valid: false, error: "Transaction not found" };
    }
    
    if (tx.meta?.err) {
      return { valid: false, error: "Transaction failed on-chain" };
    }
    
    // Find burn instruction (transfer to incinerator)
    const instructions = tx.transaction.message.instructions;
    let burnAmount: string | undefined;
    let foundBurn = false;
    
    for (const instruction of instructions) {
      if ("parsed" in instruction && instruction.program === "spl-token") {
        const parsed = instruction.parsed;
        
        if (parsed.type === "burn" || parsed.type === "transfer") {
          const info = parsed.info;
          
          // Check if destination is incinerator
          if (
            info.destination === INCINERATOR_ADDRESS ||
            info.authority === INCINERATOR_ADDRESS
          ) {
            // Verify token mint matches expected token
            if (info.mint === expectedTokenAddress) {
              burnAmount = info.amount || info.tokenAmount?.amount;
              foundBurn = true;
              break;
            }
          }
        }
      }
    }
    
    if (!foundBurn || !burnAmount) {
      return { valid: false, error: "No valid burn instruction found" };
    }
    
    return { valid: true, tokenAmount: burnAmount };
  } catch (error) {
    console.error("[TokenBurn] Error verifying transaction:", error);
    return { valid: false, error: "Failed to verify transaction" };
  }
}

/**
 * Process token burn and credit user account
 */
export async function processTokenBurn(
  userId: number,
  txSignature: string,
  tokenAddress: string,
  taxRate: number // in basis points (e.g., 600 = 6%)
): Promise<{
  success: boolean;
  creditsGranted?: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }
  
  // Check if transaction already processed
  const existing = await db
    .select()
    .from(tokenBurns)
    .where(eq(tokenBurns.txSignature, txSignature))
    .limit(1);
  
  if (existing.length > 0) {
    return { success: false, error: "Transaction already processed" };
  }
  
  // Verify burn transaction
  const verification = await verifyBurnTransaction(txSignature, tokenAddress, userId);
  
  if (!verification.valid) {
    return { success: false, error: verification.error || "Invalid transaction" };
  }
  
  // Get token price
  let tokenPrice: number;
  try {
    tokenPrice = await getTokenPrice(tokenAddress);
  } catch (error) {
    return { success: false, error: "Failed to fetch token price" };
  }
  
  if (tokenPrice <= 0) {
    return { success: false, error: "Invalid token price" };
  }
  
  // Calculate credits
  const tokenAmount = parseFloat(verification.tokenAmount!);
  const taxMultiplier = 1 - taxRate / 10000; // Convert basis points to decimal
  const effectiveAmount = tokenAmount * taxMultiplier;
  const usdValue = effectiveAmount * tokenPrice;
  const usdValueCents = Math.floor(usdValue * 100);
  const creditsGranted = Math.ceil(usdValueCents); // Round up
  
  // Record burn transaction
  const burnRecord: InsertTokenBurn = {
    userId,
    txSignature,
    tokenAmount: verification.tokenAmount!,
    tokenPriceUsd: tokenPrice.toString(),
    usdValue: usdValueCents,
    creditsGranted,
    taxRate,
    status: "verified",
    verifiedAt: new Date(),
  };
  
  await db.insert(tokenBurns).values(burnRecord);
  
  // Add credits to user account
  await addCredits(
    userId,
    creditsGranted,
    "payment",
    `Token burn: ${(effectiveAmount / 1e9).toFixed(4)} tokens @ $${tokenPrice.toFixed(6)}`,
    txSignature
  );
  
  return { success: true, creditsGranted };
}

/**
 * Get user's token burn history
 */
export async function getUserTokenBurns(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(tokenBurns)
    .where(eq(tokenBurns.userId, userId))
    .orderBy(tokenBurns.createdAt);
}
