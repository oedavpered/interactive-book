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
        [1,2.76,5.4].forEach((ratio,i)=>{
          const osc=gemAudio.createOscillator(),gain=gemAudio.createGain();
          osc.type='sine';osc.frequency.setValueAtTime(frequency*ratio,now);
          // Nearly fixed inharmonic resonances give a glass-like ring.
          osc.frequency.exponentialRampToValueAtTime(frequency*ratio*.998,now+.2);
          gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.038/(i+1),now+.002);
          gain.gain.exponentialRampToValueAtTime(.0001,now+[.38,.23,.11][i]);
          osc.connect(gain);gain.connect(gemAudio.destination);osc.start(now);osc.stop(now+.42);
          osc.onended=()=>{osc.disconnect();gain.disconnect();};
        });
      },reduced.matches?0:440);
    }catch{/* Sound is optional when audio is unavailable. */}
  }
  const launch=document.createElement('button');launch.className='decor-launch';launch.type='button';launch.innerHTML='<span aria-hidden="true">✧</span>Украшения';launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls','decor-panel');
  const panel=document.createElement('section');panel.id='decor-panel';panel.className='decor-panel';panel.setAttribute('aria-label','Инструменты украшения');panel.inert=true;
  panel.innerHTML='<button class="decor-close" type="button" aria-label="Закрыть инструменты">×</button><div class="gem-bag" role="group" aria-label="Пакетик: выбери цвет страз"></div><div class="decor-options"><p class="gem-help" role="status">Выбери пакетик и нажми на страницу</p><div class="gem-actions"><button class="gem-undo" type="button" disabled>↶ Отменить стразик</button><button class="gem-done" type="button">Готово</button></div></div>';
  document.body.append(launch,panel);
  const bag=panel.querySelector('.gem-bag'),help=panel.querySelector('.gem-help'),undo=panel.querySelector('.gem-undo');
  let crystalId=0;
  function crystal(color){
    const {h,s}=colors[color]||{h:310,s:90},id='crystal-'+(++crystalId);
    let rainbowHue=0;
    const point=(r,a)=>[50+Math.cos(a)*r,50+Math.sin(a)*r];
    const tint=(light,shift=0)=>'hsl('+(h+shift+rainbowHue)+' '+(color===0?6:Math.min(96,s*1.15))+'% '+(color===0?light:light-(100-light)*.32)+'%)';
    let art='',table=[];
    const polygon=(pts,light,a,shift=0)=>'<polygon points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="'+tint(light,shift)+'"/><polygon class="gem-facet" data-angle="'+a+'" points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="white" opacity="0"/>';
    for(let i=0;i<8;i++){
      rainbowHue=color<0?i*45:0;
      const a=i*Math.PI/4-Math.PI/8,b=a+Math.PI/4;
      const p=point(47,a),q=point(47,b),m=point(47,a+Math.PI/8),u=point(25,a),v=point(25,b),k=point(37,a+Math.PI/8);
      table.push(u);
      art+=polygon([u,v,k],[95,62,89,97,68,93,55,85][i],a);
      art+=polygon([u,k,p],[73,97,45,84,98,63,92,52][i],a+.2);
      art+=polygon([v,q,k],[98,56,93,65,87,99,52,94][i],a+.6);
      art+=polygon([p,k,m],[48,87,98,54,93,67,96,75][i],a-.3,18);
      art+=polygon([m,k,q],[96,52,78,97,61,94,72,98][i],a+.4,-18);
      art+='<path d="M'+point(43,a)+'L'+point(36,a+.07)+'" stroke="'+tint(90,i%2?65:-65)+'" stroke-width="1" opacity=".65"/>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="'+tint(66)+'" stroke="'+tint(86)+'" stroke-width="1"/>'+art+'<polygon points="'+table.map(p=>p.join(',')).join(' ')+'" fill="'+tint(84)+'" stroke="white" stroke-opacity=".4" stroke-width=".5"/><path d="M17 28Q30 12 49 14" fill="none" stroke="white" stroke-width="1.6" opacity=".7"/><g class="gem-stars"><path class="gem-star" d="M24 14Q25 23 34 24Q25 25 24 34Q23 25 14 24Q23 23 24 14Z" fill="white"/></g></svg>';
  }
  colors.forEach((color,c)=>{
    const b=document.createElement('button');b.type='button';b.className='bag-stone';b.innerHTML=crystal(c);b.setAttribute('aria-label',color.name);b.setAttribute('aria-pressed','false');
    b.style.cssText='left:'+(12+(c%3)*29)+'%;top:'+(36+Math.floor(c/3)*24)+'%;--stone-turn:'+(c%2?9:-8)+'deg';
    b.onclick=()=>choose(c,b);bag.append(b);
  });
  const mix=document.createElement('button');mix.type='button';mix.className='bag-stone bag-mix';mix.innerHTML=crystal(-1);mix.setAttribute('aria-label','Случайные цвета');mix.setAttribute('aria-pressed','true');mix.onclick=()=>choose(-1,mix);bag.append(mix);
  function choose(color,button){selected=color;bag.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));setActive(true);}
  const layers=faces.map((face,i)=>{const layer=document.createElement('span');layer.className='gem-layer';layer.dataset.page=i;layer.setAttribute('aria-label',`Страница ${i+1}: нажмите для стразика, Enter — в центре`);face.append(layer);return layer;});
  function setActive(value){active=value;document.documentElement.classList.toggle('gem-mode',value);bag.dataset.active=String(value);layers.forEach(l=>l.tabIndex=value?0:-1);help.textContent='';}
  function close(){setActive(false);panel.classList.remove('is-open');panel.inert=true;launch.hidden=false;launch.setAttribute('aria-expanded','false');}
  launch.onclick=()=>{
    if(progress<.18){openFirstSpread();help.textContent='Открываем книгу…';setTimeout(()=>{enterFocus();show();},1100);}else{enterFocus();show();}
  };
  function show(){if(!isFocused)return;panel.inert=false;panel.classList.add('is-open');launch.hidden=true;launch.setAttribute('aria-expanded','true');setActive(true);bag.querySelector('[aria-pressed="true"]').focus({preventScroll:true});}
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
  // Small one-shot glints are triggered only by actual pointer movement.
  const flashes=new WeakMap();
  let previous=null;
  document.addEventListener('pointermove',e=>{
    if(previous&&Math.hypot(e.clientX-previous.x,e.clientY-previous.y)<2)return;
    previous={x:e.clientX,y:e.clientY};lastPointer=previous;
    if(!frame)frame=requestAnimationFrame(light);
  },{passive:true});
  function illuminate(el,angle=0){
    const r=el.getBoundingClientRect();if(!r.width||r.right<0||r.left>innerWidth||r.bottom<0||r.top>innerHeight)return;
    const dx=lastPointer.x-r.left-r.width/2,dy=lastPointer.y-r.top-r.height/2,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx)-angle*Math.PI/180,amount=Math.max(0,1-d/130);
    el.querySelectorAll('.gem-facet').forEach(p=>{p.style.opacity=Math.pow(Math.max(0,Math.cos(a-Number(p.dataset.angle))),12)*amount*.75;});
    if(!reduced.matches&&amount>.15&&performance.now()-(flashes.get(el)||0)>380&&Math.random()<amount*.45){
      flashes.set(el,performance.now());
      const star=el.querySelector('.gem-star');
      const x=50+Math.cos(a)*34,y=50+Math.sin(a)*34;
      star.setAttribute('transform','translate('+(x-24)+' '+(y-24)+')');
      star.animate([{opacity:0},{opacity:1,offset:.25},{opacity:0}],{duration:260+Math.random()*140,easing:'ease-out'});
    }
  }
  function light(){frame=0;if(!lastPointer||document.hidden)return;items.forEach(item=>illuminate(item.element,item.angle));if(panel.classList.contains('is-open'))bag.querySelectorAll('.bag-stone').forEach(el=>illuminate(el));}
})();
