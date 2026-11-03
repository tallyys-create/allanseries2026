/* Galeria automática da ficha musical, com a imagem como protagonista. */
(() => {
const app=window.TAYLOR_APP, $=id=>document.getElementById(id);
if(!app)return;
const dlg=$("albumDialog"),light=$("lightbox"),INTERVAL=5000;
let album=null,photos=[],slideIndex=0,timer=null;

function stopSlideshow(){
 if(timer!==null){clearInterval(timer);timer=null;}
}
function startSlideshow(){
 stopSlideshow();
 if(photos.length>1&&dlg.open&&!document.hidden){
   timer=setInterval(()=>setSlide(slideIndex+1),INTERVAL);
 }
}
function setSlide(index,{restart=false}={}){
 if(!photos.length)return;
 slideIndex=(index%photos.length+photos.length)%photos.length;
 const stage=$("galleryBody");
 stage.querySelectorAll(".era-slide").forEach((slide,i)=>{
   const active=i===slideIndex;
   slide.classList.toggle("is-active",active);
   slide.setAttribute("aria-hidden",String(!active));
 });
 const counter=stage.querySelector(".era-counter");
 if(counter)counter.textContent=String(slideIndex+1).padStart(2,"0")+" / "+String(photos.length).padStart(2,"0");
 const caption=stage.querySelector(".era-caption");
 if(caption)caption.textContent=photos[slideIndex].caption;
 const progress=stage.querySelector(".era-progress");
 if(progress){
   progress.classList.remove("is-playing");
   // Reinicia a barra somente quando a foto efetivamente muda.
   void progress.offsetWidth;
   progress.classList.add("is-playing");
 }
 if(light.open)syncLightbox();
 if(restart)startSlideshow();
}
function syncLightbox(){
 if(!photos.length||!light.open)return;
 const item=photos[slideIndex];
 $("lightboxImage").src=item.src;
 $("lightboxImage").alt=item.caption+" · "+album.title;
 $("lightboxCaption").textContent=album.title+" — "+item.caption+" · "+(slideIndex+1)+" / "+photos.length;
}
function openFullscreen(){
 if(!photos.length)return;
 if(!light.open)light.showModal();
 syncLightbox();
 startSlideshow();
}
function gallery(a){
 const body=$("galleryBody");
 body.replaceChildren();
 photos=Array.isArray(window.TAYLOR_GALLERY?.[a.id])?[...window.TAYLOR_GALLERY[a.id]]:[];
 slideIndex=0;
 $("fullGallery").hidden=!photos.length;
 if(!photos.length){
   body.className="gallery-empty";
   const h=document.createElement("strong");h.textContent="Imagens em preparação";
   const p=document.createElement("p");p.textContent="Ainda não foi localizada imagem confiável desta era. A galeria será preenchida conforme forem importadas fotos oficiais.";
   body.append(h,p);
   return;
 }
 body.className="era-slideshow";
 body.setAttribute("aria-label","Apresentação automática das fotos da era "+a.title);
 const viewport=document.createElement("div");viewport.className="era-viewport";
 photos.forEach((item,i)=>{
   const slide=document.createElement("div");
   slide.className="era-slide"+(i===0?" is-active":"");
   slide.setAttribute("aria-hidden",String(i!==0));
   const blur=document.createElement("img");blur.className="era-backdrop";
   blur.src=item.src;blur.alt="";blur.setAttribute("aria-hidden","true");blur.draggable=false;
   const img=document.createElement("img");img.className="era-photo";
   img.src=item.src;img.alt="Foto da era "+a.title+": "+item.caption;
   img.loading=i<2?"eager":"lazy";img.decoding="async";img.draggable=false;
   img.onerror=()=>{slide.classList.add("era-broken");blur.style.display="none";img.style.display="none"};
   slide.append(blur,img);
   viewport.append(slide);
 });
 const footer=document.createElement("div");footer.className="era-overlay";
 const caption=document.createElement("strong");caption.className="era-caption";caption.textContent=photos[0].caption;
 const right=document.createElement("span");right.className="era-counter";
 right.textContent="01 / "+String(photos.length).padStart(2,"0");
 footer.append(caption,right);
 const progress=document.createElement("div");progress.className="era-progress";
 const fill=document.createElement("span");fill.className="era-progress-fill";progress.append(fill);
 body.append(viewport,footer,progress);
 setSlide(0);
}
window.TAYLOR_OPEN=id=>{
 const a=app.byId[id];if(!a)return;
 stopSlideshow();if(light.open)light.close();
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
 let cover=$("albumCoverMini");
 if(!cover){
   cover=document.createElement("img");cover.id="albumCoverMini";cover.className="album-cover-mini";
   cover.width=72;cover.height=72;cover.alt="";cover.decoding="async";
   dlg.querySelector(".modal-head").prepend(cover);
 }
 cover.src="./assets/albuns/taylor-swift/"+encodeURIComponent(a.id)+"/poster.webp";
 gallery(a);
 if(!dlg.open)dlg.showModal();
 startSlideshow();
};
$("closeAlbum").onclick=()=>dlg.close();
$("fullGallery").onclick=openFullscreen;
$("lightboxClose").onclick=()=>light.close();
$("prevPhoto").onclick=()=>setSlide(slideIndex-1,{restart:true});
$("nextPhoto").onclick=()=>setSlide(slideIndex+1,{restart:true});
light.addEventListener("keydown",e=>{
 if(e.key==="ArrowLeft"){e.preventDefault();setSlide(slideIndex-1,{restart:true})}
 if(e.key==="ArrowRight"){e.preventDefault();setSlide(slideIndex+1,{restart:true})}
});
const fullscreenImage=$("lightboxImage");
fullscreenImage.addEventListener("touchstart",e=>{
 if(e.touches.length===1)fullscreenImage.dataset.swipeX=e.touches[0].clientX;
},{passive:true});
fullscreenImage.addEventListener("touchend",e=>{
 const x=Number(fullscreenImage.dataset.swipeX);
 const delta=e.changedTouches[0]?.clientX-x;
 if(Math.abs(delta)>55)setSlide(slideIndex+(delta<0?1:-1),{restart:true});
},{passive:true});
dlg.addEventListener("close",()=>{stopSlideshow();if(light.open)light.close()});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden)stopSlideshow();
 else if(dlg.open)startSlideshow();
});
})();