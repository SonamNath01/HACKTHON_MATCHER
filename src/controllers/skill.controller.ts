import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'];

export const getAllSkills = async (req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany();
    res.status(200).json({ skills });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching skills' });
  }
};

export const addUserSkill = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { skillId, proficiency } = req.body;

  if (!skillId) {
    return res.status(400).json({ message: 'skillId is required' });
  }
  if (proficiency && !PROFICIENCY_LEVELS.includes(proficiency)) {
    return res.status(400).json({ message: 'Invalid proficiency level' });
  }

  try {
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const userSkill = await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: userId!, skillId } },
      update: { proficiency: proficiency ?? undefined },
      create: { userId: userId!, skillId, proficiency: proficiency ?? undefined },
      include: { skill: true }
    });

    res.status(200).json({ userSkill });
  } catch (error) {
    res.status(500).json({ message: 'Error adding skill' });
  }
};

export const removeUserSkill = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const skillId = req.params.skillId as string;

  try {
    await prisma.userSkill.delete({
      where: { userId_skillId: { userId: userId!, skillId } }
    });
    res.status(200).json({ message: 'Skill removed' });
  } catch (error) {
    res.status(404).json({ message: 'Skill not found on profile' });
  }
};
