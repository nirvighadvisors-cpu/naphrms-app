const fs = require('fs');
const AdmZip = require('adm-zip');

const templatePath = 'offer_template.docx';
const zip = new AdmZip(templatePath);
const documentXml = zip.readAsText('word/document.xml');

const idx = documentXml.indexOf('leave');
if (idx !== -1) {
    console.log(documentXml.substring(idx - 100, idx + 500));
}

const idx2 = documentXml.lastIndexOf('leave');
if (idx2 !== -1 && idx2 !== idx) {
    console.log("LAST OCCURRENCE:");
    console.log(documentXml.substring(idx2 - 100, idx2 + 500));
}
