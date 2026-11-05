'use strict';
/* Matyáš Folprecht — portfolio v2 (bez závislostí) */
(function(){
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motion=()=>!reduced.matches&&root.classList.contains('motion');
const EASE='cubic-bezier(.22,1,.36,1)';
const labels={identita:'Vizuální identita',ai:'AI & obraz',print:'Print',digital:'Digitál'};
const HOME_TITLE='Matyáš Folprecht — Art direction, design & AI';
const pad=n=>String(n).padStart(2,'0');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plural=n=>n+' '+(n===1?'projekt':n>1&&n<5?'projekty':'projektů');
const anim=(el,frames,opts)=>{if(!el||!motion()||!el.animate)return null;try{return el.animate(frames,{easing:EASE,fill:'none',...opts})}catch{return null}};
const done=a=>a?a.finished.catch(()=>{}):Promise.resolve();
const LOADED="this.classList.add('is-loaded')";

let projects=[],currentProject=null,currentFilter='all',lastHome=null,wasProject=false,renderedUrl='',rendering=false,scrollSaveTimer;
try{history.scrollRestoration='manual'}catch{}

/* ---------- reveal ---------- */
const revealObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  let k=0;
  entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left).forEach(e=>{
    e.target.style.setProperty('--d',Math.min(k++,5)*0.08+'s');
    e.target.classList.add('is-in');revealObserver.unobserve(e.target);
  });
},{threshold:.06,rootMargin:'0px 0px -6% 0px'}):null;
function observeReveals(){
  $$('.reveal:not(.is-in)').forEach(el=>{if(revealObserver)revealObserver.observe(el);else el.classList.add('is-in')});
}

/* ---------- image helpers ---------- */
function srcset(im){
  const tw=im.thumbWidth||1000;
  return tw<im.width?`${esc(im.thumb)} ${tw}w, ${esc(im.src)} ${im.width}w`:`${esc(im.src)} ${im.width}w`;
}
const isTall=im=>im.height>im.width*1.6;
const isPortrait=im=>im.height>im.width*1.2;

