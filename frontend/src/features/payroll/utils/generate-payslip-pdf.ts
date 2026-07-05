import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Utility to convert numbers to Indian words
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const integerPart = Math.floor(num);
  let result = '';
  
  if (integerPart > 9999999) {
    result += convertLessThanOneThousand(Math.floor(integerPart / 10000000)) + 'Crore ';
    num %= 10000000;
  }
  if (integerPart > 99999) {
    result += convertLessThanOneThousand(Math.floor((integerPart % 10000000) / 100000)) + 'Lakh ';
  }
  if (integerPart > 999) {
    result += convertLessThanOneThousand(Math.floor((integerPart % 100000) / 1000)) + 'Thousand ';
  }
  result += convertLessThanOneThousand(integerPart % 1000);
  
  return result.trim() + ' Rupees Only';
}

const formatCurrency = (val: number | null | undefined) => {
  if (val == null || isNaN(val)) return '-';
  const numStr = val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Rs. ${numStr}`;
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const generatePayslipPdf = (payslips: any[], companySettings: any, download: boolean = true) => {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const companyName = companySettings?.find((s: any) => s.key === 'COMPANY_NAME')?.value || 'Company Name';
  const companyAddress = companySettings?.find((s: any) => s.key === 'COMPANY_ADDRESS')?.value || 'Company Address';
  const companyPan = companySettings?.find((s: any) => s.key === 'COMPANY_PAN')?.value || '';

  // Brand Colors (Emerald theme)
  const colorPrimary: [number, number, number] = [5, 150, 105]; // emerald-600
  const colorPrimaryLight: [number, number, number] = [236, 253, 245]; // emerald-50
  const colorText: [number, number, number] = [15, 23, 42]; // slate-900
  const colorTextMuted: [number, number, number] = [100, 116, 139]; // slate-500
  const colorBorder: [number, number, number] = [226, 232, 240]; // slate-200

  payslips.forEach((payslip, index) => {
    if (index > 0) doc.addPage();

    const margin = 40;
    let y = 0;

    // --- Top Banner ---
    doc.setFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.rect(0, 0, pageWidth, 110, 'F');
    
    y = 45;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, pageWidth / 2, y, { align: 'center' });
    
    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(companyAddress, pageWidth / 2, y, { align: 'center' });
    
    if (companyPan) {
      y += 15;
      doc.setFontSize(9);
      doc.text(`PAN: ${companyPan}`, pageWidth / 2, y, { align: 'center' });
    }

    // --- Payslip Title ---
    y = 150;
    doc.setTextColor(colorText[0], colorText[1], colorText[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const monthName = MONTH_NAMES[payslip.month - 1];
    doc.text(`Payslip for ${monthName} ${payslip.year}`, pageWidth / 2, y, { align: 'center' });
    y += 30;

    // --- Employee Details Box ---
    const boxHeight = 115;
    doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 6, 6, 'FD');

    const emp = payslip.employee;
    const col1X = margin + 20;
    const col1DataX = margin + 110;
    const col2X = margin + 270;
    const col2DataX = margin + 350;

    const empData = [
      { l1: 'Employee Name:', v1: `${emp.firstName || ''} ${emp.lastName || ''}`, l2: 'Date of Joining:', v2: emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB') : '-' },
      { l1: 'Employee ID:', v1: emp.employeeCode || '-', l2: 'Bank Name:', v2: emp.bankName || '-' },
      { l1: 'Designation:', v1: emp.designation || '-', l2: 'Bank A/c No:', v2: emp.bankAccountNumber || '-' },
      { l1: 'Department:', v1: emp.department?.name || '-', l2: 'Bank IFSC:', v2: emp.bankIFSC || '-' },
      { l1: 'PAN Number:', v1: emp.panNumber || '-', l2: 'UAN Number:', v2: emp.uanNumber || '-' },
      { l1: 'Working Days:', v1: String(payslip.workingDays), l2: 'PF Number:', v2: emp.pfAccountNumber || '-' },
      { l1: 'Paid Days:', v1: String(payslip.presentDays), l2: '', v2: '' },
    ];

    let startY = y + 20;
    empData.forEach((row) => {
      doc.setFontSize(9);
      doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
      doc.setFont('helvetica', 'normal');
      doc.text(row.l1, col1X, startY);
      
      doc.setTextColor(colorText[0], colorText[1], colorText[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(row.v1, col1DataX, startY);
      
      if (row.l2) {
        doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
        doc.setFont('helvetica', 'normal');
        doc.text(row.l2, col2X, startY);
        
        doc.setTextColor(colorText[0], colorText[1], colorText[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(row.v2, col2DataX, startY);
      }
      startY += 13;
    });

    y += boxHeight + 25;

    // --- Earnings & Deductions Table ---
    const rawEarnings = payslip.earnings || {};
    const rawDeductions = payslip.deductions || {};
    
    const earnings = [
      { name: 'Basic Pay', amount: payslip.basicSalary },
      ...Object.entries(rawEarnings).map(([k, v]) => ({ name: k, amount: Number(v) })).filter(e => e.amount > 0)
    ];
    const deductions = Object.entries(rawDeductions).map(([k, v]) => ({ name: k, amount: Number(v) })).filter(d => d.amount > 0);

    const maxRows = Math.max(earnings.length, deductions.length);
    const tableData = [];
    
    for (let i = 0; i < maxRows; i++) {
      const e = earnings[i] || { name: '', amount: null };
      const d = deductions[i] || { name: '', amount: null };
      tableData.push([
        e.name,
        e.amount !== null ? formatCurrency(e.amount) : '',
        d.name,
        d.amount !== null ? formatCurrency(d.amount) : ''
      ]);
    }
    
    // Add Total Row
    tableData.push([
      'Total Earnings',
      formatCurrency(payslip.grossEarnings),
      'Total Deductions',
      formatCurrency(payslip.totalDeductions)
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 6, textColor: colorText, lineColor: colorBorder },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 90, halign: 'right' },
        2: { cellWidth: 140 },
        3: { cellWidth: 90, halign: 'right' },
      },
      willDrawCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(248, 250, 252);
          if (data.column.index === 0 || data.column.index === 2) {
            data.cell.styles.textColor = colorPrimary;
          }
        }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 30;

    // --- Net Pay Highlight Box ---
    doc.setFillColor(colorPrimaryLight[0], colorPrimaryLight[1], colorPrimaryLight[2]);
    doc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 55, 6, 6, 'FD');

    doc.setFontSize(14);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Pay: ${formatCurrency(payslip.netPayable)}`, margin + 20, y + 25);
    
    doc.setFontSize(10);
    doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
    doc.setFont('helvetica', 'italic');
    doc.text(`(Rupees ${numberToWords(payslip.netPayable)})`, margin + 20, y + 42);

    y += 80;

    // --- Employer Contributions ---
    const companyContributions = payslip.companyContributions || {};
    const validContributions = Object.entries(companyContributions).map(([k, v]) => ({ name: k, amount: Number(v) })).filter(c => c.amount > 0);
    
    if (validContributions.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(colorText[0], colorText[1], colorText[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Employer Contributions (For Information Only)', margin, y);
      y += 10;
      
      const contribData = validContributions.map(c => [c.name, formatCurrency(c.amount)]);
      
      autoTable(doc, {
        startY: y,
        head: [['Contribution', 'Amount']],
        body: contribData,
        theme: 'plain',
        headStyles: { fillColor: [248, 250, 252], textColor: colorTextMuted, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, textColor: colorTextMuted },
        columnStyles: {
          0: { cellWidth: 200 },
          1: { cellWidth: 100, halign: 'right' },
        },
      });
    }

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated document. No signature is required.', pageWidth / 2, pageHeight - 30, { align: 'center' });
  });

  if (download) {
    if (payslips.length === 1) {
      const p = payslips[0];
      const filename = `Payslip_${p.employee?.firstName}_${MONTH_NAMES[p.month - 1]}_${p.year}.pdf`;
      doc.save(filename);
    } else {
      doc.save(`Payslips_Bulk_${payslips.length}_employees.pdf`);
    }
  } else {
    // If not downloading immediately, return the blob url for preview
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }
};
