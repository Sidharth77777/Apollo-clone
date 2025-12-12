import { Router } from "express";
import * as ListCtrl from "../controllers/ListController.ts";

const router = Router();

// list CRUD
router.get("/", ListCtrl.listLists);
router.post("/", ListCtrl.createList);
router.get("/:id", ListCtrl.getList);
router.patch("/:id", ListCtrl.updateList);
router.delete("/:id", ListCtrl.deleteList);

// members
router.post("/:id/members", ListCtrl.addMemberToList);
router.delete("/:id/members/:memberId", ListCtrl.removeMemberFromList);

export default router;
