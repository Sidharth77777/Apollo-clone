import  { type Request, type Response } from "express";
import mongoose from "mongoose";
import PersonModel from "../models/PersonModel.ts";
import CompanyModel from "../models/CompanyModel.ts";

/**
 * Create person
 * POST /api/people
 * Body: { name, designation, department, companyExternalId OR company (ObjectId), location, externalId? }
 */
export const createPerson = async (req: Request, res: Response) => {
  try {
    const { name, designation, department, companyExternalId, company: companyId, location, externalId } = req.body ?? {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "name is required", error: null });
    }

    // resolve company to ObjectId
    let companyObjId: mongoose.Types.ObjectId | null = null;
    if (companyExternalId) {
      const comp = await CompanyModel.findOne({ externalId: companyExternalId });
      if (!comp) {
        return res.status(400).json({ success: false, message: "companyExternalId not found", error: null });
      }
      companyObjId = comp._id;
    } else if (companyId) {
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ success: false, message: "company id invalid", error: null });
      }
      const exists = await CompanyModel.exists({ _id: companyId });
      if (!exists) return res.status(400).json({ success: false, message: "company _id not found", error: null });
      companyObjId = new mongoose.Types.ObjectId(companyId);
    } else {
      return res.status(400).json({ success: false, message: "companyExternalId or company (ObjectId) is required", error: null });
    }

    // upsert by externalId if provided
    let person;
    if (externalId) {
      person = await PersonModel.findOneAndUpdate(
        { externalId },
        {
          $set: {
            name: String(name).trim(),
            designation: String(designation ?? "").trim(),
            department: String(department ?? "").trim(),
            location: String(location ?? "").trim(),
            company: companyObjId,
            externalId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      person = new PersonModel({
        name: String(name).trim(),
        designation: String(designation ?? "").trim() || "Unknown",
        department: String(department ?? "").trim() || "Unknown",
        location: String(location ?? "").trim() || "Unknown",
        company: companyObjId,
      });
      await person.save();
    }

    return res.status(201).json({ success: true, message: "Person created", data: person });
  } catch (err: any) {
    console.error("Error creating person:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};

/**
 * List people
 * GET /api/people?q=&companyExternalId=&page=&limit=
 */
export const listPeople = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(200, Number(req.query.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (q) {
      filter.name = new RegExp(q, "i");
    }

    if (req.query.companyExternalId) {
      const comp = await CompanyModel.findOne({ externalId: String(req.query.companyExternalId) });
      if (comp) filter.company = comp._id;
      else filter.company = null; // results will be empty
    }

    const [items, total] = await Promise.all([
      PersonModel.find(filter).skip(skip).limit(limit).sort({ name: 1 }).populate("company", "name externalId"),
      PersonModel.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, message: "People fetched", data: { page, limit, total, items } });
  } catch (err: any) {
    console.error("Error listing people:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};

/**
 * Get person by id or externalId
 * GET /api/people/:id
 */
export const getPerson = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required", error: null });
    }

    let person = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      person = await PersonModel.findById(id).populate("company", "name externalId");
    }
    if (!person) {
      person = await PersonModel.findOne({ externalId: id }).populate("company", "name externalId");
    }
    if (!person) {
      return res.status(404).json({ success: false, message: "Person not found", error: null });
    }

    return res.status(200).json({ success: true, message: "Person fetched", data: person });
  } catch (err: any) {
    console.error("Error fetching person:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};

/**
 * Update person
 * PATCH /api/people/:id
 */
export const updatePerson = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    const payload = req.body ?? {};

    if (!id) {
      return res.status(400).json({ success: false, message: "id is required", error: null });
    }

    // allow updating company by externalId
    if (payload.companyExternalId) {
      const comp = await CompanyModel.findOne({ externalId: payload.companyExternalId });
      if (!comp) return res.status(400).json({ success: false, message: "companyExternalId not found", error: null });
      payload.company = comp._id;
      delete payload.companyExternalId;
    }

    let person = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      person = await PersonModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
    }
    if (!person) {
      person = await PersonModel.findOneAndUpdate({ externalId: id }, { $set: payload }, { new: true });
    }
    if (!person) return res.status(404).json({ success: false, message: "Person not found", error: null });

    return res.status(200).json({ success: true, message: "Person updated", data: person });
  } catch (err: any) {
    console.error("Error updating person:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};

/**
 * Delete person
 * DELETE /api/people/:id
 */
export const deletePerson = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!id) return res.status(400).json({ success: false, message: "id is required", error: null });

    let person = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      person = await PersonModel.findByIdAndDelete(id);
    }
    if (!person) {
      person = await PersonModel.findOneAndDelete({ externalId: id });
    }
    if (!person) return res.status(404).json({ success: false, message: "Person not found", error: null });

    return res.status(200).json({ success: true, message: "Person deleted", data: null });
  } catch (err: any) {
    console.error("Error deleting person:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};
