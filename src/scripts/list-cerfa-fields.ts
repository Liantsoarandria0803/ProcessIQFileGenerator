import fs from 'fs';
import path from 'path';
import { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFDict, PDFRef } from 'pdf-lib';

function decodePdfFieldName(name: string): string {
  let result = name;
  while (result.includes('#')) {
    const match = result.match(/((?:#[0-9A-Fa-f]{2})+)/);
    if (!match || match.index === undefined) break;
    const hexSeq = match[1];
    const hexValues = hexSeq.replace(/#/g, '');
    try {
      const bytes = Buffer.from(hexValues, 'hex');
      const decoded = bytes.toString('utf8');
      result = result.substring(0, match.index) + decoded + result.substring(match.index + hexSeq.length);
    } catch {
      break;
    }
  }
  return result;
}

async function main() {
  const templatePath = path.resolve(process.cwd(), 'assets/templates_pdf/cerfa.pdf');
  const bytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const annotsRaw = page.node.get(PDFName.of('Annots'));
    if (!annotsRaw) continue;

    let annots: PDFArray | null = null;
    if (annotsRaw instanceof PDFArray) {
      annots = annotsRaw;
    } else if (annotsRaw instanceof PDFRef) {
      const resolved = pdfDoc.context.lookup(annotsRaw);
      if (resolved instanceof PDFArray) annots = resolved;
    }
    if (!annots) continue;

    for (let i = 0; i < annots.size(); i++) {
      const annotRef = annots.get(i);
      let annot: PDFDict | null = null;
      if (annotRef instanceof PDFDict) {
        annot = annotRef;
      } else if (annotRef instanceof PDFRef) {
        const resolved = pdfDoc.context.lookup(annotRef);
        if (resolved instanceof PDFDict) annot = resolved;
      }
      if (!annot) continue;

      const tValue = annot.get(PDFName.of('T'));
      if (!tValue) continue;

      let fieldName = '';
      if (tValue instanceof PDFString || tValue instanceof PDFHexString) {
        fieldName = decodePdfFieldName(tValue.decodeText());
      } else {
        continue;
      }

      const parentValue = annot.get(PDFName.of('Parent'));
      if (parentValue) {
        let parentDict: PDFDict | null = null;
        if (parentValue instanceof PDFDict) {
          parentDict = parentValue;
        } else if (parentValue instanceof PDFRef) {
          const resolved = pdfDoc.context.lookup(parentValue);
          if (resolved instanceof PDFDict) parentDict = resolved;
        }
        if (parentDict) {
          const parentT = parentDict.get(PDFName.of('T'));
          if (parentT instanceof PDFString || parentT instanceof PDFHexString) {
            fieldName = `${decodePdfFieldName(parentT.decodeText())} ${fieldName}`;
          }
        }
      }

      const rectValue = annot.get(PDFName.of('Rect'));
      let rectText = '';
      if (rectValue instanceof PDFArray) {
        const x0 = (rectValue.get(0) as any)?.asNumber?.() || 0;
        const y0 = (rectValue.get(1) as any)?.asNumber?.() || 0;
        const x1 = (rectValue.get(2) as any)?.asNumber?.() || 0;
        const y1 = (rectValue.get(3) as any)?.asNumber?.() || 0;
        rectText = ` [${x0},${y0},${x1},${y1}]`;
      }

      console.log(`page=${pageIndex + 1} field=${fieldName}${rectText}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