/* ---------- grid ---------- */
function cardHTML(p,i,n){
  const im=p.images[p.cover];
  const wide=currentFilter==='all'?(i===0||i===9):(n%2===1&&i===0);
  const w=wide?'wide':'';
  const sizes=wide?'(max-width:680px) 100vw, calc(100vw - 2 * clamp(20px, 4vw, 64px))':'(max-width:680px) 100vw, 48vw';
  const num=pad(projects.indexOf(p)+1);
  return `<article class="card ${w} reveal" data-project="${esc(p.id)}">
<a class="card-link" href="#projekt/${esc(p.id)}" aria-label="${esc(p.title)} — ${esc(p.tagline)}">
<div class="card-media${isPortrait(im)?' contain':''}"><img class="lazy" src="${esc(im.thumb)}" srcset="${srcset(im)}" sizes="${sizes}" alt="${esc(im.alt)}" width="${im.width}" height="${im.height}" loading="lazy" decoding="async" onload="${LOADED}" onerror="${LOADED}"><span class="card-arrow" aria-hidden="true">↗</span></div>
<div class="card-meta"><h3>${esc(p.title)}</h3><span class="card-cat">${esc(labels[p.category])} / ${num}</span><p class="card-tag">${esc(p.tagline)}</p></div>
</a></article>`;
}
function renderGrid(filter='all'){
  currentFilter=(filter==='all'||filter in labels)?filter:'all';
  $$('[data-filter]').forEach(b=>{const on=b.dataset.filter===currentFilter;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on))});
  const list=projects.filter(p=>currentFilter==='all'||p.category===currentFilter);
  $('#project-grid').innerHTML=list.map((p,i)=>cardHTML(p,i,list.length)).join('');
  $('.result-count').textContent=plural(list.length);
  observeReveals();
}
let filterBusy=0;
$$('[data-filter]').forEach(btn=>btn.addEventListener('click',async()=>{
  if(btn.dataset.filter===currentFilter)return;
  const token=++filterBusy,grid=$('#project-grid');
  $$('[data-filter]').forEach(b=>{const on=b===btn;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on))});
  const h=grid.offsetHeight;grid.style.minHeight=h+'px';
  const visible=$$('.card',grid).filter(c=>{const r=c.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight});
  await Promise.all(visible.map((c,i)=>done(anim(c,[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(12px)'}],{duration:220,delay:i*25,fill:'forwards',easing:'ease-in'}))));
  if(token!==filterBusy)return;
  renderGrid(btn.dataset.filter);rememberEntry();
  const bar=$('.filter-bar');
  if(bar.getBoundingClientRect().top<0)scrollTo({top:scrollY+$('#prace').getBoundingClientRect().top-parseFloat(getComputedStyle(root).getPropertyValue('--header'))+1,behavior:'instant'});
  requestAnimationFrame(()=>{grid.style.minHeight='';updateScroll()});
}));

/* ---------- project detail ---------- */
function galleryHTML(p){
  const items=p.images.map((im,i)=>({im,i})).filter(x=>x.i!==p.cover);
  const rows=[];let k=0,single=false;
  while(k<items.length){
    const a=items[k];
    if(isTall(a.im)){const run=[];while(k<items.length&&isTall(items[k].im)&&run.length<4)run.push(items[k++]);rows.push({type:'tall',items:run});continue}
    const b=items[k+1];
    const landscape=a.im.width>=a.im.height*1.3;
    if(landscape&&single||!b||isTall(b.im)){rows.push({type:'one',items:[a]});k++;single=false;continue}
    rows.push({type:'two',items:[a,b]});k+=2;single=true;
  }
  return rows.map(r=>`<div class="g-row g-${r.type}${r.type==='one'&&r.items[0].im.width<r.items[0].im.height*1.3?' g-narrow':''}">${r.items.map(({im,i})=>{
    const ratio=(im.width/im.height).toFixed(4);
    const sizes=r.type==='tall'?'(max-width:680px) 46vw, 24vw':r.type==='two'?'(max-width:680px) calc(100vw - 40px), 50vw':'(max-width:680px) calc(100vw - 40px), 92vw';
    return `<figure class="g-item reveal" style="--r:${ratio}"><button type="button" class="zoom" data-gallery-index="${i}" aria-label="Zvětšit: ${esc(im.alt)}"><img class="lazy" src="${esc(im.thumb)}" srcset="${srcset(im)}" sizes="${sizes}" alt="${esc(im.alt)}" width="${im.width}" height="${im.height}" loading="lazy" decoding="async" onload="${LOADED}" onerror="${LOADED}"><span class="zoom-hint" aria-hidden="true">+</span></button><figcaption><span>${esc(im.alt)}</span><span>${pad(i+1)}</span></figcaption></figure>`;
  }).join('')}</div>`).join('');
}
function renderProject(p){
  currentProject=p;
  const idx=projects.indexOf(p),next=projects[(idx+1)%projects.length],im=p.images[p.cover],nim=next.images[next.cover];
  const kind=p.id==='novinky-app'||isTall(im)?' is-phone':p.presentation==='compact'?' is-compact':im.width<im.height*1.3?' is-square':'';
  const heroSizes=kind===' is-phone'?'(max-width:680px) 60vw, 420px':kind===' is-compact'?'640px':kind===' is-square'?'(max-width:680px) 80vw, min(900px, 60vw)':'(min-width:2128px) 2000px, calc(100vw - 2 * clamp(20px, 4vw, 64px))';
  $('#project-page').innerHTML=`<div class="wrap">
<div class="p-top"><a class="back" href="#prace" data-back-work><span class="back-icon" aria-hidden="true">←</span>Zpět na práce</a><span class="label p-counter">${pad(idx+1)} / ${pad(projects.length)}</span></div>
<header class="p-title"><h1 tabindex="-1">${esc(p.title)}<i class="dot">.</i></h1></header>
<div class="p-hero${kind}"><button type="button" class="zoom" data-gallery-index="${p.cover}" aria-label="Zvětšit: ${esc(im.alt)}"><img src="${esc(im.src)}" srcset="${srcset(im)}" sizes="${heroSizes}" alt="${esc(im.alt)}" width="${im.width}" height="${im.height}" fetchpriority="high" decoding="async"><span class="zoom-hint" aria-hidden="true">+</span></button></div>
<div class="p-head grid">

<div class="p-facts"><div><span class="label">Kategorie</span><span>${esc(labels[p.category])}</span></div><div><span class="label">Role</span><span>${esc(p.role)}</span></div></div>
<div class="p-copy"><h2>${esc(p.tagline)}</h2><p>${esc(p.description)}</p>${p.note?`<p class="p-note">${esc(p.note)}</p>`:''}${p.source?`<a class="text-link p-source" href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">Projekt na Instagramu <span aria-hidden="true">↗</span></a>`:''}</div>
</div>

<div class="p-gallery">${galleryHTML(p)}</div>
<div class="p-cta"><span>Máš projekt, který potřebuje vlastní vizuální svět?</span><a class="text-link" href="mailto:matyas.folprecht@me.com">Pojďme se o něm pobavit <span aria-hidden="true">↗</span></a></div>
</div>
<a class="next" href="#projekt/${esc(next.id)}" aria-label="Další projekt: ${esc(next.title)}"><div class="next-inner wrap"><div class="next-text"><span class="label">Další projekt / ${esc(labels[next.category])}</span><h2 class="next-title"><span>${esc(next.title)}</span><span class="next-arrow" aria-hidden="true">→</span></h2></div><div class="next-media${isPortrait(nim)?' contain':''}" data-project="${esc(next.id)}"><img class="lazy" src="${esc(nim.thumb)}" alt="" width="${nim.thumbWidth||nim.width}" height="${nim.thumbHeight||nim.height}" loading="lazy" decoding="async" onload="${LOADED}" onerror="${LOADED}"></div></div></a>`;
  document.title=p.title+' — Matyáš Folprecht';
  $$('[data-gallery-index]',$('#project-page')).forEach(b=>b.addEventListener('click',()=>openLightbox(Number(b.dataset.galleryIndex),b)));
}

/* ---------- routing ---------- */
const headerH=()=>$('#header').offsetHeight;
function rememberEntry(){
  if(rendering)return;
  try{history.replaceState({...history.state,portfolio:true,scroll:scrollY,filter:currentFilter},'',location.href)}catch{}
}
const isProjectHash=h=>/^#projekt\/[a-z0-9-]+$/.test(h);
async function viewTransition(change,run){
  const main=$('#main');
  main.getAnimations().forEach(a=>a.cancel());
  if(!change||!motion()){run();return}
  await done(anim(main,[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-10px)'}],{duration:220,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'}));
  run();
  main.getAnimations().forEach(a=>a.cancel());
  anim(main,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:650});
}
function navigate(hash,restoreHome=false){
  closeMenu(false);
  const toProject=isProjectHash(hash);
  if(!wasProject&&toProject)lastHome={scroll:scrollY,filter:currentFilter,project:hash.slice(9)};
  rememberEntry();
  const state={portfolio:true,filter:currentFilter};
  try{if(hash===location.hash)history.replaceState(state,'',hash);else history.pushState(state,'',hash)}catch{location.hash=hash;return}
  const change=toProject||wasProject;
  viewTransition(change,()=>route({restoreHome,smooth:!change}));
}
function route(options={}){
  rendering=true;
  if($('.lightbox').open)$('.lightbox').close();
  const state=history.state||{};
  const match=location.hash.match(/^#projekt\/([a-z0-9-]+)$/);
  const p=match&&projects.find(x=>x.id===match[1]);
  if(match&&!p){
    try{history.replaceState({portfolio:true},'','#prace')}catch{}
    toast('Tento projekt tu není. Prohlédni si ostatní práce.');
  }
  const restoreScroll=options.history&&typeof state.scroll==='number'?state.scroll:null;
  if(p){
    $('#home').hidden=true;$('#project-page').hidden=false;
    renderProject(p);wasProject=true;
  }else{
    $('#home').hidden=false;$('#project-page').hidden=true;$('#project-page').innerHTML='';
    document.title=HOME_TITLE;wasProject=false;currentProject=null;
    const filter=options.restoreHome&&lastHome?lastHome.filter:state.filter;
    if(filter&&filter!==currentFilter)renderGrid(filter);
  }
  renderedUrl=location.href;
  const smooth=options.smooth&&motion()?'smooth':'instant';
  if(restoreScroll!==null)scrollTo({top:restoreScroll,behavior:'instant'});
  else if(!p&&options.restoreHome&&lastHome){
    scrollTo({top:lastHome.scroll,behavior:'instant'});
    const link=$(`.card[data-project="${lastHome.project}"] a`);
    if(link)link.focus({preventScroll:true});
  }else if(p){
    scrollTo({top:0,behavior:'instant'});$('#project-page h1').focus({preventScroll:true});
  }else{
    const id=location.hash.slice(1);
    const target=id&&id!=='top'?document.getElementById(id):null;
    if(target)scrollTo({top:Math.max(0,scrollY+target.getBoundingClientRect().top-(id==='prace'?headerH()-1:0)),behavior:smooth});
    else scrollTo({top:0,behavior:smooth});
  }
  observeReveals();updateScroll();updateSpy();rendering=false;rememberEntry();
  resetFeature();
}
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');
  if(!a||e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();
  if(a.classList.contains('to-top')&&wasProject){scrollTo({top:0,behavior:motion()?'smooth':'instant'});$('#project-page h1')?.focus({preventScroll:true});return}
  if(a.hash==='#main'){$('#main').focus({preventScroll:true});scrollTo({top:0,behavior:'instant'});return}
  navigate(a.hash||'#top',a.hasAttribute('data-back-work'));
});
addEventListener('popstate',()=>{const change=isProjectHash(location.hash)||wasProject;viewTransition(change,()=>route({history:true}))});
addEventListener('hashchange',()=>{if(location.href!==renderedUrl)route()});
addEventListener('pagehide',rememberEntry);

/* ---------- scroll spy (aria-current) ---------- */
const spyIds=['prace','o-mne','kontakt'];
function updateSpy(){
  let active=null;
  if(!wasProject){const y=innerHeight*.4;spyIds.forEach(id=>{const el=document.getElementById(id);if(el){const r=el.getBoundingClientRect();if(r.top<y&&r.bottom>y)active=id}})}
  $$('.nav a, .menu-inner > a').forEach(a=>{if(a.hash==='#'+active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
}

/* ---------- header, progress ---------- */
const header=$('#header'),bar=$('.progress span');
let lastY=scrollY,ticking=false;
function updateScroll(){
  const y=scrollY,total=root.scrollHeight-innerHeight;
  bar.style.transform=`scaleX(${total>0?Math.min(1,y/total):0})`;
  header.classList.toggle('is-scrolled',y>8);
  const menuOpen=document.body.classList.contains('menu-open');
  if(!menuOpen&&!header.contains(document.activeElement)){
    if(y>lastY+6&&y>240)header.classList.add('is-hidden');
    else if(y<lastY-6||y<240)header.classList.remove('is-hidden');
  }else header.classList.remove('is-hidden');
  if(Math.abs(y-lastY)>6)lastY=y;
  ticking=false;
}
addEventListener('scroll',()=>{
  if(!ticking){ticking=true;requestAnimationFrame(()=>{updateScroll();updateSpy()})}
  clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(rememberEntry,150);
},{passive:true});
addEventListener('resize',()=>{updateScroll();if(innerWidth>820)closeMenu(false);if($('.lightbox').open)layoutLightbox()});
header.addEventListener('focusin',()=>header.classList.remove('is-hidden'));

/* ---------- mobile menu ---------- */
const menu=$('#menu'),toggle=$('.menu-toggle');
function openMenu(){menu.hidden=false;document.body.classList.add('menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Zavřít menu');$('.menu-word').textContent='Zavřít';header.classList.remove('is-hidden');const f=$('.menu-inner a');if(f)f.focus({preventScroll:true})}
function closeMenu(focus=true){if(menu.hidden)return;menu.hidden=true;document.body.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Otevřít menu');$('.menu-word').textContent='Menu';if(focus)toggle.focus({preventScroll:true})}
toggle.addEventListener('click',()=>menu.hidden?openMenu():closeMenu());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu()}});
menu.addEventListener('keydown',e=>{ // jednoduchá past na fokus
  if(e.key!=='Tab')return;const f=[toggle,...$$('a',menu)];const i=f.indexOf(document.activeElement);
  if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}
});
toggle.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey&&!menu.hidden){e.preventDefault();$('.menu-inner a').focus()}});

/* ---------- hero karusel (celé fotky, bez ořezu) ---------- */
const DUR=6500;
const carousel=$('.carousel'),carSlidesEl=$('.car-slides'),carSlides=$$('.car-slide'),autoBtn=$('.autoplay'),carSteps=$$('.car-step');
let fIndex=0,fTimer=null,fVisible=false,fPaused=reduced.matches,fToken=0,fHover=false,fFocus=false;
function loadSlide(slide){
  const imgs=$$('img[data-src]',slide);
  imgs.forEach(img=>{if(img.dataset.srcset){img.srcset=img.dataset.srcset;img.removeAttribute('data-srcset')}img.src=img.dataset.src;img.removeAttribute('data-src')});
  const main=$('.car-img',slide);
  return main.complete&&main.naturalWidth?Promise.resolve():Promise.race([main.decode().catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);
}
async function setFeature(i,dir=1){
  const n=carSlides.length;i=(i+n)%n;
  if(i===fIndex)return;
  const token=++fToken,slide=carSlides[i],prev=carSlides[fIndex];
  await loadSlide(slide);
  if(token!==fToken)return;
  fIndex=i;
  carousel.style.setProperty('--dir',dir);
  const di=$('.car-img',slide);di.style.animation='none';void di.offsetWidth;di.style.animation='';
  carSlides.forEach(s=>{const on=s===slide;s.classList.toggle('is-active',on);s.classList.toggle('is-leaving',s===prev);on?s.removeAttribute('aria-hidden'):s.setAttribute('aria-hidden','true');$('.car-media',s).tabIndex=on?0:-1});
  const d=slide.dataset,href='#projekt/'+d.id;
  const link=$('.car-link');link.href=href;link.textContent=d.title;
  const open=$('.car-open');open.href=href;open.setAttribute('aria-label','Prohlédnout projekt '+d.title);
  $('.car-category').textContent=d.category;$('.car-caption').textContent=d.caption;$('.car-index').textContent=pad(i+1)+' / '+pad(n);
  [$('.car-meta'),$('.car-title'),$('.car-caption')].forEach((el,k)=>anim(el,[{opacity:0,transform:`translateY(${k===1?24:12}px)`},{opacity:1,transform:'none'}],{duration:800,delay:k*60}));
  carSteps.forEach((b,j)=>{b.classList.toggle('is-active',i===j);b.setAttribute('aria-pressed',String(i===j))});
  loadSlide(carSlides[(i+1)%n]);
  resetFeature();
}
function resetFeature(){
  clearTimeout(fTimer);
  const playing=!fPaused&&!fHover&&!fFocus&&fVisible&&!document.hidden&&!wasProject;
  carousel.classList.toggle('is-playing',playing);
  carousel.style.setProperty('--dur',DUR+'ms');
  if(playing){
    const s=$('.car-step.is-active .car-step-bar');if(s){s.style.animation='none';void s.offsetWidth;s.style.animation=''}
    fTimer=setTimeout(()=>setFeature(fIndex+1,1),DUR);
  }
}
function setPauseButton(){autoBtn.classList.toggle('is-paused',fPaused);autoBtn.setAttribute('aria-label',fPaused?'Spustit střídání projektů':'Pozastavit střídání projektů')}
carSteps.forEach((b,i)=>b.addEventListener('click',()=>setFeature(i,i>fIndex?1:-1)));
$('.car-prev').addEventListener('click',()=>setFeature(fIndex-1,-1));
$('.car-next').addEventListener('click',()=>setFeature(fIndex+1,1));
autoBtn.addEventListener('click',()=>{fPaused=!fPaused;setPauseButton();resetFeature()});
if(matchMedia('(hover:hover) and (pointer:fine)').matches){
  carSlidesEl.addEventListener('pointerenter',()=>{fHover=true;resetFeature()});
  carSlidesEl.addEventListener('pointerleave',()=>{fHover=false;resetFeature()});
}
carousel.addEventListener('focusin',e=>{if(e.target.matches(':focus-visible')){fFocus=true;resetFeature()}});
carousel.addEventListener('focusout',e=>{if(!carousel.contains(e.relatedTarget)){fFocus=false;resetFeature()}});
carousel.addEventListener('keydown',e=>{if(e.target.closest('.car-slides,.car-steps,.car-buttons')){if(e.key==='ArrowLeft'){e.preventDefault();setFeature(fIndex-1,-1)}else if(e.key==='ArrowRight'){e.preventDefault();setFeature(fIndex+1,1)}}});
// swipe
let cX=null,cY=null,cDx=0,cAxis=null,cSwiped=false;
carSlidesEl.addEventListener('touchstart',e=>{if(e.touches.length!==1){cX=null;return}cX=e.touches[0].clientX;cY=e.touches[0].clientY;cDx=0;cAxis=null},{passive:true});
carSlidesEl.addEventListener('touchmove',e=>{
  if(cX===null)return;const dx=e.touches[0].clientX-cX,dy=e.touches[0].clientY-cY;
  if(!cAxis&&Math.hypot(dx,dy)>8)cAxis=Math.abs(dx)>Math.abs(dy)?'x':'y';
  if(cAxis==='x'){cDx=dx;const img=$('.car-slide.is-active .car-media',carSlidesEl);if(img&&motion()){img.classList.remove('is-pressing');img.style.transition='none';img.style.transform=`translateX(${dx*.35}px)`}}
},{passive:true});
function endSwipe(){
  const m=$('.car-slide.is-active .car-media',carSlidesEl);
  if(m){m.style.transition='';if(m.style.transform){const cur=m.style.transform;m.style.transform='';anim(m,[{transform:cur},{transform:'none'}],{duration:450})}}
  if(cAxis==='x'&&Math.abs(cDx)>45){cSwiped=true;setTimeout(()=>cSwiped=false,400);setFeature(fIndex+(cDx<0?1:-1),cDx<0?1:-1)}
  cX=null;cAxis=null;
}
carSlidesEl.addEventListener('touchend',endSwipe,{passive:true});
carSlidesEl.addEventListener('touchcancel',endSwipe,{passive:true});
carSlidesEl.addEventListener('click',e=>{
  if(cSwiped){e.preventDefault();e.stopPropagation();return}
  const media=e.target.closest('.car-media');
  if(!media||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  if(!motion())return; // bez animace: běžná navigace přes router
  e.preventDefault();e.stopPropagation();
  if(media.classList.contains('is-zooming'))return;
  clearTimeout(fTimer);
  media.classList.remove('is-pressing');media.classList.add('is-zooming');
  const href=media.getAttribute('href');
  setTimeout(()=>navigate(href),340);
  setTimeout(()=>media.classList.remove('is-zooming'),1400);
},true);
// jemný „stisk“ jen pro myš/pero – dotyk se přibližuje až po kliknutí, takže swipe nezoomuje
carSlidesEl.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button>0||!motion())return;const m=e.target.closest('.car-media');if(m)m.classList.add('is-pressing')});
['pointerup','pointerleave','pointercancel'].forEach(t=>carSlidesEl.addEventListener(t,()=>{$$('.car-media.is-pressing',carSlidesEl).forEach(m=>m.classList.remove('is-pressing'))}));
carSlidesEl.addEventListener('dragstart',e=>e.preventDefault());
if('IntersectionObserver' in window)new IntersectionObserver(([e])=>{fVisible=e.isIntersecting;resetFeature()},{threshold:.25}).observe(carSlidesEl);
else fVisible=true;
document.addEventListener('visibilitychange',resetFeature);
reduced.addEventListener?.('change',()=>{root.classList.toggle('motion',!reduced.matches);if(reduced.matches)fPaused=true;setPauseButton();resetFeature()});
addEventListener('load',()=>setTimeout(()=>loadSlide(carSlides[1]),300));
setPauseButton();

/* ---------- lightbox ---------- */
const lb=$('.lightbox'),lbBg=$('.lb-bg'),lbFrame=$('.lb-frame'),lbFull=$('.lb-full'),lbThumb=$('.lb-thumb'),lbStage=$('.lb-stage');
let lbIndex=0,lbTrigger=null,lbClosing=false,lbStepToken=0;
function lbBox(){
  const wide=innerWidth>680;
  const bw=innerWidth-2*parseFloat(getComputedStyle(lbStage).paddingLeft)-(wide?140:0);
  const capH=$('.lb-caption').offsetHeight+14;
  const bh=lbStage.clientHeight-parseFloat(getComputedStyle(lbStage).paddingBottom)-capH-8;
  return {bw:Math.max(120,bw),bh:Math.max(120,bh)};
}
function layoutLightbox(){
  if(!currentProject)return;
  const im=currentProject.images[lbIndex],{bw,bh}=lbBox();
  const s=Math.min(bw/im.width,bh/im.height,im.width<=700?1.5:1);
  lbFrame.style.width=Math.round(im.width*s)+'px';lbFrame.style.height=Math.round(im.height*s)+'px';
}
function setLightboxImage(thumbSrc){
  const im=currentProject.images[lbIndex],n=currentProject.images.length;
  $('#lightbox-label').textContent=currentProject.title;
  $('#lightbox-count').textContent=pad(lbIndex+1)+' / '+pad(n);
  $('#lightbox-caption').textContent=im.alt;
  layoutLightbox();
  lbThumb.src=thumbSrc||im.thumb;
  lbFrame.classList.add('is-loading');lbFull.classList.add('is-loading');
  const ok=()=>{lbFull.classList.remove('is-loading');lbFrame.classList.remove('is-loading');$('#lightbox-state').textContent=''};
  lbFull.onload=ok;
  lbFull.onerror=()=>{lbFrame.classList.remove('is-loading');$('#lightbox-state').textContent='Obrázek se nepodařilo načíst.'};
  lbFull.alt=im.alt;lbFull.src=im.src;
  if(lbFull.complete&&lbFull.naturalWidth)ok();
  [1,-1].forEach(d=>{const x=currentProject.images[(lbIndex+d+n)%n];const pre=new Image();pre.src=x.src});
}
function triggerImg(){const img=lbTrigger&&lbTrigger.isConnected&&lbTrigger.querySelector('img');if(!img)return null;const r=img.getBoundingClientRect();return r.width&&r.bottom>0&&r.top<innerHeight?{img,r}:null}
function flipFrom(r){
  const to=lbFrame.getBoundingClientRect();
  const s=r.width/to.width;
  return `translate(${(r.left+r.width/2)-(to.left+to.width/2)}px,${(r.top+r.height/2)-(to.top+to.height/2)}px) scale(${s})`;
}
function openLightbox(i,trigger){
  if(!currentProject)return;
  lbTrigger=trigger;lbIndex=i;lbClosing=false;
  lb.classList.toggle('single',currentProject.images.length<2);
  const t=triggerImg();
  lb.showModal();
  setLightboxImage(t?t.img.currentSrc||t.img.src:null);
  $('.lb-close').focus({preventScroll:true});
  anim(lbBg,[{opacity:0},{opacity:1}],{duration:450,easing:'ease-out'});
  $$('.lb-bar,.lb-nav,.lb-caption').forEach(el=>anim(el,[{opacity:0},{opacity:1}],{duration:500,delay:150}));
  if(t)anim(lbFrame,[{transform:flipFrom(t.r)},{transform:'none'}],{duration:650});
  else anim(lbFrame,[{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'none'}],{duration:500});
}
async function closeLightbox(){
  if(!lb.open||lbClosing)return;lbClosing=true;
  lbFrame.getAnimations().forEach(a=>a.cancel());
  const cur=lbFrame.style.transform;lbFrame.style.transform='';
  const t=triggerImg(),animations=[];
  animations.push(anim(lbBg,[{opacity:1},{opacity:0}],{duration:380,fill:'forwards',easing:'ease-in'}));
  $$('.lb-bar,.lb-nav,.lb-caption').forEach(el=>animations.push(anim(el,[{opacity:1},{opacity:0}],{duration:200,fill:'forwards'})));
  if(t&&lbTrigger.dataset.galleryIndex==String(lbIndex))animations.push(anim(lbFrame,[{transform:cur||'none'},{transform:flipFrom(t.r)}],{duration:500,fill:'forwards'}));
  else animations.push(anim(lbFrame,[{opacity:1,transform:cur||'none'},{opacity:0,transform:'scale(.96)'}],{duration:300,fill:'forwards'}));
  await Promise.all(animations.map(done));
  lb.close();
}
lb.addEventListener('close',()=>{
  lbClosing=false;
  [lbBg,lbFrame,...$$('.lb-bar,.lb-nav,.lb-caption')].forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
  lbFrame.style.transform='';
  if(lbTrigger?.isConnected)lbTrigger.focus({preventScroll:true});
});
lb.addEventListener('cancel',e=>{e.preventDefault();closeLightbox()});
async function stepLightbox(dir,fromX=0){
  if(!currentProject||lbClosing)return;
  const n=currentProject.images.length;if(n<2)return;
  const token=++lbStepToken;
  lbFrame.getAnimations().forEach(a=>a.cancel());
  await done(anim(lbFrame,[{opacity:1,transform:`translateX(${fromX}px)`},{opacity:0,transform:`translateX(${fromX-dir*60}px)`}],{duration:180,easing:'ease-in',fill:'forwards'}));
  if(token!==lbStepToken)return;
  lbFrame.style.transform='';
  lbIndex=(lbIndex+dir+n)%n;setLightboxImage();
  lbFrame.getAnimations().forEach(a=>a.cancel());
  anim(lbFrame,[{opacity:0,transform:`translateX(${dir*60}px)`},{opacity:1,transform:'none'}],{duration:480});
}
$('.lb-close').addEventListener('click',closeLightbox);
$('.lb-prev').addEventListener('click',()=>stepLightbox(-1));
$('.lb-next').addEventListener('click',()=>stepLightbox(1));
lbStage.addEventListener('click',e=>{if(e.target===lbStage||e.target.classList.contains('lb-figure'))closeLightbox()});
lb.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'){e.preventDefault();stepLightbox(-1)}
  else if(e.key==='ArrowRight'){e.preventDefault();stepLightbox(1)}
});
let tX=null,tY=null,dX=0,dY=0,axis=null;
lbStage.addEventListener('touchstart',e=>{if(e.touches.length!==1){tX=null;return}tX=e.touches[0].clientX;tY=e.touches[0].clientY;dX=dY=0;axis=null;lbFrame.getAnimations().forEach(a=>a.cancel())},{passive:true});
lbStage.addEventListener('touchmove',e=>{
  if(tX===null||e.touches.length!==1)return;
  dX=e.touches[0].clientX-tX;dY=e.touches[0].clientY-tY;
  if(!axis&&Math.hypot(dX,dY)>8)axis=Math.abs(dX)>Math.abs(dY)?'x':'y';
  if(axis==='x'&&currentProject.images.length>1)lbFrame.style.transform=`translateX(${dX}px)`;
  else if(axis==='y'&&dY>0){lbFrame.style.transform=`translateY(${dY}px) scale(${Math.max(.85,1-dY/1200)})`;lbBg.style.opacity=String(Math.max(.3,1-dY/400))}
},{passive:true});
lbStage.addEventListener('touchend',()=>{
  if(tX===null)return;
  const cur=lbFrame.style.transform;lbBg.style.opacity='';
  if(axis==='x'&&Math.abs(dX)>60&&currentProject.images.length>1){stepLightbox(dX<0?1:-1,dX)}
  else if(axis==='y'&&dY>110){closeLightbox()}
  else if(cur){lbFrame.style.transform='';anim(lbFrame,[{transform:cur},{transform:'none'}],{duration:400})}
  tX=null;axis=null;
},{passive:true});
lbStage.addEventListener('touchcancel',()=>{lbFrame.style.transform='';lbBg.style.opacity='';tX=null});

/* ---------- cursor label ---------- */
if(matchMedia('(hover:hover) and (pointer:fine)').matches){
  const cur=$('.cursor');let cx=-100,cy=-100,raf=0;
  document.addEventListener('pointermove',e=>{
    const on=!!e.target.closest('.card-media')&&motion();
    cur.classList.toggle('is-visible',on);cx=e.clientX;cy=e.clientY;
    if(!raf)raf=requestAnimationFrame(()=>{cur.style.transform=`translate3d(${cx}px,${cy}px,0)`;raf=0});
  },{passive:true});
  document.addEventListener('pointerleave',()=>cur.classList.remove('is-visible'));
  document.addEventListener('click',()=>cur.classList.remove('is-visible'));
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg){const t=$('.toast');t.textContent=msg;t.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('is-visible'),3500)}

/* ---------- init ---------- */
try{
  projects=window.portfolioProjects||(typeof portfolioProjects!=='undefined'?portfolioProjects:null);
  if(!Array.isArray(projects)||!projects.length)throw new Error('no data');
  $$('[data-project-total]').forEach(el=>el.textContent=projects.length);
  $$('[data-count]').forEach(el=>{const f=el.dataset.count;el.textContent=projects.filter(p=>f==='all'||p.category===f).length});
  renderGrid(history.state?.filter||'all');
  route({history:true});
  updateScroll();
  window.__mfReady=true;
}catch(err){
  $('#load-error').hidden=false;root.classList.remove('motion');console.warn(err);
}
observeReveals();
})();
