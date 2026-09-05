/* Original procedural models. No assets, libraries or network requests. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const palette = { shell: '#d9dfd1', dark: '#26352e', screen: '#14231e', blue: '#5078f5', light: '#eef1e9', key: '#a5b0a0', metal: '#788d80' };
  const rgb = hex => hex.replace('#', '').match(/../g).map(v => parseInt(v, 16) / 255);
  const normal = v => { const length = Math.hypot(...v) || 1; return v.map(n => n / length); };
  function rotate(v, r) {
    let [x, y, z] = v;
    let c = Math.cos(r[0]), s = Math.sin(r[0]); [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(r[1]); s = Math.sin(r[1]); [x, z] = [x * c + z * s, -x * s + z * c];
    c = Math.cos(r[2]); s = Math.sin(r[2]); return [x * c - y * s, x * s + y * c, z];
  }
  function roundedBox(w, h, d, r = 0.05) {
    const p = [], n = [], half = [w / 2, h / 2, d / 2];
    r = Math.min(r, ...half);
    const faces = [[0, 1, 2, 1], [0, 2, 1, -1], [1, 2, 0, 1], [1, 0, 2, -1], [2, 0, 1, 1], [2, 1, 0, -1]];
    const values = h => [-h, -h + r * 0.293, -h + r, h - r, h - r * 0.293, h];
    for (const [axis, a, b, sign] of faces) {
      const aa = values(half[a]), bb = values(half[b]);
      const point = (i, j) => {
        const v = [0, 0, 0]; v[axis] = half[axis] * sign; v[a] = aa[i]; v[b] = bb[j];
        const core = v.map((val, k) => Math.max(-half[k] + r, Math.min(half[k] - r, val)));
        const norm = normal(v.map((val, k) => val - core[k]));
        return { p: core.map((val, k) => val + norm[k] * r), n: norm };
      };
      for (let i = 0; i < aa.length - 1; i++) for (let j = 0; j < bb.length - 1; j++) {
        const points = [point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)];
        for (const k of [0, 1, 2, 0, 2, 3]) { p.push(...points[k].p); n.push(...points[k].n); }
      }
    }
    return { p, n };
  }
  function sphere(radius, segments = 24, rings = 16) {
    const p = [], n = [];
    const vertex = (u, v) => { const a = u * TAU / segments, b = v * Math.PI / rings; return [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)]; };
    for (let u = 0; u < segments; u++) for (let v = 0; v < rings; v++) {
      const q = [vertex(u, v), vertex(u + 1, v), vertex(u + 1, v + 1), vertex(u, v + 1)];
      for (const k of [0, 1, 2, 0, 2, 3]) { n.push(...q[k]); p.push(...q[k].map(x => x * radius)); }
    }
    return { p, n };
  }
  function torus(radius, tube, segments = 64, sides = 8) {
    const p = [], n = [];
    const vertex = (u, v) => { const a = u * TAU / segments, b = v * TAU / sides; return { p: [(radius + tube * Math.cos(b)) * Math.cos(a), (radius + tube * Math.cos(b)) * Math.sin(a), tube * Math.sin(b)], n: [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)] }; };
    for (let u = 0; u < segments; u++) for (let v = 0; v < sides; v++) {
      const q = [vertex(u, v), vertex(u + 1, v), vertex(u + 1, v + 1), vertex(u, v + 1)];
      for (const k of [0, 1, 2, 0, 2, 3]) { p.push(...q[k].p); n.push(...q[k].n); }
    }
    return { p, n };
  }
  function build(name) {
    if (!['terminal', 'bot', 'orbit'].includes(name)) throw new Error('Unknown model');
    const result = { name, positions: [], normals: [], colors: [] };
    const add = (mesh, pos, color, rotation = [0, 0, 0]) => {
      const c = rgb(palette[color] || color);
      for (let i = 0; i < mesh.p.length; i += 3) {
        const p = rotate(mesh.p.slice(i, i + 3), rotation), n = rotate(mesh.n.slice(i, i + 3), rotation);
        result.positions.push(...p.map((v, k) => v + pos[k])); result.normals.push(...n); result.colors.push(...c);
      }
    };
    const box = (size, pos, color, rotation, radius) => add(roundedBox(...size, radius), pos, color, rotation);
    const ball = (r, pos, color) => add(sphere(r), pos, color);
    if (name === 'terminal') {
      box([2.7, 0.07, 1.95], [0, -1.02, 0.12], 'dark', undefined, 0.03);
      box([1.01, 0.13, 0.63], [0, -0.86, -0.29], 'metal');
      box([0.32, 0.65, 0.3], [0, -0.55, -0.28], 'blue');
      box([1.98, 1.5, 0.72], [0, 0.33, -0.18], 'shell', undefined, 0.15);
      box([1.65, 1.13, 0.09], [0, 0.42, 0.208], 'dark', undefined, 0.085);
      box([1.46, 0.94, 0.035], [0, 0.43, 0.267], 'screen', undefined, 0.065);
      box([0.18, 0.042, 0.016], [-0.48, 0.56, 0.293], 'blue', [0, 0, -0.62], 0.008);
      box([0.18, 0.042, 0.016], [-0.48, 0.465, 0.293], 'blue', [0, 0, 0.62], 0.008);
      box([0.2, 0.032, 0.016], [-0.2, 0.43, 0.293], 'blue', undefined, 0.007);
      for (let i = 0; i < 3; i++) box([0.46 - i * 0.08, 0.025, 0.015], [-0.27 - i * 0.04, 0.22 - i * 0.085, 0.293], 'metal', undefined, 0.008);
      ball(0.027, [0.74, -0.27, 0.205], 'blue');
      for (let i = 0; i < 3; i++) box([0.22, 0.02, 0.02], [-0.61, -0.265 + i * 0.055, 0.201], 'metal', undefined, 0.005);
      box([1.89, 0.14, 0.64], [-0.11, -0.85, 0.66], 'shell', undefined, 0.055);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 10; col++) box([0.135, 0.056, 0.095], [-0.86 + col * 0.166, -0.754, 0.445 + row * 0.13], col === 9 ? 'blue' : 'key', undefined, 0.016);
      box([0.46, 0.06, 0.078], [-0.11, -0.756, 0.93], 'light', undefined, 0.02);
      box([0.22, 0.12, 0.34], [1.1, -0.87, 0.62], 'blue', [0, -0.15, 0], 0.09);
    } else if (name === 'bot') {
      box([1.48, 1.06, 0.84], [0, 0.43, 0], 'shell', undefined, 0.21);
      box([1.19, 0.62, 0.09], [0, 0.49, 0.446], 'screen', undefined, 0.04);
      for (const x of [-0.29, 0.29]) box([0.13, 0.22, 0.034], [x, 0.52, 0.503], 'blue', undefined, 0.055);
      box([0.22, 0.027, 0.02], [0, 0.31, 0.502], 'light', undefined, 0.012);
      box([0.07, 0.28, 0.07], [0, 1.055, 0], 'metal', undefined, 0.03); ball(0.108, [0, 1.24, 0], 'blue');
      for (const side of [-1, 1]) {
        box([0.18, 0.37, 0.47], [side * 0.83, 0.43, 0], 'blue', undefined, 0.085);
        box([0.28, 0.54, 0.32], [side * 0.75, -0.45, 0], 'metal', [0, 0, side * 0.2], 0.13);
        ball(0.18, [side * 0.8, -0.73, 0.035], 'blue');
        box([0.36, 0.16, 0.55], [side * 0.3, -1.03, 0.14], 'blue', undefined, 0.07);
        box([0.15, 0.22, 0.17], [side * 0.3, -0.88, 0], 'dark', undefined, 0.06);
      }
      box([0.29, 0.21, 0.26], [0, -0.19, 0], 'metal');
      box([1.0, 0.69, 0.62], [0, -0.49, 0], 'shell', undefined, 0.18);
      box([0.48, 0.32, 0.04], [0, -0.47, 0.327], 'dark', undefined, 0.018);
      for (let i = 0; i < 3; i++) box([0.06, 0.09 + i * 0.04, 0.02], [-0.13 + i * 0.13, -0.48 + i * 0.02, 0.355], 'blue', undefined, 0.01);
    } else {
      ball(0.67, [0, 0, 0], 'blue');
      add(torus(0.676, 0.01, 56, 6), [0, 0, 0], 'light', [0.45, 0, 0]);
      const rings = [[1.23, [0.88, 0.17, -0.4]], [1.42, [-0.58, 0.64, 0.55]], [1.1, [0.2, 1.14, -0.3]]];
      rings.forEach(([radius, rotation], i) => {
        add(torus(radius, i === 0 ? 0.035 : 0.023), [0, 0, 0], i === 0 ? 'shell' : 'metal', rotation);
        const angle = i * 2.1 + 0.65, pos = rotate([radius * Math.cos(angle), radius * Math.sin(angle), 0], rotation);
        ball(i === 0 ? 0.2 : 0.105, pos, i === 0 ? 'shell' : 'light');
      });
    }
    return result;
  }
  function createGLTF(name) {
    const mesh = build(name), arrays = [mesh.positions, mesh.normals, mesh.colors];
    const bytes = new Uint8Array(arrays.reduce((n, a) => n + a.length * 4, 0));
    const view = new DataView(bytes.buffer); let offset = 0;
    for (const array of arrays) for (const value of array) { view.setFloat32(offset, value, true); offset += 4; }
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const encode = typeof btoa === 'function' ? btoa : s => Buffer.from(s, 'binary').toString('base64');
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < mesh.positions.length; i++) { const axis = i % 3; min[axis] = Math.min(min[axis], mesh.positions[i]); max[axis] = Math.max(max[axis], mesh.positions[i]); }
    let byteOffset = 0;
    const bufferViews = arrays.map(a => { const entry = { buffer: 0, byteOffset, byteLength: a.length * 4, target: 34962 }; byteOffset += a.length * 4; return entry; });
    return { asset: { version: '2.0', generator: 'Shomkee Studio — procedural models' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name }], meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, material: 0, mode: 4 }] }], materials: [{ name: 'Matte vertex colors', doubleSided: true, pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 0.72 } }], buffers: [{ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + encode(binary) }], bufferViews, accessors: arrays.map((a, i) => ({ bufferView: i, componentType: 5126, count: a.length / 3, type: 'VEC3', ...(i === 0 ? { min, max } : {}) })) };
  }
  const api = { build, createGLTF };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StudioModels = api;
})(typeof window !== 'undefined' ? window : globalThis);
