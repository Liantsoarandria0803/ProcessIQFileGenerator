const { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFRef, PDFDict } = require('pdf-lib');
const fs = require('fs');
function dec(n) { let r=n; while(r.includes('#')){const m=r.match(/((?:#[0-9A-Fa-f]{2})+)/);if(!m)break;try{r=r.substring(0,m.index)+Buffer.from(m[1].replace(/#/g,''),'hex').toString('utf8')+r.substring(m.index+m[1].length);}catch{break;}} return r; }
async function run() {
  const d = await PDFDocument.load(fs.readFileSync('assets/templates_pdf/cerfa.pdf'),{ignoreEncryption:true});
  const ps = d.getPages();
  for(let p=0;p<ps.length;p++){
    const an = ps[p].node.lookup(PDFName.of('Annots'),PDFArray);
    if(!an)continue;
    for(let i=0;i<an.size();i++){
      try{
        let a=an.get(i); if(a instanceof PDFRef)a=d.context.lookup(a); if(!a)continue;
        const t=a.get(PDFName.of('T')); if(!t)continue;
        let fn=''; if(t instanceof PDFString)fn=t.decodeText();else if(t instanceof PDFHexString)fn=t.decodeText();
        fn=dec(fn); let full=fn;
        const pr=a.get(PDFName.of('Parent'));
        if(pr){let pd=pr;if(pr instanceof PDFRef)pd=d.context.lookup(pr);if(pd){const pt=pd.get(PDFName.of('T'));if(pt){let pn='';if(pt instanceof PDFString)pn=pt.decodeText();else if(pt instanceof PDFHexString)pn=pt.decodeText();if(pn)full=dec(pn)+' '+fn;}}}
        const rv=a.get(PDFName.of('Rect'));let c='';
        if(rv&&rv instanceof PDFArray)c='x='+Math.round(rv.get(0).asNumber())+',y='+Math.round(rv.get(1).asNumber());
        console.log('P'+(p+1)+' | '+c+' | '+full);
      }catch{}
    }
  }
}
run();
