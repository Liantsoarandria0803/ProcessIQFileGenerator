const { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFRef, PDFDict, PDFNumber } = require('pdf-lib');
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

  // Only page 2 (index 1) - look for unmapped fields
  const unmapped = ['8_69', '8_87', '8_90', '8_91', '8_92', '8_93', '8_94', '8_97', '8_98'];

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

        // Get rect
        const rectValue = annot.get(PDFName.of('Rect'));
        let coords = '';
        if (rectValue && rectValue instanceof PDFArray) {
          const x0 = rectValue.get(0);
          const y0 = rectValue.get(1);
          const x1 = rectValue.get(2);
          const y1 = rectValue.get(3);
          coords = `(${x0}, ${y0}, ${x1}, ${y1})`;
        }

        // Show fields near the contract section (page 2) that are unmapped
        if (unmapped.some(u => fullName.includes(u))) {
          console.log(`P${p+1}: ${fullName} @ ${coords}`);
        }
      } catch {}
    }
  }
}

main();
