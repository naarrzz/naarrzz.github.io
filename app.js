// Pose lab: a jointed figure on a 3D stage, drawn the way Flex and Count draws a body
// (bones, joints, one counted arm in red). Each section of the site puts it in a pose.
import * as THREE from './vendor/three.module.min.js';

const D = Math.PI / 180;
const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const SECTIONS = [
  { id: 'about', label: 'How I work', short: 'About', sub: 'start here' },
  { id: 'flex', label: 'Flex and Count', short: 'Flex & Count', sub: 'build 19', c: '#FF2A2F', video: 'media/flex.mp4' },
  { id: 'timelog', label: 'Time Log', short: 'Time Log', sub: 'v0.6.0', c: '#0A84FF', video: 'media/timelog.mp4' },
  { id: 'coaching', label: 'Coaching page', short: 'Coaching', sub: 'live', c: '#D93D1A', video: 'media/coaching.mp4' },
  { id: 'posing', label: 'Posing coach', short: 'Posing', sub: 'soon' },
  { id: 'ops', label: 'Supplement ops agent', short: 'Ops agent', sub: 'soon' },
  { id: 'experience', label: 'Experience and skills', short: 'Experience', sub: 'intern, 2026' },
  { id: 'contact', label: 'Contact', short: 'Contact', sub: 'say hi' },
];
const byId = Object.fromEntries(SECTIONS.map(s => [s.id, s]));

/* ---------------- navigation ---------------- */
const rail = $('.rail'), dock = $('.dock'), panel = $('#panel');
let current = 'about';

function buildNav(root, key) {
  const thumb = document.createElement('span'); thumb.className = 'thumb'; root.append(thumb);
  for (const s of SECTIONS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.go = s.id;
    b.innerHTML = key === 'rail'
      ? `<i style="${s.c ? `--c:${s.c}` : ''}"></i>${s.label}<small>${s.sub}</small>`
      : s.short;
    root.append(b);
  }
}
buildNav(rail, 'rail'); buildNav(dock, 'dock');

function moveThumb(root) {
  const b = $(`[data-go="${current}"]`, root), t = $('.thumb', root);
  if (!b || !b.offsetWidth) return;
  t.style.width = b.offsetWidth + 'px'; t.style.height = b.offsetHeight + 'px';
  t.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
  if (root === dock) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function go(id, { push = true, scroll = true } = {}) {
  if (!byId[id]) id = 'about';
  current = id;
  document.body.dataset.s = id;
  for (const sec of panel.querySelectorAll('section')) sec.classList.toggle('on', sec.id === id);
  for (const b of document.querySelectorAll('[data-go]')) b.setAttribute('aria-current', b.dataset.go === id);
  panel.scrollTop = 0;
  if (scroll && isPhone() && !document.body.classList.contains('plain')) scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  moveThumb(rail); moveThumb(dock);
  if (push) history.replaceState(null, '', id === 'about' ? location.pathname : '#' + id);
  stage.enter(id);
}
const isPhone = () => innerWidth <= 820;

document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (!b) return;
  e.preventDefault();
  if (document.body.classList.contains('plain')) { togglePlain(false); }
  go(b.dataset.go);
});
addEventListener('hashchange', () => go(location.hash.slice(1), { push: false }));
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = SECTIONS.findIndex(s => s.id === current);
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { go(SECTIONS[(i + 1) % SECTIONS.length].id); e.preventDefault(); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { go(SECTIONS[(i + SECTIONS.length - 1) % SECTIONS.length].id); e.preventDefault(); }
});

/* ---------------- theme and quick view ---------------- */
const root = document.documentElement;
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
$('#btn-theme').addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('narz-theme', root.dataset.theme); } catch (e) {}
  stage.theme();
});
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => stage.theme());

function togglePlain(on = !document.body.classList.contains('plain')) {
  document.body.classList.toggle('plain', on);
  $('#btn-plain').textContent = on ? 'Pose lab' : 'Quick view';
  scrollTo(0, 0);
  stage.resize();
  if (!on) { moveThumb(rail); moveThumb(dock); }
}
$('#btn-plain').addEventListener('click', () => togglePlain());

// The light inside each glass surface follows the pointer.
addEventListener('pointermove', e => {
  for (const g of document.querySelectorAll('.glass')) {
    const r = g.getBoundingClientRect();
    if (e.clientX < r.left - 200 || e.clientX > r.right + 200 || e.clientY < r.top - 200 || e.clientY > r.bottom + 200) continue;
    g.style.setProperty('--x', (e.clientX - r.left) + 'px'); g.style.setProperty('--y', (e.clientY - r.top) + 'px');
  }
}, { passive: true });

