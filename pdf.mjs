export function jpegPdf(jpeg,width,height){return pagesPdf([{jpeg,width,height}])}
function pagesPdf(pages){
 const enc=new TextEncoder(),parts=[],offsets=[0];let size=0;
 const add=x=>{const bytes=typeof x==='string'?enc.encode(x):x;parts.push(bytes);size+=bytes.length};
 const obj=(id,body)=>{offsets[id]=size;add(`${id} 0 obj\n${body}\nendobj\n`)};
 add('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,`<< /Type /Pages /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] /Count ${pages.length} >>`);
 pages.forEach(({jpeg,width,height},i)=>{const id=3+i*3;obj(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.8898 595.2756] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);offsets[id+1]=size;add(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);add(jpeg);add('\nendstream\nendobj\n');const content='q\n841.8898 0 0 595.2756 0 0 cm\n/Im0 Do\nQ\n';obj(id+2,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`)});
 const xref=size,n=3+pages.length*3;add(`xref\n0 ${n}\n0000000000 65535 f \n`);for(let i=1;i<n;i++)add(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);add(`trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);return new Blob(parts,{type:'application/pdf'});
}
export async function worksheetPdf(svg){
 await document.fonts.ready;
 const pages=[];for(const page of (Array.isArray(svg)?svg:[svg])){
 const url=URL.createObjectURL(new Blob([page],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('SVG image load failed'));img.src=url});
  const canvas=document.createElement('canvas');canvas.width=3508;canvas.height=2480;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const jpeg=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('JPEG conversion failed')),'image/jpeg',.97));
  pages.push({jpeg:new Uint8Array(await jpeg.arrayBuffer()),width:canvas.width,height:canvas.height});
 }finally{URL.revokeObjectURL(url)}
 }return pagesPdf(pages);
}
