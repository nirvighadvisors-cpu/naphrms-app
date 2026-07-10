import { Request, Response } from 'express';
import prisma from '../../config/database';
import { getHRAdminUserIds, notifyUsers } from '../../services/notification.service';

// ─── EMPLOYEE ENDPOINTS ──────────────────────────────────────

export const createTicket = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { subject, description, category, priority } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        description,
        category,
        priority: priority || 'MEDIUM',
        employeeId: employee.id,
      },
    });

    res.status(201).json({ message: 'Ticket created successfully', data: ticket });

    // Notify HR
    try {
      const hrUserIds = await getHRAdminUserIds();
      if (hrUserIds.length > 0) {
        await notifyUsers({
          userIds: hrUserIds,
          title: '🎫 New Helpdesk Ticket',
          message: `${employee.firstName} ${employee.lastName} created a new ticket: ${subject}`,
          type: 'SYSTEM',
          linkUrl: '/admin/tickets',
        });
      }
    } catch (err) {
      console.error('Failed to notify HR of ticket creation', err);
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
};

export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const tickets = await prisma.ticket.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { email: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    res.status(200).json({ data: tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
};

export const getTicketDetails = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            profilePhotoUrl: true,
          },
        },
        assignedTo: {
          select: { id: true, email: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                email: true,
                role: true,
                employee: { select: { firstName: true, lastName: true, profilePhotoUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Security check
    if (role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (ticket.employeeId !== employee?.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Filter out internal comments for employees
      ticket.comments = ticket.comments.filter(c => !c.isInternal);
    }

    res.status(200).json({ data: ticket });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({ message: 'Failed to fetch ticket details' });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const { content, isInternal } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Determine if user has access
    if (role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (ticket.employeeId !== employee?.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: id,
        authorId: userId!,
        content,
        isInternal: role !== 'EMPLOYEE' ? !!isInternal : false,
      },
    });

    res.status(201).json({ message: 'Comment added', data: comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// ─── ADMIN ENDPOINTS ─────────────────────────────────────────

export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        assignedTo: {
          select: { id: true, email: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    res.status(200).json({ data: tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
};

export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const updateData: any = { status };
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    } else {
      updateData.resolvedAt = null;
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ message: 'Ticket status updated', data: ticket });

    // Notify Employee
    try {
      const targetEmployee = await prisma.employee.findUnique({
        where: { id: ticket.employeeId },
        select: { userId: true },
      });
      if (targetEmployee?.userId) {
        await notifyUsers({
          userIds: [targetEmployee.userId],
          title: `🎫 Ticket ${status}`,
          message: `Your helpdesk ticket "${ticket.subject}" has been marked as ${status}.`,
          type: 'SYSTEM',
          linkUrl: '/employee/dashboard',
        });
      }
    } catch (err) {
      console.error('Failed to send ticket status notification', err);
    }
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ message: 'Failed to update ticket' });
  }
};

export const assignTicket = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { assignedToId } = req.body; // User ID of admin/hr

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { assignedToId },
    });

    res.status(200).json({ message: 'Ticket assigned', data: ticket });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ message: 'Failed to assign ticket' });
  }
};
