// Screenshot import only. The Gemini secret lives exclusively in the Worker.
export async function analyzeScreenshot(file) {
  if(!file||!/^image\/(png|jpeg|webp|heic|heif)$/i.test(file.type))throw Error('Use um print PNG, JPG, WebP ou HEIC.');
  const supported=/^image\/(png|jpeg|webp)$/i.test(file.type);
  let blob=file;
  if(file.size>5*1024*1024||!supported){
    const bitmap=await createImageBitmap(file);
    try{
      const scale=Math.min(1,2160/bitmap.width,3600/bitmap.height);
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível preparar o print.');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Falha ao preparar o print')),'image/jpeg',0.9));
    }finally{bitmap.close();}
  }
  if(blob.size>5*1024*1024)throw Error('Print muito grande para análise. Utilize uma captura menor.');
  const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Falha ao ler o print'));reader.readAsDataURL(blob);});
  const res=await fetch('https://amigo-secreto-import.vitruidor.workers.dev/screenshot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mimeType:blob.type,data:String(dataUrl).split(',')[1]}),signal:AbortSignal.timeout(45000)});
  const raw=await res.text();let result;try{result=JSON.parse(raw)}catch{throw Error('Servidor de prints retornou uma resposta inválida (HTTP '+res.status+').');}
  if(!res.ok||!result.ok)throw Error(result.error||'Erro na análise (HTTP '+res.status+').');
  return result.product;
}
