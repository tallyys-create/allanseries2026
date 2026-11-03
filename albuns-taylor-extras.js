/* Ferramentas da barra de julgamento musical, seguindo as outras tiers. */
(() => {
const app=window.TAYLOR_APP;if(!app)return;
const $=id=>document.getElementById(id);
const isHost=document.documentElement.dataset.mode==="allan";
const storageKey="allanwoodtv-taylor-2026-"+(isHost?"allan":"publico");
$("randomBtn").onclick=()=>{
 const options=app.albums.filter(a=>!app.getState()[a.id]);
 if(!options.length)return app.notice("Todos os 18 álbuns já foram julgados!");
 const pick=options[Math.floor(Math.random()*options.length)];
 window.TAYLOR_OPEN(pick.id);
 app.notice("Sorteado: "+pick.title+"! 🎲");
};
$("jumpCatalogBtn2").onclick=()=>document.getElementById("librarySection").scrollIntoView({behavior:"smooth",block:"start"});
if($("signOutAllanBtn"))$("signOutAllanBtn").onclick=()=>{
 if(!confirm("Sair do perfil Allan e retornar ao portal?"))return;
 sessionStorage.removeItem("allanwoodtv-host-session-v1");
 location.href="./index.html";
};
if($("shareTierBtn"))$("shareTierBtn").onclick=async()=>{
 const url=new URL("./albuns-taylor-publico.html",location.href).href;
 try {
   if(navigator.share){await navigator.share({title:"Tier de álbuns · Taylor Swift · AllanWoodTV",url});return}
   await navigator.clipboard.writeText(url);
   app.notice("Link da tier copiado!");
 }catch(err){if(err?.name!=="AbortError")app.notice("Copie o endereço na barra do navegador.")}
};
// Backup/importação de vereditos, idêntico em propósito ao de séries e filmes.
const actions=$("board")?.closest("section")?.querySelector(".bar .actions");
if(actions){
 const backup=document.createElement("button");backup.className="btn";backup.type="button";backup.textContent="⇩ Backup JSON";
 const importButton=document.createElement("button");importButton.className="btn";importButton.type="button";importButton.textContent="⇧ Importar";
 const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.hidden=true;
 actions.append(backup,importButton,input);
 const download=(content,name)=>{const blob=new Blob([content],{type:"application/json;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)};
 backup.onclick=()=>{
   let order={};try{order=JSON.parse(localStorage.getItem(storageKey+"-order")||"{}")}catch{}
   const payload={app:"AllanWoodTV",type:"TaylorSwiftAlbums",version:1,role:isHost?"allan":"publico",created:new Date().toISOString(),locations:app.getState(),order};
   download(JSON.stringify(payload,null,2),"allanwoodtv-taylor-"+(isHost?"allan":"publico")+"-backup.json");
   app.notice("Backup do ranking exportado.");
 };
 importButton.onclick=()=>input.click();
 input.onchange=async()=>{
   const file=input.files?.[0];if(!file)return;
   try{
     const value=JSON.parse(await file.text());
     if(value.type!=="TaylorSwiftAlbums"||value.version!==1||!value.locations||typeof value.locations!=="object"||!value.order)throw Error("Formato incompatível");
     const validTiers=app.tiers.map(t=>t.id);
     const locations={};
     for(const [id,tier] of Object.entries(value.locations)){
        if(!app.byId[id]||!validTiers.includes(tier))throw Error("O backup contém álbum ou tier inválido");
        locations[id]=tier;
     }
     const order={};
     for(const tier of validTiers){
       const ids=value.order[tier]||[];
       if(!Array.isArray(ids)||ids.some(id=>!app.byId[id]))throw Error("Ordem inválida");
       order[tier]=[...new Set(ids.filter(id=>locations[id]===tier))];
       Object.keys(locations).filter(id=>locations[id]===tier&&!order[tier].includes(id)).forEach(id=>order[tier].push(id));
     }
     if(!confirm("Substituir o ranking atual pelos dados deste backup?"))return;
     localStorage.setItem(storageKey,JSON.stringify(locations));
     localStorage.setItem(storageKey+"-order",JSON.stringify(order));
     location.reload();
   }catch(e){app.notice("Não foi possível importar: "+e.message)}
   finally{input.value=""}
 };
}
})();
