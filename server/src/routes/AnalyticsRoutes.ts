import { Router } from "express";
import { track, getTraffic, getSummary, getDevices } from "../controllers/AnalyticsController.ts";

const router = Router();

// Public: tracking endpoint (used by client via sendBeacon / fetch)
router.post("/track", track);

// Protected analytics read endpoints (admin)
router.get("/traffic", getTraffic);
router.get("/summary", getSummary);
router.get("/devices", getDevices);

export default router;