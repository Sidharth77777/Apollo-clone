import type { Request, Response } from "express";
import mongoose from "mongoose";
import CompanyModel from "../models/CompanyModel.js";

/** Helper: only admin can modify companies */
const requireAdmin = (req: Request, res: Response) => {
  const isAdmin = !!(req as any).isAdmin;
  if (!isAdmin) {
    res.status(403).json({
      success: false,
      message: "Only admins can modify companies",
      error: null,
    });
    return false;
  }
  return true;
};

/** Normalize arrays into strings[] — accepts arrays or comma-separated strings */
const toStrArray = (val: any) => {
  if (!val && val !== "") return [];
  if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => String(s).trim())
      .filter(Boolean);
  }
  return [];
};

/** slugify for externalId generation */
const slugify = (str: string) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // spaces -> hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens

/** Generate unique externalId (appends suffix if needed) */
const generateUniqueExternalId = async (baseName: string) => {
  const base = slugify(baseName) || `company`;
  let candidate = base;
  let i = 1;
  // loop until unique (protect against infinite loop theoretically)
  while (await CompanyModel.exists({ externalId: candidate })) {
    candidate = `${base}-${i++}`;
    // safety fallback
    if (i > 10000) break;
  }
  return candidate;
};

/** Clean payload */
const normalizeCompanyPayload = (p: any) => {
  const payload: any = { ...p };

  if (payload.website) payload.website = String(payload.website).trim();

  // Accept either array or comma-separated string from frontend
  payload.industries = toStrArray(payload.industries);
  payload.keywords = toStrArray(payload.keywords);

  if (payload.employees && payload.employees !== "") payload.employees = String(payload.employees).trim();
  else delete payload.employees;

  if (payload.founded !== undefined && payload.founded !== "") {
    const n = Number(payload.founded);
    payload.founded = Number.isNaN(n) ? undefined : n;
  } else {
    delete payload.founded;
  }

  if (payload.revenueBillion !== undefined && payload.revenueBillion !== "") {
    const n = Number(payload.revenueBillion);
    payload.revenueBillion = Number.isNaN(n) ? undefined : n;
  } else {
    delete payload.revenueBillion;
  }

  if (payload.totalFundingMillion !== undefined && payload.totalFundingMillion !== "") {
    const n = Number(payload.totalFundingMillion);
    payload.totalFundingMillion = Number.isNaN(n) ? undefined : n;
  } else {
    delete payload.totalFundingMillion;
  }

  if (payload.subsidiariesCount !== undefined && payload.subsidiariesCount !== "") {
    const n = parseInt(String(payload.subsidiariesCount), 10);
    payload.subsidiariesCount = Number.isNaN(n) ? undefined : n;
  } else {
    delete payload.subsidiariesCount;
  }

  // trim string fields
  for (const k of ["name", "externalId", "description", "parentCompany", "fundingStage", "logo", "location"]) {
    if (payload[k] !== undefined && payload[k] !== null) {
      payload[k] = String(payload[k]).trim();
      if (payload[k] === "") delete payload[k];
    }
  }

  // Remove empty arrays -> keep empty arrays as [] (optional)
  if (Array.isArray(payload.industries) && payload.industries.length === 0) delete payload.industries;
  if (Array.isArray(payload.keywords) && payload.keywords.length === 0) delete payload.keywords;

  return payload;
};

/** Create company (admin only) */
export const createCompany = async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const raw = req.body ?? {};
    if (!raw.name || !String(raw.name).trim()) {
      return res.status(400).json({
        success: false,
        message: "name is required",
        error: null,
      });
    }

    // normalize payload first
    const payload = normalizeCompanyPayload(raw);

    // generate externalId if not provided or invalid
    let externalId = payload.externalId ? slugify(payload.externalId) : "";
    if (!externalId || !/^[a-z0-9\-]+$/.test(externalId)) {
      externalId = await generateUniqueExternalId(payload.name);
    } else {
      // ensure uniqueness
      if (await CompanyModel.exists({ externalId })) {
        // if conflict, make it unique by appending counter
        externalId = await generateUniqueExternalId(externalId);
      }
    }

    payload.externalId = externalId;

    // remove undefined keys
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const company = await CompanyModel.findOneAndUpdate(
      { externalId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      message: "Company created/updated",
      data: company,
    });
  } catch (err: any) {
    console.error("Error creating company:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message ?? String(err),
    });
  }
};

/** List companies */
export const listCompanies = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Number(req.query.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { industries: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      CompanyModel.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
      CompanyModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Companies fetched",
      data: { page, limit, total, items },
    });
  } catch (err: any) {
    console.error("Error listing companies:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message ?? String(err),
    });
  }
};

/** Get company by _id or externalId */
export const getCompany = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");

    let company: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) company = await CompanyModel.findById(id);

    if (!company) company = await CompanyModel.findOne({ externalId: id });

    if (!company)
      return res.status(404).json({
        success: false,
        message: "Company not found",
        error: null,
      });

    return res.status(200).json({
      success: true,
      message: "Company fetched",
      data: company,
    });
  } catch (err: any) {
    console.error("Error fetching company:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message ?? String(err),
    });
  }
};

/** Update company (admin only) */
export const updateCompany = async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required", error: null });
    }

    const rawPayload = req.body ?? {};
    const payload = normalizeCompanyPayload(rawPayload);

    // if externalId provided, validate/slugify
    if (payload.externalId) {
      const slug = slugify(payload.externalId);
      if (!/^[a-z0-9\-]+$/.test(slug)) {
        return res.status(400).json({ success: false, message: "invalid externalId", error: null });
      }
      payload.externalId = slug;
    }

    // remove undefined keys
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    let company: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      company = await CompanyModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
    }

    if (!company) {
      company = await CompanyModel.findOneAndUpdate({ externalId: id }, { $set: payload }, { new: true });
    }

    if (!company)
      return res.status(404).json({ success: false, message: "Company not found", error: null });

    return res.status(200).json({ success: true, message: "Company updated", data: company });
  } catch (err: any) {
    console.error("Error updating company:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message ?? String(err),
    });
  }
};

/** Delete company (admin only) */
export const deleteCompany = async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required", error: null });
    }

    let company: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) company = await CompanyModel.findById(id);

    if (!company) company = await CompanyModel.findOne({ externalId: id });

    if (!company)
      return res.status(404).json({ success: false, message: "Company not found", error: null });

    await company.remove();

    return res.status(200).json({ success: true, message: "Company deleted", data: null });
  } catch (err: any) {
    console.error("Error deleting company:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message ?? String(err),
    });
  }
};
