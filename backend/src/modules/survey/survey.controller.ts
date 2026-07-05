import { Request, Response } from 'express';
import prisma from '../../config/database';
import { notifyUsers } from '../../services/notification.service';

export const createSurvey = async (req: Request, res: Response) => {
  try {
    const { title, description, isActive, targetDepartmentId, expiresAt, questions } = req.body;

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        isActive: isActive !== undefined ? isActive : true,
        targetDepartmentId: targetDepartmentId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        questions: {
          create: questions.map((q: any, i: number) => ({
            type: q.type,
            text: q.text,
            options: q.options || [],
            order: i,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    res.status(201).json({ message: 'Survey created', data: survey });

    // Notify target employees
    try {
      const whereClause: any = { status: 'ACTIVE', userId: { not: null } };
      if (targetDepartmentId) {
        whereClause.departmentId = targetDepartmentId;
      }
      const employees = await prisma.employee.findMany({
        where: whereClause,
        select: { userId: true },
      });
      const userIds = employees.map(e => e.userId).filter(Boolean) as string[];
      if (userIds.length > 0) {
        await notifyUsers({
          userIds,
          title: '📋 New Survey Published',
          message: `A new survey "${title}" requires your input.`,
          type: 'SYSTEM',
          linkUrl: '/employee/dashboard',
        });
      }
    } catch (err) {
      console.error('Failed to notify employees of new survey', err);
    }
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ message: 'Failed to create survey' });
  }
};

export const getAllSurveys = async (req: Request, res: Response) => {
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    res.status(200).json({ data: surveys });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ message: 'Failed to fetch surveys' });
  }
};

export const getActiveSurveys = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const surveys = await prisma.survey.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ data: surveys });
  } catch (error) {
    console.error('Error fetching active surveys:', error);
    res.status(500).json({ message: 'Failed to fetch active surveys' });
  }
};

export const getSurveyDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    res.status(200).json({ data: survey });
  } catch (error) {
    console.error('Error fetching survey details:', error);
    res.status(500).json({ message: 'Failed to fetch survey details' });
  }
};

export const submitSurvey = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { answers } = req.body; // Array of { questionId, textValue, numberValue, optionValue }

    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if already submitted
    const existing = await prisma.surveyResponse.findUnique({
      where: {
        surveyId_employeeId: {
          surveyId: id,
          employeeId: employee.id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Survey already submitted' });
    }

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: id,
        employeeId: employee.id,
        answers: {
          create: answers.map((a: any) => ({
            questionId: a.questionId,
            textValue: a.textValue,
            numberValue: a.numberValue,
            optionValue: a.optionValue,
          })),
        },
      },
    });

    res.status(201).json({ message: 'Survey submitted', data: response });
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({ message: 'Failed to submit survey' });
  }
};

export const getSurveyResponses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        answers: {
          include: {
            question: { select: { text: true, type: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.status(200).json({ data: responses });
  } catch (error) {
    console.error('Error fetching survey responses:', error);
    res.status(500).json({ message: 'Failed to fetch survey responses' });
  }
};
