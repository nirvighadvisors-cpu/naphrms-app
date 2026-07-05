import prisma from '../config/database';

async function main() {
  const employeeId = 'aef89c43-7069-4bae-bca3-fc6b35ba485c'; // Chirag's ID
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  console.log('partialOfferLetterUrl:', employee?.partialOfferLetterUrl);
}

main().catch(console.error);
