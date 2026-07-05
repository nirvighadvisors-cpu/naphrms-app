const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('offer_template.docx', 'binary');
const zip = new PizZip(content);
let xml = zip.files['word/document.xml'].asText();

xml = xml.replace('<w:t>(</w:t>', '<w:t></w:t>');
xml = xml.replace('<w:t xml:space="preserve">Candidate </w:t>', '<w:t>{%signature}</w:t>');
xml = xml.replace('<w:t>Sign</w:t>', '<w:t></w:t>');
xml = xml.replace('<w:t xml:space="preserve">)           ', '<w:t xml:space="preserve">            ');

zip.file('word/document.xml', xml);
const newContent = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync('offer_template.docx', newContent);
console.log('Template modified successfully');
