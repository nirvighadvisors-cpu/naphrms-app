import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdmin() {
  const hash = await bcrypt.hash('Admin@123', 12);
  
  await prisma.user.updateMany({
    where: { 
      email: {
        in: ['admin@nirvighadvisors.com', 'nirvighadvisors@gmail.com']
      }
    },
    data: { 
      passwordHash: hash,
      status: 'ACTIVE'
    }
  });
  
  console.log('Passwords updated to Admin@123');
}

resetAdmin().catch(console.error).finally(() => prisma.$disconnect());
