import { Router } from "express"
import { PrismaClient } from "@prisma/client"

const router = Router()
const prisma = new PrismaClient()

router.get("/", async (req, res) => {
  const skills = await prisma.skill.findMany()
  res.json(skills)
})

export default router