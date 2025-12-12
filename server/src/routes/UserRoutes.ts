import { Router } from "express";
import { login, logout, me, signup } from "../controllers/UserController.ts";

const router = Router();

router.post("/signup", signup)

router.post("/login", login)

router.post("/logout", logout)

router.get("/me", me)


export default router;