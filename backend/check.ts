import prisma from './src/config/database';

async function check() {
  const docs = await prisma.employeeDocument.findMany({
    where: { type: 'OFFER_LETTER' }
  });
  console.log('Offer letters found:', docs.length);
  if (docs.length > 0) {
    console.log(docs);
  }
}

check().catch(console.error);
