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

