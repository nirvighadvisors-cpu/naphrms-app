const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('offer_template.docx', 'binary');
const zip = new PizZip(content);
let xml = zip.files['word/document.xml'].asText();

const matchIndex = xml.indexOf('Candidate </w:t>');
if (matchIndex !== -1) {
    console.log(xml.substring(matchIndex - 300, matchIndex + 300));
}
