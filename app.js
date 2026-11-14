// Pose lab: a jointed figure on a 3D stage, drawn the way Flex and Count draws a body
// (bones and joints). Each section of the site gives it a pose and its own 3D world.
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
  if (push) history.replaceState(null, '', id === 'about' ? location.pathname + location.search : '#/' + id);
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
const fromHash = () => location.hash.replace(/^#\/?/, '');
addEventListener('hashchange', () => go(fromHash(), { push: false }));
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
go(fromHash() || 'about', { push: false, scroll: false });
if (isPhone()) requestAnimationFrame(() => scrollTo(0, 0));
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
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
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
    fragmentShader: 'uniform vec3 c; uniform float b; uniform float p; varying vec3 n; varying vec3 v; void main(){ float f = pow(1. - abs(dot(normalize(n), normalize(v))), p); gl_FragColor = vec4(c, b + f * .7); }',
  });
  const mBody = rim(0xdfe6ff, .03, 2.4);
  const mHot = new THREE.MeshBasicMaterial({ color: 0xFF2A2F });
  const mHotJoint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mHotBody = rim(0xFF2A2F, .1, 1.7);
  const mFloor = new THREE.LineBasicMaterial({ transparent: true, opacity: .2 });
  const mIron = new THREE.MeshBasicMaterial();

  /* --- rig: bodybuilder proportions (wide shoulders, narrow waist) --- */
  const fig = new THREE.Group(); scene.add(fig);
  const J = {};
  const joint = (name, parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); J[name] = o; return o; };
  joint('hips', fig, 0, 1.0, 0);
  joint('spine', J.hips, 0, .12, 0);
  joint('chest', J.spine, 0, .2, 0);
  joint('neck', J.chest, 0, .22, 0);
  joint('head', J.neck, 0, .12, 0);
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    joint('sh' + k, J.chest, s * .245, .15, 0);
    joint('el' + k, J['sh' + k], 0, -.3, 0);
    joint('wr' + k, J['el' + k], 0, -.27, 0);
    joint('hand' + k, J['wr' + k], 0, -.055, 0);
    joint('hp' + k, J.hips, s * .11, -.05, 0);
    joint('kn' + k, J['hp' + k], 0, -.45, 0);
    joint('an' + k, J['kn' + k], 0, -.44, 0);
    joint('toe' + k, J['an' + k], 0, -.04, .16);
  }

  const Y = new THREE.Vector3(0, 1, 0);
  const sphere = new THREE.SphereGeometry(1, 24, 16);
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
  // a muscle: a stretched sphere hanging off a joint
  function muscle(host, sx, sy, sz, x, y, z, armKey) {
    const o = new THREE.Mesh(sphere, mBody); o.scale.set(sx, sy, sz); o.position.set(x, y, z); J[host].add(o);
    if (armKey) arms[armKey].bodies.push(o);
    return o;
  }
  bone('hips', 'spine'); bone('spine', 'chest'); bone('chest', 'neck'); bone('neck', 'head');
  bone('shL', 'shR'); bone('hpL', 'hpR');
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    bone('sh' + k, 'el' + k, .062, k); bone('el' + k, 'wr' + k, .046, k); bone('wr' + k, 'hand' + k, null, k);
    bone('hp' + k, 'kn' + k, .09); bone('kn' + k, 'an' + k, .056); bone('an' + k, 'toe' + k, .036);
    muscle('sh' + k, .092, .1, .095, s * .012, -.015, 0, k);        // delt
    muscle('sh' + k, .066, .105, .078, 0, -.15, .028, k);           // biceps
    muscle('sh' + k, .06, .11, .07, s * .012, -.16, -.03, k);       // triceps
    muscle('el' + k, .056, .1, .058, 0, -.09, .006, k);             // forearm
    muscle('hand' + k, .048, .052, .05, 0, -.01, 0, k);             // fist
    muscle('chest', .118, .085, .075, s * .1, .075, .075);          // pec
    muscle('chest', .1, .19, .085, s * .2, -.03, -.03);             // lat
    muscle('hp' + k, .1, .2, .112, s * .022, -.19, .028);           // quad sweep
    muscle('hp' + k, .085, .15, .09, 0, -.2, -.05);                 // hamstring
    muscle('kn' + k, .062, .12, .07, 0, -.14, -.03);                // calf
    muscle('hips', .1, .1, .11, s * .085, -.03, -.05);              // glute
  }
  // torso: a V from the shoulders down to a narrow waist
  const vTorso = new THREE.Mesh(new THREE.CylinderGeometry(.215, .13, .36, 28), mBody); vTorso.scale.z = .6; vTorso.position.set(0, -.02, 0); J.chest.add(vTorso);
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(.13, .145, .24, 24), mBody); waist.scale.z = .72; waist.position.set(0, .1, 0); J.hips.add(waist);
  muscle('chest', .17, .06, .08, 0, .2, -.02);                       // traps
  const neckV = new THREE.Mesh(new THREE.CylinderGeometry(.055, .07, .12, 16), mBody); neckV.position.y = .05; J.neck.add(neckV);
  muscle('head', .088, .108, .098, 0, .02, 0);
  // joint dots
  for (const n of Object.keys(J)) {
    if (/^(spine|neck|hand|toe|head)/.test(n)) continue;
    const dot = new THREE.Mesh(sphere, mJoint); dot.scale.setScalar(.022); J[n].add(dot);
    const m = n.match(/^(sh|el|wr)([LR])$/); if (m) arms[m[2]].joints.push(dot);
  }
  // dumbbells, shown in the gym
  const bells = [];
  for (const k of ['L', 'R']) {
    const g = new THREE.Group(); J['hand' + k].add(g); g.scale.setScalar(.001);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .26, 10), mIron); bar.rotation.z = Math.PI / 2; g.add(bar);
    for (const x of [-.1, .1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.044, .044, .055, 18), mIron); h.rotation.z = Math.PI / 2; h.position.x = x; g.add(h); }
    bells.push(g);
  }

  /* --- floor --- */
  const floor = new THREE.Group(); scene.add(floor);
  const ringPts = (r, n = 96, y = 0) => { const pts = []; for (let i = 0; i <= n; i++) pts.push(new THREE.Vector3(Math.cos(i / n * 6.2832) * r, y, Math.sin(i / n * 6.2832) * r)); return pts; };
  for (const r of [.55, 1.1, 1.75]) floor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts(r)), mFloor));
  const ticksG = [];
  for (let i = 0; i < 72; i++) { const a = i / 72 * 6.2832, r2 = i % 6 ? 1.8 : 1.88; ticksG.push(new THREE.Vector3(Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75), new THREE.Vector3(Math.cos(a) * r2, 0, Math.sin(a) * r2)); }
  floor.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticksG), mFloor));

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

  /* --- poses: joint -> [x, y, z] degrees. L is the figure's left (+x).
         Shoulder z lifts the arm out to the side, x swings it forward (negative), y twists it.
         "sh", "el", "hp", "kn", "wr" without a side apply to both, mirrored. --- */
  const mir = r => [r[0], -r[1], -r[2]];
  const P = (o) => { const out = {}; for (const k in o) { if (/^(sh|el|hp|kn|wr)$/.test(k)) { out[k + 'L'] = o[k]; out[k + 'R'] = mir(o[k]); } else out[k] = o[k]; } return out; };
  const POSE = {
    relaxed: P({ sh: [4, 0, 18], el: [-16, 0, 0], chest: [-4, 0, 0], hp: [0, 0, 5] }),
    handsHips: P({ sh: [14, 0, 46], el: [-10, 0, -112], chest: [-7, 0, 0], spine: [-3, 0, 2], hpL: [0, 0, 13], hpR: [0, 0, -5], knL: [4, 0, 0], head: [-3, 0, 0] }),
    sweep: P({ shR: [-6, 0, -96], elR: [0, 0, -10], shL: [0, 0, 150], elL: [0, 0, 92], chest: [-6, 10, 6], spine: [0, 6, 3], hpL: [0, 0, 9], hpR: [-10, 0, -7], knR: [12, 0, 0], head: [-4, 22, 0] }),
    frontDouble: P({ sh: [4, 0, 97], el: [0, 0, 116], wr: [0, 0, 24], chest: [-10, 0, 0], spine: [-4, 0, 0], hpL: [0, 0, 9], hpR: [-12, 0, -7], knR: [14, 0, 0], head: [-4, 0, 0] }),
    victory: P({ shR: [0, 0, -154], elR: [0, 0, -30], shL: [2, 0, 95], elL: [0, 0, 122], chest: [-7, -12, -9], spine: [0, -6, -5], hips: [0, 8, 0], hpL: [0, 0, 18], hpR: [-8, 0, -18], knR: [10, 0, 0], head: [-10, -26, 4] }),
    mostMuscular: P({ y: -.05, hips: [6, 0, 0], spine: [20, 0, 0], chest: [22, 0, 0], neck: [-16, 0, 0], head: [-22, 0, 0], sh: [0, -40, 52], el: [-106, 0, -41], hp: [-24, 0, 14], kn: [34, 0, 0] }),
    arnold: P({ y: -.09, hips: [0, 40, 0], spine: [4, -18, -4], chest: [4, -32, -6], shL: [0, 13, 152], elL: [108, 0, 59], shR: [0, 80, -63], elR: [11, 0, -86], hpL: [-38, 0, 6], knL: [48, 0, 0], hpR: [18, 0, -4], knR: [26, 0, 0], head: [14, -24, 0] }),
    backDouble: P({ hips: [0, 180, 0], sh: [10, 0, 99], el: [0, 0, 117], wr: [0, 0, 24], chest: [-9, 0, 0], spine: [-3, 0, 3], hpR: [14, 0, -7], knR: [28, 0, 0], hpL: [0, 0, 8] }),
    latSpread: P({ sh: [0, -11, 53], el: [-131, 0, -57], chest: [-9, 0, 0], spine: [-3, 0, 0], hp: [0, 0, 8] }),
    sideChest: P({ hips: [0, 74, 0], spine: [0, -10, 0], chest: [-9, -24, 0], shR: [0, 68, -16], elR: [-67, 0, -79], shL: [0, -70, 37], elL: [-94, 0, 0], hpR: [-26, 0, 0], knR: [48, 0, 0], head: [0, -40, 0] }),
    backLat: P({ hips: [0, 180, 0], sh: [0, -11, 53], el: [-131, 0, -57], chest: [-7, 0, 0], hpR: [10, 0, -8], knR: [22, 0, 0], hpL: [0, 0, 8] }),
    absThigh: P({ sh: [0, 0, 152], el: [0, 0, 130], chest: [13, 0, 0], spine: [5, 0, 0], hpL: [-20, 0, 4], knL: [6, 0, 0], hpR: [0, 0, -5] }),
    watch: P({ shL: [-46, -62, 4], elL: [-104, 0, 0], shR: [4, 0, -18], elR: [-16, 0, 0], head: [20, 14, 0], chest: [4, 6, 0], hpR: [0, 0, -5], hpL: [0, 0, 5] }),
    onCall: P({ shR: [-24, 0, -34], elR: [-150, 0, 0], shL: [-30, -50, 6], elL: [-80, 0, 0], head: [4, -10, -10], chest: [0, -8, 0], hips: [0, -10, 0], hpL: [-14, 0, 5], knL: [22, 0, 0], hpR: [8, 0, -5] }),
    thinking: P({ shR: [-34, 0, -4], elR: [-142, 0, 0], shL: [-12, -78, 4], elL: [-96, 0, 0], head: [9, 10, 5], chest: [3, -5, 0], hpL: [0, 0, 6], hpR: [0, 0, -4] }),
    pointing: P({ shL: [-70, 0, 34], elL: [-18, 0, 0], shR: [14, 0, -46], elR: [-10, 0, 112], head: [-4, 26, 0], chest: [-3, 14, 0], hips: [0, 8, 0], hp: [0, 0, 6] }),
    typing: P({ sh: [-22, 0, 10], el: [-78, 0, -10], head: [16, 0, 0], chest: [8, 0, 0], hp: [0, 0, 6] }),
    wave: P({ shR: [0, 0, -152], elR: [0, 0, -40], shL: [4, 0, 18], elL: [-16, 0, 0], head: [0, 0, -7], chest: [0, 0, 3], hpL: [0, 0, 5], hpR: [0, 0, -4] }),
  };
  const FLEXED = new Set(['frontDouble', 'victory', 'mostMuscular', 'arnold', 'backDouble', 'latSpread', 'sideChest', 'backLat', 'absThigh']);
  // Small moves on top of a pose, so it reads as a person holding it, not a mannequin.
  const tw = (r, x = 0, y = 0, z = 0) => [(r ? r[0] : 0) + x, (r ? r[1] : 0) + y, (r ? r[2] : 0) + z];
  function alive(name, t) {
    const p = { ...POSE[name] };
    const breath = Math.sin(t * 1.7);
    p.chest = tw(p.chest, breath * 1.4, Math.sin(t * .7) * 2, 0);
    p.spine = tw(p.spine, 0, 0, Math.sin(t * .9) * 1.6);
    p.head = tw(p.head, Math.sin(t * .8) * 1.5, Math.sin(t * .55) * 4, 0);
    p.hips = tw(p.hips, 0, 0, Math.sin(t * .9 + 1) * -1.2);
    if (FLEXED.has(name)) { // squeeze harder in pulses
      const sq = Math.sin(t * 4.2) * 2.4;
      p.elL = tw(p.elL, 0, 0, sq * (p.elL && p.elL[2] < 0 ? -1 : 1)); p.elR = tw(p.elR, 0, 0, -sq * (p.elR && p.elR[2] > 0 ? -1 : 1));
      p.chest = tw(p.chest, Math.sin(t * 4.2) * .8, 0, 0);
    }
    if (name === 'handsHips') { // the slow side-to-side turn from the hero clip
      const turn = Math.sin(t * .95) * 16;
      p.spine = tw(p.spine, 0, turn * .45, 0); p.chest = tw(p.chest, 0, turn * .55, 0); p.head = tw(p.head, 0, -turn * .5, 0); p.hips = tw(p.hips, 0, turn * .2, 0);
    }
    if (name === 'wave') p.elR = tw(p.elR, 0, 0, Math.sin(t * 7) * -24);
    if (name === 'typing') { p.elL = tw(p.elL, Math.sin(t * 13) * 3, 0, 0); p.elR = tw(p.elR, Math.sin(t * 11 + 1) * 3, 0, 0); }
    return p;
  }
  const seq = (list) => { // [[pose, label, seconds], ...] played in a loop
    const total = list.reduce((a, b) => a + b[2], 0);
    const at = t => { let x = t % total; for (const s of list) { if (x < s[2]) return s; x -= s[2]; } return list[0]; };
    return { pose: t => alive(at(t)[0], t), name: t => at(t)[1] };
  };
  const ease = (x) => x * x * (3 - 2 * x);
  const wave01 = (t, period, hold = .18) => { const p = (t % period) / period, up = p < .5 ? p * 2 : 2 - p * 2; return ease(Math.min(1, Math.max(0, (up - hold / 2) / (1 - hold)))); };

  const STATES = {
    about: { cam: [-.2, .08, 4.7], ...seq([['handsHips', 'Relaxed front', 5], ['sweep', 'Arm sweep', 1.3], ['frontDouble', 'Front double biceps', 3.4], ['victory', 'Classic pose', 3.4], ['mostMuscular', 'Most muscular', 3.4], ['arnold', 'Three-quarter twist', 3.6], ['backDouble', 'Back double biceps', 3.4]]) },
    flex: { cam: [-.85, .08, 4.6], hot: 'LR', reps: true, angle: 'R', bells: true,
      pose: t => { const p = alive('relaxed', t); p.shR = [-4, 0, -16]; p.shL = [-4, 0, 16]; p.elR = [-(6 + 136 * wave01(t, 3.2)), 0, 0]; p.elL = [-(6 + 136 * wave01(t + 1.6, 3.2)), 0, 0]; return p; } },
    timelog: { cam: [.45, .1, 4.7], ...seq([['watch', 'Checking the time', 4], ['onCall', 'On a call, walking', 3.6], ['typing', 'Back to work', 3.2]]) },
    coaching: { cam: [0, .06, 4.7], ...seq([['handsHips', 'Relaxed front', 4.6], ['sweep', 'Arm sweep', 1.3], ['frontDouble', 'Front double biceps', 4]]) },
    posing: { cam: [.12, .06, 4.9], sway: .22, ...seq([['frontDouble', 'Front double biceps', 3.2], ['latSpread', 'Front lat spread', 3.2], ['sideChest', 'Side chest', 3.2], ['backDouble', 'Back double biceps', 3.2], ['backLat', 'Back lat spread', 3.2], ['absThigh', 'Abs and thigh', 3.2], ['mostMuscular', 'Most muscular', 3.2]]) },
    ops: { cam: [.4, .1, 4.8], ...seq([['thinking', 'Reading the numbers', 4.2], ['pointing', 'Flagging a low stock', 3.4]]) },
    experience: { cam: [-.3, .1, 4.8], ...seq([['typing', 'Patching a server', 4], ['thinking', 'Finding the root cause', 3.6], ['handsHips', 'Ticket closed', 3]]) },
    contact: { cam: [.2, .08, 4.7], ...seq([['wave', 'Waving', 60]]) },
  };

  const qTmp = new THREE.Quaternion(), eTmp = new THREE.Euler();
  const POSED = ['hips', 'spine', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hpL', 'hpR', 'knL', 'knR'];
  function applyPose(p, k) {
    for (const n of POSED) {
      const r = p[n] || [0, 0, 0];
      eTmp.set(r[0] * D, r[1] * D, r[2] * D);
      qTmp.setFromEuler(eTmp);
      J[n].quaternion.slerp(qTmp, k);
    }
  }

  /* --- worlds: one small 3D set per section, drawn as wireframes and floating labels --- */
  function makeLabel(text, { size = .15, bg = null, sans = false, weight = 500 } = {}) {
    const lines = text.split('\n'), fs = 40, pad = bg ? 22 : 6, lh = fs * 1.32;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const f = `${weight} ${fs}px ${sans ? '-apple-system, "Segoe UI", Roboto, sans-serif' : 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'}`;
    x.font = f;
    const wpx = Math.ceil(Math.max(...lines.map(l => x.measureText(l).width))) + pad * 2, hpx = Math.ceil(lines.length * lh) + pad * 2;
    c.width = wpx; c.height = hpx; x.font = f; x.textBaseline = 'top';
    if (bg) { x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, wpx, hpx, 20); x.fill(); }
    x.fillStyle = '#fff'; lines.forEach((l, i) => x.fillText(l, pad, pad + i * lh + 5));
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const h = size * hpx / fs; s.scale.set(h * wpx / hpx, h, 1);
    return s;
  }
  const worlds = {};
  function mkWorld(id, accent, build) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const reg = [], ticks = [];
    const R = (m, base, tone) => { m.transparent = true; m.depthWrite = false; const e = { m, base, mul: 1, tone }; reg.push(e); return e; };
    const M = {
      wire: R(new THREE.LineBasicMaterial(), .4, 'ink').m,
      dim: R(new THREE.LineBasicMaterial(), .15, 'ink').m,
      fill: R(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), .045, 'ink').m,
      acc: R(new THREE.LineBasicMaterial({ color: accent }), .9, 'raw').m,
      accFill: R(new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide }), .6, 'raw').m,
      glow: R(new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), .07, 'raw').m,
    };
    const w = {
      g, M, accent,
      group(x = 0, y = 0, z = 0, parent = g) { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; },
      mesh(geo, mat = 'fill', x = 0, y = 0, z = 0, parent = g) { const o = new THREE.Mesh(geo, M[mat] || mat); o.position.set(x, y, z); parent.add(o); return o; },
      edges(geo, mat = 'wire', x = 0, y = 0, z = 0, parent = g) { const o = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 24), M[mat] || mat); o.position.set(x, y, z); parent.add(o); return o; },
      box(bw, bh, bd, x, y, z, { mat = 'wire', solid = true, parent = g } = {}) { const geo = new THREE.BoxGeometry(bw, bh, bd), o = w.group(x, y, z, parent); if (solid) o.add(new THREE.Mesh(geo, M.fill)); o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), M[mat])); return o; },
      cyl(r, h, x, y, z, { mat = 'wire', axis = 'y', parent = g, seg = 20 } = {}) { const o = w.edges(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y, z, parent); if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; return o; },
      line(pts, mat = 'wire', parent = g) { const o = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => p.isVector3 ? p : new THREE.Vector3(...p))), M[mat] || mat); parent.add(o); return o; },
      label(text, x, y, z, { tone = 'ink', o = .78, parent = g, ...opts } = {}) { const s = makeLabel(text, opts); s.position.set(x, y, z); if (tone === 'acc') s.material.color.set(accent); s.userData.e = R(s.material, o, tone === 'ink' ? 'ink' : 'raw'); parent.add(s); return s; },
      own(mat, base, tone = 'raw') { return R(mat, base, tone); },
      tick(fn) { ticks.push(fn); },
    };
    build(w);
    worlds[id] = { g, reg, ticks, k: 0 };
  }
  const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  // A server rack with blinking lights.
  function rack(w, x, z, h = 1.9, rows = 7) {
    w.box(.62, h, .62, x, h / 2, z);
    for (let i = 0; i < rows; i++) {
      const y = .22 + i * (h - .4) / (rows - 1);
      w.line([[x - .25, y, z + .315], [x + .25, y, z + .315]], 'dim');
      const led = w.mesh(new THREE.PlaneGeometry(.1 + rnd(i, x) * .18, .028), 'accFill', x - .14 + rnd(i, z) * .1, y + .045, z + .316);
      const sp = 1.5 + rnd(i, x + z) * 5, ph = rnd(i, x * 2) * 6;
      w.tick(t => { led.visible = Math.sin(t * sp + ph) > -.35; });
    }
  }
  // Labels that drift upward and loop.
  function drift(w, items, range = 2.4) {
    items.forEach(([text, x, y, z, opts], i) => {
      const s = w.label(text, x, y, z, { o: .7, ...opts });
      const sp = .05 + rnd(i, 3) * .04, ph = rnd(i, 9);
      w.tick(t => { const u = (t * sp + ph) % 1; s.position.y = y + (u - .5) * range; s.position.x = x + Math.sin(t * .4 + i) * .08; s.userData.e.mul = Math.sin(u * Math.PI) ** .6; });
    });
  }

  // 1. About: cloud, security and AI.
  mkWorld('about', 0x3b9cff, w => {
    for (const [x, z] of [[-2.6, -2.0], [-1.5, -2.7], [1.55, -2.8], [2.5, -2.2], [-3.5, -1.2]]) rack(w, x, z);
    // clouds, wired down to the racks, with packets riding the links
    const ico = new THREE.IcosahedronGeometry(1, 1);
    const cloud = (x, y, z, s) => { const c = w.group(x, y, z); for (const [dx, dy, r] of [[0, 0, .5], [-.55, -.08, .36], [.55, -.06, .4], [.22, .22, .34], [-.25, .18, .3]]) { const o = w.edges(ico, 'wire', dx, dy, 0, c); o.scale.setScalar(r); } c.scale.setScalar(s); w.tick(t => { c.position.y = y + Math.sin(t * .5 + x) * .08; }); return c; };
    cloud(-1.9, 3.0, -2.4, 1); cloud(2.3, 3.25, -2.6, .9); cloud(.2, 3.5, -3.6, 1.2);
    const links = [[[-1.9, 2.7, -2.4], [-2.6, 1.9, -2.0]], [[-1.9, 2.7, -2.4], [-1.5, 1.9, -2.7]], [[2.3, 2.95, -2.6], [1.55, 1.9, -2.8]], [[2.3, 2.95, -2.6], [2.5, 1.9, -2.2]], [[.2, 3.1, -3.6], [-1.9, 3.0, -2.4]], [[.2, 3.1, -3.6], [2.3, 3.25, -2.6]]];
    links.forEach(([a, b], i) => {
      w.line([a, b], 'dim');
      const dot = w.mesh(sphere, 'accFill'); dot.scale.setScalar(.035);
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
      w.tick(t => { const u = (t * (.35 + rnd(i) * .3) + rnd(i, 2)) % 1; dot.position.lerpVectors(i % 2 ? A : B, i % 2 ? B : A, u); });
    });
    // firewall: a slow dome around the figure, with threats kept outside it
    const dome = w.edges(new THREE.IcosahedronGeometry(2.05, 1), 'dim', 0, 1.0, 0);
    w.tick(t => { dome.rotation.y = t * .06; });
    const red = w.own(new THREE.LineBasicMaterial({ color: 0xff453a }), .95).m;
    const oct = new THREE.OctahedronGeometry(.11);
    for (let i = 0; i < 6; i++) {
      const o = w.edges(oct, red), tag = i % 3 === 0 ? w.label(i ? '403 blocked' : 'threat blocked', 0, 0, 0, { size: .085, o: .7 }) : null;
      w.tick(t => { const a = -Math.PI / 2 + Math.sin(t * (.1 + rnd(i) * .08) + i * 1.9) * 1.45, r = 2.45 + Math.sin(t * 1.3 + i) * .14; o.position.set(Math.cos(a) * r, .7 + rnd(i, 4) * 1.6 + Math.sin(t + i) * .1, Math.sin(a) * r - .2); o.rotation.set(t, t * 1.3, 0); if (tag) tag.position.copy(o.position).y += .2; });
    }
    // a small neural net
    const net = w.group(-1.1, 2.3, -1.5), layers = [3, 4, 4, 2], nodes = [];
    layers.forEach((n, li) => { nodes.push([]); for (let i = 0; i < n; i++) { const d = w.mesh(sphere, 'accFill', li * .3, (i - (n - 1) / 2) * .2, 0, net); d.scale.setScalar(.03); nodes[li].push(d); } });
    for (let li = 0; li < layers.length - 1; li++) for (const a of nodes[li]) for (const b of nodes[li + 1]) w.line([a.position, b.position], 'dim', net);
    w.tick(t => { nodes.flat().forEach((d, i) => d.scale.setScalar(.026 + .016 * Math.max(0, Math.sin(t * 2.4 - d.position.x * 7 + i)))); net.position.y = 2.25 + Math.sin(t * .6) * .06; });
    w.label('agent', -.65, 2.78, -1.5, { size: .09, tone: 'acc' });
    drift(w, [
      ['az vm list -d --query "[?powerState==\'VM running\']"', -2.3, 1.5, -1.2, { size: .085 }],
      ['$ sudo dnf update --security\n  15 / 15 findings fixed', 2.2, 1.3, -1.1, { size: .085 }],
      ['if (angle < 50 && wasDown) reps++', 1.6, 2.4, -1.9, { size: .085, tone: 'acc' }],
      ['agent.run({ tools: [get_stock, list_low_cover] })', -.9, 3.0, -2.6, { size: .085 }],
      ['SELECT sku, days_of_cover\nFROM stock WHERE days_of_cover < 14', 1.2, 3.1, -3.0, { size: .08 }],
      ['firestore.rules: allow read, write: if request.auth.uid == uid', -2.6, 2.6, -2.9, { size: .075 }],
    ]);
  });

  // 2. Flex and Count: the gym.
  mkWorld('flex', 0xFF2A2F, w => {
    // power rack with a loaded bar
    for (const x of [-.75, .75]) for (const z of [-1.7, -2.5]) w.box(.08, 2.3, .08, x, 1.15, z);
    for (const z of [-1.7, -2.5]) w.box(1.58, .08, .08, 0, 2.3, z);
    for (const x of [-.75, .75]) { w.box(.08, .08, .88, x, 2.3, -2.1); w.box(.16, .05, .12, x, 1.42, -1.62, { mat: 'acc' }); }
    w.cyl(.018, 2.3, 0, 1.47, -1.62, { axis: 'x' });
    for (const x of [-1.0, -.93, .93, 1.0]) w.cyl(.3, .05, x, 1.47, -1.62, { axis: 'x', mat: 'acc', seg: 28 });
    for (const x of [-1.07, 1.07]) w.cyl(.2, .04, x, 1.47, -1.62, { axis: 'x', seg: 24 });
    // dumbbell rack
    const dr = w.group(-2.7, 0, -1.6); dr.rotation.y = .5;
    for (const y of [.45, .85]) { w.box(1.7, .05, .34, 0, y, 0, { parent: dr }); for (let i = 0; i < 5; i++) { const x = -.68 + i * .34, s = .7 + i * .09; w.cyl(.012, .22, x, y + .1, 0, { axis: 'z', parent: dr, mat: 'dim' }); for (const z of [-.09, .09]) w.cyl(.06 * s, .06, x, y + .1, z, { axis: 'z', parent: dr, seg: 14 }); } }
    for (const x of [-.82, .82]) w.box(.05, 1.0, .34, x, .5, 0, { parent: dr });
    // bench
    const bn = w.group(2.5, 0, -1.3); bn.rotation.y = -.6;
    w.box(1.25, .1, .34, 0, .46, 0, { parent: bn }); for (const x of [-.5, .5]) w.box(.06, .42, .3, x, .21, 0, { parent: bn });
    // plate tree and a kettlebell
    w.cyl(.02, 1.2, 3.3, .6, -2.4); for (const y of [.35, .6, .85]) w.cyl(.24 - y * .08, .05, 3.3, y, -2.4, { axis: 'x', mat: y < .5 ? 'acc' : 'wire', seg: 24 });
    // mirror wall and rubber floor
    w.box(6.4, 2.5, .02, 0, 1.35, -3.3); for (const x of [-1.6, 0, 1.6]) w.line([[x, .1, -3.29], [x, 2.6, -3.29]], 'dim');
    for (let i = -4; i <= 4; i++) { w.line([[i, .002, -3.3], [i, .002, 2]], 'dim'); if (i > -4) w.line([[-4, .002, i * .66], [4, .002, i * .66]], 'dim'); }
    drift(w, [['strict rep', -1.7, 2.0, -1.0, { size: .09, tone: 'acc' }], ['elbow 47° → rep', 1.9, 2.2, -1.2, { size: .09 }], ['set 3 · 12 per side', -2.4, 2.7, -2.2, { size: .09 }], ['on-device · nothing uploaded', 2.0, 3.0, -2.6, { size: .085 }]], 1.6);
  });

  // 3. Time Log: a busy day.
  mkWorld('timelog', 0x0A84FF, w => {
    const clock = w.group(0, 1.75, -2.7);
    w.line(ringPts(1.45, 96).map(p => new THREE.Vector3(p.x, p.z, 0)), 'wire', clock);
    w.line(ringPts(1.52, 96).map(p => new THREE.Vector3(p.x, p.z, 0)), 'dim', clock);
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.2832, r1 = i % 5 ? 1.38 : 1.28; w.line([[Math.sin(a) * r1, Math.cos(a) * r1, 0], [Math.sin(a) * 1.45, Math.cos(a) * 1.45, 0]], i % 5 ? 'dim' : 'wire', clock); }
    const hr = w.line([[0, 0, 0], [0, .7, 0]], 'wire', clock), mn = w.line([[0, 0, 0], [0, 1.15, 0]], 'acc', clock), sc = w.line([[0, -.15, 0], [0, 1.25, 0]], 'dim', clock);
    w.tick(t => { mn.rotation.z = -t * .5; hr.rotation.z = -t * .5 / 12 - 1; sc.rotation.z = -Math.floor(t * 2) / 60 * 6.2832 * 4; });
    // the day as tiles, circling
    const tiles = [['Work', '#3A7BD5'], ['School', '#7B4FD6'], ['Gym', '#C99A1E'], ['Biyahe', '#7F8A93'], ['Kain', '#6FA832'], ['Scroll', '#D94C4C'], ['Tulog', '#4F5BA6'], ['Coaching', '#D9772B'], ['Content', '#C2478E']];
    tiles.forEach(([name, bg], i) => {
      const s = w.label(name, 0, 0, 0, { bg, sans: true, weight: 700, size: .1, tone: 'raw', o: .95 });
      w.tick(t => { const a = t * .22 + i / tiles.length * 6.2832, r = 2.35 + (i % 3) * .28; s.position.set(Math.cos(a) * r, .55 + (i * .37) % 2.3 + Math.sin(t * .9 + i) * .08, Math.sin(a) * r * .8 - .4); s.userData.e.mul = Math.min(1, Math.max(0, (.3 - s.position.z) / .9)); });
    });
    // a timeline of the day on the floor
    let x0 = -3; [[.9, 0], [.5, 2], [1.3, 1], [.4, 4], [1.1, 0], [.7, 5], [.6, 3]].forEach(([len, c]) => { const m = w.own(new THREE.MeshBasicMaterial({ color: tiles[c][1], side: THREE.DoubleSide }), .75).m; const o = w.mesh(new THREE.PlaneGeometry(len - .05, .16), m, x0 + len / 2, .01, 1.15); o.rotation.x = -Math.PI / 2; x0 += len; });
    drift(w, [['09:00', -2.6, 1.6, -1.6, { size: .11 }], ['gap: 45 min unlogged', 2.2, 1.4, -1.3, { size: .085, tone: 'acc' }], ['13:30', 2.7, 2.6, -2.2, { size: .11 }], ['Kasabay ng: Scroll', -2.2, 2.7, -2.0, { size: .085 }], ['22:30  sleep goal', .9, 3.4, -3.0, { size: .085 }]], 1.8);
  });

  // 4. Coaching page: a photo studio, with the food that still fits the macros.
  mkWorld('coaching', 0xD93D1A, w => {
    // backdrop and softboxes
    w.line([[-2.4, 0, -1.2], [-2.4, 0, -2.6], [-2.4, 3.1, -2.6], [2.4, 3.1, -2.6], [2.4, 0, -2.6], [2.4, 0, -1.2]], 'wire');
    w.line([[-2.4, 3.1, -2.6], [-2.4, 3.1, -2.2]], 'dim'); w.line([[2.4, 3.1, -2.6], [2.4, 3.1, -2.2]], 'dim');
    for (const s of [-1, 1]) { const st = w.group(s * 2.9, 0, -.6); st.rotation.y = -s * .7; w.cyl(.015, 2.0, 0, 1.0, 0, { parent: st, mat: 'dim' }); w.box(.7, .9, .08, 0, 2.2, 0, { parent: st }); w.mesh(new THREE.PlaneGeometry(.62, .82), 'glow', 0, 2.2, .045, st); for (const a of [0, 2.1, 4.2]) w.line([[0, .5, 0], [Math.cos(a) * .35, 0, Math.sin(a) * .35]], 'dim', st); }
    const pool = w.mesh(new THREE.CircleGeometry(1.5, 48), 'glow', 0, .004, 0); pool.rotation.x = -Math.PI / 2;
    const cone = w.mesh(new THREE.ConeGeometry(1.5, 3.6, 40, 1, true), 'glow', 0, 1.8, 0);
    // macro rings
    const macros = w.group(-1.75, 2.1, -1.3);
    [['P 180 g', .78, .3], ['C 320 g', .62, .42], ['F 70 g', .9, .54]].forEach(([txt, frac, r], i) => {
      w.line(ringPts(r, 64).map(p => new THREE.Vector3(p.x, p.z, 0)), 'dim', macros);
      const arc = []; for (let k = 0; k <= 48; k++) { const a = Math.PI / 2 - k / 48 * 6.2832 * frac; arc.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
      const l = w.line(arc, 'acc', macros); w.tick(t => { l.rotation.z = Math.sin(t * .5 + i) * .12; });
      w.label(txt, .95, .42 - i * .2, 0, { size: .085, parent: macros });
    });
    w.label('fits your macros', 0, -.82, 0, { size: .09, tone: 'acc', parent: macros });
    w.tick(t => { macros.position.y = 2.1 + Math.sin(t * .7) * .06; });
    // a burger and an ice cream, because flexible dieting
    const burger = w.group(1.7, 1.9, -1.2);
    w.edges(new THREE.SphereGeometry(.3, 14, 6, 0, 6.2832, 0, Math.PI / 2), 'wire', 0, .09, 0, burger);
    w.cyl(.31, .07, 0, .03, 0, { parent: burger, mat: 'acc', seg: 18 }); w.cyl(.33, .02, 0, -.03, 0, { parent: burger, mat: 'dim', seg: 18 }); w.cyl(.3, .1, 0, -.11, 0, { parent: burger, seg: 18 });
    const cream = w.group(2.4, 2.75, -1.9);
    const cn = w.edges(new THREE.ConeGeometry(.16, .45, 12), 'wire', 0, -.2, 0, cream); cn.rotation.x = Math.PI;
    w.edges(new THREE.IcosahedronGeometry(.17, 1), 'acc', 0, .12, 0, cream); w.edges(new THREE.IcosahedronGeometry(.13, 1), 'wire', 0, .34, 0, cream);
    w.tick(t => { burger.rotation.y = t * .5; burger.position.y = 1.9 + Math.sin(t * .8) * .07; cream.rotation.y = -t * .4; cream.rotation.z = .25; cream.position.y = 2.75 + Math.sin(t * .7 + 2) * .07; });
    drift(w, [['7 questions → 1 DM', 1.5, 3.1, -2.2, { size: .09 }], ['FIL / EN', -2.3, 3.0, -2.2, { size: .09 }], ['no fake scarcity', .2, 3.5, -2.5, { size: .085 }]], 1.2);
  });

  // 5. Posing coach: a stage, lights, and posing-room mirrors.
  mkWorld('posing', 0xffc24a, w => {
    w.box(5.2, .3, 3.0, 0, -.152, -.3); w.line([[-2.6, .001, 1.2], [2.6, .001, 1.2]], 'acc');
    // truss with moving lights
    for (const y of [3.25, 3.45]) w.line([[-2.7, y, -1.5], [2.7, y, -1.5]], 'wire');
    for (let i = 0; i <= 18; i++) { const x = -2.7 + i * .3; w.line([[x, 3.25, -1.5], [x + (i % 2 ? .3 : -.3), 3.45, -1.5]], 'dim'); }
    for (const x of [-2.7, 2.7]) w.line([[x, -.3, -1.5], [x, 3.45, -1.5]], 'wire');
    [-1.8, -.6, .6, 1.8].forEach((x, i) => {
      const piv = w.group(x, 3.25, -1.5); w.box(.18, .22, .18, 0, -.08, 0, { parent: piv, mat: 'acc' });
      w.mesh(new THREE.ConeGeometry(.75, 3.5, 32, 1, true), 'glow', 0, -1.85, 0, piv);
      w.tick(t => { piv.rotation.z = -x * .16 + Math.sin(t * .7 + i * 1.6) * .16; piv.rotation.x = .38 + Math.sin(t * .5 + i) * .08; });
    });
    // mirrors
    for (const s of [-1, 1]) { const mr = w.group(s * 3.0, 0, -.9); mr.rotation.y = -s * .75; w.box(1.5, 2.5, .03, 0, 1.3, 0, { parent: mr }); w.line([[-.5, .4, .02], [.1, 2.2, .02]], 'dim', mr); w.line([[-.2, .4, .02], [.4, 2.2, .02]], 'dim', mr); }
    // backdrop and the call-out
    w.box(4.4, 2.2, .02, 0, 1.6, -2.4, { solid: false, mat: 'dim' });
    const call = w.label('1  FRONT DOUBLE BICEPS', 0, 2.95, -2.35, { size: .12, tone: 'acc', sans: true, weight: 700 });
    w.label('hold 0:30 · match the ghost', 0, 2.68, -2.35, { size: .08 });
    w.tick(t => { call.userData.e.mul = .65 + .35 * Math.abs(Math.sin(t * 1.05)); });
    drift(w, [['shoulders down', -1.9, 1.9, -1.0, { size: .085 }], ['elbow 92° ✓', 1.9, 2.1, -1.1, { size: .085, tone: 'acc' }], ['twist the torso', 2.2, 1.2, -.9, { size: .085 }]], 1.2);
  });

  // 6. Supplement ops agent: a small warehouse.
  mkWorld('ops', 0x34c759, w => {
    for (const [x, z, ry] of [[-2.5, -2.0, .35], [2.4, -2.3, -.3]]) {
      const sh = w.group(x, 0, z); sh.rotation.y = ry;
      for (const px of [-.9, .9]) for (const pz of [-.25, .25]) w.line([[px, 0, pz], [px, 2.4, pz]], 'wire', sh);
      for (let lv = 0; lv < 3; lv++) { const y = .25 + lv * .8; w.box(1.8, .04, .5, 0, y, 0, { parent: sh });
        for (let b = 0; b < 4; b++) { if (rnd(b + lv * 4, x) < .22) continue; const bw = .3 + rnd(b, lv + x) * .12, bh = .26 + rnd(b, lv + z) * .28; w.box(bw, bh, .36, -.66 + b * .44, y + .02 + bh / 2, 0, { parent: sh, mat: lv === 0 && b === 1 ? 'acc' : 'wire' }); } }
    }
    // conveyor with boxes moving along it
    w.box(7, .08, .5, 0, .5, -1.25, { solid: false }); for (let i = -7; i <= 7; i++) w.cyl(.04, .5, i * .5, .5, -1.25, { axis: 'z', mat: 'dim', seg: 8 });
    for (let i = 0; i < 5; i++) { const b = w.box(.34, .28, .34, 0, .7, -1.25, { mat: i === 2 ? 'acc' : 'wire' }); w.tick(t => { b.position.x = ((t * .45 + i * 1.5) % 7.4) - 3.7; }); }
    // days-of-cover bars
    const ch = w.group(.9, 2.0, -2.5); w.line([[-.1, 0, 0], [1.9, 0, 0]], 'wire', ch); w.line([[-.1, 0, 0], [-.1, 1.1, 0]], 'wire', ch);
    [.9, .7, .35, .8, .18, .6].forEach((h, i) => { const low = h < .4; const m = low ? w.own(new THREE.MeshBasicMaterial({ color: 0xff453a, side: THREE.DoubleSide }), .8).m : 'accFill'; const b = w.mesh(new THREE.PlaneGeometry(.22, 1), m, .12 + i * .3, 0, 0, ch); w.tick(t => { const g = Math.min(1, Math.max(.02, (t * .9 - i * .15) % 6)); b.scale.y = h * g; b.position.y = h * g / 2; }); });
    w.label('days of cover', .85, 1.3, 0, { size: .08, parent: ch });
    drift(w, [['orders_2026-11.csv', -1.9, 2.9, -1.6, { size: .09 }], ['row 214: unknown SKU → rejected', -2.2, 1.7, -.9, { size: .08 }], ['reorder WHEY-2KG × 40 · approve?', 2.1, 1.4, -.9, { size: .08, tone: 'acc' }], ['demo data', 0, 3.4, -2.8, { size: .09 }], ['weekly report → sent', -.6, 3.0, -2.6, { size: .08 }]], 1.5);
  });

  // 7. Experience: a server room.
  mkWorld('experience', 0x5ac8fa, w => {
    for (let i = 0; i < 4; i++) { rack(w, -2.1 - i * .25, -1.1 - i * 1.1, 2.1, 6); rack(w, 2.1 + i * .25, -1.3 - i * 1.1, 2.1, 6); }
    for (let i = 0; i < 7; i++) w.line([[-1.4 - i * .12, .002, -.6 - i * .7], [1.4 + i * .12, .002, -.6 - i * .7]], 'dim');
    for (const y of [2.6, 2.75]) { w.line([[-2.2, y, -1], [-3.0, y, -4.6]], 'dim'); w.line([[2.2, y, -1.2], [3.0, y, -4.8]], 'dim'); }
    // a padlock
    const lock = w.group(0, 3.0, -2.8); w.box(.5, .42, .16, 0, 0, 0, { parent: lock, mat: 'acc' });
    const arc = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI; arc.push(new THREE.Vector3(Math.cos(a) * .17, .21 + Math.sin(a) * .22, 0)); } w.line(arc, 'acc', lock);
    w.tick(t => { lock.rotation.y = Math.sin(t * .6) * .5; lock.position.y = 3.0 + Math.sin(t * .8) * .06; });
    drift(w, [['$ sudo dnf update --security\n  15 / 15 findings fixed', -1.7, 1.6, -.8, { size: .08 }], ['ticket · closed complete', 1.8, 1.9, -.9, { size: .085, tone: 'acc' }], ['Get-HotFix | sort InstalledOn', 1.5, 2.9, -2.0, { size: .08 }], ['BEGIN TRAN  -- dry run\nROLLBACK    -- 0 conflicts', -1.6, 2.9, -2.2, { size: .08 }], ['/var 100% → 55%', .2, 3.6, -3.2, { size: .085 }], ['172 test cases', -.4, 2.2, -3.4, { size: .085 }]], 1.5);
  });

  // 8. Contact: a signal going out.
  mkWorld('contact', 0xFF453A, w => {
    for (let i = 0; i < 4; i++) { const r = w.line(ringPts(1, 80), i % 2 ? 'dim' : 'acc'); r.position.y = .004; w.tick(t => { const u = (t * .22 + i / 4) % 1; r.scale.setScalar(.6 + u * 3.4); r.visible = u < .96; }); }
    [['github.com/naarrzz', '#111111'], ['LinkedIn', '#0A66C2'], ['Email', '#D93D1A'], ['Open to work', '#248A3D'], ['UTC+8', '#59636E']].forEach(([txt, bg], i) => {
      const s = w.label(txt, 0, 0, 0, { bg, sans: true, weight: 700, size: .09, tone: 'raw', o: .95 });
      w.tick(t => { const a = t * .2 + i * 1.257; s.position.set(Math.cos(a) * 2.4, 1.0 + i * .42 + Math.sin(t + i) * .08, Math.sin(a) * 1.9 - .5); s.userData.e.mul = Math.min(1, Math.max(0, (.3 - s.position.z) / .9)); });
    });
  });

  /* --- camera and interaction --- */
  const cam = { yaw: -.5, pitch: .1, dist: 9, tYaw: -.2, tPitch: .08, tDist: 4.7, drag: 0, dragPitch: 0 };
  let dragging = false, lx = 0, ly = 0, dragged = false;
  canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.2) return; // let the page scroll
    cam.drag -= dx * .008; cam.dragPitch = Math.max(-.2, Math.min(.5, cam.dragPitch + dy * .004));
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
  function place(el, world, dx = 0, dy = 0, center = false) {
    v3.copy(world).project(camera);
    const x = rectLeft + (v3.x * .5 + .5) * W + dx, y = rectTop + (-v3.y * .5 + .5) * H + dy;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` + (center ? ' translateX(-50%)' : '');
  }
  const elbowAngle = k => {
    J['sh' + k].getWorldPosition(a3); J['el' + k].getWorldPosition(b3); J['wr' + k].getWorldPosition(c3);
    return a3.sub(b3).angleTo(c3.sub(b3)) / D;
  };

  /* --- state --- */
  const dbgPose = new URLSearchParams(location.search).get('pose'); // ?pose=mostMuscular holds one pose, for tuning
  let st = STATES.about, stId = 'about', tState = 0, tAll = 0, reps = 0, repDown = { L: true, R: true }, phoneOn = 0, intro = 0, lastName = '', bellK = 0;
  function enter(id) {
    stId = STATES[id] ? id : 'about'; st = STATES[stId]; tState = 0; reps = 0; repDown = { L: true, R: true };
    hud.reps.querySelector('b').textContent = '0';
    cam.tYaw = st.cam[0]; cam.tPitch = st.cam[1]; cam.tDist = st.cam[2]; cam.drag = 0; cam.dragPitch = 0;
    showVideo(id);
    trailInit = false;
  }

  function theme() {
    const dark = isDark(), ink = dark ? 0xffffff : 0x16161c;
    mBone.color.set(ink); mJoint.color.set(ink); mIron.color.set(dark ? 0x8d8d96 : 0x2a2a30);
    mBody.uniforms.c.value.set(dark ? 0xdfe6ff : 0x3a3f52); mBody.uniforms.b.value = dark ? .03 : .06;
    mHotJoint.color.set(ink);
    mFloor.color.set(ink); mFloor.opacity = dark ? .2 : .16;
    trail.material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (const id in worlds) for (const e of worlds[id].reg) if (e.tone === 'ink') e.m.color.set(ink);
  }
  theme();

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); rectTop = r.top; rectLeft = r.left;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Center the figure in the gap between the intro and the panel on wide screens.
    let viewShift = 0;
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
    tAll += dt;
    const t = reduceMotion ? 1.3 : (tState += dt);
    intro = Math.min(1, intro + dt * .9);
    const phoneMode = isPhone();

    // pose
    const p = dbgPose && POSE[dbgPose] ? alive(dbgPose, t) : st.pose(t);
    applyPose(p, 1 - Math.exp(-dt * (reduceMotion ? 60 : 5.5)));
    J.hips.position.y += (1.0 + (p.y || 0) - J.hips.position.y) * (1 - Math.exp(-dt * 5.5));
    fig.scale.setScalar(.6 + .4 * (1 - Math.pow(1 - intro, 3)));
    bellK += ((st.bells ? 1 : 0) - bellK) * (1 - Math.exp(-dt * 6));
    for (const b of bells) { b.scale.setScalar(Math.max(.001, bellK)); b.visible = bellK > .02; }

    // counted arm(s) in red
    for (const k of ['L', 'R']) {
      const hot = (st.hot || '').includes(k);
      for (const m of arms[k].bones) m.material = hot ? mHot : mBone;
      for (const m of arms[k].bodies) m.material = hot ? mHotBody : mBody;
      for (const m of arms[k].joints) { m.material = hot ? mHotJoint : mJoint; m.scale.setScalar(hot ? .032 : .022); }
    }

    // camera
    const kc = 1 - Math.exp(-dt * 3.2);
    const sway = st.sway && !reduceMotion ? Math.sin(t * .5) * st.sway : 0;
    cam.yaw += (cam.tYaw + cam.drag + sway + px * .12 - cam.yaw) * kc;
    cam.pitch += (cam.tPitch + cam.dragPitch + py * .05 - cam.pitch) * kc;
    const hasPhone = !!(byId[stId].video) && !(videos[stId] && videos[stId].failed);
    phoneOn += ((hasPhone ? 1 : 0) - phoneOn) * (1 - Math.exp(-dt * 5));
    const dist = cam.tDist * (phoneMode ? .84 : 1) * (camera.aspect < .9 ? 1.1 : 1) * (1 + phoneOn * (phoneMode ? .1 : .16));
    cam.dist += (dist - cam.dist) * kc;
    right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    const sideGap = phoneMode ? .62 : .8;
    look.set(0, phoneMode ? 1.1 : .98, 0).addScaledVector(right, phoneOn * sideGap * .6);
    camera.position.set(look.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, look.y + Math.sin(cam.pitch) * cam.dist, look.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
    camera.lookAt(look);
    floor.rotation.y += dt * .05;

    // worlds fade in and out; each one faces the section's own camera angle
    for (const id in worlds) {
      const w = worlds[id];
      w.k += ((id === stId ? 1 : 0) - w.k) * (1 - Math.exp(-dt * (id === stId ? 2.6 : 6)));
      w.g.visible = w.k > .015;
      if (!w.g.visible) continue;
      w.g.rotation.y = STATES[id].cam[0];
      // pushed back a little so the set sits behind the figure, not around the camera
      const yw = STATES[id].cam[0]; w.g.scale.setScalar(.82); w.g.position.set(-Math.sin(yw) * 1.1, (1 - w.k) * -.5, -Math.cos(yw) * 1.1);
      if (!reduceMotion) for (const fn of w.ticks) fn(tAll, dt);
      for (const e of w.reg) e.m.opacity = e.base * e.mul * w.k;
    }

    // phone floats on the figure's side, facing the camera
    phone.position.set(0, 1.12 + Math.sin(tAll * 1.1) * .02, 0).addScaledVector(right, sideGap + .1).addScaledVector(v3.set(Math.sin(cam.yaw), 0, Math.cos(cam.yaw)), .45);
    phone.rotation.set(-.04 + py * .15, cam.yaw - .28 + Math.sin(tAll * .6) * .1 + px * .3, .03);
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
          hud.reps.querySelector('b').textContent = reps;
          hud.reps.classList.remove('tick'); void hud.reps.offsetWidth; hud.reps.classList.add('tick');
        }
      }
    }
    hud.reps.classList.toggle('show', !!st.reps && intro > .6);
    hud.angle.classList.toggle('show', !!st.angle && intro > .6);
    const name = st.name ? st.name(t) : '';
    hud.pose.classList.toggle('show', !st.reps && !!name && intro > .6);
    if (name !== lastName) { hud.pose.querySelector('span').textContent = name; lastName = name; }

    if (st.angle) {
      const a = elbowAngle(st.angle);
      hud.angle.querySelector('b').textContent = Math.round(a) + '°';
      J['el' + st.angle].getWorldPosition(b3); place(hud.angle, b3, -84, -14);
    }
    b3.set(0, 1.98, 0);
    if (st.reps) place(hud.reps, b3, phoneMode ? (phoneOn > .5 ? -128 : 44) : 30, phoneMode ? (phoneOn > .5 ? -30 : 6) : -20);
    else place(hud.pose, b3, 0, phoneMode ? -4 : -30, true);
    place(hud.hint, v3.set(0, -.02, 0), 0, 10, true);

    // wrist trail
    const tk = (st.hot || '').includes('R') ? 'R' : (st.hot ? 'L' : null);
    trail.visible = !!tk && !reduceMotion;
    if (tk) {
      J['wr' + tk].getWorldPosition(c3);
      if (!trailInit) { for (let i = 0; i < TRAIL; i++) trailPos.set([c3.x, c3.y, c3.z], i * 3); trailInit = true; }
      trailPos.copyWithin(3, 0, (TRAIL - 1) * 3); trailPos.set([c3.x, c3.y, c3.z], 0);
      const dark = isDark();
      for (let i = 0; i < TRAIL; i++) { const f = Math.pow(1 - i / TRAIL, 2); if (dark) trailCol.set([f, .16 * f, .18 * f], i * 3); else trailCol.set([1, 1 - .84 * f, 1 - .82 * f], i * 3); }
      trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  frame();

  return { enter, theme, resize };
}
