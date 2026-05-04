import { Router } from "express"
import { PrismaClient } from "@prisma/client"

const router = Router()
const prisma = new PrismaClient()

router.get("/", async (req, res) => {
  const hackathons = await prisma.hackathon.findMany()
  res.json(hackathons)
})

export default router