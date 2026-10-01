// A live pile surface: each fibre bends locally and springs back after a stroke.
(() => {
  const canvas = document.querySelector('.cover-fur');
  const cover = document.querySelector('.cover');
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const choices = [...document.querySelectorAll('.cover-choice')];
  let theme = 'pink';
  try { theme = localStorage.getItem('book-cover-theme') === 'leopard' ? 'leopard' : 'pink'; } catch {}
  let leopardSurface;
  let width = 0, height = 0, fibres = [], frame = 0, lastTime = 0;
  let pointer = null, previous = null;
  const pad = 14;
  let seed = 731;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function makeLeopard(w, h) {
    const surface = document.createElement('canvas');
    surface.width = Math.ceil(w * 2); surface.height = Math.ceil(h * 2);
    const c = surface.getContext('2d');
    c.scale(2,2); seed = 1984;
    const base = c.createLinearGradient(0,0,w,h);
    base.addColorStop(0,'#d6ad72'); base.addColorStop(.5,'#c5985f'); base.addColorStop(1,'#e1bb84');
    c.fillStyle=base; c.fillRect(0,0,w,h);
    // Broken, irregular rosettes rather than solid polka dots.
    for(let row=-1;row<h/43+1;row++) for(let col=-1;col<w/44+1;col++) {
      const x=col*44+(row%2)*22+(random()-.5)*16;
      const y=row*43+(random()-.5)*16;
      const rx=10+random()*8,ry=9+random()*7;
      c.save();c.translate(x,y);c.rotate(random()*Math.PI);
      c.fillStyle='#a77340';c.beginPath();c.ellipse(0,0,rx*.85,ry*.85,0,0,Math.PI*2);c.fill();
      const segments=3+Math.floor(random()*3);
      for(let s=0;s<segments;s++) {
        const a=s/segments*Math.PI*2+random()*.3;
        const span=(.55+random()*.3)*Math.PI*2/segments;
        c.strokeStyle=random()>.5?'#39251c':'#493020'; c.lineWidth=3+random()*3;c.lineCap='round';
        c.beginPath();
        for(let k=0;k<=9;k++) {
          const t=a+span*k/9,rr=1+Math.sin(t*5+x)*.11;
          const px=Math.cos(t)*rx*rr,py=Math.sin(t)*ry*rr;
          if(k===0)c.moveTo(px,py);else c.lineTo(px,py);
        }
        c.stroke();
      }
      c.restore();
      c.fillStyle='#4a3020';c.beginPath();c.ellipse(x+22,y+21,1.5+random()*2,2+random()*2,random()*3,0,Math.PI*2);c.fill();
    }
    // Fine, sparse nap follows the colour underneath each individual hair.
    const pixels=c.getImageData(0,0,surface.width,surface.height).data;
    for(let n=0;n<w*h/21;n++) {
      const x=random()*w,y=random()*h;
      const index=(Math.floor(y*2)*surface.width+Math.floor(x*2))*4;
      const light=random()>.5?23:-16;
      c.strokeStyle=`rgba(${Math.max(0,pixels[index]+light)},${Math.max(0,pixels[index+1]+light)},${Math.max(0,pixels[index+2]+light)},.55)`;
      c.lineWidth=.45;c.beginPath();c.moveTo(x,y);c.lineTo(x+.6+random()*1.1,y-1.5-random()*2);c.stroke();
    }
    return surface;
  }
  function resize() {
    width = cover.clientWidth; height = cover.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round((width + pad * 2) * ratio);
    canvas.height = Math.round((height + pad * 2) * ratio);
    context.setTransform(ratio, 0, 0, ratio, pad * ratio, pad * ratio);
    leopardSurface=makeLeopard(width,height);
    seed = 731;
    fibres = [];
    for (let y = 3; y < height - 3; y += 2.8) {
      for (let x = 3; x < width - 3; x += 2.8) {
        const px = x + random() * 3, py = y + random() * 3;
        const edge = Math.min(px, width - px, py, height - py);
        if (edge < 12 && (px < 12 || px > width - 12) && (py < 12 || py > height - 12)) continue;
        const angle = -1.05 + .65 * Math.sin(px * .038 + py * .023) + (random() - .5) * 1.2;
        const length = 9 + random() * 15;
        fibres.push({x:px,y:py,dx:Math.cos(angle)*length,dy:Math.sin(angle)*length,
          bendX:0,bendY:0,tone:random(),curl:(random()-.5)*9});
      }
    }
    wake();
  }
  function draw(time) {
    frame = 0;
    if (!width || !height || !leopardSurface) return;
    const decay = Math.exp(-Math.min(50,time-lastTime || 16)/150);
    lastTime = time;
    context.clearRect(-pad,-pad,width+pad*2,height+pad*2);
    if(theme==='leopard') {
      context.save();context.beginPath();context.roundRect(0,0,width,height,[8,15,15,8]);context.clip();
      context.drawImage(leopardSurface,0,0,width,height);context.restore();return;
    }
    const base = context.createLinearGradient(0,0,width,height);
    base.addColorStop(0,'#f8b6d7'); base.addColorStop(.5,'#e995bf'); base.addColorStop(1,'#d87aaf');
    context.fillStyle = base;
    context.beginPath(); context.roundRect(0,0,width,height,[8,15,15,8]); context.fill();
    let moving = false;
    context.lineCap = 'round';
    for (const f of fibres) {
      let tx=0,ty=0;
      if (pointer && !reduced.matches) {
        const dx=f.x-pointer.x,dy=f.y-pointer.y;
        const influence=Math.max(0,1-Math.hypot(dx,dy)/64);
        tx=(dx*.38+pointer.vx*1.4)*influence;
        ty=(dy*.3+pointer.vy*1.4+12)*influence;
      }
      f.bendX=tx+(f.bendX-tx)*decay; f.bendY=ty+(f.bendY-ty)*decay;
      if (Math.abs(f.bendX-tx)+Math.abs(f.bendY-ty)>.08) moving=true;
      const ex=f.x+f.dx+f.bendX,ey=f.y+f.dy+f.bendY;
      context.strokeStyle=`hsl(329  ${48+f.tone*18}% ${54+f.tone*30}%)`;
      context.lineWidth=.65+f.tone*.55;
      context.beginPath(); context.moveTo(f.x,f.y);
      context.quadraticCurveTo(f.x+f.dx*.35+f.curl+f.bendX*.7,f.y+f.dy*.6+f.bendY*.7,ex,ey);
      context.stroke();
      context.strokeStyle=`rgba(255,225,241,${.12+f.tone*.25})`;
      context.lineWidth=.45;
      context.beginPath(); context.moveTo(ex-f.dx*.35,ey-f.dy*.35); context.lineTo(ex,ey); context.stroke();
    }
    if (moving && !document.hidden) frame=requestAnimationFrame(draw);
  }
  function wake(){if(!frame && !document.hidden) frame=requestAnimationFrame(draw);}
  cover.addEventListener('pointermove',event=>{
    if(theme==='leopard' || book.classList.contains('is-cover-open') || reduced.matches) return;
    const rect=canvas.getBoundingClientRect();
    if(rect.width<width*.4) return;
    const x=(event.clientX-rect.left)/rect.width*(width+pad*2)-pad;
    const y=(event.clientY-rect.top)/rect.height*(height+pad*2)-pad;
    pointer={x,y,vx:previous?Math.max(-12,Math.min(12,x-previous.x)):0,vy:previous?Math.max(-12,Math.min(12,y-previous.y)):0};
    previous={x,y}; wake();
  });
  function release(){pointer=null;previous=null;wake();}
  function selectTheme(value) {
    theme=value; release();
    choices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cover===theme)));
    try { localStorage.setItem('book-cover-theme',theme); } catch {}
  }
  choices.forEach(button=>{
    button.addEventListener('click',()=>selectTheme(button.dataset.cover));
    const swatch=button.querySelector('canvas'),c=swatch.getContext('2d');
    if(button.dataset.cover==='leopard') c.drawImage(makeLeopard(110,110),0,0,96,96);
    else {
      c.fillStyle='#e99bc5';c.fillRect(0,0,96,96);seed=91;
      for(let i=0;i<1400;i++) {
        const x=random()*96,y=random()*110;
        c.strokeStyle=`hsl(329 60% ${60+random()*27}%)`;c.lineWidth=.8;
        c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+4,y-4,x+2+random()*7,y-8-random()*7);c.stroke();
      }
    }
  });
  selectTheme(theme);
  cover.addEventListener('pointerleave',release);
  window.addEventListener('scroll',release,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  new ResizeObserver(resize).observe(cover);
})();
