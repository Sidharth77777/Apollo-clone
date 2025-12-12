import UserModel from "../models/UserModel.ts";
import CreditTxnModel from "../models/CreditTxnModel.ts";
import type { UserDoc } from "../models/UserModel.ts";

/**
 * Add credits to a user and create a transaction record
 * @param userId - User ID to add credits to
 * @param amount - Number of credits to add (positive number)
 * @param reason - Reason for the credit addition
 * @param meta - Optional metadata to store with the transaction
 * @returns Updated user document or null if user not found
 */
export const addCredits = async (
  userId: string,
  amount: number,
  reason: string,
  meta?: Record<string, any>
): Promise<UserDoc | null> => {
  console.log("🔧 addCredits called with:", {
    userId,
    userIdType: typeof userId,
    amount,
    reason,
    meta,
  });

  try {
    // Find and update user credits atomically
    console.log("🔍 Finding and updating user...");
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true } // Return updated document
    );

    console.log("📊 Update result:", {
      found: !!updatedUser,
      userId: updatedUser?._id?.toString(),
      newCredits: updatedUser?.credits,
    });

    if (!updatedUser) {
      console.error(`❌ User ${userId} not found when adding credits`);
      return null;
    }

    // Create transaction record
    console.log("📝 Creating transaction record...");
    const txn = await CreditTxnModel.create({
      user: userId,
      change: amount,
      reason: reason,
      meta: meta || {},
    });

    console.log("✅ Transaction created:", {
      txnId: txn._id.toString(),
      change: txn.change,
      reason: txn.reason,
    });

    console.log(`✅ Successfully added ${amount} credits to user ${userId}. New balance: ${updatedUser.credits}`);
    
    return updatedUser;
  } catch (error: any) {
    console.error("❌ Error in addCredits:", error);
    console.error("   Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Deduct credits from a user and create a transaction record
 * @param userId - User ID to deduct credits from
 * @param amount - Number of credits to deduct (positive number)
 * @param reason - Reason for the credit deduction
 * @param meta - Optional metadata to store with the transaction
 * @returns Updated user document or null if insufficient credits or user not found
 */
export const deductCredits = async (
  userId: string,
  amount: number,
  reason: string,
  meta?: Record<string, any>
): Promise<UserDoc | null> => {
  try {
    // Check if user has enough credits
    const user = await UserModel.findById(userId);
    if (!user) {
      console.error(`User ${userId} not found when deducting credits`);
      return null;
    }

    if (user.credits < amount) {
      console.error(`User ${userId} has insufficient credits. Required: ${amount}, Available: ${user.credits}`);
      return null;
    }

    // Deduct credits atomically
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { credits: -amount } },
      { new: true }
    );

    if (!updatedUser) {
      return null;
    }

    // Create transaction record (negative change)
    await CreditTxnModel.create({
      user: userId,
      change: -amount,
      reason: reason,
      meta: meta || {},
    });

    console.log(`Successfully deducted ${amount} credits from user ${userId}. New balance: ${updatedUser.credits}`);
    
    return updatedUser;
  } catch (error: any) {
    console.error("Error in deductCredits:", error);
    throw error;
  }
};

/**
 * Get user's credit balance
 */
export const getUserCredits = async (userId: string): Promise<number | null> => {
  try {
    const user = await UserModel.findById(userId).select("credits").lean();
    return user ? user.credits : null;
  } catch (error) {
    console.error("Error getting user credits:", error);
    return null;
  }
};

/**
 * Get user's credit transaction history
 */
export const getCreditHistory = async (userId: string, limit: number = 50) => {
  try {
    return await CreditTxnModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error("Error getting credit history:", error);
    return [];
  }
};