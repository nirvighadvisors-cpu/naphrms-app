import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.attendanceRecord.deleteMany();
  console.log('Attendance reset');
}
main().finally(() => prisma.$disconnect());
