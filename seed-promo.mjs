import { drizzle } from "drizzle-orm/mysql2";
import { promoCodes } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function seedPromoCode() {
  console.log("Creating DRSUESS50 promo code...");
  
  try {
    await db.insert(promoCodes).values({
      code: "DRSUESS50",
      creditAmount: 5000, // $50 in cents
      maxUses: 0, // Unlimited uses
      currentUses: 0,
      expiresAt: null, // Never expires
      isActive: 1,
    });
    
    console.log("✅ DRSUESS50 promo code created successfully!");
    console.log("   Value: $50");
    console.log("   Max uses: Unlimited");
    console.log("   Expires: Never");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("ℹ️  DRSUESS50 promo code already exists");
    } else {
      console.error("❌ Error creating promo code:", error);
    }
  }
  
  process.exit(0);
}

seedPromoCode();
