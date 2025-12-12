import { Router } from "express";
import * as PersonCtrl from "../controllers/PersonController.ts";

const router = Router();

// POST /api/people
router.post("/", PersonCtrl.createPerson);

// GET /api/people
router.get("/", PersonCtrl.listPeople);

// GET /api/people/:id
router.get("/:id", PersonCtrl.getPerson);

// PATCH /api/people/:id
router.patch("/:id", PersonCtrl.updatePerson);

// DELETE /api/people/:id
router.delete("/:id", PersonCtrl.deletePerson);

export default router;
