/* Flicks Demo Kit v1.1. Copy verbatim into every demo. Platform code lives outside this block. */
(function(){
const Q=new URLSearchParams(location.search),UA=navigator.userAgent;
const OS=Q.get('os')||(/Android/i.test(UA)?'android':'ios'),STUB=Q.get('flicks')==='stub';
document.documentElement.dataset.os=OS;
const HEAD='<!doctype html>\n<meta charset=utf-8>\n<meta name=ad.orientation content=portrait,landscape>\n<script>var ExitApi=window.ExitApi||{exit:function(){}},clickTag="${CLICK_URL_UNESC}";<\/script>\n';
const EXTRA={
dv360:'<script>window.AD_CONFIG=window.AD_CONFIG||{};window.AD_CONFIG.dsp="dv360_studio";window.AD_CONFIG.publisherInfo={"publisher_id":"${PUBLISHER_ID}","adsxt_publisher_id":"${ADSXT_PUBLISHER_ID}","universal_site_id":"${UNIVERSAL_SITE_ID}","source_url":"${SOURCE_URL}","source_url_enc":"${SOURCE_URL_ENC}","adsxt_ad_system_domain":"${ADSXT_AD_SYSTEM_DOMAIN}"};window.AD_CONFIG.clickTracker={"mode":"exit","template":""};<\/script>\n',
house:'<script>window.AD_CONFIG=window.AD_CONFIG||{};window.AD_CONFIG.dsp="house";window.AD_CONFIG.clickTracker={"mode":"exit","template":""};<\/script>\n',
fonts:String.raw`<script>(function(){var seen={},head=document.head||document.documentElement,until=Date.now()+3e4;function add(css){if(seen[css])return;seen[css]=1;var s=document.createElement("style");s.setAttribute("data-vertex-fonts","");s.textContent=css;head.appendChild(s)}function scan(){try{var ps=document.getElementsByTagName("vertex-player");for(var i=0;i<ps.length;i++){var r=ps[i].shadowRoot;if(!r)continue;var n=r.querySelectorAll("style,link[rel=stylesheet]");for(var j=0;j<n.length;j++){var el=n[j];if(el.tagName==="LINK"){if(/fonts\.googleapis\.com/.test(el.href)&&!seen[el.href]){seen[el.href]=1;var l=document.createElement("link");l.rel="stylesheet";l.href=el.href;head.appendChild(l)}continue}var m=(el.textContent||"").match(/@font-face\s*\{[^}]*\}/g);if(m)add(m.join(""))}}}catch(e){}if(Date.now()<until)setTimeout(scan,250)}scan()})();<\/script>`+'\n'};
const SIZE={tall:[360,640],wide:[560,420],square:[540,540]};
/* Runs inside each Flick's iframe, before the tag. Reports ready, errors, variant switches and click-outs to the page. */
function bridge(S,hideCta){
  var av=function(s){return /av01|av1/i.test(String(s||''))};
  try{if(window.VideoDecoder&&VideoDecoder.isConfigSupported){var o=VideoDecoder.isConfigSupported.bind(VideoDecoder);VideoDecoder.isConfigSupported=function(q){return q&&av(q.codec)?Promise.resolve({supported:false,config:q}):o(q)}}}catch(e){}
  try{var mc=navigator.mediaCapabilities;if(mc&&mc.decodingInfo){var od=mc.decodingInfo.bind(mc);mc.decodingInfo=function(q){return q&&q.video&&av(q.video.contentType)?Promise.resolve({supported:false,smooth:false,powerEfficient:false}):od(q)}}}catch(e){}
  function t(m){m.flam=1;m.slot=S;try{parent.postMessage(m,'*')}catch(e){}}
  window.__vxOpen=function(u){t({type:'cta',url:u||''});return true};
  window.ExitApi={exit:function(n,u){t({type:'cta',url:u||''})}};
  window.open=function(u){t({type:'cta',url:String(u||'')});return null};
  document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[target=_blank]');if(a){e.preventDefault();t({type:'cta',url:a.href})}},true);
  function root(){var v=document.querySelector('vertex-player');return v&&v.shadowRoot}
  /* Variant buttons and CTAs can render after the player says it is ready, and the shadow root can attach late,
     so the CTA rule and the variant count are re-checked for a while instead of once. */
  function count(){var r=root();return r?r.querySelectorAll('button[data-vertex-diff]').length:0}
  function hideCtas(){var v=document.querySelector('vertex-player'),r=v&&v.shadowRoot;if(!hideCta||!r||r.querySelector('style[data-fk]'))return;var s=document.createElement('style');s.setAttribute('data-fk','');s.textContent='[data-vertex-trigger]:not([data-vertex-diff]){visibility:hidden!important;opacity:0!important;pointer-events:none!important}';r.appendChild(s)}
  var until=Date.now()+60000,last=-1;(function watch(){hideCtas();var n=count();if(n!==last&&n>0){last=n;t({type:'variants',n:n})}if(Date.now()<until)setTimeout(watch,250)})();
  function hook(v){
    if(v.__flam)return;v.__flam=1;
    v.addEventListener('vertex-ready',function(){hideCtas();t({type:'ready',variants:count()})});
    v.addEventListener('vertex-error',function(e){var d=e.detail||{};if(d.recovered||d.severity==='warning'||/WebGPU/.test(d.message||''))return;t({type:'error',msg:String(d.message||d.code||'render error')})});
    v.addEventListener('vertex-cta',function(e){t({type:'cta',url:(e.detail||{}).url||''})});
    v.addEventListener('vertex-diff-change',function(e){t({type:'switch',diff:+((e.detail||{}).diff)||0})});
  }
  window.addEventListener('message',function(e){var d=e.data,r=root();if(!d||!d.flamCmd||!r)return;
    if(d.flamCmd==='diff'){var b=r.querySelector('button[data-vertex-diff="'+(+d.i)+'"]');if(b)b.click();else t({type:'novariant',i:+d.i})}
    if(d.flamCmd==='cta'){var els=r.querySelectorAll('[data-vertex-trigger]:not([data-vertex-diff])');for(var i=0;i<els.length;i++){if(getComputedStyle(els[i]).display!=='none'){els[i].click();return}}t({type:'nocta'})}});
  new MutationObserver(function(){var v=document.querySelector('vertex-player');if(v)hook(v)}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('error',function(e){var s=e.target;if(s&&s.tagName==='SCRIPT')t({type:'error',msg:'Could not load '+s.src})},true);
}
const K={version:'1.1',os:OS,stub:STUB,log:[],slots:{},flows:[],maxLive:2,readyMs:12000};
const tagOf=b=>b.tag||HEAD+(b.extra?b.extra.split('+').map(e=>EXTRA[e]).join(''):'')+'<script src='+b.src+'><\/script>';
const doc=(id,b,hide)=>'<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;background:'+(b.bg||'#111')+';overflow:hidden}</style><script>('+bridge+')('+JSON.stringify(id)+','+!!hide+')<\/script>'+tagOf(b).replace(/^<!doctype html>/i,'');
const live=()=>Object.values(K.slots).filter(s=>s.mounted).length;
function note(slot,type,extra){K.log.push(Object.assign({slot,type,t:Math.round(performance.now())},extra||{}))}
function fail(host,s,msg){s.error=msg;host.classList.add('fk-bad');if(!host.querySelector('.fk-warn'))host.insertAdjacentHTML('beforeend','<span class="fk-warn">Flick did not load</span>');note(s.id,'error',{msg});console.error('[flicks-kit] '+s.id+': '+msg)}
function mount(host){
  const id=host.dataset.slot,b=K.cfg.brands[host.dataset.brand];let s=K.slots[id]||(K.slots[id]={id,brand:host.dataset.brand,variant:0});
  if(s.mounted)return;if(!b){fail(host,s,'unknown brand "'+host.dataset.brand+'"');return}
  if(live()>=K.maxLive){s.waiting=true;return}
  s.waiting=false;s.mounted=true;s.ready=false;s.error=null;host.classList.remove('fk-bad');host.querySelector('.fk-warn')?.remove();
  const [bw,bh]=b.size||SIZE[b.ar||'square'],cover=host.dataset.fit==='cover';
  if(STUB){host.insertAdjacentHTML('afterbegin','<div class="fk-stub">'+b.name+'<small>Flick stand-in, test mode</small></div>');s.ready=true;host.classList.add('rdy');note(id,'ready',{stub:true});return}
  const f=document.createElement('iframe');f.title=b.name+' Flick';f.setAttribute('allow','autoplay; fullscreen');f.setAttribute('scrolling','no');
  f.width=bw;f.height=bh;f.style.cssText='width:'+bw+'px;height:'+bh+'px';f.srcdoc=doc(id,b,host.dataset.cta==='native');
  const fit=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const sc=cover?Math.max(w/bw,h/bh):Math.min(w/bw,h/bh);f.style.transform='translate('+(w-bw*sc)/2+'px,'+(h-bh*sc)/2+'px) scale('+sc+')'};
  fit();s.ro=new ResizeObserver(fit);s.ro.observe(host);host.prepend(f);
  s.timer=setTimeout(()=>{if(s.mounted&&!s.ready&&!s.error)fail(host,s,'no ready signal after '+K.readyMs+'ms from '+(b.src||'tag'))},K.readyMs);
}
function unmount(host){
  const s=K.slots[host.dataset.slot];if(!s)return;s.waiting=false;if(!s.mounted)return;
  clearTimeout(s.timer);s.ro&&s.ro.disconnect();s.mounted=false;s.ready=false;s.variant=0;host.classList.remove('rdy');
  host.querySelectorAll('iframe,.fk-stub,.fk-warn').forEach(n=>n.remove());
  document.querySelectorAll('.flick[data-slot]').forEach(h=>{const w=K.slots[h.dataset.slot];if(w&&w.waiting)mount(h)});
}
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?mount(e.target):unmount(e.target)),{rootMargin:'120px 0px'});
K.scan=()=>document.querySelectorAll('.flick[data-slot]').forEach(h=>{if(!h.__fk){h.__fk=1;io.observe(h)}});
const hostOf=id=>document.querySelector('.flick[data-slot="'+id+'"]');
const send=(id,m)=>{const f=hostOf(id)?.querySelector('iframe');if(f)f.contentWindow.postMessage(m,'*')};
K.switchVariant=(id,i)=>send(id,{flamCmd:'diff',i});
K.pressCta=id=>send(id,{flamCmd:'cta'});
window.addEventListener('message',e=>{
  const m=e.data;if(!m||m.flam!==1)return;const s=K.slots[m.slot],host=hostOf(m.slot);
  if(!s||!host||e.source!==host.querySelector('iframe')?.contentWindow)return;
  if(m.type==='variants'){s.variants=Math.max(s.variants||0,m.n);note(m.slot,'variants',{n:m.n})}
  else if(m.type==='ready'){s.ready=true;s.variants=Math.max(s.variants||0,m.variants||0);clearTimeout(s.timer);host.classList.add('rdy');note(m.slot,'ready',{variants:m.variants})}
  else if(m.type==='error'){clearTimeout(s.timer);fail(host,s,m.msg)}
  else if(m.type==='switch'){s.variant=m.diff;note(m.slot,'switch',{diff:m.diff});host.dispatchEvent(new CustomEvent('flick:switch',{detail:m.diff,bubbles:true}))}
  else if(m.type==='cta'){note(m.slot,'cta',{url:m.url});K.cfg.onCta?K.cfg.onCta(m.slot,m.url,s.variant):window.open(m.url,'_blank','noopener')}
  else note(m.slot,m.type);
});
K.go=id=>{
  const fl=K.flows.find(f=>f.id===id);if(!fl)return;fl.go();K.redock&&K.redock();
  setTimeout(()=>{K.scan();const el=document.querySelector('[data-flow="'+id+'"]')||hostOf(fl.slot);if(!el){console.error('[flicks-kit] flow "'+id+'" has no target on screen');return}
    /* Scroll only the app's own scroller: scrollIntoView would also shift the page and the phone frame. */
    const r=el.getBoundingClientRect();let sc=el.parentElement;while(sc&&!(/(auto|scroll)/.test(getComputedStyle(sc).overflowY)&&sc.scrollHeight>sc.clientHeight))sc=sc.parentElement;
    if(sc){const c=sc.getBoundingClientRect();if(r.top<c.top-2||r.bottom>c.bottom+2){const z=c.height/(sc.clientHeight||1)||1;sc.scrollTo({top:sc.scrollTop+(r.top-c.top-(c.height-r.height)/2)/z,behavior:'smooth'})}}
    el.classList.remove('fk-hl');void el.offsetWidth;el.classList.add('fk-hl');setTimeout(()=>el.classList.remove('fk-hl'),1800)},fl.settle||350);
};
function pill(root){
  const b=document.createElement('button');b.className='fk-pill';b.setAttribute('data-flicks-button','');b.setAttribute('aria-expanded','false');b.innerHTML='Explore Flicks<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const menu=document.createElement('div');menu.className='fk-menu';menu.setAttribute('role','menu');menu.hidden=true;
  K.flows.forEach(f=>{const i=document.createElement('button');i.setAttribute('role','menuitem');i.dataset.go=f.id;i.textContent=f.label;i.onclick=()=>{open(false);K.go(f.id)};menu.appendChild(i)});
  root.append(b,menu);let pos=null,drag=null,moved=false;
  /* Layout size, not on-screen size: the root may sit inside a scaled phone frame. */
  const box=()=>({width:root.clientWidth,height:root.clientHeight}),zoom=()=>root.getBoundingClientRect().width/(root.clientWidth||1)||1,clamp=(x,y)=>{const f=box();return{x:Math.min(Math.max(8,x),f.width-b.offsetWidth-8),y:Math.min(Math.max(8,y),f.height-b.offsetHeight-8)}};
  function place(p){const f=box(),nav=parseFloat(getComputedStyle(root).getPropertyValue('--fk-nav'))||0;pos=clamp(p?p.x:12,p?p.y:f.height-nav-b.offsetHeight-14);b.style.left=pos.x+'px';b.style.top=pos.y+'px';
    const up=pos.y>f.height/2;menu.style.left=Math.min(Math.max(8,pos.x),f.width-menu.offsetWidth-8)+'px';menu.style.top=up?'':pos.y+b.offsetHeight+6+'px';menu.style.bottom=up?f.height-pos.y+6+'px':'';menu.style.maxHeight=(up?pos.y:f.height-pos.y-b.offsetHeight)-20+'px'}
  function open(v){menu.hidden=!v;b.setAttribute('aria-expanded',v);if(v)place(pos)}
  b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);drag={x:pos.x,y:pos.y,sx:e.clientX,sy:e.clientY,z:zoom(),moved:false}});
  b.addEventListener('pointermove',e=>{if(!drag)return;if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<6)return;drag.moved=true;moved=true;open(false);place({x:drag.x+(e.clientX-drag.sx)/drag.z,y:drag.y+(e.clientY-drag.sy)/drag.z})});
  b.addEventListener('pointerup',()=>{const d=drag;drag=null;if(d&&!d.moved)open(menu.hidden)});
  b.addEventListener('pointercancel',()=>{drag=null});
  document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target!==b&&!b.contains(e.target))open(false)},true);
  new ResizeObserver(()=>place(moved?pos:null)).observe(root);place(null);
  K.redock=()=>{open(false);if(!moved)place(null)};
}
K.init=cfg=>{
  K.cfg=cfg;K.flows=cfg.flows;if(cfg.maxLive)K.maxLive=cfg.maxLive;
  const st=document.createElement('style');st.textContent='.flick{position:relative;overflow:hidden;background:#111}.flick iframe{position:absolute;left:0;top:0;border:0;display:block;transform-origin:0 0;opacity:0;transition:opacity .4s}.flick.rdy iframe{opacity:1}.fk-stub{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:repeating-linear-gradient(45deg,#1d1d22 0 12px,#26262d 12px 24px);color:#fff;font:600 15px system-ui}.fk-stub small{font:400 11px system-ui;opacity:.7}.fk-warn{position:absolute;left:8px;bottom:8px;padding:4px 8px;border-radius:6px;background:#b00020;color:#fff;font:600 11px system-ui;z-index:2}.fk-hl{animation:fkhl 1.8s ease-out}@keyframes fkhl{0%,60%{box-shadow:0 0 0 3px var(--fk-accent,#fff),0 0 0 6px rgba(0,0,0,.35)}100%{box-shadow:0 0 0 3px transparent,0 0 0 6px transparent}}.fk-pill{position:absolute;z-index:95;display:flex;align-items:center;gap:6px;height:36px;padding:0 14px;border:0;border-radius:18px;background:var(--fk-bg,rgba(28,28,30,.92));color:var(--fk-fg,#fff);font:600 13px/1 var(--fk-font,system-ui);box-shadow:0 6px 20px rgba(0,0,0,.28);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;white-space:nowrap}.fk-pill::after{content:"";position:absolute;inset:-5px 0}.fk-pill[aria-expanded=true] svg{transform:rotate(180deg)}.fk-menu{position:absolute;z-index:96;width:200px;overflow:auto;padding:4px 0;border-radius:14px;background:var(--fk-bg,rgba(28,28,30,.96));box-shadow:0 10px 30px rgba(0,0,0,.35)}.fk-menu[hidden]{display:none}.fk-menu button{display:block;width:100%;min-height:44px;padding:0 16px;border:0;background:none;color:var(--fk-fg,#fff);font:500 14px var(--fk-font,system-ui);text-align:left;cursor:pointer}';
  document.head.appendChild(st);pill(document.querySelector(cfg.root));K.scan();
};
window.FlicksKit=window.__demo=K;
})();
