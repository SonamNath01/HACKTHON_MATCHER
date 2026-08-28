import { Router } from "express"
import { prisma } from "../lib/prisma"

const router = Router()

router.get("/", async (req, res) => {
  try {
    const hackathons = await prisma.hackathon.findMany()
    res.json({ hackathons })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching hackathons' })
  }
})

export default router
