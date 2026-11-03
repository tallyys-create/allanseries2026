/* AllanWoodTV — motor compartilhado de posição e rolagem para capas.
   Séries, filmes e álbuns usam este cálculo; cada tier preserva seu próprio catálogo. */
(() => {
  "use strict";
  function insertionAnchor(dock,x,y,selector=".series-card",exclude=[]){
    if(!dock)return null;
    const ignored=new Set(exclude.filter(Boolean));
    const cards=[...dock.children].filter(el=>el.matches(selector)&&!ignored.has(el));
    if(!cards.length)return null;
    const rows=[];
    for(const card of cards){
      const rect=card.getBoundingClientRect();
      let row=rows.find(r=>Math.abs(r.top-rect.top)<12);
      if(!row){row={top:rect.top,bottom:rect.bottom,items:[]};rows.push(row)}
      row.items.push({el:card,rect});
      row.bottom=Math.max(row.bottom,rect.bottom);
    }
    rows.sort((a,b)=>a.top-b.top);
    for(let i=0;i<rows.length;i++){
      const row=rows[i];
      if(y<=row.bottom+6){
        const item=row.items.find(it=>x<it.rect.left+it.rect.width/2);
        return item?.el||rows[i+1]?.items[0]?.el||null;
      }
    }
    return null;
  }
  function catalogAnchor(dock,id,items,exclude=[]){
    if(!dock||!Array.isArray(items))return null;
    const position=items.findIndex(x=>x.id===id);
    if(position<0)return null;
    const ignored=new Set(exclude.filter(Boolean));
    return [...dock.children].find(el=>el.dataset?.id&&!ignored.has(el)&&items.findIndex(x=>x.id===el.dataset.id)>position)||null;
  }
  function scrollVelocity(pos,start,end,margin=78,maxSpeed=18){
    if(pos<start+margin)return -Math.min(maxSpeed,(start+margin-pos)/margin*maxSpeed);
    if(pos>end-margin)return Math.min(maxSpeed,(pos-end+margin)/margin*maxSpeed);
    return 0;
  }
  function previewHasPointer(preview,x,y){
    if(!preview?.isConnected)return false;
    const r=preview.getBoundingClientRect();
    return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
  }
  window.AllanTierDrag=Object.freeze({insertionAnchor,catalogAnchor,scrollVelocity,previewHasPointer,version:1});
})();