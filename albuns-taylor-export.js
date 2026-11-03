/* Imagem do ranking preservando exatamente a ordem visual de cada veredito. */
(() => {
const app=window.TAYLOR_APP,$=id=>document.getElementById(id);
if(!app)return;
const host=document.documentElement.dataset.mode==="allan";
const ordered=tierId=>app.getOrdered(tierId);
const viewer=()=>($("viewerNameInput")?.value||"").trim().slice(0,28)||"Fã da Taylor";
const wrap=(ctx,str,width,max=3)=>{
 const words=String(str).split(/\s+/),lines=[];let line="";
 for(const word of words){const next=line?line+" "+word:word;
  if(ctx.measureText(next).width<=width||!line){line=next;continue}
  lines.push(line);line=word;
 }
 if(line)lines.push(line);
 return lines.slice(0,max);
};
function rgbText(color){
 const n=Number.parseInt(color.replace("#",""),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
 return (.2126*r+.7152*g+.0722*b)>146?"#162116":"#fff7e4";
}
const getImage=src=>new Promise(resolve=>{
 const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=src;
});
const downloadBlob=(blob,name)=>{
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1800);
};
async function exportPng(share=false){
 const state=app.getState(),rated=app.albums.filter(a=>state[a.id]);
 if(!rated.length){app.notice("Classifique pelo menos um álbum antes de salvar.");return;}
 const W=1450,left=46,top=205,right=46,labelW=263,gap=11;
 const card=95,cardGap=12,cardH=131,innerGap=23,bodyWidth=W-left-right-labelW-innerGap;
 const cols=Math.max(1,Math.floor((bodyWidth+cardGap)/(card+cardGap)));
 const sections=app.tiers.map(t=>{const items=ordered(t.id);
  return {tier:t,items,lines:Math.max(1,Math.ceil(items.length/cols)),
   height:Math.max(162,36+Math.max(1,Math.ceil(items.length/cols))*cardH+6)};
 });
 const H=top+sections.reduce((sum,s)=>sum+s.height+gap,0)+79;
 const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext("2d");
 if(!ctx){app.notice("Seu navegador não permite criar a imagem.");return;}
 const grad=ctx.createLinearGradient(0,0,W,H);
 grad.addColorStop(0,"#1c3525");grad.addColorStop(.6,"#0f1c14");grad.addColorStop(1,"#382a21");
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#a0e4a5";ctx.font="900 22px sans-serif";ctx.fillText("✦ ALLANWOODTV · TRIBUNAL MUSICAL",left,53);
 ctx.fillStyle="#fff9e9";ctx.font="900 57px sans-serif";ctx.fillText("TAYLOR SWIFT · ÁLBUNS",left,115);
 ctx.font="22px sans-serif";ctx.fillStyle="#d3e0d0";
 ctx.fillText(host?"O VEREDITO DO ALLAN":"O VEREDITO DE "+viewer().toUpperCase(),left,158);
 const covers=new Map(await Promise.all(rated.map(async a=>[
  a.id,await getImage("./assets/albuns/taylor-swift/"+a.id+"/poster.webp")
 ])));
 let y=top;
 for(let i=0;i<sections.length;i++){
  const {tier,items,height}=sections[i];
  ctx.fillStyle="#203024";ctx.fillRect(left,y,W-left-right,height);
  ctx.fillStyle=tier.color;ctx.fillRect(left,y,labelW,height);
  ctx.fillStyle=rgbText(tier.color);ctx.font="900 14px sans-serif";
  ctx.fillText("VEREDITO "+String(i+1).padStart(2,"0"),left+16,y+30);
  ctx.font="900 21px sans-serif";
  wrap(ctx,tier.name,labelW-30,3).forEach((line,k)=>ctx.fillText(line,left+16,y+64+k*24));
  ctx.font="800 13px sans-serif";ctx.fillText(items.length+" "+(items.length===1?"álbum":"álbuns"),left+16,y+height-15);
  for(let j=0;j<items.length;j++){
   const a=items[j],col=j%cols,row=Math.floor(j/cols);
   const x=left+labelW+innerGap+col*(card+cardGap), yy=y+17+row*cardH;
   ctx.fillStyle=a.color;ctx.fillRect(x,yy,card,card);
   const image=covers.get(a.id);if(image)ctx.drawImage(image,x,yy,card,card);
   else{ctx.fillStyle="#fff";ctx.font="900 12px sans-serif";ctx.fillText(a.title.slice(0,13),x+5,yy+49)}
   ctx.font="700 11px sans-serif";ctx.fillStyle="#f4f5e9";
   wrap(ctx,a.title,card,2).forEach((line,k)=>ctx.fillText(line,x,yy+card+15+k*12));
  }
  y+=height+gap;
 }
 ctx.fillStyle="#b7d5b2";ctx.font="18px sans-serif";
 ctx.fillText("Classificados: "+rated.length+" / "+app.albums.length+" · Não classificados: "+(app.albums.length-rated.length),left,y+35);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
 if(!blob){app.notice("Não foi possível gerar a imagem.");return;}
 const name="tier-taylor-swift-"+(host?"allan":"publico")+".png";
 if(share&&navigator.share){
  try{
   const file=new File([blob],name,{type:"image/png"});
   if(!navigator.canShare||navigator.canShare({files:[file]})){
    await navigator.share({title:"Meu veredito · Taylor Swift · AllanWoodTV",files:[file]});
    app.notice("Ranking pronto para compartilhar!");return;
   }
  }catch(e){if(e?.name==="AbortError")return}
 }
 downloadBlob(blob,name);
 app.notice(share?"Ranking salvo para compartilhar!":"Imagem do ranking salva!");
}
$("copyBtn").onclick=async()=>{
 const state=app.getState();
 const lines=["🎧 TIER TAYLOR SWIFT · ALLANWOODTV",
   ...app.tiers.map(t=>t.name.toUpperCase()+": "+(ordered(t.id).map(a=>a.title).join(" • ")||"—")),
   "Ainda não classificados: "+(app.albums.filter(a=>!state[a.id]).map(a=>a.title).join(" • ")||"nenhum")];
 try{await navigator.clipboard.writeText(lines.join("\n"));app.notice("Ranking copiado!")}
 catch{app.notice("Não foi possível copiar neste navegador.")}
};
$("exportBtn").onclick=()=>exportPng(false);
window.TAYLOR_EXPORT={image:exportPng};
})();