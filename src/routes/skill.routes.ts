import { Router } from "express"
import { protect } from "../middleware/protect"
import { getAllSkills, addUserSkill, removeUserSkill } from "../controllers/skill.controller"

const router = Router()

router.get("/", getAllSkills)
router.post("/me", protect, addUserSkill)
router.delete("/me/:skillId", protect, removeUserSkill)

export default router
