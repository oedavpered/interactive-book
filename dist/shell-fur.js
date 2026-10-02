// Layered shell fur: each draw extrudes a transparent fibre slice.
(() => {
  const cover=document.querySelector('.cover');
  const canvas=document.createElement('canvas');
  canvas.className='shell-fur';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl)return;
  const vertex=`
    attribute vec2 position;
    uniform vec2 size;
    uniform float height;
    varying vec2 uv;
    void main(){
      uv=position*.5+.5;
      vec2 p=position*size/(size+28.0);
      // Extruded layers project beyond the base at the top and side edges.
      p+=vec2(3.5,10.0)*height/(size+28.0)*2.0;
      gl_Position=vec4(p,height*.2,1.0);
    }`;
  const fragment=`
    precision highp float;
    varying vec2 uv;
    uniform vec2 size;
    uniform vec2 pointer;
    uniform float strength;
    uniform float height;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      vec2 local=uv*size;
      vec2 delta=local-pointer;
      float brush=exp(-dot(delta,delta)/2600.0)*strength;
      vec2 flow=vec2(2.5*sin(local.y*.035)+2.0,7.0);
      flow+=normalize(delta+vec2(.001))*brush*19.0;
      vec2 root=local-flow*height*height;
      vec2 q=abs(root-size*.5)-(size*.5-vec2(12.0));
      float edge=length(max(q,0.0))+min(max(q.x,q.y),0.0)-12.0;
      if(edge>0.0)discard;
      vec2 cell=floor(root/1.55);
      vec2 f=fract(root/1.55);
      vec2 center=vec2(.18)+vec2(hash(cell),hash(cell+37.0))*.64;
      float strand=hash(cell+81.0);
      float radius=mix(.48,.075,height)*( .65+strand*.5);
      float coverage=1.0-smoothstep(radius-.07,radius+.07,length(f-center));
      if(height>strand*.65+.35)discard;
      if(height>.001&&coverage<.05)discard;
      float light=.68+height*.48+strand*.17;
      vec3 pink=mix(vec3(.71,.27,.48),vec3(1.0,.65,.82),strand*.5+height*.5);
      pink*=light;
      pink+=vec3(.12,.085,.11)*pow(height,4.0)*(1.0-brush*.35);
      gl_FragColor=vec4(pink,height<.001?1.0:coverage*.86);
    }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  let program;
  try {
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  }catch{return;}
  cover.append(canvas);cover.classList.add('has-shell-fur');
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const attribute=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['size','height','pointer','strength'].map(k=>[k,gl.getUniformLocation(program,k)]));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  let w=0,h=0,raf=0,power=0,target=0,px=-1000,py=-1000;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function draw(){
    raf=0;if(document.hidden||!w||!h||gl.isContextLost()||cover.dataset.theme!=='pink')return;
    power+=(target-power)*.15;
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.size,w,h);gl.uniform2f(uniforms.pointer,px,py);gl.uniform1f(uniforms.strength,power);
    const layers=innerWidth<700?18:30;
    for(let i=0;i<layers;i++){gl.uniform1f(uniforms.height,i/(layers-1));gl.drawArrays(gl.TRIANGLES,0,6);}
    if(Math.abs(target-power)>.002)wake();
  }
  function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(draw);}
  function resize(){w=cover.clientWidth;h=cover.clientHeight;const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round((w+28)*ratio);canvas.height=Math.round((h+28)*ratio);gl.viewport(0,0,canvas.width,canvas.height);wake();}
  cover.addEventListener('pointermove',e=>{if(reduced.matches||cover.dataset.theme!=='pink')return;const r=canvas.getBoundingClientRect();if(r.width<w*.4)return;px=(e.clientX-r.left)/r.width*(w+28)-14;py=(1-(e.clientY-r.top)/r.height)*(h+28)-14;target=1;wake();});
  cover.addEventListener('pointerleave',()=>{target=0;wake();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cover.classList.remove('has-shell-fur');cancelAnimationFrame(raf);raf=0;});
  document.addEventListener('visibilitychange',wake);
  new MutationObserver(wake).observe(cover,{attributes:true,attributeFilter:['data-theme']});
  new ResizeObserver(resize).observe(cover);
})();
