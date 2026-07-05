import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { globalLimiter } from './middleware/rate-limiter.middleware';
import authRoutes from './modules/auth/auth.route';
import employeeRoutes from './modules/employee/employee.route';
import departmentRoutes from './modules/department/department.route';
import attendanceRoutes from './modules/attendance/attendance.route';
import holidayRoutes from './modules/holiday/holiday.route';
import worksiteRoutes from './modules/worksite/worksite.route';
import leaveRoutes from './modules/leave/leave.route';
import payrollRoutes from './modules/payroll/payroll.route';
import expenseRoutes from './modules/expense/expense.route';
import performanceRoutes from './modules/performance/performance.route';
import documentRoutes from './modules/document/document.route';
import timesheetRoutes from './modules/timesheet/timesheet.route';
import reportRoutes from './modules/report/report.route';
import settingsRoutes from './modules/settings/settings.route';
import onboardingRoutes from './modules/onboarding/onboarding.route';
import notificationRoutes from './modules/notification/notification.route';
import pushRoutes from './modules/notification/push.route';
import searchRoutes from './modules/search/search.routes';
import announcementRoutes from './modules/announcement/announcement.route';
import ticketRoutes from './modules/ticket/ticket.route';
import dashboardRoutes from './modules/dashboard/dashboard.route';
import surveyRoutes from './modules/survey/survey.route';
import recognitionRoutes from './modules/recognition/recognition.route';
import policyRoutes from './modules/policy/policy.routes';

const app = express();

// ── Request Logging ──────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Security Middleware ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", config.frontendUrl],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for external font/image loading
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Global Rate Limiter ─────────────────────────────────────
app.use('/api', globalLimiter);

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/worksites', worksiteRoutes);

// Routes will be registered here in subsequent phases:
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/recognition', recognitionRoutes);
app.use('/api/policies', policyRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

export default app;
