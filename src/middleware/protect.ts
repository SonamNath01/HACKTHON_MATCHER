import {Request, Response ,NextFunction} from 'express';
import jwt from 'jsonwebtoken';
declare global {
    namespace Express {
        interface Request {
            user?: {id: string};
        }
    }
}
export const protect = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
        return res.status(401).json({message: 'Unauthorized'});
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {id: string};
        req.user = {id: decoded.id};
        next();
    } catch (error) {
        return res.status(401).json({message: 'Unauthorized'});
    }   
};
