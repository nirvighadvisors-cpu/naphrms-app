import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { getSignedUrl } from './src/lib/storage';

async function main() {
  const policies = await prisma.policyDocument.findMany();
  console.log(policies);
  for (const p of policies) {
    try {
      const url = await getSignedUrl(p.fileUrl, 300);
      console.log(`Signed URL for ${p.fileUrl}: ${url}`);
    } catch (err) {
      console.error(`Error for ${p.fileUrl}:`, err);
    }
  }
}
main();
