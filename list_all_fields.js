const { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFRef, PDFDict } = require('pdf-lib');const { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFRef, PDFDict } = require('pdf-lib');const { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFRef, PDFDict } = require('pdf-lib');

const fs = require('fs');

function decodeName(name) {const fs = require('fs');const fs = require('fs');

  let result = name;

  while (result.includes('#')) {

    const match = result.match(/((?:#[0-9A-Fa-f]{2})+)/);

    if (!match || match.index === undefined) break;function decodeName(name) {function decodeName(name) {

    const hexValues = match[1].replace(/#/g, '');

    try {  let result = name;  let result = name;

      const decoded = Buffer.from(hexValues, 'hex').toString('utf8');

      result = result.substring(0, match.index) + decoded + result.substring(match.index + match[1].length);  while (result.includes('#')) {  while (result.includes('#')) {

    } catch { break; }

  }    const match = result.match(/((?:#[0-9A-Fa-f]{2})+)/);    const match = result.match(/((?:#[0-9A-Fa-f]{2})+)/);

  return result;

}    if (!match || match.index === undefined) break;    if (!match || match.index === undefined) break;

async function run() {

  const bytes = fs.readFileSync('assets/templates_pdf/cerfa.pdf');    const hexValues = match[1].replace(/#/g, '');    const hexValues = match[1].replace(/#/g, '');

  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const pages = doc.getPages();    try {    try {

  const all = [];

  for (let p = 0; p < pages.length; p++) {      const decoded = Buffer.from(hexValues, 'hex').toString('utf8');      const decoded = Buffer.from(hexValues, 'hex').toString('utf8');

    const page = pages[p];

    const annots = page.node.lookup(PDFName.of('Annots'), PDFArray);      result = result.substring(0, match.index) + decoded + result.substring(match.index + match[1].length);      result = result.substring(0, match.index) + decoded + result.substring(match.index + match[1].length);

    if (!annots) continue;

    for (let i = 0; i < annots.size(); i++) {    } catch { break; }    } catch { break; }

      try {

        const ao = annots.get(i);  }  }

        let a;

        if (ao instanceof PDFRef) a = doc.context.lookup(ao);  return result;  return result;

        else if (ao instanceof PDFDict) a = ao;

        else continue;}}

        if (!a) continue;

        const tv = a.get(PDFName.of('T'));

        if (!tv) continue;

        let rn = '';async function listAllFields() {async function main() {

        if (tv instanceof PDFString) rn = tv.decodeText();

        else if (tv instanceof PDFHexString) rn = tv.decodeText();  const bytes = fs.readFileSync('assets/templates_pdf/cerfa.pdf');  const bytes = fs.readFileSync('assets/templates_pdf/cerfa.pdf');

        let fn = decodeName(rn);

        let full = fn;  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

        const par = a.get(PDFName.of('Parent'));

        if (par) {  const pages = doc.getPages();  const pages = doc.getPages();

          let pd = par;

          if (par instanceof PDFRef) pd = doc.context.lookup(par);  const allFields = [];

          if (pd) {

            const pt = pd.get(PDFName.of('T'));  for (let p = 0; p < pages.length; p++) {

            if (pt) {

              let pn = '';  for (let p = 0; p < pages.length; p++) {    const annots = pages[p].node.lookup(PDFName.of('Annots'), PDFArray);

              if (pt instanceof PDFString) pn = pt.decodeText();

              else if (pt instanceof PDFHexString) pn = pt.decodeText();    const page = pages[p];    if (!annots) continue;

              if (pn) full = decodeName(pn) + ' ' + fn;

            }    const annots = page.node.lookup(PDFName.of('Annots'), PDFArray);

          }

        }    if (!annots) continue;    for (let i = 0; i < annots.size(); i++) {

        const rv = a.get(PDFName.of('Rect'));

        let c = '';      try {

        if (rv && rv instanceof PDFArray) {

          c = 'x=' + Math.round(rv.get(0).asNumber()) + ',y=' + Math.round(rv.get(1).asNumber());    for (let i = 0; i < annots.size(); i++) {        let annotObj = annots.get(i);

        }

        all.push({ p: p+1, n: full, c: c });      try {        let annot;

      } catch {}

    }        const annotObj = annots.get(i);        if (annotObj instanceof PDFRef) annot = doc.context.lookup(annotObj);

  }

  all.sort((a,b) => a.p - b.p || a.n.localeCompare(b.n));        let annot;        else if (annotObj instanceof PDFDict) annot = annotObj;

  for (const f of all) console.log('Page ' + f.p + ' | ' + f.c + ' | ' + f.n);

  console.log('Total: ' + all.length);        if (annotObj instanceof PDFRef) annot = doc.context.lookup(annotObj);        else continue;

}

run();        else if (annotObj instanceof PDFDict) annot = annotObj;        if (!annot) continue;


        else continue;

        if (!annot) continue;        const tValue = annot.get(PDFName.of('T'));

        if (!tValue) continue;

        const tValue = annot.get(PDFName.of('T'));

        if (!tValue) continue;        let rawName = '';

        if (tValue instanceof PDFString) rawName = tValue.decodeText();

        let rawName = '';        else if (tValue instanceof PDFHexString) rawName = tValue.decodeText();

        if (tValue instanceof PDFString) rawName = tValue.decodeText();

        else if (tValue instanceof PDFHexString) rawName = tValue.decodeText();        let fieldName = decodeName(rawName);



        let fieldName = decodeName(rawName);        let fullName = fieldName;

        const parent = annot.get(PDFName.of('Parent'));

        let fullName = fieldName;        if (parent) {

        const parent = annot.get(PDFName.of('Parent'));          let pd = parent;

        if (parent) {          if (parent instanceof PDFRef) pd = doc.context.lookup(parent);

          let pd = parent;          if (pd) {

          if (parent instanceof PDFRef) pd = doc.context.lookup(parent);            const pt = pd.get(PDFName.of('T'));

          if (pd) {            if (pt) {

            const pt = pd.get(PDFName.of('T'));              let pn = '';

            if (pt) {              if (pt instanceof PDFString) pn = pt.decodeText();

              let pn = '';              else if (pt instanceof PDFHexString) pn = pt.decodeText();

              if (pt instanceof PDFString) pn = pt.decodeText();              if (pn) {

              else if (pt instanceof PDFHexString) pn = pt.decodeText();                pn = decodeName(pn);

              if (pn) {                fullName = pn + ' ' + fieldName;

                pn = decodeName(pn);              }

                fullName = pn + ' ' + fieldName;            }

              }          }

            }        }

          }

        }        console.log('P' + (p + 1) + ': ' + fullName);

      } catch {}

        const rectValue = annot.get(PDFName.of('Rect'));    }

        let coords = '';  }

        if (rectValue && rectValue instanceof PDFArray) {}

          const x0 = rectValue.get(0);

          const y0 = rectValue.get(1);main();

          coords = `x=${Math.round(x0.asNumber())},y=${Math.round(y0.asNumber())}`;
        }

        allFields.push({ page: p + 1, name: fullName, coords });
      } catch {}
    }
  }

  allFields.sort((a, b) => a.page - b.page || a.name.localeCompare(b.name));
  
  console.log('=== TOUS LES CHAMPS DU PDF CERFA ===');
  for (const f of allFields) {
    console.log(`Page ${f.page} | ${f.coords} | ${f.name}`);
  }
  console.log('\nTotal: ' + allFields.length + ' champs');
}

listAllFields();
