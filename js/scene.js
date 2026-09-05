/* Small, on-demand WebGL viewer. All geometry is generated locally. */
(function () {
  'use strict';
  const canvas = document.getElementById('scene');
  const fallback = document.getElementById('scene-fallback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let gl, program, buffers = [], frame = 0, previous = 0, inView = true, dragging = false;
  let yaw = -0.43, pitch = 0.16, model = 'terminal', vertices = 0, pointer = null;
  let auto = false, ready = false;
  const cache = new Map();
  const vertexSource = `attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor;
    uniform mat4 uModel; uniform mat4 uProjection; uniform mat4 uView;
    varying vec3 vNormal; varying vec3 vColor; varying vec3 vPosition;
    void main(){ vec4 p = uModel * vec4(aPosition,1.0); vPosition=p.xyz;
      vNormal=mat3(uModel)*aNormal; vColor=aColor; gl_Position=uProjection*uView*p; }`;
  const fragmentSource = `precision mediump float;
    varying vec3 vNormal; varying vec3 vColor; varying vec3 vPosition;
    void main(){ vec3 n=normalize(vNormal);
      float key=max(dot(n,normalize(vec3(-3.0,5.0,6.0))),0.0);
      float fill=max(dot(n,normalize(vec3(4.0,1.0,-2.0))),0.0);
      float light=0.38+0.59*key+0.2*fill;
      vec3 color=pow(vColor,vec3(2.2))*light;
      gl_FragColor=vec4(pow(color,vec3(1.0/2.2)),1.0); }`;
  function shader(type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('Shader could not compile'); }
    return s;
  }
  function matrix(x, y) {
    const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y);
    return new Float32Array([cy, sx * sy, -cx * sy, 0, 0, cx, sx, 0, sy, -sx * cy, cx * cy, 0, 0, 0, 0, 1]);
  }
  function schedule() { if (ready && inView && !document.hidden && !frame) frame = requestAnimationFrame(render); }
  function render(now) {
    frame = 0;
    if (!ready || !inView || document.hidden) { previous = 0; return; }
    if (auto && !dragging && previous) yaw += Math.min((now - previous) / 1000, 0.05) * 0.18;
    previous = now;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, matrix(pitch, yaw));
    gl.drawArrays(gl.TRIANGLES, 0, vertices);
    if (auto && !dragging) schedule();
  }
  function resize() {
    if (!ready) return;
    const box = canvas.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = box.width / box.height;
    const f = 1 / Math.tan(35 * Math.PI / 360), near = 0.1, far = 40;
    const projection = new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
    const distance = aspect < 0.95 ? 6.7 : 5.8;
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, projection);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.03, -distance, 1]));
    schedule();
  }
  function setModel(name) {
    if (!ready) return false;
    if (!cache.has(name)) cache.set(name, window.StudioModels.build(name));
    const mesh = cache.get(name);
    buffers.forEach(buffer => gl.deleteBuffer(buffer)); buffers = [];
    [['aPosition', mesh.positions], ['aNormal', mesh.normals], ['aColor', mesh.colors]].forEach(([attribute, data]) => {
      const buffer = gl.createBuffer(); buffers.push(buffer); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program, attribute);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    });
    vertices = mesh.positions.length / 3; model = name; reset(); return true;
  }
  function reset() { yaw = model === 'orbit' ? -0.24 : -0.43; pitch = model === 'orbit' ? 0.1 : 0.16; previous = 0; schedule(); }
  function setAuto(value) { auto = Boolean(value); previous = 0; schedule(); return auto; }
  function fail() { ready = false; cancelAnimationFrame(frame); frame = 0; canvas.hidden = true; fallback.hidden = false; window.dispatchEvent(new Event('studio:unavailable')); }
  function init() {
    try {
      gl = canvas.getContext('webgl', { antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
      if (!gl || !window.StudioModels) return fail();
      const vs = shader(gl.VERTEX_SHADER, vertexSource), fs = shader(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unable to link shaders');
      gl.useProgram(program); gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);
      ready = true; canvas.hidden = false; fallback.hidden = true;
      setModel(model); resize();
    } catch { fail(); }
  }
  canvas.addEventListener('pointerdown', event => {
    if (!ready || event.button !== 0 || dragging) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; dragging = true;
    canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging || !pointer || pointer.id !== event.pointerId) return;
    yaw += (event.clientX - pointer.x) * 0.01;
    if (event.pointerType !== 'touch') pitch = Math.max(-0.65, Math.min(0.7, pitch + (event.clientY - pointer.y) * 0.007));
    pointer.x = event.clientX; pointer.y = event.clientY; schedule();
  });
  const endDrag = () => { dragging = false; pointer = null; previous = 0; schedule(); };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') yaw -= 0.12;
    if (event.key === 'ArrowRight') yaw += 0.12;
    if (event.key === 'ArrowUp') pitch = Math.max(-0.65, pitch - 0.08);
    if (event.key === 'ArrowDown') pitch = Math.min(0.7, pitch + 0.08);
    if (event.key === 'Home') reset();
    schedule();
  });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); });
  canvas.addEventListener('webglcontextrestored', () => { buffers = []; init(); window.dispatchEvent(new Event('studio:restored')); });
  document.addEventListener('visibilitychange', () => { previous = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting; previous = 0;
    if (inView) schedule(); else { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '80px' }).observe(canvas.parentElement);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener('resize', resize);
  reduced.addEventListener('change', event => { if (event.matches) { setAuto(false); window.dispatchEvent(new Event('studio:motionoff')); } });
  window.Studio3D = {
    get ready() { return ready; },
    get info() { return { model, triangles: vertices / 3, auto, ready, queuedFrame: Boolean(frame), yaw, pitch }; },
    setModel, reset, setAuto,
    exportModel() {
      const data = JSON.stringify(window.StudioModels.createGLTF(model));
      const url = URL.createObjectURL(new Blob([data], { type: 'model/gltf+json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'shomkee-' + model + '.gltf'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
  };
  init();
})();
