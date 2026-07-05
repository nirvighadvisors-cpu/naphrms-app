const AdmZip = require('adm-zip');

const docxPath = "..\\Employment Offer Letter.docx";
const outDocx = "offer_template.docx";

try {
  const zip = new AdmZip(docxPath);
  let xml = zip.readAsText('word/document.xml');
  
  // Replace "( Candidate Sign )" with "{%signature}"
  xml = xml.replace(/\(\s*Candidate Sign\s*\)/g, '{%signature}');
  
  // Replace placeholders
  xml = xml.replace(/\{Designation\}/g, '{designation}');
  xml = xml.replace(/\{Date \}/g, '{date}');
  xml = xml.replace(/\{Reporting Manager Name\}/g, '{managerName}');
  xml = xml.replace(/\{Write in Figures\}/g, '{ctcFigures}');
  xml = xml.replace(/\{Write in Words\}/g, '{ctcWords}');
  xml = xml.replace(/\{Emp Name\}/g, '{employeeName}');

  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf-8'));
  zip.writeZip(outDocx);
  console.log("Success! Wrote to " + outDocx);
} catch (e) {
  console.error("Failed:", e);
}
