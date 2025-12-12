// controllers/SeedController.ts
import type { Request, Response } from "express";
import CompanyModel from "../models/CompanyModel.ts";
import PersonModel from "../models/PersonModel.ts";
import { ENV } from "../lib/ENV.ts";
import mongoose from "mongoose";

type FrontCompany = any;
type FrontPerson = any;

export const seedHandler = async (req: Request, res: Response) => {
  try {
    const { secret, companies = [], people = [] } = req.body ?? {};

    // protect endpoint
    if (!ENV.SEED_SECRET || secret !== ENV.SEED_SECRET) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const report: { companiesInserted: number; companiesUpdated: number; peopleInserted: number; peopleUpdated: number; warnings: string[] } = {
      companiesInserted: 0,
      companiesUpdated: 0,
      peopleInserted: 0,
      peopleUpdated: 0,
      warnings: [],
    };

    // Upsert companies
    for (const c of companies as FrontCompany[]) {
      const externalId = String(c.id ?? c.externalId ?? "").trim();
      if (!externalId) {
        report.warnings.push("Skipping company with empty id/externalId");
        continue;
      }

      const payload = {
        externalId,
        name: c.name,
        description: c.description,
        website: c.website,
        industries: c.industries ?? [],
        keywords: c.keywords ?? [],
        parentCompany: c.parentCompany ?? null,
        subsidiariesCount: c.subsidiariesCount ?? null,
        stockSymbol: c.stockSymbol ?? null,
        founded: c.founded ?? null,
        employees: c.employees ?? null,
        location: c.location ?? null,
        logo: c.logo ?? null,
        fundingStage: c.fundingStage ?? null,
        totalFundingMillion: c.totalFundingMillion ?? null,
        revenueBillion: c.revenueBillion ?? null,
      };

      const existing = await CompanyModel.findOne({ externalId });
      if (existing) {
        await CompanyModel.updateOne({ externalId }, { $set: payload });
        report.companiesUpdated += 1;
      } else {
        await CompanyModel.create(payload);
        report.companiesInserted += 1;
      }
    }

    // Upsert people (resolve company by externalId)
    for (const p of people as FrontPerson[]) {
      const externalId = String(p.id ?? "").trim() || undefined;
      const name = String(p.name ?? "").trim();
      if (!name) {
        report.warnings.push(`Skipping person with empty name (raw: ${JSON.stringify(p).slice(0, 80)})`);
        continue;
      }

      const companyExternalId = String(p.companyId ?? p.company ?? "").trim();
      if (!companyExternalId) {
        report.warnings.push(`Skipping person ${name}: missing companyId`);
        continue;
      }

      const company = await CompanyModel.findOne({ externalId: companyExternalId });
      if (!company) {
        report.warnings.push(`Skipping person ${name}: company ${companyExternalId} not found`);
        continue;
      }

      const payload: any = {
        name,
        designation: p.designation ?? "Unknown",
        department: p.department ?? "Unknown",
        company: company._id,
        location: p.location ?? "Unknown",
      };
      if (externalId) payload.externalId = externalId;

      if (externalId) {
        const exists = await PersonModel.findOne({ externalId });
        if (exists) {
          await PersonModel.updateOne({ externalId }, { $set: payload });
          report.peopleUpdated += 1;
        } else {
          await PersonModel.create(payload);
          report.peopleInserted += 1;
        }
      } else {
        // fallback upsert by name + company
        const match = { name: payload.name, company: company._id };
        const exists = await PersonModel.findOne(match);
        if (exists) {
          await PersonModel.updateOne(match, { $set: payload });
          report.peopleUpdated += 1;
        } else {
          await PersonModel.create(payload);
          report.peopleInserted += 1;
        }
      }
    }

    return res.status(200).json({ success: true, message: "Seed completed", data: report });
  } catch (err: any) {
    console.error("Seed error:", err);
    return res.status(500).json({ success: false, message: "Seed failed", error: err.message ?? err });
  }
};

export const deletePeopleHandler = async (req: Request, res: Response) => {
  try {
    const { secret } = req.body ?? {};

    // protect the endpoint with the same seed secret
    if (!ENV.SEED_SECRET || secret !== ENV.SEED_SECRET) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // perform deletion
    const result = await PersonModel.deleteMany({});
    // result may include deletedCount
    return res.status(200).json({
      success: true,
      message: "People collection cleared",
      deletedCount: (result as any)?.deletedCount ?? null,
    });
  } catch (err: any) {
    console.error("deletePeopleHandler error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete people", error: err?.message ?? String(err) });
  }
};