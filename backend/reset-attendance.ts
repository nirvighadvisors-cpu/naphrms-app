import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting attendance records for today...');
  
  // Find today's date range
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // Delete related regularization requests first
  const deletedRegs = await prisma.regularizationRequest.deleteMany({
    where: {
      attendance: {
        date: {
          gte: today,
          lt: tomorrow,
        }
      }
    }
  });

  console.log(`Deleted ${deletedRegs.count} regularization requests.`);

  // Delete all attendance records for today
  const deleteResult = await prisma.attendanceRecord.deleteMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow,
      }
    }
  });

  console.log(`Deleted ${deleteResult.count} attendance records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
