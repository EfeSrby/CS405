// CS405 · Lab 1 — your first triangle in WebGPU (starter)
// Work through the TODOs in order. After each one, check the matching
// checkpoint on the lab slides. The reference solution is in ../lab1-solution/.

const canvas = document.querySelector('canvas');

// ---------------------------------------------------------------------------
// TODO 1 — get a device and configure the canvas
//   a) check navigator.gpu exists, throw a clear error if not
//   b) const adapter = await navigator.gpu.requestAdapter()
//   c) const device  = await adapter.requestDevice()
//   d) const ctx     = canvas.getContext('webgpu')
//   e) const format  = navigator.gpu.getPreferredCanvasFormat()
//   f) ctx.configure({ device, format, alphaMode: 'opaque' })
//   g) console.log('WebGPU ready:', format)
// ---------------------------------------------------------------------------

if (!navigator.gpu) throw new Error('WebGPU is not available in this browser.');

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error('No WebGPU adapter found.');

const device = await adapter.requestDevice();

const ctx = canvas.getContext('webgpu');

const format = navigator.gpu.getPreferredCanvasFormat();

ctx.configure({ device, format, alphaMode: 'opaque' });

console.log('WebGPU ready:', format);
// ---------------------------------------------------------------------------
// TODO 2 — a shader module and a render pipeline
//   The vertex shader returns clip-space positions for vertex_index 0, 1, 2.
//   The fragment shader returns a solid colour.
//   Then: device.createRenderPipeline({ layout: 'auto', vertex, fragment })
// ---------------------------------------------------------------------------

const SHADER = /* wgsl */`
struct U {
  time: f32,
  aspect: f32,
  mouse: vec2f,
};
@group(0) @binding(0) var<uniform> u: U;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) colour: vec3f,
};

const P = array<vec2f, 6>(
  vec2f(-0.3, -0.3), vec2f( 0.3, -0.3), vec2f( 0.3,  0.3),
  vec2f(-0.3, -0.3), vec2f( 0.3,  0.3), vec2f(-0.3,  0.3));

const C = array<vec3f, 6>(
  vec3f(1.0, 0.25, 0.1), vec3f(0.95, 0.8, 0.2), vec3f(0.2, 0.6, 0.9),
  vec3f(1.0, 0.25, 0.1), vec3f(0.2, 0.6, 0.9), vec3f(0.3, 0.75, 0.4));

@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  var p = P[i];
  let a = u.time;
  let R = mat2x2f( cos(a), sin(a),
                -sin(a), cos(a));
  p = R * p;
  p.x = p.x / u.aspect;
  p = p + (u.mouse * 2.0 - 1.0);

  var out: VSOut;
  out.pos = vec4f(p, 0.0, 1.0);
  out.colour = C[i];
  return out;
}

@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  return vec4f(in.colour, 1.0);
}`;

const module = device.createShaderModule({ code: SHADER });
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module, entryPoint: 'vs' },
  fragment: { module, entryPoint: 'fs', targets: [{ format }] },
  primitive: { topology: 'triangle-list' },
});

const ubuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
const bind = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: ubuf } }],
});

const mouse = [0.5, 0.5];
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  mouse[0] = (e.clientX - r.left) / r.width;
  mouse[1] = 1 - (e.clientY - r.top) / r.height;
});

// ---------------------------------------------------------------------------
// TODO 3 — a colour per vertex
//   Return a struct from the vertex shader with @location(0) colour,
//   take it as the fragment shader's input, and watch it interpolate.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TODO 4 — a uniform buffer with the time, and rotate the triangle
//   size 16 bytes, usage UNIFORM | COPY_DST
//   bind group from pipeline.getBindGroupLayout(0)
//   device.queue.writeBuffer(...) every frame
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TODO 5 — your turn: a square (two triangles), correct aspect ratio,
//   and the shape following the mouse.
// ---------------------------------------------------------------------------

const t0 = performance.now();

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
}
window.addEventListener('resize', resize);
resize();

function frame() {
  // TODO 1 (continued): create a command encoder, begin a render pass that
  // clears the canvas, end it, and submit it to device.queue.
  //
const t = (performance.now() - t0) / 1000;
device.queue.writeBuffer(ubuf, 0, new Float32Array([t, canvas.width / canvas.height, mouse[0], mouse[1]]));

  const enc = device.createCommandEncoder();     
const pass = enc.beginRenderPass({
  colorAttachments: [{
    view: ctx.getCurrentTexture().createView(), 
    clearValue: { r: 0.06, g: 0.07, b: 0.09, a: 1 },
    loadOp: 'clear',                           
    storeOp: 'store',                        
  }],
});

pass.setPipeline(pipeline);
pass.setBindGroup(0, bind);
pass.draw(6);

pass.end();
device.queue.submit([enc.finish()]);            

  // TODO 2 (continued): pass.setPipeline(pipeline); pass.draw(3);
  // TODO 4 (continued): writeBuffer + pass.setBindGroup(0, bind);

  requestAnimationFrame(frame);
}
frame();
