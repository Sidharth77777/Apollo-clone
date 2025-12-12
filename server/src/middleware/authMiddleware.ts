import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../lib/ENV.js";


export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const auth = String(req.headers.authorization ?? "");
    let token: string | null = null;
    if (auth.startsWith("Bearer ")) token = auth.replace("Bearer ", "");
    else if ((req as any).cookies && (req as any).cookies.token) token = (req as any).cookies.token;
    else if ((req as any).signedCookies && (req as any).signedCookies.token) token = (req as any).signedCookies.token;

    if (!token) return res.status(401).json({ success: false, message: "Unauthorized", error: null });

    try {
        const payload: any = jwt.verify(token, ENV.JWT_SECRET);
        (req as any).userId = payload.sub;
        (req as any).isAdmin = !!payload.isAdmin;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token", error: null });
    }
};