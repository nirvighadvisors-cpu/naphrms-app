import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface OfferLetterProps {
  employee: any;
  signatureUrl?: string;
}

export const OfferLetterTemplate = forwardRef<HTMLDivElement, OfferLetterProps>(
  ({ employee, signatureUrl }, ref) => {
    const today = new Date();
    
    return (
      <div 
        ref={ref} 
        style={{ width: '800px', backgroundColor: 'white', color: 'black', padding: '40px 60px', fontFamily: 'serif' }}
        className="absolute -left-[9999px] top-0"
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#111' }}>NIRVIGH ADVISORS PVT. LTD.</h1>
          <p style={{ margin: '0', fontSize: '12px', color: '#555' }}>123 Corporate Avenue, Business Park, Bangalore - 560001</p>
          <p style={{ margin: '0', fontSize: '12px', color: '#555' }}>Email: hr@nirvighadvisors.com | Web: www.nirvighadvisors.com</p>
        </div>

        {/* Date & Salutation */}
        <div style={{ marginBottom: '30px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>Date: {format(today, 'dd MMMM yyyy')}</p>
          <p style={{ margin: '0' }}>To,</p>
          <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{employee?.firstName} {employee?.lastName}</p>
          <p style={{ margin: '5px 0 0 0' }}>
            {(() => {
              try {
                if (!employee?.currentAddress) return 'Address on file';
                const addr = JSON.parse(employee.currentAddress);
                return [addr.houseNo, addr.building, addr.street, addr.landmark, addr.city, addr.taluka, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ');
              } catch {
                return employee?.currentAddress || 'Address on file';
              }
            })()}
          </p>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: '30px' }}>
          <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Subject: Offer of Employment</p>
        </div>

        {/* Body */}
        <div style={{ lineHeight: '1.6', marginBottom: '40px', fontSize: '14px', textAlign: 'justify' }}>
          <p>Dear {employee?.firstName},</p>
          <p>
            We are pleased to offer you the position of employment at Nirvigh Advisors Pvt. Ltd. 
            Your skills and experience will be an ideal fit for our team.
          </p>
          <p>
            As discussed, your starting date will be communicated to you shortly. You will be expected to perform duties 
            in alignment with the company's goals and operational requirements. Detailed compensation structure, 
            benefits, and company policies will be provided in your final Appointment Letter upon your joining.
          </p>
          <p>
            Please note that this offer is contingent upon the successful completion of background checks and verification 
            of the KYC documents provided by you during the onboarding process.
          </p>
          <p>
            If you accept this offer, please electronically sign this document. By signing, you acknowledge that you 
            have read, understood, and accepted the terms of employment with Nirvigh Advisors Pvt. Ltd.
          </p>
          <p>
            We look forward to welcoming you to the team and wish you a successful career with us.
          </p>
          <p style={{ marginTop: '20px' }}>Sincerely,</p>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
          <div style={{ width: '45%' }}>
            <div style={{ height: '60px', borderBottom: '1px solid #ccc', marginBottom: '10px', display: 'flex', alignItems: 'flex-end', paddingBottom: '5px' }}>
              <span style={{ fontFamily: 'cursive', fontSize: '20px', color: '#000' }}>HR Department</span>
            </div>
            <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px' }}>Authorized Signatory</p>
            <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>Nirvigh Advisors Pvt. Ltd.</p>
          </div>

          <div style={{ width: '45%' }}>
            <div style={{ height: '60px', borderBottom: '1px solid #ccc', marginBottom: '10px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureUrl} alt="Employee Signature" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
              ) : (
                <span style={{ color: '#999', fontSize: '12px' }}>[ E-Signature Pending ]</span>
              )}
            </div>
            <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px' }}>Accepted By</p>
            <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>{employee?.firstName} {employee?.lastName}</p>
          </div>
        </div>
      </div>
    );
  }
);

OfferLetterTemplate.displayName = 'OfferLetterTemplate';
