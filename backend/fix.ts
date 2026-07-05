import prisma from './src/config/database';

async function fix() {
  const employee = await prisma.employee.findUnique({
    where: { id: 'aef89c43-7069-4bae-bca3-fc6b35ba485c' },
    select: { id: true, finalOfferLetterUrl: true }
  });
  
  if (employee?.finalOfferLetterUrl) {
    // Check if document already exists
    const existing = await prisma.employeeDocument.findFirst({
      where: { employeeId: employee.id, type: 'OFFER_LETTER', fileUrl: employee.finalOfferLetterUrl }
    });
    
    if (!existing) {
      await prisma.employeeDocument.create({
        data: {
          employeeId: employee.id,
          type: 'OFFER_LETTER',
          fileName: 'final_offer_letter.pdf',
          fileUrl: employee.finalOfferLetterUrl,
          fileSize: 100000,
          uploadedById: '00000000-0000-0000-0000-000000000000' // SYSTEM or fake
        }
      });
      console.log('Fixed missing document!');
    } else {
      console.log('Document already exists.');
    }
  } else {
    console.log('No final offer letter URL found.');
  }
}

fix().catch(console.error);
