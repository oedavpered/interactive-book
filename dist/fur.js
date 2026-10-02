// A live pile surface: each fibre bends locally and springs back after a stroke.
(() => {
  const canvas = document.querySelector('.cover-fur');
  const cover = document.querySelector('.cover');
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const choices = [...document.querySelectorAll('.cover-choice')];
  let theme = 'pink';
  try { const saved=localStorage.getItem('book-cover-theme'); if(['pink','leopard','glitter','holographic'].includes(saved)) theme=saved; } catch {}
  const colorPanel=document.querySelector('.glitter-colors');
  const customColor=document.querySelector('.glitter-custom');
  const colorButtons=[...document.querySelectorAll('[data-glitter-color]')];
  let glitterColor='#242329',glitterSurface,glitterPoints=[];
  let lightX=.35,lightY=.25,lightStrength=0;
  try { const saved=localStorage.getItem('book-glitter-color'); if(/^#[0-9a-f]{6}$/i.test(saved)) glitterColor=saved; } catch {}
  let leopardSurface;
  let width = 0, height = 0, fibres = [], frame = 0, lastTime = 0;
  let pointer = null, previous = null;
  const pad = 14;
  let seed = 731;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let holoX=.35,holoY=.4;
  const holoSurface=document.createElement('canvas');
  holoSurface.width=240;holoSurface.height=332;
  const holoContext=holoSurface.getContext('2d');
  const holoPixels=holoContext.createImageData(240,332);
  const foilGeometry=new Float32Array(240*332*2);
  let foilGeometryReady=false;
  function foilNoise(a,b) {
    const ix=Math.floor(a),iy=Math.floor(b);
    const fx=a-ix,fy=b-iy;
    const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    const hash=(xx,yy)=>{const n=Math.sin(xx*127.1+yy*311.7+71)*43758.5453;return n-Math.floor(n);};
    const top=hash(ix,iy)*(1-sx)+hash(ix+1,iy)*sx;
    const bottom=hash(ix,iy+1)*(1-sx)+hash(ix+1,iy+1)*sx;
    return (top*(1-sy)+bottom*sy)*2-1;
  }
  function foilDistance(u,v,x,y) {
    // Stable spatial noise bends the reflection without flickering each frame.
    const bend=foilNoise(v*4.3,2.7)*.17+foilNoise(v*10.8,8.4)*.065;
    const center=.88-.68*v+bend+(x-.35)*.46+(y-.4)*.12;
    const warp=foilNoise(u*5.2+foilNoise(v*3,4),v*7.3)*.055
      +foilNoise(u*14.5,v*19.2)*.018;
    const breadth=.8+(foilNoise(v*6.1,12)+1)*.3;
    return (u-center+warp)/breadth;
  }
  function paintHologram(c,w,h,x,y) {
    // A curved diffraction band over a dark metallic substrate.
    const data=holoPixels.data;
    for(let py=0;py<332;py++) for(let px=0;px<240;px++) {
      const u=px/239,v=py/331;
      const gi=(py*240+px)*2;
      if(!foilGeometryReady) {
        foilGeometry[gi]=foilDistance(u,v,.35,.4);
        foilGeometry[gi+1]=1/(.8+(foilNoise(v*6.1,12)+1)*.3);
      }
      const d=foilGeometry[gi]-((x-.35)*.46+(y-.4)*.12)*foilGeometry[gi+1];
      const glow=Math.exp(-d*d/ .029);
      const hue=((d*670+v*36+(y-.4)*100+340)%360+360)%360;
      const chroma=.72,hh=hue/60,z=chroma*(1-Math.abs(hh%2-1));
      const rgb=hh<1?[chroma,z,0]:hh<2?[z,chroma,0]:hh<3?[0,chroma,z]:hh<4?[0,z,chroma]:hh<5?[z,0,chroma]:[chroma,0,z];
      const wash=Math.exp(-Math.pow(u-.45-v*.12,2)/.19)*.2;
      const base=[19+v*31,28+(1-v)*18,48+v*6];
      const highlight=Math.exp(-Math.pow(d+.018,2)/.0025)*.2;
      const i=(py*240+px)*4;
      for(let k=0;k<3;k++) data[i+k]=Math.min(255,base[k]+wash*105+glow*(rgb[k]*172+32)+highlight*80);
      data[i+3]=255;
    }
    foilGeometryReady=true;
    holoContext.putImageData(holoPixels,0,0);
    c.save();c.beginPath();c.roundRect(0,0,w,h,[8,15,15,8]);c.clip();
    c.imageSmoothingEnabled=true;c.drawImage(holoSurface,0,0,w,h);
    // Fixed microflakes catch the moving light independently.
    for(let i=0;i<1150;i++) {
      const u=((Math.sin(i*127.1+7)*43758.5453)%1+1)%1;
      const v=((Math.sin(i*311.7+3)*19642.349)%1+1)%1;
      const d=foilDistance(u,v,x,y);
      const glow=Math.exp(-d*d/.055);
      const flicker=Math.pow(Math.max(0,Math.sin(i*1.83+x*9+y*6)),8);
      const alpha=.09+glow*.48+flicker*.35;
      const size=i%19===0?1.1:.38+(i%5)*.1;
      c.fillStyle='rgba(241,249,255,'+alpha+')';c.fillRect(u*w,v*h,size,size);
      if(i%37===0&&glow+flicker>1) {
        c.fillStyle='rgba(245,251,255,.4)';c.fillRect(u*w-2,v*h,5,.5);c.fillRect(u*w,v*h-2,.5,5);
      }
    }
    // Thin bright fold at the binding gives the foil a reflective edge.
    const edge=c.createLinearGradient(0,0,w*.055,0);
    [[0,'#081329'],[.12,'#568ad9'],[.28,'#a0eaf2'],[.4,'#faf1c4'],[.5,'#e49dd6'],[.62,'#443267'],[.8,'#afc8cd'],[1,'#ffffff00']].forEach(([p,color])=>edge.addColorStop(p,color));
    c.fillStyle=edge;c.fillRect(0,0,w*.055,h);
    const rim=c.createLinearGradient(0,0,w,h);
    rim.addColorStop(0,'#95b9ff90');rim.addColorStop(.45,'#efffffbb');rim.addColorStop(1,'#b37dcb66');
    c.strokeStyle=rim;c.lineWidth=1.4;c.beginPath();c.roundRect(.7,.7,w-1.4,h-1.4,[8,15,15,8]);c.stroke();
    c.restore();
  }
  function drawHologram(decay) {
    const x=pointer?pointer.x/width:.35,y=pointer?pointer.y/height:.4;
    holoX=x+(holoX-x)*decay;holoY=y+(holoY-y)*decay;
    paintHologram(context,width,height,holoX,holoY);
    if(Math.abs(holoX-x)+Math.abs(holoY-y)>.001&&!document.hidden)frame=requestAnimationFrame(draw);
  }
  function makeGlitter(w,h) {
    const surface=document.createElement('canvas');surface.width=Math.max(1,Math.round(w*2));surface.height=Math.max(1,Math.round(h*2));
    const c=surface.getContext('2d');
    const rgb=[1,3,5].map(i=>parseInt(glitterColor.slice(i,i+2),16));
    seed=9271;
    const pixels=c.createImageData(surface.width,surface.height);
    for(let i=0;i<pixels.data.length;i+=4) {
      const n=random(),shine=random();
      const brightness=.25+n*.55;
      for(let k=0;k<3;k++) pixels.data[i+k]=shine>.987?rgb[k]+(255-rgb[k])*(.3+random()*.6):rgb[k]*brightness;
      pixels.data[i+3]=255;
    }
    c.putImageData(pixels,0,0);
    c.scale(2,2);
    for(let i=0;i<w*h*.18;i++) {
      const x=random()*w,y=random()*h,size=.3+random()*.9,bright=random();
      c.fillStyle='rgba(255,248,241,'+(bright>.94?.95:.025+bright*.12)+')';
      c.fillRect(x,y,size,size*.65);
    }
    return surface;
  }
  function rebuildGlitter() {
    if(width&&height) glitterSurface=makeGlitter(width,height);
    const swatch=document.querySelector('[data-cover="glitter"] canvas');
    swatch.getContext('2d').drawImage(makeGlitter(48,48),0,0,96,96);
    customColor.value=glitterColor;
    colorButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.glitterColor===glitterColor)));
    wake();
  }
  function setGlitterColor(color) {
    glitterColor=color;
    try {localStorage.setItem('book-glitter-color',color);}catch {}
    rebuildGlitter();
  }
  colorButtons.forEach(b=>b.addEventListener('click',()=>setGlitterColor(b.dataset.glitterColor)));
  customColor.addEventListener('input',()=>setGlitterColor(customColor.value));
  function drawGlitter(decay) {
    const aimX=pointer?pointer.x/width:.35,aimY=pointer?pointer.y/height:.25;
    lightX=aimX+(lightX-aimX)*decay;lightY=aimY+(lightY-aimY)*decay;
    const aimStrength=pointer?1:0;lightStrength=aimStrength+(lightStrength-aimStrength)*decay;
    context.save();context.beginPath();context.roundRect(0,0,width,height,[8,15,15,8]);context.clip();
    context.drawImage(glitterSurface,0,0,width,height);
    for(const p of glitterPoints) {
      const distance=Math.hypot(p.x/width-lightX,p.y/height-lightY);
      const beam=Math.max(0,1-distance/1.05);
      const facet=Math.pow(Math.max(0,Math.sin(p.phase+lightX*p.nx+lightY*p.ny)),22);
      const shine=facet*(.28+beam*.72)*(.48+lightStrength*.52);
      if(shine<.07)continue;
      context.fillStyle='rgba(255,252,243,'+shine+')';
      context.fillRect(p.x,p.y,p.size,p.size*.72);
      if(p.star && shine>.22) {
        const radius=1.6+shine*2.3;
        const glow=context.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*2);
        glow.addColorStop(0,'rgba(255,250,244,'+(shine*.5)+')');
        glow.addColorStop(1,'rgba(255,250,244,0)');
        context.fillStyle=glow;context.fillRect(p.x-radius*2,p.y-radius*2,radius*4,radius*4);
        context.fillStyle='rgba(248,252,255,'+Math.min(1,shine*1.3)+')';
        context.beginPath();
        context.moveTo(p.x,p.y-radius);context.lineTo(p.x+.4,p.y-.4);
        context.lineTo(p.x+radius,p.y);context.lineTo(p.x+.4,p.y+.4);
        context.lineTo(p.x,p.y+radius);context.lineTo(p.x-.4,p.y+.4);
        context.lineTo(p.x-radius,p.y);context.lineTo(p.x-.4,p.y-.4);
        context.closePath();context.fill();
      }
    }
    context.restore();
    if(Math.abs(lightX-aimX)+Math.abs(lightY-aimY)+Math.abs(lightStrength-aimStrength)>.002&&!document.hidden)frame=requestAnimationFrame(draw);
  }
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
    // Each rosette shares one irregular contour: a tan core and 2–3 broken
    // dark bands following its perimeter, rather than separate satellite dots.
    function rosette(x,y,rx,ry) {
      const phase=random()*Math.PI*2,angle=random()*Math.PI*2;
      const radial=a=>1+.12*Math.sin(a*3+phase)+.07*Math.cos(a*5-phase)+.04*Math.sin(a*7+phase);
      const point=(a,r)=>[Math.cos(a)*rx*radial(a)*r,Math.sin(a)*ry*radial(a)*r];
      c.save();c.translate(x,y);c.rotate(angle);
      c.beginPath();
      for(let k=0;k<=100;k++) {
        const p=point(k/100*Math.PI*2,.91);
        if(k===0)c.moveTo(...p);else c.lineTo(...p);
      }
      c.closePath();c.fillStyle='#936235';c.fill();
      const count=random()<.6?2:3;
      const weights=Array.from({length:count},()=>.65+random()*1.1);
      const total=weights.reduce((a,b)=>a+b,0);
      let start=phase;
      for(let s=0;s<count;s++) {
        const sector=weights[s]/total*Math.PI*2;
        const gap=.23+random()*.21;
        const span=sector-gap,thickness=.34+random()*.16;
        c.beginPath();
        for(let side=0;side<2;side++) for(let k=0;k<=40;k++) {
          const t=side?1-k/40:k/40,a=start+span*t;
          // Rounded tapered ends and changing width make open C/U shapes.
          const cap=Math.pow(Math.sin(Math.PI*t),.25);
          const band=thickness*cap*(1+.16*Math.sin(a*4+phase));
          const p=point(a,.88+(side?-band:band*.72));
          if(side===0&&k===0)c.moveTo(...p);else c.lineTo(...p);
        }
        c.closePath();c.fillStyle=s%2?'#20150f':'#160f0d';c.fill();
        start+=sector;
      }
      c.restore();
    }
    for(let row=-1;row<9;row++) for(let col=-1;col<7;col++) {
      const x=col*143+(row%2)*71+(random()-.5)*33;
      const y=row*150+(random()-.5)*37;
      const size=(.68+random()*.36)*1.34;
      rosette(x,y,(32+random()*10)*size,(35+random()*14)*size);
      if(random()>.73) blob(x+65,y+72,5+random()*5,6+random()*8,random()*3,'#251910');
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
    glitterSurface=makeGlitter(width,height);
    seed=862;glitterPoints=[];
    for(let i=0;i<width*height*.055;i++) glitterPoints.push({x:random()*width,y:random()*height,size:.35+random()*.9,phase:random()*Math.PI*2,nx:8+random()*24,ny:8+random()*24,star:i%17===0});
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
    if(theme==='glitter') { drawGlitter(decay);return; }
    if(theme==='holographic') { drawHologram(decay);return; }
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
    colorPanel.hidden=theme!=='glitter';
    choices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cover===theme)));
    try { localStorage.setItem('book-cover-theme',theme); } catch {}
  }
  choices.forEach(button=>{
    button.addEventListener('click',()=>selectTheme(button.dataset.cover));
    const swatch=button.querySelector('canvas'),c=swatch.getContext('2d');
    if(button.dataset.cover==='leopard') c.drawImage(makeLeopard(110,110),0,0,96,96);
    else if(button.dataset.cover==='holographic') paintHologram(c,96,96,.35,.4);
    else if(button.dataset.cover==='pink') {
      c.fillStyle='#e99bc5';c.fillRect(0,0,96,96);seed=91;
      for(let i=0;i<1400;i++) {
        const x=random()*96,y=random()*110;
        c.strokeStyle=`hsl(329 60% ${60+random()*27}%)`;c.lineWidth=.8;
        c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+4,y-4,x+2+random()*7,y-8-random()*7);c.stroke();
      }
    }
  });
  rebuildGlitter();
  selectTheme(theme);
  cover.addEventListener('pointerleave',release);
  window.addEventListener('scroll',release,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  new ResizeObserver(resize).observe(cover);
})();
