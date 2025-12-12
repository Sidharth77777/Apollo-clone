// routes/seed.ts
import { Router } from "express";
import { deletePeopleHandler, seedHandler } from "../controllers/SeedController.js";

const router = Router();

// POST /api/seed
// Body: { secret, companies: [...], people: [...] }
router.post("/", seedHandler);

router.post("/delete-people", deletePeopleHandler);

export default router;
