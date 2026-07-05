import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
import supabase from '../../config/supabase';
import prisma from '../../config/database';

export class OfferLetterService {
  /**
   * Generates a partial Offer Letter by embedding the signature and basic details,
   * then uploads it to Supabase and updates the employee record.
   */
  static async generateAndUploadPartial(employeeId: string): Promise<string> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        manager: true,
      }
    });

    if (!employee) throw new Error('Employee not found');
    if (!employee.signatureUrl) throw new Error('Employee signature not found');

    // 1. Download the signature image from Supabase
    const { data: signatureData, error: downloadError } = await supabase.storage
      .from('hrms-documents')
      .download(employee.signatureUrl);

    if (downloadError || !signatureData) {
      throw new Error(`Failed to download signature: ${downloadError?.message}`);
    }

    const signatureBuffer = Buffer.from(await signatureData.arrayBuffer());

    // 2. Load the template
    const templatePath = path.resolve(__dirname, '../../../offer_template.docx');
    console.log('Resolving template path to:', templatePath);
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // 3. Setup Image Module
    const imageOptions = {
      centered: false,
      fileType: "docx",
      getImage: (tagValue: string, tagName: string) => {
        return signatureBuffer;
      },
      getSize: (img: any, tagValue: string, tagName: string) => {
        return [150, 50]; // Width and height in pixels
      },
    };

    const imageModule = new ImageModule(imageOptions);

    // 4. Run Docxtemplater
    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    });

    // 5. Replace Text Variables
    const joiningDateStr = employee.dateOfJoining 
      ? new Date(employee.dateOfJoining).toLocaleDateString() 
      : new Date().toLocaleDateString();
      
    doc.render({
      signature: "signature.png", 
      designation: employee.designation || '',
      date: joiningDateStr,
      managerName: employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '',
      ctcFigures: '', 
      ctcWords: '',   
      employeeName: `${employee.firstName} ${employee.lastName}`,
    });

    // 6. Get final binary
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // 7. Upload to Supabase Storage
    const uploadPath = `${employee.id}/documents/partial_offer_letter_${Date.now()}.docx`;
    const { error: uploadError } = await supabase.storage
      .from('hrms-documents')
      .upload(uploadPath, buf, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload generated offer letter: ${uploadError.message}`);
    }

    // 8. Update Database Record
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        partialOfferLetterUrl: uploadPath,
        offerLetterStatus: 'AWAITING_HR_COMPLETION',
      }
    });

    return uploadPath;
  }
}
