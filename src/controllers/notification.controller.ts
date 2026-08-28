import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Safety cap so a long-lived account's inbox can't be loaded unbounded.
const MAX_NOTIFICATIONS = 100;

//fetch all notifications for logged in user
export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_NOTIFICATIONS
    });

    res.status(200).json({ notifications });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// — mark one notification as read
export const markAsRead = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = req.user?.id;

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // make sure user can only mark their own notifications
    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'Not your notification' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.status(200).json({ notification: updated });

  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
};
