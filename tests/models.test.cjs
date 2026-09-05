const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build, createGLTF } = require('../js/models.js');
for (const name of ['terminal', 'bot', 'orbit']) {
  test(`${name}: valid, bounded triangle geometry`, () => {
    const mesh = build(name);
    assert.equal(mesh.positions.length % 9, 0);
    assert.equal(mesh.positions.length, mesh.normals.length);
    assert.equal(mesh.positions.length, mesh.colors.length);
    assert(mesh.positions.length > 0 && mesh.positions.length < 250000);
    for (const n of mesh.positions) assert(Number.isFinite(n) && Math.abs(n) < 3);
    for (const n of mesh.colors) assert(Number.isFinite(n) && n >= 0 && n <= 1);
    for (let i = 0; i < mesh.normals.length; i += 3) assert(Math.abs(Math.hypot(...mesh.normals.slice(i, i + 3)) - 1) < 1e-6);
  });
  test(`${name}: self-contained glTF 2.0 with correct buffers`, () => {
    const file = createGLTF(name);
    assert.equal(file.asset.version, '2.0'); assert.equal(file.scene, 0);
    const bytes = Buffer.from(file.buffers[0].uri.split(',')[1], 'base64');
    assert.equal(bytes.length, file.buffers[0].byteLength);
    for (const [i, view] of file.bufferViews.entries()) {
      assert.equal(view.byteOffset % 4, 0); assert(view.byteOffset + view.byteLength <= bytes.length);
      assert.equal(file.accessors[i].count * 12, view.byteLength);
    }
    assert(file.accessors[0].min.every(Number.isFinite)); assert(file.accessors[0].max.every(Number.isFinite));
    const source = build(name).positions;
    for (let i = 0; i < source.length; i++) assert(Math.abs(bytes.readFloatLE(i * 4) - source[i]) < 1e-6);
  });
}
test('unknown model is rejected', () => assert.throws(() => build('unknown')));
