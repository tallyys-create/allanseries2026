/* Ficha musical: galeria dominante + ficha compacta. Imagens auditadas no manifesto. */
(() => {
const app=window.TAYLOR_APP, $=id=>document.getElementById(id);
if(!app)return;
const dlg=$("albumDialog"),light=$("lightbox");
let album=null,photos=[],photoIndex=0;
function showPhoto(index){
 if(!photos.length)return;
 photoIndex=(index+photos.length)%photos.length;
 const item=photos[photoIndex];
 $("lightboxImage").src=item.src;
 $("lightboxImage").alt=item.caption+" · "+album.title;
 $("lightboxCaption").textContent=album.title+" — "+item.caption+" · "+(photoIndex+1)+" / "+photos.length;
 if(!light.open)light.showModal();
}
function gallery(a){
 const body=$("galleryBody");
 body.replaceChildren();
 const found=Array.isArray(window.TAYLOR_GALLERY?.[a.id])?window.TAYLOR_GALLERY[a.id]:[];
 photos=[...found];
 $("fullGallery").hidden=!photos.length;
 if(!found.length){
   body.className="gallery-empty";
   const h=document.createElement("strong");h.textContent="Imagens em preparação";
   const p=document.createElement("p");p.textContent="Ainda não foi localizada imagem confiável desta era. A galeria será preenchida conforme forem importadas fotos oficiais.";
   body.append(h,p);return;
 }
 body.className="gallery-grid";
 found.forEach((item,i)=>{
   const button=document.createElement("button");button.type="button";button.className="gallery-item";button.style.setProperty("--artcolor",a.color);
   button.title="Ampliar: "+item.caption;
   const img=document.createElement("img");img.src=item.src;img.loading=i<3?"eager":"lazy";img.decoding="async";img.alt="Cena de "+item.caption+" · era "+a.title;
   img.onerror=()=>{button.classList.add("scene-unavailable");button.title="Imagem indisponível";img.style.display="none";};
   const label=document.createElement("span");label.textContent=item.caption;label.className="scene-caption";
   button.append(img,label);
   button.onclick=()=>showPhoto(i);
   body.append(button);
 });
}
window.TAYLOR_OPEN=id=>{
 const a=app.byId[id];if(!a)return;
 album=a;photos=[];
 $("albumName").textContent=a.title;
 $("albumEdition").textContent="TAYLOR SWIFT · "+(a.id.endsWith("-tv")?"TAYLOR'S VERSION":a.id==="anthology"||a.id==="encore"?"EDIÇÃO ESPECIAL":"ÁLBUM");
 $("albumYear").textContent=a.year;
 $("albumGenre").textContent=a.genre;
 $("albumTrackCount").textContent=a.tracks.length?a.tracks.length+" faixas":"Em revisão";
 $("albumMemo").textContent=a.memo;
 const list=$("albumTracks");list.replaceChildren();
 (a.tracks.length?a.tracks:["Tracklist em revisão"]).forEach(x=>{const li=document.createElement("li");li.textContent=x;list.append(li)});
 const box=$("rankChoices");box.replaceChildren();
 [...app.tiers,{id:"",name:"Não classificado"}].forEach(t=>{
   const b=document.createElement("button");b.type="button";b.textContent=t.name;
   if((app.getState()[a.id]||"")===t.id)b.classList.add("selected");
   b.onclick=()=>{app.move(a.id,t.id);dlg.close();app.notice("Veredito atualizado!")};
   box.append(b);
 });
 // A capa pequena identifica o lançamento; o espaço maior permanece dedicado à era.
 let cover=$("albumCoverMini");
 if(!cover){
   cover=document.createElement("img");cover.id="albumCoverMini";cover.className="album-cover-mini";
   cover.width=72;cover.height=72;cover.alt="";cover.decoding="async";
   dlg.querySelector(".modal-head").prepend(cover);
 }
 cover.src="./assets/albuns/taylor-swift/"+encodeURIComponent(a.id)+"/poster.webp";
 gallery(a);
 if(!dlg.open)dlg.showModal();
};
$("closeAlbum").onclick=()=>dlg.close();
$("fullGallery").onclick=()=>showPhoto(0);
$("lightboxClose").onclick=()=>light.close();
$("prevPhoto").onclick=()=>showPhoto(photoIndex-1);
$("nextPhoto").onclick=()=>showPhoto(photoIndex+1);
light.addEventListener("keydown",e=>{if(e.key==="ArrowLeft")showPhoto(photoIndex-1);if(e.key==="ArrowRight")showPhoto(photoIndex+1)});
$("lightboxImage").addEventListener("touchstart",e=>{if(e.touches.length===1)$("lightboxImage").dataset.swipeX=e.touches[0].clientX},{passive:true});
$("lightboxImage").addEventListener("touchend",e=>{const x=Number($("lightboxImage").dataset.swipeX);const delta=e.changedTouches[0]?.clientX-x;if(Math.abs(delta)>55)showPhoto(photoIndex+(delta<0?1:-1))},{passive:true});
})();
