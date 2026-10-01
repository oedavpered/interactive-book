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
  // Generated from geometry and individually shaded fibres; no photo texture.
  let leopardMaster;
  function makeLeopard(w, h) {
    if (!leopardMaster) leopardMaster = createLeopard();
    const surface = document.createElement('canvas');
    surface.width = Math.ceil(w * 2); surface.height = Math.ceil(h * 2);
    surface.getContext('2d').drawImage(leopardMaster,0,0,surface.width,surface.height);
    return surface;
  }
  function createLeopard() {
    const surface = document.createElement('canvas');
    const W=780,H=1076;
    surface.width=W;surface.height=H;
    const c=surface.getContext('2d');
    seed=8047;
    c.fillStyle='#bc955f';c.fillRect(0,0,W,H);
    // Broad tonal variations suggest the changing direction of a short pile.
    for(let n=0;n<65;n++) {
      const x=random()*W,y=random()*H,r=45+random()*170;
      const g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,n%2?'rgba(235,210,153,.25)':'rgba(92,54,29,.22)');
      g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
    function blob(x,y,rx,ry,angle,color) {
      c.save();c.translate(x,y);c.rotate(angle);
      const points=[];
      for(let k=0;k<12;k++) {
        const a=k*Math.PI/6,r=.77+random()*.38;
        points.push([Math.cos(a)*rx*r,Math.sin(a)*ry*r]);
      }
      c.beginPath();
      c.moveTo((points[11][0]+points[0][0])/2,(points[11][1]+points[0][1])/2);
      for(let k=0;k<12;k++) {
        const p=points[k],q=points[(k+1)%12];
        c.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2);
      }
      c.closePath();c.fillStyle=color;c.fill();c.restore();
    }
    for(let row=-1;row<10;row++) for(let col=-1;col<8;col++) {
      const x=col*118+(row%2)*56+(random()-.5)*46;
      const y=row*130+(random()-.5)*52;
      const rx=29+random()*22,ry=33+random()*26,angle=random()*Math.PI;
      blob(x,y,rx*.78,ry*.8,angle,'#936235');
      const pieces=4+Math.floor(random()*2);
      const phase=random()*Math.PI*2;
      for(let s=0;s<pieces;s++) {
        const a=phase+s/pieces*Math.PI*2+(random()-.5)*.4;
        const px=Math.cos(a)*rx,py=Math.sin(a)*ry;
        const xx=x+px*Math.cos(angle)-py*Math.sin(angle);
        const yy=y+px*Math.sin(angle)+py*Math.cos(angle);
        blob(xx,yy,13+random()*10,27+random()*16,a+angle,random()>.5?'#20150f':'#160f0d');
      }
      if(random()>.35) blob(x+57,y+60,6+random()*10,8+random()*14,random()*3,'#251910');
    }
    const pixels=c.getImageData(0,0,W,H).data;
    // Sample each root's pigment and carry it along the strand to feather spots.
    c.lineCap='round';
    for(let n=0;n<145000;n++) {
      const x=random()*W,y=random()*H;
      const index=(Math.floor(y)*W+Math.floor(x))*4;
      const r=pixels[index],g=pixels[index+1],b=pixels[index+2];
      const angle=-1.18+.36*Math.sin(x*.018+y*.01)+.22*Math.cos(y*.031)+(random()-.5)*.55;
      const length=3+random()*8;
      const light=(random()-.45)*(r<65?15:50);
      c.strokeStyle='rgba('+Math.max(0,r+light)+','+Math.max(0,g+light*.87)+','+Math.max(0,b+light*.7)+',.7)';
      c.lineWidth=.45+random()*.45;
      c.beginPath();c.moveTo(x,y);
      c.quadraticCurveTo(x+Math.cos(angle+.18)*length*.5,y+Math.sin(angle+.18)*length*.5,x+Math.cos(angle)*length,y+Math.sin(angle)*length);
      c.stroke();
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
