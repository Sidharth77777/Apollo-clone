// test-credits.ts
// Run this script to test if your credit system works
// Usage: npx tsx test-credits.ts YOUR_USER_ID

import mongoose from "mongoose";
import { ENV } from "./lib/ENV.ts";
import { addCredits } from "./lib/credits.ts";
import UserModel from "./models/UserModel.ts";
import CreditTxnModel from "./models/CreditTxnModel.ts";

const testCredits = async (userId: string) => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(ENV.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check if user exists
    console.log("👤 Checking user...");
    const userBefore = await UserModel.findById(userId);
    if (!userBefore) {
      console.error("❌ User not found:", userId);
      process.exit(1);
    }
    console.log("✅ User found:", {
      id: userBefore._id,
      email: userBefore.email,
      creditsBefore: userBefore.credits,
    });

    // Test adding credits
    console.log("\n💰 Testing addCredits function...");
    const creditsToAdd = 100;
    const updatedUser = await addCredits(
      userId,
      creditsToAdd,
      "test_manual_add",
      { testRun: true, timestamp: new Date() }
    );

    if (!updatedUser) {
      console.error("❌ addCredits returned null");
      process.exit(1);
    }

    console.log("✅ Credits added successfully!");
    console.log("Updated user:", {
      id: updatedUser._id,
      email: updatedUser.email,
      creditsAfter: updatedUser.credits,
      difference: updatedUser.credits - userBefore.credits,
    });

    // Check transaction record
    console.log("\n📝 Checking transaction record...");
    const txn = await CreditTxnModel.findOne({
      user: userId,
      reason: "test_manual_add",
    }).sort({ createdAt: -1 });

    if (!txn) {
      console.error("❌ Transaction record not found!");
      process.exit(1);
    }

    console.log("✅ Transaction record found:", {
      id: txn._id,
      user: txn.user,
      change: txn.change,
      reason: txn.reason,
      meta: txn.meta,
      createdAt: txn.createdAt,
    });

    // Show all transactions for this user
    console.log("\n📊 All transactions for this user:");
    const allTxns = await CreditTxnModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.table(
      allTxns.map((t) => ({
        id: t._id.toString().substring(0, 8) + "...",
        change: t.change,
        reason: t.reason,
        date: t.createdAt?.toISOString().substring(0, 19).replace("T", " "),
      }))
    );

    console.log("\n✅ All tests passed!");
    console.log("\n🎯 Next steps:");
    console.log("1. If this works, the issue is in the webhook handler");
    console.log("2. Make sure Stripe webhook is being called (check logs)");
    console.log("3. Make sure STRIPE_WEBHOOK_SECRET is correct");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

// Get userId from command line args
const userId = process.argv[2];

if (!userId) {
  console.error("❌ Usage: npx tsx test-credits.ts YOUR_USER_ID");
  console.error("Example: npx tsx test-credits.ts 675915e49b9c2f1e2b38e7c0");
  process.exit(1);
}

testCredits(userId);