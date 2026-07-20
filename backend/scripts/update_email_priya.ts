import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendEmail } from '../src/lib/email';
import { config } from '../src/config/env';

const prisma = new PrismaClient();

async function main() {
  const oldEmail = 'priyasharma67275@gmail.com';
  const newEmail = 'priyasharma672745@gmail.com';

  console.log(`Looking for user with email: ${oldEmail}`);
  const user = await prisma.user.findUnique({
    where: { email: oldEmail },
    include: { employee: true },
  });

  if (!user) {
    console.error('User not found!');
    return;
  }

  const employee = user.employee;
  if (!employee) {
    console.error('Employee not found!');
    return;
  }

  console.log(`Updating email for ${employee.firstName} ${employee.lastName}...`);
  
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { email: oldEmail },
    data: {
      email: newEmail,
      inviteToken,
      inviteExpiresAt,
    },
  });
  
  console.log(`Updated email to ${newEmail}`);
  console.log('Sending invitation email...');

  const activationLink = `${config.appUrl}/activate?token=${inviteToken}`;
  await sendEmail({
    to: newEmail,
    subject: 'Welcome to NAP HRMS — Activate Your Account',
    html: `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Nirvigh Advisors</h1>
          <p style="color: #94a3b8; margin: 10px 0 0; font-size: 16px;">We're thrilled to have you on board, ${employee.firstName}!</p>
        </div>
        
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi ${employee.firstName},</p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your employee account has been successfully created. To officially get started and receive your Employee ID, you just need to complete your onboarding profile.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #0f172a; margin: 0; font-weight: 600; font-size: 15px;">Next Step:</p>
            <p style="color: #475569; margin: 5px 0 0; font-size: 14px;">Set your password and complete your registration by clicking the button below.</p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${activationLink}" style="display: inline-block; padding: 14px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2), 0 2px 4px -1px rgba(13, 148, 136, 0.1);">Complete Registration</a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 0; text-align: center;">
            <span style="display: inline-block; margin-right: 5px;">⏳</span> This activation link will expire in <strong>72 hours</strong>.
          </p>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Nirvigh Advisors. All rights reserved.</p>
          <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `,
  });

  console.log('Successfully updated email and sent invite!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
