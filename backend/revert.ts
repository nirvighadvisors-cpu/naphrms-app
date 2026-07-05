import prisma from './src/config/database';

async function main() {
  await prisma.employee.update({
    where: { id: 'aef89c43-7069-4bae-bca3-fc6b35ba485c' },
    data: {
      offerLetterStatus: 'AWAITING_HR_COMPLETION'
    }
  });
  console.log('Reverted offerLetterStatus!');
}

main().catch(console.error);
