import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const AnalyticsHitSchema  = new Schema({
  path: { type: String, required: true },
  ts: { type: Date, required: true, default: () => new Date() },
  ua: { type: String },
  ip: { type: String },
  referrer: { type: String },
  visitorId: { type: String }, // optional: client-side generated visitor id (cookie)
  deviceType: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"], default: "unknown" },
  
}, { timestamps: false });


export type AnalyticHit = InferSchemaType<typeof AnalyticsHitSchema>;
export type AnalyticsHitDoc = HydratedDocument<AnalyticHit>;

const AnalyticsHitModel =  mongoose.models.AnalyticsHit || mongoose.model("AnalyticsHit", AnalyticsHitSchema);

export default AnalyticsHitModel;
