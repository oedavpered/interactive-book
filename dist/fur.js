// A live pile surface: each fibre bends locally and springs back after a stroke.
(() => {
  const canvas = document.querySelector('.cover-fur');
  const cover = document.querySelector('.cover');
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, fibres = [], frame = 0, lastTime = 0;
  let pointer = null, previous = null;
  const pad = 14;
  let seed = 731;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function resize() {
    width = cover.clientWidth; height = cover.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round((width + pad * 2) * ratio);
    canvas.height = Math.round((height + pad * 2) * ratio);
    context.setTransform(ratio, 0, 0, ratio, pad * ratio, pad * ratio);
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
    const decay = Math.exp(-Math.min(50,time-lastTime || 16)/150);
    lastTime = time;
    context.clearRect(-pad,-pad,width+pad*2,height+pad*2);
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
    if(book.classList.contains('is-cover-open') || reduced.matches) return;
    const rect=canvas.getBoundingClientRect();
    if(rect.width<width*.4) return;
    const x=(event.clientX-rect.left)/rect.width*(width+pad*2)-pad;
    const y=(event.clientY-rect.top)/rect.height*(height+pad*2)-pad;
    pointer={x,y,vx:previous?Math.max(-12,Math.min(12,x-previous.x)):0,vy:previous?Math.max(-12,Math.min(12,y-previous.y)):0};
    previous={x,y}; wake();
  });
  function release(){pointer=null;previous=null;wake();}
  cover.addEventListener('pointerleave',release);
  window.addEventListener('scroll',release,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  new ResizeObserver(resize).observe(cover);
})();