/* ---------------- the stage ---------------- */
const stage = makeStage();
go(location.hash.slice(1) || 'about', { push: false, scroll: false });
addEventListener('resize', () => { stage.resize(); moveThumb(rail); moveThumb(dock); });

function makeStage() {
  const canvas = $('#stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    // No WebGL: the site still works as a plain page.
    document.body.classList.add('plain'); $('#btn-plain').hidden = true;
    return { enter() {}, theme() {}, resize() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 4, 3); scene.add(key);

  /* --- materials (colors set in theme()) --- */
  const mBone = new THREE.MeshBasicMaterial();
  const mJoint = new THREE.MeshBasicMaterial();
  // Glass-like body: almost clear facing the camera, bright at the edges.
  const rim = (color, base, power) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { c: { value: new THREE.Color(color) }, b: { value: base }, p: { value: power } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); n = normalize(normalMatrix * normal); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; uniform float b; uniform float p; varying vec3 n; varying vec3 v; void main(){ float f = pow(1. - abs(dot(normalize(n), normalize(v))), p); gl_FragColor = vec4(c, b + f * .8); }',
  });
  const mBody = rim(0xdfe6ff, .04, 2.2);
  const mHot = new THREE.MeshBasicMaterial({ color: 0xFF2A2F });
  const mHotJoint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mHotBody = rim(0xFF2A2F, .12, 1.6);
  const mFloor = new THREE.LineBasicMaterial({ transparent: true, opacity: .2 });

  /* --- rig --- */
  const fig = new THREE.Group(); scene.add(fig);
  const J = {};
  const joint = (name, parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); J[name] = o; return o; };
  joint('hips', fig, 0, 1.0, 0);
  joint('spine', J.hips, 0, .12, 0);
  joint('chest', J.spine, 0, .2, 0);
  joint('neck', J.chest, 0, .21, 0);
  joint('head', J.neck, 0, .13, 0);
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    joint('sh' + k, J.chest, s * .21, .14, 0);
    joint('el' + k, J['sh' + k], 0, -.3, 0);
    joint('wr' + k, J['el' + k], 0, -.27, 0);
    joint('hand' + k, J['wr' + k], 0, -.09, 0);
    joint('hp' + k, J.hips, s * .1, -.05, 0);
    joint('kn' + k, J['hp' + k], 0, -.45, 0);
    joint('an' + k, J['kn' + k], 0, -.44, 0);
    joint('toe' + k, J['an' + k], 0, -.04, .15);
  }

  const Y = new THREE.Vector3(0, 1, 0);
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const arms = { L: { bones: [], joints: [], bodies: [] }, R: { bones: [], joints: [], bodies: [] } };
  function bone(a, b, vol, armKey) {
    const from = J[a], to = J[b];
    const v = to.parent === from ? to.position.clone() : to.position.clone().sub(from.position);
    const host = to.parent === from ? from : from.parent;
    const base = to.parent === from ? new THREE.Vector3() : from.position.clone();
    const len = v.length(), q = new THREE.Quaternion().setFromUnitVectors(Y, v.clone().normalize());
    const line = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, len, 8), mBone);
    line.position.copy(base).addScaledVector(v, .5); line.quaternion.copy(q); host.add(line);
    if (armKey) arms[armKey].bones.push(line);
    if (vol) {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(vol, Math.max(.01, len - vol * 1.2), 6, 16), mBody);
      body.position.copy(line.position); body.quaternion.copy(q); host.add(body);
      if (armKey) arms[armKey].bodies.push(body);
    }
  }
  bone('hips', 'spine'); bone('spine', 'chest'); bone('chest', 'neck'); bone('neck', 'head');
  bone('shL', 'shR'); bone('hpL', 'hpR');
  for (const k of ['L', 'R']) {
    bone('sh' + k, 'el' + k, .05, k); bone('el' + k, 'wr' + k, .04, k); bone('wr' + k, 'hand' + k, .035, k);
    bone('hp' + k, 'kn' + k, .075); bone('kn' + k, 'an' + k, .055); bone('an' + k, 'toe' + k, .035);
  }
  // torso and head volumes
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.15, .26, 8, 20), mBody); torso.scale.set(1.25, 1, .72); torso.position.set(0, .2, 0); J.hips.add(torso);
  const chestV = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .2, 8, 20), mBody); chestV.rotation.z = Math.PI / 2; chestV.scale.set(1, 1.15, .8); chestV.position.set(0, .1, 0); J.chest.add(chestV);
  const head = new THREE.Mesh(sphere, mBody); head.scale.set(.095, .115, .105); head.position.y = .02; J.head.add(head);
  // joint dots
  for (const n of Object.keys(J)) {
    if (/^(spine|neck|hand|toe)/.test(n)) continue;
    const dot = new THREE.Mesh(sphere, mJoint); dot.scale.setScalar(n === 'head' ? .001 : .024); J[n].add(dot);
    const m = n.match(/^(sh|el|wr)([LR])$/); if (m) arms[m[2]].joints.push(dot);
  }

  /* --- floor --- */
  const floor = new THREE.Group(); scene.add(floor);
  for (const r of [.55, 1.1, 1.75]) {
    const pts = []; for (let i = 0; i <= 96; i++) pts.push(new THREE.Vector3(Math.cos(i / 96 * 6.2832) * r, 0, Math.sin(i / 96 * 6.2832) * r));
    floor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mFloor));
  }
  const ticks = [];
  for (let i = 0; i < 72; i++) { const a = i / 72 * 6.2832, r1 = 1.75, r2 = i % 6 ? 1.8 : 1.88; ticks.push(new THREE.Vector3(Math.cos(a) * r1, 0, Math.sin(a) * r1), new THREE.Vector3(Math.cos(a) * r2, 0, Math.sin(a) * r2)); }
  floor.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), mFloor));

  /* --- wrist trail --- */
  const TRAIL = 46;
  const trailPos = new Float32Array(TRAIL * 3), trailCol = new Float32Array(TRAIL * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  trail.frustumCulled = false; scene.add(trail);
  let trailInit = false;

  /* --- phone with a screen recording --- */
  const phone = new THREE.Group(); scene.add(phone); phone.scale.setScalar(0);
  const PW = .43, PH = .895; // screen matches the 390 x 844 recordings
  const rr = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(rr(PW, PH, .07), { depth: .035, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 3, curveSegments: 12 }),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: .35, metalness: .7 }));
  shell.position.z = -.0435; phone.add(shell);
  const SW = PW - .03, SH = PH - .03;
  const screenGeo = new THREE.ShapeGeometry(rr(SW, SH, .058), 12);
  { const p = screenGeo.attributes.position, uv = screenGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / SW + .5, p.getY(i) / SH + .5); }
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x111114, toneMapped: false });
  const screen = new THREE.Mesh(screenGeo, screenMat); screen.position.z = .002; phone.add(screen);
  const videos = {};
  function videoFor(id) {
    const s = byId[id]; if (!s || !s.video) return null;
    if (!videos[id]) {
      const v = document.createElement('video');
      v.src = s.video; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
      v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace;
      videos[id] = { v, tex, ok: false };
      v.addEventListener('loadeddata', () => { videos[id].ok = true; if (current === id) showVideo(id); });
      v.addEventListener('error', () => { videos[id].failed = true; });
    }
    return videos[id];
  }
  function showVideo(id) {
    for (const k in videos) if (k !== id) videos[k].v.pause();
    const e = videoFor(id);
    if (e && e.ok) { screenMat.map = e.tex; screenMat.color.set(0xffffff); screenMat.needsUpdate = true; e.v.currentTime = 0; e.v.play().catch(() => {}); }
    else { screenMat.map = null; screenMat.color.set(0x111114); screenMat.needsUpdate = true; }
  }

  /* --- poses: joint -> [x, y, z] degrees. L is the figure's left (+x). --- */
  const REST = { shL: [0, 0, 7], shR: [0, 0, -7], elL: [-8, 0, 0], elR: [-8, 0, 0] };
  const pose = (o) => ({ ...REST, ...o });
  const ease = (x) => x * x * (3 - 2 * x);
  const wave01 = (t, period, hold = .18) => { // 0..1..0 with a short hold at each end
    const p = (t % period) / period, h = hold / 2;
    const up = p < .5 ? p * 2 : 2 - p * 2;
    return ease(Math.min(1, Math.max(0, (up - h) / (1 - hold))));
  };
  const POSES = {
    dbl: (f = 1) => pose({ shL: [0, 0, 92], elL: [0, 0, 100 + 18 * f], shR: [0, 0, -92], elR: [0, 0, -100 - 18 * f], chest: [-6, 0, 0], hpL: [0, 0, 5], hpR: [0, 0, -5] }),
    lat: () => pose({ shL: [8, 0, 52], elL: [-10, 0, -92], shR: [8, 0, -52], elR: [-10, 0, 92], chest: [-4, 0, 0], hpL: [0, 0, 5], hpR: [0, 0, -5] }),
    abs: () => pose({ shL: [0, 0, 150], elL: [0, 0, 128], shR: [0, 0, -150], elR: [0, 0, -128], chest: [10, 0, 0], hpL: [-16, 0, 3], knL: [10, 0, 0], hpR: [0, 0, -3] }),
    crab: () => pose({ shL: [-38, 0, 34], elL: [-88, -50, 0], shR: [-38, 0, -34], elR: [-88, 50, 0], chest: [16, 0, 0], head: [-10, 0, 0], hpL: [0, 0, 7], hpR: [0, 0, -7], knL: [8, 0, 0], knR: [8, 0, 0] }),
  };
  const CYCLE = [['dbl', 'Front double biceps'], ['lat', 'Front lat spread'], ['abs', 'Abs and thigh'], ['crab', 'Most muscular']];

  const STATES = {
    about: { cam: [-.5, .1, 4.5], hot: 'R', reps: true, angle: 'R',
      pose: t => pose({ shR: [-3, 0, -7], elR: [-(6 + 136 * wave01(t, 2.6)), 0, 0] }) },
    flex: { cam: [-1.0, .08, 4.5], hot: 'LR', reps: true, angle: 'R',
      pose: t => pose({ shR: [-3, 0, -7], elR: [-(6 + 136 * wave01(t, 3.2)), 0, 0], shL: [-3, 0, 7], elL: [-(6 + 136 * wave01(t + 1.6, 3.2)), 0, 0] }) },
    timelog: { cam: [.5, .12, 4.5],
      pose: t => pose({ shL: [-46, -62, 4], elL: [-104, 0, 0], head: [20 + 2 * Math.sin(t * 1.3), 14, 0], chest: [4, 6, 0], hpR: [0, 0, -4] }) },
    coaching: { cam: [0, .06, 4.5], hot: 'LR',
      pose: t => POSES.dbl(.5 + .5 * Math.sin(t * 2.2)) },
    posing: { cam: [.15, .06, 4.5], hot: 'LR',
      pose: t => POSES[CYCLE[Math.floor(t / 3) % CYCLE.length][0]](1),
      name: t => CYCLE[Math.floor(t / 3) % CYCLE.length][1], sway: .35 },
    ops: { cam: [.45, .1, 4.5],
      pose: t => pose({ shR: [-34, 0, 4], elR: [-142, 0, 0], shL: [-12, -78, 2], elL: [-96, 0, 0], head: [9 + 2 * Math.sin(t * .9), 10, 5], chest: [3, -5, 0], hpL: [0, 0, 5], hpR: [0, 0, -3] }) },
    experience: { cam: [-.3, .1, 4.5],
      pose: t => pose({ shL: [6, 0, 40], elL: [-12, 0, -80], shR: [6, 0, -40], elR: [-12, 0, 80], hpL: [0, 0, 7], hpR: [0, 0, -7], chest: [-3 + Math.sin(t * 1.2), 0, 0] }) },
    contact: { cam: [.2, .08, 4.5],
      pose: t => pose({ shR: [0, 0, -152], elR: [0, 0, -(38 + 26 * Math.sin(t * 7))], head: [0, 0, -7], chest: [0, 0, 3], hpL: [0, 0, 4] }) },
  };

  const target = {}; const qTmp = new THREE.Quaternion(), eTmp = new THREE.Euler();
  const POSED = Object.keys(J).filter(n => !/^(hips|wr|hand|an|toe|spine)/.test(n) || n === 'spine');
  function applyPose(p, k) {
    for (const n of POSED) {
      const r = p[n] || [0, 0, 0];
      eTmp.set(r[0] * D, r[1] * D, r[2] * D);
      qTmp.setFromEuler(eTmp);
      J[n].quaternion.slerp(qTmp, k);
    }
  }

  /* --- camera and interaction --- */
  const cam = { yaw: -.5, pitch: .1, dist: 9, tYaw: -.5, tPitch: .1, tDist: 4.5, drag: 0, dragPitch: 0 };
  let dragging = false, lx = 0, ly = 0, dragged = false;
  canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.2) return; // let the page scroll
    cam.drag -= dx * .008; cam.dragPitch = Math.max(-.25, Math.min(.5, cam.dragPitch + dy * .004));
    if (!dragged) { dragged = true; $('#hud-hint').classList.add('gone'); }
  });
  const stop = () => { dragging = false; };
  canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);
  let px = 0, py = 0;
  addEventListener('pointermove', e => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; }, { passive: true });

  /* --- HUD --- */
  const hud = { reps: $('#hud-reps'), angle: $('#hud-angle'), pose: $('#hud-pose'), hint: $('#hud-hint') };
  const v3 = new THREE.Vector3(), a3 = new THREE.Vector3(), b3 = new THREE.Vector3(), c3 = new THREE.Vector3();
  let W = 1, H = 1, rectTop = 0, rectLeft = 0;
  function place(el, world, dx = 0, dy = 0) {
    v3.copy(world).project(camera);
    const x = rectLeft + (v3.x * .5 + .5) * W + dx, y = rectTop + (-v3.y * .5 + .5) * H + dy;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
  const elbowAngle = k => {
    J['sh' + k].getWorldPosition(a3); J['el' + k].getWorldPosition(b3); J['wr' + k].getWorldPosition(c3);
    return a3.sub(b3).angleTo(c3.sub(b3)) / D;
  };

  /* --- state --- */
  let st = STATES.about, stId = 'about', tState = 0, reps = 0, repDown = { L: true, R: true }, phoneOn = 0, intro = 0, lastName = '';
  function enter(id) {
    stId = id; st = STATES[id] || STATES.about; tState = 0; reps = 0; repDown = { L: true, R: true };
    hud.reps.querySelector('b').textContent = '0';
    cam.tYaw = st.cam[0]; cam.tPitch = st.cam[1]; cam.tDist = st.cam[2]; cam.drag = 0; cam.dragPitch = 0;
    showVideo(id);
    trailInit = false;
  }

  function theme() {
    const dark = isDark();
    mBone.color.set(dark ? 0xffffff : 0x1c1c1e); mJoint.color.set(dark ? 0xffffff : 0x1c1c1e);
    mBody.uniforms.c.value.set(dark ? 0xdfe6ff : 0x3a3f52); mBody.uniforms.b.value = dark ? .04 : .07;
    mHotJoint.color.set(dark ? 0xffffff : 0x1c1c1e);
    mFloor.color.set(dark ? 0xffffff : 0x000000); mFloor.opacity = dark ? .2 : .16;
    trail.material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
  }
  theme();

  let viewShift = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); rectTop = r.top; rectLeft = r.left;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Center the figure in the gap between the intro and the panel on wide screens.
    viewShift = 0;
    if (!isPhone()) {
      const a = $('.intro').getBoundingClientRect(), b = panel.getBoundingClientRect();
      viewShift = W / 2 - (a.right + b.left) / 2;
    }
    camera.fov = isPhone() ? 36 : 32;
    if (viewShift) camera.setViewOffset(W, H, viewShift, 0, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const clock = new THREE.Clock();
  const look = new THREE.Vector3(), right = new THREE.Vector3(), tmpCol = new THREE.Color();
  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) clock.getDelta(); });

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.body.classList.contains('plain')) return;
    const dt = Math.min(clock.getDelta(), .05);
    const t = reduceMotion ? 1.3 : (tState += dt);
    intro = Math.min(1, intro + dt * .9);
    const phoneMode = isPhone();

    // pose
    applyPose(st.pose(t), 1 - Math.exp(-dt * (reduceMotion ? 60 : 9)));
    J.hips.position.y = 1.0 + (reduceMotion ? 0 : Math.sin(t * 1.6) * .004);
    const s = 1 - Math.pow(1 - intro, 3);
    fig.scale.setScalar(.6 + .4 * s);

    // counted arm(s) in red
    for (const k of ['L', 'R']) {
      const hot = (st.hot || '').includes(k);
      for (const m of arms[k].bones) m.material = hot ? mHot : mBone;
      for (const m of arms[k].bodies) m.material = hot ? mHotBody : mBody;
      for (const m of arms[k].joints) { m.material = hot ? mHotJoint : mJoint; m.scale.setScalar(hot ? .034 : .024); }
    }

    // camera
    const kc = 1 - Math.exp(-dt * 3.2);
    const sway = st.sway && !reduceMotion ? Math.sin(t * .5) * st.sway : 0;
    cam.yaw += (cam.tYaw + cam.drag + sway + px * .12 - cam.yaw) * kc;
    cam.pitch += (cam.tPitch + cam.dragPitch + py * .05 - cam.pitch) * kc;
    const hasPhone = !!(byId[stId].video) && !(videos[stId] && videos[stId].failed);
    phoneOn += ((hasPhone ? 1 : 0) - phoneOn) * (1 - Math.exp(-dt * 5));
    const dist = cam.tDist * (phoneMode ? .84 : 1) * (camera.aspect < .9 ? 1.1 : 1);
    cam.dist += (dist - cam.dist) * kc;
    right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    const sideGap = phoneMode ? .5 : .6;
    look.set(0, phoneMode ? 1.1 : .98, 0).addScaledVector(right, phoneOn * sideGap * .55);
    camera.position.set(look.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, look.y + Math.sin(cam.pitch) * cam.dist, look.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
    camera.lookAt(look);
    floor.rotation.y += dt * .05;

    // phone floats on the figure's side, facing the camera
    phone.position.set(0, 1.12 + Math.sin(t * 1.1) * .02, 0).addScaledVector(right, sideGap + .1).addScaledVector(v3.set(Math.sin(cam.yaw), 0, Math.cos(cam.yaw)), .35);
    phone.rotation.set(-.04 + py * .15, cam.yaw - .28 + Math.sin(t * .6) * .1 + px * .3, .03);
    phone.scale.setScalar(Math.max(.0001, phoneOn * (phoneMode ? 1 : 1.12)));
    phone.visible = phoneOn > .01;

    fig.updateMatrixWorld(true);

    // reps and elbow angle (same thresholds as the app: past 160 is down, under 50 is a rep)
    if (st.reps) {
      for (const k of ['L', 'R']) {
        if (!(st.hot || '').includes(k)) continue;
        const a = elbowAngle(k);
        if (a > 160) repDown[k] = true;
        else if (a < 50 && repDown[k]) {
          repDown[k] = false; reps++;
          const b = hud.reps.querySelector('b'); b.textContent = reps;
          hud.reps.classList.remove('tick'); void hud.reps.offsetWidth; hud.reps.classList.add('tick');
        }
      }
    }
    hud.reps.classList.toggle('show', !!st.reps && intro > .6);
    hud.angle.classList.toggle('show', !!st.angle && intro > .6);
    const name = st.name ? st.name(t) : (document.getElementById(stId)?.dataset.pose || '');
    hud.pose.classList.toggle('show', !st.reps && !!name && intro > .6);
    if (name !== lastName) { hud.pose.querySelector('span').textContent = name; lastName = name; }

    if (st.angle) {
      const a = elbowAngle(st.angle);
      hud.angle.querySelector('b').textContent = Math.round(a) + '°';
      J['el' + st.angle].getWorldPosition(b3); place(hud.angle, b3, -78, -14);
    }
    J.head.getWorldPosition(b3); b3.y += .2;
    if (st.reps) place(hud.reps, b3, phoneMode ? (phoneOn > .5 ? -128 : 44) : 26, phoneMode ? (phoneOn > .5 ? -44 : 6) : -30);
    else { place(hud.pose, b3, 0, -34); hud.pose.style.transform += ' translateX(-50%)'; }
    place(hud.hint, v3.set(0, -.02, 0), 0, 10); hud.hint.style.transform += ' translateX(-50%)';

    // wrist trail
    const tk = (st.hot || '').includes('R') ? 'R' : (st.hot ? 'L' : null);
    trail.visible = !!tk && !reduceMotion;
    if (tk) {
      J['wr' + tk].getWorldPosition(c3);
      if (!trailInit) { for (let i = 0; i < TRAIL; i++) trailPos.set([c3.x, c3.y, c3.z], i * 3); trailInit = true; }
      trailPos.copyWithin(3, 0, (TRAIL - 1) * 3); trailPos.set([c3.x, c3.y, c3.z], 0);
      for (let i = 0; i < TRAIL; i++) { const f = Math.pow(1 - i / TRAIL, 2); tmpCol.setRGB(1 * f, .16 * f, .18 * f); trailCol.set([tmpCol.r, tmpCol.g, tmpCol.b], i * 3); }
      if (!isDark()) for (let i = 0; i < TRAIL; i++) { const f = Math.pow(1 - i / TRAIL, 2); trailCol.set([1, 1 - .84 * f, 1 - .82 * f], i * 3); }
      trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  frame();

  return { enter, theme, resize };
}
