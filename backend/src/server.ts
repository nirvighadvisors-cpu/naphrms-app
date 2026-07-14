import http from 'http';
import app from './app';
import { config, validateEnv } from './config/env';
import prisma from './config/database';
import { startAttendanceCronJobs } from './modules/attendance/attendance.cron';
import { startLeaveCronJobs } from './modules/leave/leave.cron';
import { ensureBucket } from './lib/storage';
import { initSocketIO } from './config/socket';

async function main() {
  // Validate environment variables
  validateEnv();

  // Ensure storage bucket exists
  try {
    await ensureBucket();
  } catch (error) {
    console.error('❌ Failed to ensure storage bucket:', error);
  }

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Start cron jobs (attendance, leaves)
  startAttendanceCronJobs();
  startLeaveCronJobs();

  // Create HTTP server from Express app (required for Socket.IO)
  const httpServer = http.createServer(app);

  // Initialize Socket.IO on the HTTP server
  initSocketIO(httpServer);

  // Start server
  httpServer.listen(config.port, () => {
    // Self-ping to prevent Render from sleeping (if on free tier)
    if (config.renderExternalUrl) {
      const pingUrl = `${config.renderExternalUrl}/api/health`;
      const pingModule = pingUrl.startsWith('https') ? require('https') : http;
      console.log(`⏱️ Setting up Render self-ping every 14 minutes for: ${pingUrl}`);
      
      const doPing = () => {
        pingModule.get(pingUrl, (res: any) => {
          if (res.statusCode === 200) {
            console.log(`✅ Render self-ping successful at ${new Date().toISOString()}`);
          } else {
            console.log(`⚠️ Render self-ping failed with status: ${res.statusCode}`);
          }
          res.resume(); // consume response data to free up memory
        }).on('error', (err: any) => {
          console.log(`❌ Render self-ping error: ${err.message}`);
        });
      };

      // Immediate first ping after 30 seconds (let server fully start)
      setTimeout(doPing, 30 * 1000);
      // Then every 14 minutes
      setInterval(doPing, 14 * 60 * 1000);
    }
    console.log(`
╔══════════════════════════════════════════════╗
║          NAP HRMS — API SERVER           ║
╠══════════════════════════════════════════════╣
║  Status:      Running                        ║
║  Port:        ${String(config.port).padEnd(30)}║
║  Environment: ${config.nodeEnv.padEnd(30)}║
║  Frontend:    ${config.frontendUrl.padEnd(30)}║
║  Socket.IO:   Enabled                        ║
║  Web Push:    ${config.vapidPublicKey ? 'Enabled' : 'Disabled'}${' '.repeat(config.vapidPublicKey ? 25 : 24)}║
╚══════════════════════════════════════════════╝
    `);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
