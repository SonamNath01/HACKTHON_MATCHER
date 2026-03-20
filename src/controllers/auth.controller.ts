import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {PrismaClient} from '@prisma/client'
const prisma = new PrismaClient();

const signToken =(userId: string) => {
    return jwt.sign({id: userId}, process.env.JWT_SECRET!, {expiresIn: '7d'});
};
export const register = async (req: Request, res: Response) => {
    const{name, email, password} = req.body;
    try {
        const existingUser = await prisma.user.findUnique({where: {email}});
        if (existingUser) {
            return res.status(400).json({message: 'User already exists'});
        }
        const hashedpassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedpassword
            }
        });
        const token = signToken(user.id);
        res.status(201).json({token});
    } catch (error) {
        res.status(500).json({message: 'Error registering user'});
    }
};
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user.id);
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ token, user: userWithoutPassword });

  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
};
export const getMe = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: { skill: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ user: userWithoutPassword });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

