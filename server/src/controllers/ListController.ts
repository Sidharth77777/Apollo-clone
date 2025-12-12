import { type Request, type Response } from "express";
import mongoose from "mongoose";
import ListModel from "../models/ListModel.js";
import PersonModel from "../models/PersonModel.js";
import UserModel from "../models/UserModel.js";
import CompanyModel from "../models/CompanyModel.js";
import { addCredits, deductCredits } from "../lib/credits.js";


const CREATE_LIST_COST = 10;
const ADD_MEMBER_COST = 2;

/**
 * Helper: check if current user is admin or owner of a list
 */
const isAdminOrOwner = (req: Request, ownerId?: string) => {
  try {
    const uid = (req as any).userId;
    const isAdmin = !!(req as any).isAdmin;
    if (isAdmin) return true;
    if (!uid || !ownerId) return false;
    return String(uid) === String(ownerId);
  } catch {
    return false;
  }
};

/**
 * Create list
 * POST /api/lists
 * Body: { name, target? }  (target defaults to "people")
 * Auth required: sets owner to req.userId
 */
export const createList = async (req: Request, res: Response) => {
  try {
    const { name, target } = req.body ?? {};
    const ownerId = (req as any).userId;

    if (!ownerId) return res.status(401).json({ success: false, message: "Unauthorized", error: null });

    // validate inputs BEFORE charging
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "name is required", error: null });
    }
    if (target && !["people", "company"].includes(String(target))) {
      return res.status(400).json({ success: false, message: "invalid target", error: null });
    }

    // charge AFTER validation (avoids charging for invalid requests)
    const charged = await deductCredits(ownerId, CREATE_LIST_COST, "create_list", { listName: name });
    if (!charged) {
      return res.status(402).json({ success:false, message: "Insufficient credits. Please top up.", error: null });
    }

    const list = await ListModel.create({
      name: String(name).trim(),
      target: target ? String(target) : "people",
      members: [],
      owner: new mongoose.Types.ObjectId(ownerId),
    });

    const populated = await ListModel.findById(list._id).populate({ path: "owner", select: "email" });

    return res.status(201).json({ success: true, message: "List created", data: populated });
  } catch (err: any) {
    console.error("Error creating list:", err.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};


/**
 * List lists
 * GET /api/lists?q=&page=&limit=&all=true  (admins can pass all=true to see all lists)
 * Auth required
 */
export const listLists = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(200, Number(req.query.limit ?? 20));
    const skip = (page - 1) * limit;
    const showAll = String(req.query.all ?? "false") === "true";

    const filter: any = {};
    if (q) filter.name = new RegExp(q, "i");

    // restrict to user's lists unless admin requested all (and is admin)
    const isAdmin = !!(req as any).isAdmin;
    const uid = (req as any).userId;
    if (!isAdmin || !showAll) {
      // show only user's lists
      if (!uid) return res.status(401).json({ success: false, message: "Unauthorized", error: null });
      filter.owner = new mongoose.Types.ObjectId(uid);
    } else {
      // admin and showAll -> no owner filter
    }

    const [items, total] = await Promise.all([
      ListModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      ListModel.countDocuments(filter),
    ]);

    // add membersCount and optionally owner email for convenience
    // fetch owners for listed items (to avoid join per-item, get distinct owner ids)
    const ownerIds = Array.from(new Set(items.map((it: any) => String(it.owner ?? "")).filter(Boolean)));
    const owners = ownerIds.length > 0 ? await UserModel.find({ _id: { $in: ownerIds } }).select("email").lean() : [];
    const ownerMap: Record<string, any> = {};
    for (const o of owners) ownerMap[String(o._id)] = o;

    const itemsWithCounts = items.map((it: any) => ({
      ...it,
      membersCount: Array.isArray(it.members) ? it.members.length : 0,
      owner: it.owner ? { _id: it.owner, email: ownerMap[String(it.owner)]?.email ?? null } : null,
    }));

    return res.status(200).json({ success: true, message: "Lists fetched", data: { page, limit, total, items: itemsWithCounts } });
  } catch (err: any) {
    console.error("Error listing lists:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};

/**
 * Get list by id
 * GET /api/lists/:id
 * Auth required: owner or admin
 */
export const getList = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json({ success: false, message: "id is required", error: null });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "invalid id", error: null });
    }

    // fetch list first so we can inspect target (and perform access control)
    const list = await ListModel.findById(id);
    if (!list) {
      return res.status(404).json({ success: false, message: "List not found", error: null });
    }

    // access control
    if (!isAdminOrOwner(req, String((list as any).owner ?? ""))) {
      return res.status(403).json({ success: false, message: "Forbidden", error: null });
    }

    // populate members depending on target
    let populated;
    if (String(list.target) === "company") {
      populated = await ListModel.findById(id)
        .populate({
          path: "members",
          model: "Company",
          select: "name logo website location employees externalId",
        })
        .populate({ path: "owner", select: "email" })
        .lean();
    } else {
      populated = await ListModel.findById(id)
        .populate({
          path: "members",
          model: "Person",
          select:
            "externalId name designation department location phone email companyEmail corporateEmail social",
        })
        .populate({ path: "owner", select: "email" })
        .lean();
    }

    return res.status(200).json({ success: true, message: "List fetched", data: populated });
  } catch (err: any) {
    console.error("Error fetching list:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};


/**
 * Update list
 * PATCH /api/lists/:id
 * Body: { name?, target? }
 * Only owner or admin can update
 */
export const updateList = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    const payload = req.body ?? {};

    if (!id) {
      return res.status(400).json({ success: false, message: "id is required", error: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "invalid id", error: null });
    }

    if (payload.target && !["people", "company"].includes(String(payload.target))) {
      return res.status(400).json({ success: false, message: "invalid target", error: null });
    }

    const list = await ListModel.findById(id);
    if (!list) return res.status(404).json({ success: false, message: "List not found", error: null });

    // access control
    if (!isAdminOrOwner(req, String(list.owner ?? ""))) {
      return res.status(403).json({ success: false, message: "Forbidden", error: null });
    }

    // Prevent changing owner via payload
    delete (payload as any).owner;

    const updated = await ListModel.findByIdAndUpdate(id, { $set: payload }, { new: true }).populate({ path: "owner", select: "email" });
    return res.status(200).json({ success: true, message: "List updated", data: updated });
  } catch (err: any) {
    console.error("Error updating list:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};

/**
 * Delete list
 * DELETE /api/lists/:id
 * Only owner or admin can delete
 */
export const deleteList = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    if (!id) return res.status(400).json({ success: false, message: "id is required", error: null });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "invalid id", error: null });

    const list = await ListModel.findById(id);
    if (!list) return res.status(404).json({ success: false, message: "List not found", error: null });

    if (!isAdminOrOwner(req, String(list.owner ?? ""))) {
      return res.status(403).json({ success: false, message: "Forbidden", error: null });
    }

    // Delete the list
    await ListModel.findByIdAndDelete(id);

    // Attempt refund to the list owner (best-effort)
    try {
      const ownerId = String(list.owner ?? "");
      if (ownerId) {
        await addCredits(ownerId, CREATE_LIST_COST, "refund_list_deleted", { listId: id });
      }
    } catch (refundErr) {
      console.error("Failed to refund credits after list deletion:", refundErr);
    }

    return res.status(200).json({ success: true, message: "List deleted", data: null });
  } catch (err: any) {
    console.error("Error deleting list:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};


export const addMemberToList = async (req: Request, res: Response) => {
  try {
    const listId = String(req.params.id ?? "");
    const { personId, email, companyId } = req.body ?? {};
    const actorId = String((req as any).userId ?? "");

    if (!actorId) return res.status(401).json({ success: false, message: "Unauthorized", error: null });

    if (!listId) return res.status(400).json({ success: false, message: "list id is required", error: null });
    if (!mongoose.Types.ObjectId.isValid(listId)) return res.status(400).json({ success: false, message: "invalid list id", error: null });

    const list = await ListModel.findById(listId!);
    if (!list) return res.status(404).json({ success: false, message: "List not found", error: null });

    if (!isAdminOrOwner(req, String(list.owner ?? ""))) {
      return res.status(403).json({ success: false, message: "Forbidden", error: null });
    }

    if (String(list.target) === "people") {
      if (!personId && !email) {
        return res.status(400).json({ success: false, message: "personId or email is required", error: null });
      }
      if (personId && !mongoose.Types.ObjectId.isValid(personId)) {
        return res.status(400).json({ success: false, message: "invalid personId", error: null });
      }
    } else if (String(list.target) === "company") {
      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId is required for company lists", error: null });
      }
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ success: false, message: "invalid companyId", error: null });
      }
    } else {
      return res.status(400).json({ success: false, message: "Unsupported list target", error: null });
    }

    // charge the ACTOR (requesting user)
    const charged = await deductCredits(actorId, ADD_MEMBER_COST, "add_member", { listId, memberId: personId ?? companyId });
    if (!charged) {
      return res.status(402).json({ success:false, message: "Insufficient credits. Please top up.", error: null });
    }

    // Perform the add operation
    try {
      if (String(list.target) === "people") {
        let resolvedPersonId: mongoose.Types.ObjectId | null = null;

        if (personId) {
          const exists = await PersonModel.exists({ _id: personId });
          if (!exists) {
            // refund because we charged but person doesn't exist
            await addCredits(actorId, ADD_MEMBER_COST, "refund_add_member_person_not_found", { personId, listId });
            return res.status(404).json({ success: false, message: "Person not found", error: null });
          }
          resolvedPersonId = new mongoose.Types.ObjectId(personId);
        } else if (email) {
          const raw = String(email ?? "").trim().toLowerCase();
          const localPart = raw.split("@")[0];
          let person = await PersonModel.findOne({ $or: [{ email: raw }, { externalId: raw }, { externalId: localPart }] });

          if (!person) {
            const isAdmin = !!(req as any).isAdmin;
            if (!isAdmin) {
              // refund because can't create person for non-admin
              await addCredits(actorId, ADD_MEMBER_COST, "refund_add_member_person_not_found", { email: raw, listId });
              return res.status(404).json({ success: false, message: "Person not found. Ask an admin to create the person or provide personId.", error: null });
            }

            // create new Person stub (admin-only)
            const safeName = localPart!
              .split(/[\.\-_]/)
              .filter(Boolean)
              .map((s) => s[0] ? s[0].toUpperCase() + s.slice(1) : "")
              .join(" ") || raw;

            const baseExternal = `p-${localPart!.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
            let candidate = baseExternal;
            let i = 1;
            while (await PersonModel.exists({ externalId: candidate })) {
              candidate = `${baseExternal}-${i++}`;
            }

            const newPerson = new PersonModel({
              name: safeName,
              externalId: candidate,
              ...(PersonModel.schema.path("email") ? { email: raw } : {}),
              designation: "Unknown",
              department: "Unknown",
              location: "Unknown",
            } as any);

            person = await newPerson.save();
          }

          resolvedPersonId = new mongoose.Types.ObjectId(person!._id);
        }

        if (!resolvedPersonId) {
          // refund as safety
          await addCredits(actorId, ADD_MEMBER_COST, "refund_add_member_failed_resolve", { listId, personId, email });
          return res.status(500).json({ success: false, message: "Failed to resolve person", error: null });
        }

        await ListModel.findByIdAndUpdate(listId, { $addToSet: { members: resolvedPersonId } });
      } else {
        // company
        const exists = await CompanyModel.exists({ _id: companyId });
        if (!exists) {
          // refund: company not found
          await addCredits(actorId, ADD_MEMBER_COST, "refund_add_member_company_not_found", { companyId, listId });
          return res.status(404).json({ success: false, message: "Company not found", error: null });
        }

        const resolvedCompanyId = new mongoose.Types.ObjectId(companyId);
        await ListModel.findByIdAndUpdate(listId, { $addToSet: { members: resolvedCompanyId } });
      }

      // return updated populated list
      const fresh = await ListModel.findById(listId);
      if (!fresh) {
        return res.status(500).json({ success: false, message: "Failed to fetch updated list", error: null });
      }

      let updated;
      if (String(fresh.target) === "company") {
        updated = await ListModel.findById(listId)
          .populate({ path: "members", model: "Company", select: "name logo website location employees" })
          .populate({ path: "owner", select: "email" });
      } else {
        updated = await ListModel.findById(listId)
          .populate({ path: "members", model: "Person", select: "name designation location externalId email" })
          .populate({ path: "owner", select: "email" });
      }

      return res.status(200).json({ success: true, message: "Member added to list", data: updated });
    } catch (innerErr) {
      // If any DB op failed after charge, refund and report error
      try {
        await addCredits(actorId, ADD_MEMBER_COST, "refund_add_member_exception", { listId, error: String(innerErr) });
      } catch (refundErr) {
        console.error("Refund failed after addMember error:", refundErr);
      }
      console.error("Error performing add member operation:", innerErr);
      return res.status(500).json({ success: false, message: "Failed to add member", error: String(innerErr) });
    }
  } catch (err: any) {
    console.error("Error adding member to list:", err.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};


/**
 * Remove member from list
 * DELETE /api/lists/:id/members/:memberId
 * Only owner or admin
 */
export const removeMemberFromList = async (req: Request, res: Response) => {
  try {
    const listId = String(req.params.id ?? "");
    const memberId = String(req.params.memberId ?? "");

    if (!listId || !memberId) return res.status(400).json({ success: false, message: "list id and member id are required", error: null });
    if (!mongoose.Types.ObjectId.isValid(listId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ success: false, message: "invalid id(s)", error: null });
    }

    const list = await ListModel.findById(listId);
    if (!list) return res.status(404).json({ success: false, message: "List not found", error: null });

    if (!isAdminOrOwner(req, String(list.owner ?? ""))) {
      return res.status(403).json({ success: false, message: "Forbidden", error: null });
    }

    // atomic pull
    await ListModel.findByIdAndUpdate(listId, { $pull: { members: new mongoose.Types.ObjectId(memberId) } });

    // Attempt refund to the list owner (best-effort)
    try {
      const ownerId = String(list.owner ?? "");
      if (ownerId) {
        await addCredits(ownerId, ADD_MEMBER_COST, "refund_member_removed", { listId, memberId });
      }
    } catch (refundErr) {
      // Log refund failure but do not fail the endpoint
      console.error("Failed to refund credits after member removal:", refundErr);
    }

    // return updated list populated by target
    const fresh = await ListModel.findById(listId);
    if (!fresh) {
      return res.status(500).json({ success: false, message: "Failed to fetch updated list", error: null });
    }

    let updated;
    if (String(fresh.target) === "company") {
      updated = await ListModel.findById(listId)
        .populate({ path: "members", model: "Company", select: "name logo website location employees" })
        .populate({ path: "owner", select: "email" });
    } else {
      updated = await ListModel.findById(listId)
        .populate({ path: "members", model: "Person", select: "name designation location externalId" })
        .populate({ path: "owner", select: "email" });
    }

    return res.status(200).json({ success: true, message: "Member removed from list", data: updated });
  } catch (err: any) {
    console.error("Error removing member from list:", err.response?.data || err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: err.response?.data || err.message });
  }
};

