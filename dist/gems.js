(() => {
  const key='friendbook-rhinestones-v1';
  const colors=[{name:'Хрустальные',h:215,s:15},{name:'Розовые',h:326,s:70},{name:'Голубые',h:194,s:80},{name:'Сиреневые',h:270,s:65},{name:'Зелёные',h:155,s:65},{name:'Медовые',h:38,s:85}];
  const faces=[...document.querySelectorAll('.page-face')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let selected=-1,active=false,items=[],frame=0,lastPointer=null;
  let gemAudio=null;
  function landingSound(item){
    try {
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      gemAudio ||= new Audio();
      if(gemAudio.state==='suspended')gemAudio.resume().catch(()=>{});
      // Unlock on the click, then chime at the landing rather than at takeoff.
      setTimeout(()=>{
        if(!item.element.isConnected||document.hidden||gemAudio.state!=='running')return;
        const now=gemAudio.currentTime,frequency=1350+(26-item.size)*48+Math.random()*90;
        [1,2.31,3.7].forEach((ratio,i)=>{
          const osc=gemAudio.createOscillator(),gain=gemAudio.createGain();
          osc.type='sine';osc.frequency.setValueAtTime(frequency*ratio,now);
          osc.frequency.exponentialRampToValueAtTime(frequency*ratio*.94,now+.13);
          gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.045/(i+1),now+.004);
          gain.gain.exponentialRampToValueAtTime(.0001,now+.18+i*.025);
          osc.connect(gain);gain.connect(gemAudio.destination);osc.start(now);osc.stop(now+.27);
          osc.onended=()=>{osc.disconnect();gain.disconnect();};
        });
      },reduced.matches?0:440);
    }catch{/* Sound is optional when audio is unavailable. */}
  }
  const launch=document.createElement('button');launch.className='decor-launch';launch.type='button';launch.innerHTML='<span aria-hidden="true">✧</span>Украшения';launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls','decor-panel');
  const panel=document.createElement('section');panel.id='decor-panel';panel.className='decor-panel';panel.setAttribute('aria-label','Инструменты украшения');panel.inert=true;
  panel.innerHTML='<button class="decor-close" type="button" aria-label="Закрыть инструменты">×</button><button class="gem-bag" type="button" aria-label="Пакетик со стразами" aria-pressed="false"></button><div class="decor-options"><p class="gem-help" role="status">Выбери пакетик и нажми на страницу</p><div class="gem-colors" role="group" aria-label="Цвет страз"></div><div class="gem-actions"><button class="gem-undo" type="button" disabled>↶ Отменить стразик</button><button class="gem-done" type="button">Готово</button></div></div>';
  document.body.append(launch,panel);
  const bag=panel.querySelector('.gem-bag'),help=panel.querySelector('.gem-help'),undo=panel.querySelector('.gem-undo');
  function crystal(color){
    const {h,s}=colors[color];let facets='';
    const point=(r,a)=>[50+Math.cos(a)*r,50+Math.sin(a)*r];
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5-.5,p=point(47,a),q=point(47,a+Math.PI/5),u=point(25,a+.11),v=point(25,a+Math.PI/5+.11);
      facets+=`<polygon class="gem-facet" data-angle="${a}" data-base="${i%2?48:70}" points="${p} ${q} ${v} ${u}" fill="hsl(${h} ${s}% ${i%2?48:78}%)" stroke="white" stroke-opacity=".2" stroke-width=".5"/><polygon class="gem-facet" data-angle="${a+.5}" data-base="${i%2?78:60}" points="50,50 ${u} ${v}" fill="hsl(${h} ${s}% ${i%2?87:65}%)"/>`;
    }
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="hsl(${h} ${s}% 37%)" stroke="hsl(${h} 35% 88%)" stroke-width="2"/>${facets}<path d="M20 29L39 16L62 18" fill="none" stroke="white" stroke-width="2" opacity=".8"/><path class="gem-spark" d="M28 8L30 24L44 27L30 30L28 46L25 30L11 27L25 24Z" fill="white"/><path d="M64 76L77 63" stroke="white" stroke-width="1.5" opacity=".6"/></svg>`;
  }
  for(let i=0;i<9;i++){const s=document.createElement('span');s.className='bag-stone';s.innerHTML=crystal(i%colors.length);s.style.cssText=`left:${8+(i%3)*27}%;top:${55+Math.floor(i/3)*13}%;transform:rotate(${i*39}deg)`;bag.append(s);}
  [-1,...colors.keys()].forEach(c=>{const b=document.createElement('button');b.type='button';b.className='gem-color';b.setAttribute('aria-label',c<0?'Случайные цвета':colors[c].name);b.setAttribute('aria-pressed',String(c===selected));b.style.setProperty('--color',c<0?'conic-gradient(#efa9d2,#acdef0,#c8b1e9,#a7dfc7,#f0d59a,#efa9d2)':`hsl(${colors[c].h} ${colors[c].s}% 76%)`);b.onclick=()=>{selected=c;panel.querySelectorAll('.gem-color').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};panel.querySelector('.gem-colors').append(b);});
  const layers=faces.map((face,i)=>{const layer=document.createElement('span');layer.className='gem-layer';layer.dataset.page=i;layer.setAttribute('aria-label',`Страница ${i+1}: нажмите для стразика, Enter — в центре`);face.append(layer);return layer;});
  function setActive(value){active=value;document.documentElement.classList.toggle('gem-mode',value);bag.setAttribute('aria-pressed',String(value));layers.forEach(l=>l.tabIndex=value?0:-1);help.textContent=value?'Нажимай на страницу — по одному стразику':'Выбери пакетик и нажми на страницу';}
  function close(){setActive(false);panel.classList.remove('is-open');panel.inert=true;launch.hidden=false;launch.setAttribute('aria-expanded','false');}
  launch.onclick=()=>{
    if(progress<.18){openFirstSpread();help.textContent='Открываем книгу…';setTimeout(()=>{enterFocus();show();},1100);}else{enterFocus();show();}
  };
  function show(){if(!isFocused)return;panel.inert=false;panel.classList.add('is-open');launch.hidden=true;launch.setAttribute('aria-expanded','true');setActive(true);bag.focus({preventScroll:true});}
  bag.onclick=()=>setActive(!active);
  panel.querySelector('.decor-close').onclick=()=>{close();launch.focus();};panel.querySelector('.gem-done').onclick=()=>{close();launch.focus();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('is-open')){e.preventDefault();e.stopImmediatePropagation();close();launch.focus();}},true);
  new MutationObserver(()=>{if((active||panel.classList.contains('is-open'))&&!document.documentElement.classList.contains('is-focused'))close();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  function save(){try{localStorage.setItem(key,JSON.stringify(items.map(({element,...item})=>item)));}catch{help.textContent='Память браузера заполнена — новые стразы пока не сохранены';}undo.disabled=!items.length;}
  function render(item,animate=false){
    const el=document.createElement('span');el.className='gem-stone';el.style.cssText=`left:${item.x*100}%;top:${item.y*100}%;--gem-size:${item.size}px;--gem-angle:${item.angle}deg`;el.innerHTML=crystal(item.color);layers[item.page].append(el);item.element=el;
    if(animate&&!reduced.matches){const rest=`translate(-50%,-50%) rotate(${item.angle}deg)`;el.animate([{transform:`translate(-50%,calc(-50% - 100px)) rotate(${item.angle-50}deg) scale(1.6)`,opacity:0,filter:'drop-shadow(12px 24px 9px #4b344d22)'},{offset:.18,opacity:1},{offset:.75,transform:rest+' scale(.88)',filter:'drop-shadow(1px 1px 1px #4b344d66)'},{offset:.88,transform:rest+' scale(1.1)'},{transform:rest,opacity:1}],{duration:570,easing:'cubic-bezier(.3,.1,.55,1)'});}
  }
  function place(page,x,y){if(items.length>=400){help.textContent='Уже 400 страз — сначала отмени лишние';return;}const rect=layers[page].getBoundingClientRect();if(rect.width<50)return;const size=10+Math.pow(Math.random(),1.5)*16,marginX=18/faces[page].clientWidth,marginY=18/faces[page].clientHeight;const item={page,x:Math.max(marginX,Math.min(1-marginX,x)),y:Math.max(marginY,Math.min(1-marginY,y)),size,angle:Math.random()*360,color:selected<0?Math.floor(Math.random()*colors.length):selected};items.push(item);render(item,true);landingSound(item);save();}
  layers.forEach((layer,page)=>{layer.addEventListener('click',e=>{if(!active)return;e.preventDefault();e.stopPropagation();place(page,e.offsetX/layer.clientWidth,e.offsetY/layer.clientHeight);});layer.addEventListener('keydown',e=>{if(active&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();place(page,.5,.5);}});});
  undo.onclick=()=>{const item=items.pop();item?.element.remove();save();};
  try{const stored=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(stored))items=stored.filter(i=>Number.isInteger(i.page)&&i.page>=0&&i.page<faces.length&&Number.isInteger(i.color)&&colors[i.color]&&[i.x,i.y,i.size,i.angle].every(Number.isFinite)&&i.x>=0&&i.x<=1&&i.y>=0&&i.y<=1&&i.size>=10&&i.size<=40).slice(0,400);items.forEach(i=>render(i));undo.disabled=!items.length;}catch{}
  // Light follows the viewer's pointer; stones stay fixed to their page.
  document.addEventListener('pointermove',e=>{lastPointer={x:e.clientX,y:e.clientY};if(!frame)frame=requestAnimationFrame(light);},{passive:true});
  function light(){frame=0;if(!lastPointer||document.hidden)return;for(const item of items){const r=item.element.getBoundingClientRect();if(!r.width||r.right<0||r.left>innerWidth||r.bottom<0||r.top>innerHeight)continue;const dx=lastPointer.x-r.left-r.width/2,dy=lastPointer.y-r.top-r.height/2,distance=Math.hypot(dx,dy),a=Math.atan2(dy,dx)-item.angle*Math.PI/180,amount=Math.max(0,1-distance/170);const {h,s}=colors[item.color];item.element.querySelectorAll('.gem-facet').forEach(p=>{const shine=Math.pow(Math.max(0,Math.cos(a-Number(p.dataset.angle))),8)*amount;const l=Number(p.dataset.base)+shine*35;p.style.fill=`hsl(${h+shine*18} ${s-shine*25}% ${Math.min(99,l)}%)`;});item.element.querySelector('.gem-spark').style.opacity=amount*Math.pow(Math.max(0,Math.cos(a+2.3)),8);}}
})();
