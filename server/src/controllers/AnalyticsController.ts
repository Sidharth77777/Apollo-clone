import type { Request, Response } from "express";
import AnalyticsHitModel from "../models/AnalyticsHitModel.js";

/** small UA sniff */
const detectDeviceType = (ua?: string) => {
  if (!ua) return "unknown";
  const u = ua.toLowerCase();
  if (/ipad|tablet/.test(u)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(u)) return "mobile";
  return "desktop";
};

// POST /api/analytics/track
export const track = async (req: Request, res: Response) => {
  try {
    const { path, visitorId, referrer } = req.body ?? {};
    const ua = req.get("user-agent") ?? req.body?.ua ?? "";
    const ip = req.ip || (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
    if (!path) return res.status(400).json({ message: "Missing path" });

    const hit = new AnalyticsHitModel({
      path,
      ts: new Date(),
      ua,
      ip,
      referrer,
      visitorId,
      deviceType: detectDeviceType(ua),
    });

    await hit.save();
    return res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error("analytics.track failed:", err);
    return res.status(500).json({ message: "Failed to track" });
  }
};

/**
 * GET /api/analytics/traffic?range=30
 * returns array [{ date: '2025-12-11', visits: 120, uniques: 80 }]
 */
export const getTraffic = async (req: Request, res: Response) => {
  try {
    const rangeDays = Number(req.query.range ?? 30);
    const end = new Date();
    const start = new Date(Date.now() - Math.max(1, rangeDays) * 24 * 60 * 60 * 1000);

    // Aggregation:
    //  - project dateStr (YYYY-MM-DD)
    //  - uniqueKey = visitorId || ip
    //  - group by dateStr, count visits and collect uniqueKey set
    const pipeline: any[] = [
      { $match: { ts: { $gte: start, $lte: end } } },
      {
        $project: {
          dateStr: {
            $dateToString: { format: "%Y-%m-%d", date: "$ts", timezone: "UTC" },
          },
          uniqueKey: { $ifNull: ["$visitorId", "$ip"] },
          path: 1,
        },
      },
      {
        $group: {
          _id: "$dateStr",
          visits: { $sum: 1 },
          uniquesSet: { $addToSet: "$uniqueKey" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          visits: 1,
          uniques: { $size: "$uniquesSet" },
        },
      },
      { $sort: { date: 1 } },
    ];

    const result = await AnalyticsHitModel.aggregate(pipeline).allowDiskUse(true).exec();
    return res.json({ data: result });
  } catch (err: any) {
    console.error("analytics.getTraffic failed:", err);
    return res.status(500).json({ message: "Failed to get traffic" });
  }
};

/**
 * GET /api/analytics/summary?range=30
 * returns { totalVisits, uniqueVisitors, bounceRate }
 * - bounceRate is optional (we don't track page depth here) -> left undefined or 0
 */
export const getSummary = async (req: Request, res: Response) => {
  try {
    const rangeDays = Number(req.query.range ?? 30);
    const start = new Date(Date.now() - Math.max(1, rangeDays) * 24 * 60 * 60 * 1000);
    const end = new Date();

    const pipeline = [
      { $match: { ts: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          uniqueVisitorsSet: { $addToSet: { $ifNull: ["$visitorId", "$ip"] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalVisits: 1,
          uniqueVisitors: { $size: "$uniqueVisitorsSet" },
        },
      },
    ];

    const summary = (await AnalyticsHitModel.aggregate(pipeline).exec())[0] ?? { totalVisits: 0, uniqueVisitors: 0 };
    // bounceRate: we don't have page-level session depth; leave undefined or compute if you track session start/stop
    return res.json({ data: { ...summary, bounceRate: undefined } });
  } catch (err: any) {
    console.error("analytics.getSummary failed:", err);
    return res.status(500).json({ message: "Failed to get summary" });
  }
};

/**
 * GET /api/analytics/devices?range=30
 * returns array [{ name: 'Desktop', value: 120 }, ...]
 */
export const getDevices = async (req: Request, res: Response) => {
  try {
    const rangeDays = Number(req.query.range ?? 30);
    const start = new Date(Date.now() - Math.max(1, rangeDays) * 24 * 60 * 60 * 1000);

    const pipeline = [
      { $match: { ts: { $gte: start } } },
      {
        $group: {
          _id: "$deviceType",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: "$count",
        },
      },
    ];

    const result = await AnalyticsHitModel.aggregate(pipeline).exec();
    return res.json({ data: result });
  } catch (err: any) {
    console.error("analytics.getDevices failed:", err);
    return res.status(500).json({ message: "Failed to get device breakdown" });
  }
};
