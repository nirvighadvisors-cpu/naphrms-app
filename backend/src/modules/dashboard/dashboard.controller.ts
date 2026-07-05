import { Request, Response } from 'express';
import prisma from '../../config/database';

export const getActionItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const actionItems = [];

    // 1. Profile Completion
    if (!employee.isProfileComplete) {
      actionItems.push({
        id: 'profile-completion',
        title: 'Complete your profile',
        description: 'Your employee profile is missing some details. Please complete it.',
        type: 'PROFILE_COMPLETION',
        actionUrl: '/employee/profile',
        priority: 'HIGH',
        dueDate: null,
      });
    }

    // 2. Pending Leave Approvals (If Manager)
    const pendingLeaves = await prisma.leaveRequest.count({
      where: {
        status: 'PENDING',
        employee: {
          managerId: employee.id,
        },
      },
    });

    if (pendingLeaves > 0) {
      actionItems.push({
        id: 'pending-leaves',
        title: 'Pending Leave Approvals',
        description: `You have ${pendingLeaves} leave request(s) waiting for your approval.`,
        type: 'LEAVE_APPROVAL',
        actionUrl: '/admin/leave', // Assuming managers use admin leave page or similar
        priority: 'MEDIUM',
        dueDate: null,
      });
    }

    // 3. Pending Performance Self-Reviews
    const pendingReviews = await prisma.review.findMany({
      where: {
        employeeId: employee.id,
        status: 'SELF_REVIEW_PENDING',
      },
      include: {
        cycle: true,
      },
    });

    pendingReviews.forEach(review => {
      actionItems.push({
        id: `review-${review.id}`,
        title: 'Self-Review Pending',
        description: `Please complete your self-review for ${review.cycle.name}.`,
        type: 'PERFORMANCE_REVIEW',
        actionUrl: '/employee/performance',
        priority: 'HIGH',
        dueDate: review.cycle.endDate.toISOString(),
      });
    });

    // 4. Pending Surveys
    const pendingSurveys = await prisma.survey.findMany({
      where: {
        isActive: true,
        OR: [
          { targetDepartmentId: null },
          { targetDepartmentId: employee.departmentId },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          {
            responses: {
              none: {
                employeeId: employee.id,
              },
            },
          },
        ],
      },
    });

    pendingSurveys.forEach(survey => {
      actionItems.push({
        id: `survey-${survey.id}`,
        title: `Survey: ${survey.title}`,
        description: survey.description || 'Please complete this survey.',
        type: 'SURVEY',
        actionUrl: '/employee/surveys',
        priority: 'MEDIUM',
        dueDate: survey.expiresAt ? survey.expiresAt.toISOString() : null,
      });
    });

    res.status(200).json({ data: actionItems });
  } catch (error) {
    console.error('Error fetching action items:', error);
    res.status(500).json({ message: 'Failed to fetch action items' });
  }
};
