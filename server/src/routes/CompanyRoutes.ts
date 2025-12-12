import { Router } from "express";
import * as CompanyCtrl from "../controllers/CompanyController.ts";

const router = Router();

// POST /api/companies
router.post("/", CompanyCtrl.createCompany);

// GET /api/companies
router.get("/", CompanyCtrl.listCompanies);

// GET /api/companies/:id
router.get("/:id", CompanyCtrl.getCompany);

// PATCH /api/companies/:id
router.patch("/:id", CompanyCtrl.updateCompany);

// DELETE /api/companies/:id
router.delete("/:id", CompanyCtrl.deleteCompany);

export default router;
