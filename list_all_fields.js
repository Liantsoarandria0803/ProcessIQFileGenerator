const { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFRef, PDFDict } = require('pdf-lib');
const fs = require('fs');

function decodeName(name) {
  let result = name;
  while (result.includes('#')) {
    const match = result.match(/((?:#[0-9A-Fa-f]{2})+)/);
    if (!match || match.index === undefined) break;
    const hexValues = match[1].replace(/#/g, '');
    try {
      const decoded = Buffer.from(hexValues, 'hex').toString('utf8');
      result = result.substring(0, match.index) + decoded + result.substring(match.index + match[1].length);
    } catch { break; }
  }
  return result;
}

async function main() {
  const bytes = fs.readFileSync('assets/templates_pdf/cerfa.pdf');
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();

  for (let p = 0; p < pages.length; p++) {
    const annots = pages[p].node.lookup(PDFName.of('Annots'), PDFArray);
    if (!annots) continue;

    for (let i = 0; i < annots.size(); i++) {
      try {
        let annotObj = annots.get(i);
        let annot;
        if (annotObj instanceof PDFRef) annot = doc.context.lookup(annotObj);
        else if (annotObj instanceof PDFDict) annot = annotObj;
        else continue;
        if (!annot) continue;

        const tValue = annot.get(PDFName.of('T'));
        if (!tValue) continue;

        let rawName = '';
        if (tValue instanceof PDFString) rawName = tValue.decodeText();
        else if (tValue instanceof PDFHexString) rawName = tValue.decodeText();

        let fieldName = decodeName(rawName);

        let fullName = fieldName;
        const parent = annot.get(PDFName.of('Parent'));
        if (parent) {
          let pd = parent;
          if (parent instanceof PDFRef) pd = doc.context.lookup(parent);
          if (pd) {
            const pt = pd.get(PDFName.of('T'));
            if (pt) {
              let pn = '';
              if (pt instanceof PDFString) pn = pt.decodeText();
              else if (pt instanceof PDFHexString) pn = pt.decodeText();
              if (pn) {
                pn = decodeName(pn);
                fullName = pn + ' ' + fieldName;
              }
            }
          }
        }

        console.log('P' + (p + 1) + ': ' + fullName);
      } catch {}
    }
  }
}

main();
