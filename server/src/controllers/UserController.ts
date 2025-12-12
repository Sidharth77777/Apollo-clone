import { type Request, type Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../models/UserModel.ts";
import { ENV } from "../lib/ENV.ts";

const COOKIE_NAME = "token";
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { email = "", password = "" } = req.body ?? {};

    if (!String(email).trim()) {
      return res.status(400).json({ success: false, message: "email is required", error: null });
    }
    if (!String(password).trim() || String(password).length < 6) {
      return res.status(400).json({ success: false, message: "password is required (min 6 chars)", error: null });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "email already registered", error: null });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const user = new UserModel({
      email: normalizedEmail,
      password: hashed,
      // isAdmin defaults to false
    });

    await user.save();

    // create token
    const token = jwt.sign({ sub: user._id.toString(), isAdmin: !!(user as any).isAdmin }, ENV.JWT_SECRET, {
      expiresIn: "7d",
    });

    // set HttpOnly cookie (token stored only in cookie)
    res.cookie(COOKIE_NAME, token, cookieOptions);

    return res.status(201).json({
      success: true,
      message: "User created",
      data: { user: { _id: user._id, email: user.email, createdAt: user.createdAt, credits: user.credits }, token: "(stored in cookie)" },
    });
  } catch (err: any) {
    console.error("Error in signup:", err.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message ?? err });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email = "", password = "" } = req.body ?? {};

    if (!String(email).trim() || !String(password).trim()) {
      return res.status(400).json({ success: false, message: "email and password are required", error: null });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials", error: null });
    }

    const match = await bcrypt.compare(String(password), user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials", error: null });
    }

    const token = jwt.sign({ sub: user._id.toString(), isAdmin: !!(user as any).isAdmin }, ENV.JWT_SECRET, {
      expiresIn: "7d",
    });

    // set HttpOnly cookie
    res.cookie(COOKIE_NAME, token, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user: { _id: user._id, email: user.email, isAdmin: !!(user as any).isAdmin, credits: user.credits }, token: "(stored in cookie)" },
    });
  } catch (err: any) {
    console.error("Error in login:", err.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message ?? err });
  }
};

/**
 * GET /api/auth/me
 * Reads token from cookie (or Authorization header if present) and returns current user
 */
export const me = async (req: Request, res: Response) => {
  try {
    const authHeader = String(req.headers.authorization ?? "");
    const tokenFromHeader = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    const tokenFromCookie = (req as any).cookies?.[COOKIE_NAME] ?? null;
    const token = tokenFromHeader ?? tokenFromCookie;

    if (!token) return res.status(401).json({ success: false, message: "Unauthorized", error: null });

    let payload: any;
    try {
      payload = jwt.verify(token, ENV.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token", error: null });
    }

    if (!payload?.sub || !mongoose.Types.ObjectId.isValid(payload.sub)) {
      return res.status(401).json({ success: false, message: "Invalid token payload", error: null });
    }

    const user = await UserModel.findById(payload.sub).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found", error: null });

    return res.status(200).json({ success: true, message: "User fetched", data: user });
  } catch (err: any) {
    console.error("Error in me:", err.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message ?? err });
  }
};

/**
 * POST /api/auth/logout
 * Clears the token cookie
 */
export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (err: any) {
    console.error("Error in logout:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message ?? err });
  }
};
