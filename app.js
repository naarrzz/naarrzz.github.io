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
  scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 2.1));
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
    { const lat = muscle('chest', .088, .3, .09, s * .14, -.125, -.035); lat.rotation.z = -s * .3; } // lat, from the armpit down to the hip
    muscle('hp' + k, .1, .2, .112, s * .022, -.19, .028);           // quad sweep
    muscle('hp' + k, .085, .15, .09, 0, -.2, -.05);                 // hamstring
    muscle('kn' + k, .062, .12, .07, 0, -.14, -.03);                // calf
    muscle('hips', .1, .1, .11, s * .085, -.03, -.05);              // glute
  }
  // torso: a V from the shoulders down to a narrow waist
  const vTorso = new THREE.Mesh(new THREE.CylinderGeometry(.205, .095, .5, 28), mBody); vTorso.scale.z = .62; vTorso.position.set(0, -.1, 0); J.chest.add(vTorso);
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(.1, .125, .13, 24), mBody); waist.scale.z = .76; waist.position.set(0, .035, 0); J.hips.add(waist);
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

  floor.position.y = .006;
  // soft shadow under the figure
  const shC = document.createElement('canvas'); shC.width = shC.height = 128;
  { const x = shC.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shC), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .004; scene.add(shadow);
  scene.fog = new THREE.Fog(0x0b0b0d, 5.5, 15);

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
    relaxed: P({ hips: [0, 0, 3], spine: [0, 0, -3], sh: [4, 0, 18], el: [-16, 0, 0], chest: [-4, 0, 0], hp: [0, 0, 5] }),
    handsHips: P({ x: -.03, hips: [0, -6, 5], spine: [-3, 4, -6], chest: [-7, 0, 0], sh: [14, 0, 46], el: [-10, 0, -112], hpL: [-4, 0, 20], knL: [8, 0, 0], hpR: [0, 0, 3], head: [-3, 0, 2] }),
    frontDouble: P({ x: .02, hips: [0, 5, -4], spine: [-4, -3, 5], chest: [-10, 0, 0], sh: [4, 0, 97], el: [0, 0, 116], wr: [0, 0, 24], hpL: [0, 0, 9], hpR: [-12, 0, -7], knR: [14, 0, 0], head: [-4, 0, 0] }),
    victory: P({ x: .03, hips: [0, 10, -6], spine: [0, -4, 8], chest: [-7, -8, 3], shR: [0, 0, -140], elR: [0, 0, -46], shL: [0, 0, 108], elL: [0, 0, 122], hpR: [0, 0, -24], knR: [5, 0, 0], hpL: [-10, 0, 8], knL: [22, 0, 0], head: [-12, -22, 0] }),
    mostMuscular: P({ y: -.05, hips: [6, 8, 0], spine: [20, 0, 0], chest: [22, -6, 0], neck: [-16, 0, 0], head: [-22, 0, 0], sh: [0, -40, 52], el: [-106, 0, -41], hp: [-24, 0, 14], kn: [34, 0, 0] }),
    arnold: P({ y: -.1, hips: [0, 112, 0], spine: [2, 16, 5], chest: [0, 36, 4], shL: [0, -72, 72], elL: [-46, 0, 67], shR: [0, -34, -159], elR: [107, 0, -17], hpR: [28, 0, -4], hpL: [-32, 0, 4], knL: [50, 0, 0], head: [22, 20, 0] }),
    backDouble: P({ x: .03, hips: [0, 180, 5], spine: [-3, 0, -5], sh: [10, 0, 99], el: [0, 0, 117], wr: [0, 0, 24], chest: [-9, 0, 0], hpR: [14, 0, -7], knR: [28, 0, 0], hpL: [0, 0, 8] }),
    latSpread: P({ hips: [0, -5, 4], spine: [-3, 3, -4], sh: [0, -11, 53], el: [-131, 0, -57], chest: [-9, 0, 0], hp: [0, 0, 8] }),
    sideChest: P({ hips: [0, 74, 0], spine: [0, -10, 0], chest: [-9, -24, 0], shR: [0, 68, -16], elR: [-67, 0, -79], shL: [0, -70, 37], elL: [-94, 0, 0], hpR: [-26, 0, 0], knR: [48, 0, 0], head: [0, -40, 0] }),
    backLat: P({ hips: [0, 180, 0], sh: [0, -11, 53], el: [-131, 0, -57], chest: [-7, 0, 0], hpR: [10, 0, -8], knR: [22, 0, 0], hpL: [0, 0, 8] }),
    absThigh: P({ hips: [0, 6, -4], spine: [5, -3, 4], sh: [0, 0, 152], el: [0, 0, 130], chest: [13, 0, 0], hpL: [-20, 0, 4], knL: [6, 0, 0], hpR: [0, 0, -5] }),
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
    about: { cam: [-.2, .08, 4.7], ...seq([['handsHips', 'Relaxed front', 5], ['frontDouble', 'Front double biceps', 3.6], ['victory', 'Classic pose', 3.4], ['mostMuscular', 'Most muscular', 3.4], ['arnold', 'Three-quarter twist', 3.6], ['backDouble', 'Back double biceps', 3.4]]) },
    flex: { cam: [-.85, .08, 4.6], hot: 'LR', reps: true, angle: 'R', bells: true,
      pose: t => { const p = alive('relaxed', t); p.shR = [-4, 0, -16]; p.shL = [-4, 0, 16]; p.elR = [-(6 + 136 * wave01(t, 3.2)), 0, 0]; p.elL = [-(6 + 136 * wave01(t + 1.6, 3.2)), 0, 0]; return p; } },
    timelog: { cam: [.45, .1, 4.7], ...seq([['watch', 'Checking the time', 4], ['onCall', 'On a call, walking', 3.6], ['typing', 'Back to work', 3.2]]) },
    coaching: { cam: [0, .06, 4.7], ...seq([['handsHips', 'Relaxed front', 4.6], ['frontDouble', 'Front double biceps', 4.2]]) },
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

  /* --- worlds: one solid, lit 3D set per section. The figure stands on each world's floor. --- */
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
  const worlds = {}, WHITE = new THREE.Color(0xffffff);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function mkWorld(id, pal, build) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const reg = [], ticks = [], cache = {};
    const R = (m, base, tone, col) => { const e = { m, base, mul: 1, tone, col }; reg.push(e); return e; };
    const w = {
      g, pal,
      // a lit, solid material; the same arguments give back the same material
      mat(color, { rough = .75, metal = 0, glow = 0, flat = false } = {}) {
        if (color && color.isMaterial) return color;
        const key = [color, rough, metal, glow, flat].join();
        if (!cache[key]) { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat, emissive: glow ? color : 0x000000, emissiveIntensity: glow }); R(m, 1, glow ? 'lit' : 'solid', new THREE.Color(color)); cache[key] = m; }
        return cache[key];
      },
      lineMat(color, o = .6) { const key = 'l' + color + o; if (!cache[key]) { cache[key] = new THREE.LineBasicMaterial({ color, transparent: true, depthWrite: false }); R(cache[key], o, 'raw'); } return cache[key]; },
      beam(color, o = .08) { const key = 'b' + color + o; if (!cache[key]) { cache[key] = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }); R(cache[key], o, 'raw'); } return cache[key]; },
      group(x = 0, y = 0, z = 0, parent = g, ry = 0) { const o = new THREE.Group(); o.position.set(x, y, z); o.rotation.y = ry; parent.add(o); return o; },
      M(geo, x, y, z, m, parent = g) { const o = new THREE.Mesh(geo, w.mat(m)); o.position.set(x, y, z); parent.add(o); return o; },
      B(bw, bh, bd, x, y, z, m, parent = g) { const o = w.M(boxGeo, x, y, z, m, parent); o.scale.set(bw, bh, bd); return o; },
      C(r, h, x, y, z, m, { axis = 'y', seg = 20, parent = g, r2 = r } = {}) { const o = w.M(new THREE.CylinderGeometry(r2, r, h, seg), x, y, z, m, parent); if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; return o; },
      S(r, x, y, z, m, parent = g) { const o = w.M(sphere, x, y, z, m, parent); o.scale.setScalar(r); return o; },
      line(pts, m, parent = g) { const o = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => p.isVector3 ? p : new THREE.Vector3(...p))), m); parent.add(o); return o; },
      label(text, x, y, z, { tone = 'ink', o = .85, parent = g, ...opts } = {}) { const s = makeLabel(text, opts); s.position.set(x, y, z); if (tone === 'acc') s.material.color.set(pal.acc); s.userData.e = R(s.material, o, tone === 'ink' ? 'ink' : 'raw'); parent.add(s); return s; },
      tick(fn) { ticks.push(fn); },
    };
    const ground = w.M(new THREE.CircleGeometry(16, 56), 0, -.004, 0, w.mat(pal.floor, { rough: pal.floorRough ?? .85, metal: pal.floorMetal ?? 0 })); ground.rotation.x = -Math.PI / 2;
    build(w);
    worlds[id] = { g, reg, ticks, k: 0 };
  }
  const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const STEEL = { rough: .4, metal: .8 }, DARK = { rough: .55, metal: .5 };

  // A server rack: steel cabinet, dark glass door, rows of units with blinking lights.
  function rack(w, x, z, ry = 0, h = 2.05) {
    const r = w.group(x, 0, z, w.g, ry);
    w.B(.64, h, .9, 0, h / 2, 0, w.mat(0x1b1e26, DARK), r);
    w.B(.56, h - .14, .02, 0, h / 2, .455, w.mat(0x07090d, { rough: .2, metal: .9 }), r);
    w.B(.66, .05, .92, 0, h + .025, 0, w.mat(0x2a2e38, DARK), r);
    const leds = [w.mat(0x3b9cff, { glow: 2.2 }), w.mat(0x30d158, { glow: 2.2 }), w.mat(0xffb020, { glow: 2.2 })];
    for (let i = 0; i < 9; i++) {
      const y = .2 + i * (h - .36) / 8;
      w.B(.5, .1, .012, 0, y, .468, w.mat(0x232733, { rough: .5, metal: .6 }), r);
      for (let k = 0; k < 3; k++) {
        const led = w.B(.03, .02, .01, -.2 + k * .06, y, .476, leds[(i + k) % 3 === 0 ? 2 : (i + k) % 2], r);
        const sp = 1.5 + rnd(i * 3 + k, x) * 6, ph = rnd(i, x * 2 + k) * 6;
        w.tick(t => { led.visible = Math.sin(t * sp + ph) > -.3; });
      }
    }
    return r;
  }
  // Labels that drift upward and loop.
  function drift(w, items, range = 1.6) {
    items.forEach(([text, x, y, z, opts], i) => {
      const s = w.label(text, x, y, z, { o: .8, ...opts });
      const sp = .05 + rnd(i, 3) * .04, ph = rnd(i, 9);
      w.tick(t => { const u = (t * sp + ph) % 1; s.position.y = y + (u - .5) * range; s.position.x = x + Math.sin(t * .4 + i) * .08; s.userData.e.mul = Math.sin(u * Math.PI) ** .6; });
    });
  }
  // A small desk with a laptop; the screen glows in the given color.
  function laptopDesk(w, parent, screenColor, wood = 0x3a2c20) {
    w.B(1.1, .05, .6, 0, .74, 0, w.mat(wood, { rough: .6 }), parent);
    for (const [x, z] of [[-.5, -.25], [.5, -.25], [-.5, .25], [.5, .25]]) w.B(.05, .72, .05, x, .36, z, w.mat(0x1c1c20, STEEL), parent);
    w.B(.38, .02, .26, 0, .775, .04, w.mat(0x9a9ca3, STEEL), parent);
    const scr = w.B(.38, .25, .012, 0, .9, -.1, w.mat(0x9a9ca3, STEEL), parent); scr.rotation.x = -.2;
    const glow = w.B(.35, .22, .004, 0, .9, -.092, w.mat(screenColor, { glow: 1.6 }), parent); glow.rotation.x = -.2;
    return glow;
  }

  // 1. About: a server room under the cloud, a firewall, an AI agent, and two people trying to get in.
  mkWorld('about', { floor: 0x11141b, floorRough: .35, floorMetal: .5, acc: 0x3b9cff }, w => {
    for (let i = -6; i <= 6; i++) { w.line([[i * .9, .002, -6], [i * .9, .002, 3]], w.lineMat(0x5b6b86, .18)); w.line([[-6, .002, i * .9 - 1], [6, .002, i * .9 - 1]], w.lineMat(0x5b6b86, .18)); }
    // back row of racks, slightly curved, plus side rows
    [[-3.3, -2.6, .5], [-2.4, -3.2, .32], [-1.45, -3.6, .15], [-.48, -3.75, .04], [.48, -3.75, -.04], [1.45, -3.6, -.15], [2.4, -3.2, -.32], [3.3, -2.6, -.5]].forEach(([x, z, ry]) => rack(w, x, z, ry));
    w.B(7.4, .06, .5, 0, 2.65, -3.3, w.mat(0x2a2e38, DARK)); // cable tray
    for (let i = -3; i <= 3; i++) w.B(.03, .55, .03, i * 1.1, 2.38, -3.3, w.mat(0x2a2e38, DARK));
    for (const x of [-2.2, 0, 2.2]) w.B(1.3, .03, .16, x, 3.05, -2.2, w.mat(0xdfeaff, { glow: 1.3 })); // ceiling lights
    // clouds above, wired down to the racks, with packets riding the links
    const cloudMat = w.mat(0xeaf1fb, { rough: .95 });
    const cloud = (x, y, z, s) => { const c = w.group(x, y, z); for (const [dx, dy, dz, r] of [[0, 0, 0, .46], [-.5, -.08, .05, .33], [.52, -.06, 0, .37], [.2, .2, -.05, .32], [-.24, .17, .04, .29], [.05, -.12, .2, .3]]) w.S(r, dx, dy, dz, cloudMat, c); c.scale.setScalar(s); w.tick(t => { c.position.y = y + Math.sin(t * .5 + x) * .07; c.position.x = x + Math.sin(t * .13 + x) * .15; }); return c; };
    cloud(-1.7, 3.45, -2.6, .9); cloud(1.9, 3.6, -2.8, .85); cloud(.1, 3.95, -3.8, 1.1);
    const links = [[[-1.7, 3.1, -2.6], [-2.4, 2.1, -3.2]], [[-1.7, 3.1, -2.6], [-1.45, 2.1, -3.6]], [[1.9, 3.3, -2.8], [1.45, 2.1, -3.6]], [[1.9, 3.3, -2.8], [2.4, 2.1, -3.2]], [[.1, 3.55, -3.8], [-.48, 2.1, -3.75]], [[.1, 3.55, -3.8], [.48, 2.1, -3.75]]];
    links.forEach(([a, b], i) => {
      w.line([a, b], w.lineMat(0x3b9cff, .45));
      const dot = w.S(.04, 0, 0, 0, w.mat(0x7cc0ff, { glow: 2.5 }));
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
      w.tick(t => { const u = (t * (.35 + rnd(i) * .3) + rnd(i, 2)) % 1; dot.position.lerpVectors(i % 2 ? A : Bv, i % 2 ? Bv : A, u); });
    });
    // the firewall: a dome of light around the figure
    const dome = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.0, 2)), w.lineMat(0x3b9cff, .16)); dome.position.y = .2; w.g.add(dome);
    w.tick(t => { dome.rotation.y = t * .05; });
    // a shield with a lock, floating
    const sh = new THREE.Shape(); sh.moveTo(0, .34); sh.lineTo(.27, .24); sh.lineTo(.27, -.02); sh.quadraticCurveTo(.25, -.28, 0, -.4); sh.quadraticCurveTo(-.25, -.28, -.27, -.02); sh.lineTo(-.27, .24); sh.closePath();
    const shield = w.group(1.25, 2.55, -1.3);
    const sm = w.M(new THREE.ExtrudeGeometry(sh, { depth: .07, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 }), 0, 0, -.035, w.mat(0x1f6fe0, { rough: .3, metal: .7 }), shield);
    w.B(.16, .13, .04, 0, -.06, .08, w.mat(0xf2f5fa, { rough: .4, metal: .3 }), shield);
    const hasp = w.M(new THREE.TorusGeometry(.055, .016, 8, 16, Math.PI), 0, .005, .08, w.mat(0xf2f5fa, { rough: .4, metal: .3 }), shield);
    w.tick(t => { shield.rotation.y = Math.sin(t * .7) * .6; shield.position.y = 2.55 + Math.sin(t * .9) * .06; });
    // two people at laptops outside the wall, and their attacks stopping at the dome
    const hood = w.mat(0x15161a, { rough: .9 }), redLine = w.lineMat(0xff453a, .9), spark = w.mat(0xff453a, { glow: 3 });
    [[-2.55, -.9, .95], [2.6, -1.1, -.95]].forEach(([x, z, ry], i) => {
      const h = w.group(x, 0, z, w.g, ry);
      laptopDesk(w, h, 0xff3b30, 0x23252b);
      w.C(.27, .78, 0, .78, -.52, hood, { parent: h, r2: .15, seg: 14 });   // body in a hoodie
      w.S(.17, 0, 1.3, -.5, hood, h); w.S(.115, 0, 1.28, -.42, w.mat(0x050506, { rough: 1 }), h); // hood, face in shadow
      for (const s of [-1, 1]) { const arm = w.B(.08, .08, .42, s * .2, .95, -.3, hood, h); arm.rotation.x = .5; }
      w.B(.4, .05, .4, 0, .42, -.55, w.mat(0x2a2c33, DARK), h); w.C(.03, .42, 0, .21, -.55, w.mat(0x2a2c33, STEEL), { parent: h });
      // attack line from the laptop to where the dome stops it
      const from = new THREE.Vector3(x, .95, z), dir = new THREE.Vector3(0, 1.15, 0).sub(from).normalize(), hit = new THREE.Vector3(0, 1.15, 0).addScaledVector(dir, -1.98);
      w.line([from, hit], redLine); const sp = w.S(.07, hit.x, hit.y, hit.z, spark);
      const pk = w.S(.035, 0, 0, 0, spark);
      w.tick(t => { const u = (t * .7 + i * .4) % 1; pk.position.lerpVectors(from, hit, u); sp.scale.setScalar(.05 + .05 * Math.abs(Math.sin(t * 9 + i))); });
      const tag = w.label(i ? '403 blocked' : 'threat blocked', hit.x, hit.y + .22, hit.z, { size: .08, o: .9 }); tag.material.color.set(0xff6b61); tag.userData.e.tone = 'raw';
    });
    // the AI agent: a small neural net over a console
    const net = w.group(-1.2, 2.45, -1.4), layers = [3, 4, 4, 2], nodes = [], nm = w.mat(0x7cc0ff, { glow: 2 });
    layers.forEach((n, li) => { nodes.push([]); for (let i = 0; i < n; i++) nodes[li].push(w.S(.032, li * .3, (i - (n - 1) / 2) * .2, 0, nm, net)); });
    for (let li = 0; li < layers.length - 1; li++) for (const a of nodes[li]) for (const b of nodes[li + 1]) w.line([a.position, b.position], w.lineMat(0x7cc0ff, .3), net);
    w.tick(t => { nodes.flat().forEach((d, i) => d.scale.setScalar(.026 + .018 * Math.max(0, Math.sin(t * 2.4 - d.position.x * 7 + i)))); net.position.y = 2.45 + Math.sin(t * .6) * .05; });
    w.label('AI agent', -.75, 2.95, -1.4, { size: .085, tone: 'acc' });
    drift(w, [
      ['az vm list -d --query "[?powerState==\'VM running\']"', -1.3, 1.7, -2.4, { size: .075 }],
      ['$ sudo dnf update --security\n  15 / 15 findings fixed', 1.3, 1.5, -2.5, { size: .075 }],
      ['agent.run({ tools: [get_stock, list_low_cover] })', .2, 3.2, -2.6, { size: .075 }],
    ]);
  });

  // 2. Flex and Count: a gym.
  mkWorld('flex', { floor: 0x232327, floorRough: .9, acc: 0xFF2A2F }, w => {
    const steel = w.mat(0x5a5e69, STEEL), chrome = w.mat(0xc4c7cf, { rough: .25, metal: 1 }), rubber = w.mat(0x1b1b1f, { rough: .8 }), red = w.mat(0xd0181d, { rough: .6 });
    for (let i = -5; i <= 5; i++) { w.line([[i, .002, -4], [i, .002, 3]], w.lineMat(0x000000, .5)); w.line([[-5, .002, i * .7], [5, .002, i * .7]], w.lineMat(0x000000, .5)); }
    // back wall with mirrors
    w.B(11, 3.6, .2, 0, 1.8, -4.1, w.mat(0x3a3c44, { rough: .9 }));
    for (const x of [-3.3, -1.1, 1.1, 3.3]) { w.B(2.1, 2.3, .03, x, 1.45, -3.98, w.mat(0x9fb2c4, { rough: .08, metal: 1 })); w.B(2.16, .05, .05, x, 2.62, -3.97, steel); w.B(2.16, .05, .05, x, .28, -3.97, steel); }
    for (const x of [-3, 0, 3]) w.B(1.8, .04, .22, x, 3.3, -1.5, w.mat(0xfff4e0, { glow: 1.5 })); // lights
    // power rack with a loaded bar
    for (const x of [-.78, .78]) for (const z of [-1.9, -2.8]) w.B(.09, 2.35, .09, x, 1.175, z, steel);
    for (const z of [-1.9, -2.8]) w.B(1.65, .09, .09, 0, 2.35, z, steel);
    for (const x of [-.78, .78]) { w.B(.09, .09, .99, x, 2.35, -2.35, steel); w.B(.09, .09, .99, x, .05, -2.35, steel); w.B(.2, .06, .14, x, 1.4, -1.8, red); }
    for (let i = 0; i < 6; i++) w.C(.02, 1.5, 0, 2.35, -2.0 - i * .13, chrome, { axis: 'x', seg: 8 }); // pull-up bars
    w.C(.016, 2.25, 0, 1.47, -1.8, chrome, { axis: 'x', seg: 12 });
    for (const s of [-1, 1]) { w.C(.3, .05, s * .98, 1.47, -1.8, red, { axis: 'x', seg: 32 }); w.C(.3, .05, s * 1.04, 1.47, -1.8, rubber, { axis: 'x', seg: 32 }); w.C(.19, .035, s * 1.095, 1.47, -1.8, w.mat(0x2f6fdf, { rough: .6 }), { axis: 'x', seg: 28 }); w.C(.035, .08, s * 1.14, 1.47, -1.8, chrome, { axis: 'x', seg: 12 }); }
    // dumbbell rack
    const dr = w.group(-2.9, 0, -2.2, w.g, .55);
    for (const x of [-.95, .95]) w.B(.06, 1.0, .5, x, .5, 0, steel, dr);
    [.42, .86].forEach((y, lv) => { const sh = w.B(1.9, .04, .44, 0, y, 0, steel, dr); sh.rotation.x = -.18; for (let i = 0; i < 6; i++) { const x = -.78 + i * .31, s = .72 + (i + lv * 2) * .05; w.C(.014, .2, x, y + .1, 0, chrome, { axis: 'z', parent: dr, seg: 8 }); for (const z of [-.11, .11]) w.C(.062 * s, .1, x, y + .1, z, rubber, { axis: 'z', parent: dr, seg: 12 }); } });
    // bench
    const bn = w.group(2.6, 0, -1.9, w.g, -.7);
    w.B(1.25, .09, .32, 0, .47, 0, red, bn); w.B(1.1, .05, .1, 0, .4, 0, steel, bn);
    for (const x of [-.48, .48]) { w.B(.06, .4, .06, x, .2, 0, steel, bn); w.B(.06, .05, .46, x, .025, 0, steel, bn); }
    // plate tree, kettlebells, a water bottle
    w.C(.03, 1.25, 3.5, .625, -3.0, steel); w.B(.6, .05, .6, 3.5, .025, -3.0, steel);
    [[.3, .26, red], [.52, .22, rubber], [.74, .18, rubber], [.94, .15, w.mat(0x2f6fdf, { rough: .6 })]].forEach(([y, r, m]) => { w.C(r, .05, 3.42, y, -3.0, m, { axis: 'x', seg: 24 }); w.C(r, .05, 3.58, y, -3.0, m, { axis: 'x', seg: 24 }); });
    [[-1.9, -3.2, .16], [-1.55, -3.3, .13]].forEach(([x, z, r]) => { w.S(r, x, r, z, rubber); const hd = w.M(new THREE.TorusGeometry(r * .62, r * .16, 8, 16), x, r * 1.75, z, rubber); hd.rotation.y = .5; });
    w.C(.04, .22, 2.2, .11, -1.3, w.mat(0x2f6fdf, { rough: .4 })); w.C(.025, .04, 2.2, .24, -1.3, w.mat(0xffffff));
    drift(w, [['strict rep', -1.5, 2.7, -1.6, { size: .085, tone: 'acc' }], ['elbow 47° → rep', 1.6, 2.9, -1.6, { size: .085 }], ['on-device · nothing uploaded', 0, 3.1, -3.4, { size: .08 }]], 1.0);
  });

  // 3. Time Log: a busy day, all in one room.
  mkWorld('timelog', { floor: 0x2b2118, floorRough: .6, acc: 0x0A84FF }, w => {
    for (let i = -8; i <= 8; i++) w.line([[i * .45, .002, -4], [i * .45, .002, 3]], w.lineMat(0x000000, .35)); // floorboards
    w.B(11, 3.6, .2, 0, 1.8, -3.6, w.mat(0x242c38, { rough: .95 }));
    w.B(11, .12, .05, 0, .06, -3.48, w.mat(0xe9e4da, { rough: .7 }));
    // wall clock
    const clock = w.group(0, 2.35, -3.46);
    w.C(.62, .06, 0, 0, 0, w.mat(0x15161a, STEEL), { axis: 'z', parent: clock, seg: 48 }); w.C(.56, .062, 0, 0, .004, w.mat(0xf4f1ea, { rough: .8 }), { axis: 'z', parent: clock, seg: 48 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832, tk = w.B(i % 3 ? .02 : .035, i % 3 ? .07 : .11, .01, Math.sin(a) * .47, Math.cos(a) * .47, .04, 0x15161a, clock); tk.rotation.z = -a; }
    const hand = (len, wd, m) => { const p = w.group(0, 0, .05, clock); w.B(wd, len, .012, 0, len / 2 - .04, 0, m, p); return p; };
    const hr = hand(.3, .035, 0x15161a), mn = hand(.45, .024, 0x15161a), sc = hand(.5, .01, w.mat(0xff453a, { glow: .6 }));
    w.tick(t => { mn.rotation.z = -t * .35; hr.rotation.z = -t * .35 / 12 - 1; sc.rotation.z = -Math.floor(t * 2) / 60 * 6.2832 * 3; });
    // a wall planner made of the day's tiles
    const tiles = [['Work', 0x3A7BD5], ['School', 0x7B4FD6], ['Gym', 0xC99A1E], ['Biyahe', 0x7F8A93], ['Kain', 0x6FA832], ['Scroll', 0xD94C4C], ['Tulog', 0x4F5BA6], ['Coaching', 0xD9772B], ['Content', 0xC2478E]];
    const board = w.group(-2.35, 2.0, -3.47); w.B(2.0, 1.5, .04, 0, 0, 0, w.mat(0xf0ece3, { rough: .9 }), board); w.B(2.08, 1.58, .03, 0, 0, -.01, w.mat(0x6b5138, { rough: .7 }), board);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { if (rnd(r * 6 + c, 5) < .2) continue; w.B(.27, .26, .012, -.8 + c * .32, .5 - r * .33, .03, w.mat(tiles[Math.floor(rnd(r * 6 + c, 2) * 9)][1], { rough: .8 }), board); }
    // work desk: laptop, lamp, mug, books
    const desk = w.group(2.5, 0, -2.4, w.g, -.5); laptopDesk(w, desk, 0x6fb6ff);
    w.C(.06, .02, -.4, .775, -.15, 0x15161a, { parent: desk }); const arm = w.B(.02, .42, .02, -.4, .97, -.15, 0x15161a, desk); arm.rotation.z = -.3; const shade = w.C(.09, .1, -.3, 1.18, -.15, 0x15161a, { parent: desk, r2: .04 }); w.S(.03, -.3, 1.13, -.15, w.mat(0xffe2a8, { glow: 3 }), desk);
    const lampBeam = w.M(new THREE.ConeGeometry(.36, .4, 24, 1, true), -.3, .95, -.15, w.beam(0xffd58a, .1), desk);
    w.C(.04, .09, .38, .81, .12, w.mat(0xf4f1ea, { rough: .5 }), { parent: desk }); w.B(.26, .04, .19, .32, .785, -.14, 0x8a2f2f, desk); w.B(.24, .04, .18, .33, .825, -.14, 0x2f5d8a, desk);
    w.B(.44, .05, .44, 0, .46, .6, w.mat(0x1c1c20, DARK), desk); w.B(.44, .5, .05, 0, .72, .82, w.mat(0x1c1c20, DARK), desk); w.C(.03, .44, 0, .22, .6, w.mat(0x55585f, STEEL), { parent: desk });
    // the rest of the day by the wall: gym bag, a dumbbell, a backpack, shoes
    const bag = w.C(.2, .62, -2.6, .21, -2.6, w.mat(0x1d2430, { rough: .9 }), { axis: 'x', seg: 16 }); w.B(.3, .03, .04, -2.6, .42, -2.6, w.mat(0xd0181d));
    w.C(.012, .26, -1.9, .07, -2.9, w.mat(0xc4c7cf, STEEL), { axis: 'x', seg: 8 }); for (const s of [-1, 1]) w.C(.07, .09, -1.9 + s * .13, .07, -2.9, 0x101012, { axis: 'x', seg: 12 });
    const pack = w.B(.34, .46, .2, 1.2, .23, -3.2, w.mat(0x3a4a6b, { rough: .9 })); w.B(.26, .2, .05, 1.2, .2, -3.08, w.mat(0x2b3852, { rough: .9 }));
    // the tiles of the day also circle the figure, like the app
    tiles.forEach(([name, col], i) => {
      const s = w.label(name, 0, 0, 0, { bg: '#' + col.toString(16).padStart(6, '0'), sans: true, weight: 700, size: .085, tone: 'raw', o: .95 });
      w.tick(t => { const a = t * .2 + i / tiles.length * 6.2832; s.position.set(Math.cos(a) * 1.9, .7 + (i * .37) % 1.9 + Math.sin(t * .9 + i) * .06, Math.sin(a) * 1.5 - .6); s.userData.e.mul = Math.min(1, Math.max(0, (.2 - s.position.z) / .8)); });
    });
    drift(w, [['gap: 45 min unlogged', 1.3, 1.5, -2.4, { size: .08, tone: 'acc' }], ['Kasabay ng: Scroll', -1.3, 3.1, -2.6, { size: .08 }]], 1.0);
  });

  // 4. Coaching page: the photo studio from the hero clip, with the food that still fits the macros.
  mkWorld('coaching', { floor: 0x1a1a1c, floorRough: .7, acc: 0xD93D1A }, w => {
    const paper = w.mat(0x242426, { rough: .95 }), black = w.mat(0x3a3a3f, { rough: .5, metal: .5 });
    w.B(7, 3.8, .1, 0, 1.9, -3.2, paper); const sweep = w.C(.9, 7, 0, .9, -2.35, paper, { axis: 'x', seg: 24 }); sweep.scale.set(1, 1, 1); // seamless backdrop
    w.C(.04, 7.4, 0, 3.75, -3.1, black, { axis: 'x', seg: 10 }); for (const x of [-3.6, 3.6]) w.C(.03, 3.75, x, 1.875, -3.1, black, { seg: 10 });
    // softboxes
    for (const s of [-1, 1]) {
      const st = w.group(s * 2.5, 0, -.9, w.g, -s * .85);
      w.C(.02, 2.1, 0, 1.05, 0, black, { parent: st, seg: 8 }); for (const a of [0, 2.1, 4.2]) { const lg = w.C(.014, .75, Math.cos(a) * .22, .26, Math.sin(a) * .22, black, { parent: st, seg: 6 }); lg.rotation.z = Math.cos(a) * .62; lg.rotation.x = -Math.sin(a) * .62; }
      const box = w.group(0, 2.2, 0, st); box.rotation.x = .25; w.C(.2, .4, 0, 0, -.2, black, { axis: 'z', parent: box, r2: .5, seg: 4 }); w.B(.72, .72, .02, 0, 0, .01, w.mat(0xfffaf0, { glow: 1.6 }), box);
      w.M(new THREE.ConeGeometry(1.3, 2.6, 4, 1, true), 0, 0, 1.3, w.beam(0xfff2dc, .05), box).rotation.x = -Math.PI / 2;
    }
    // camera on a tripod
    const cm = w.group(-1.5, 0, 1.2, w.g, 2.3);
    for (const a of [0, 2.1, 4.2]) { const lg = w.C(.016, 1.35, Math.cos(a) * .3, .64, Math.sin(a) * .3, black, { parent: cm, seg: 6 }); lg.rotation.z = Math.cos(a) * .45; lg.rotation.x = -Math.sin(a) * .45; }
    w.B(.22, .15, .14, 0, 1.36, 0, black, cm); w.C(.055, .16, 0, 1.36, .14, black, { axis: 'z', parent: cm, seg: 16 }); w.C(.045, .01, 0, 1.36, .225, w.mat(0x3a5b8a, { rough: .1, metal: 1 }), { axis: 'z', parent: cm, seg: 16 }); w.B(.07, .04, .06, 0, 1.455, 0, black, cm);
    // a small table with a burger, an ice cream and a food scale
    const tb = w.group(1.75, 0, -1.2, w.g, -.3);
    w.C(.42, .04, 0, .8, 0, w.mat(0xf2efe8, { rough: .6 }), { parent: tb, seg: 32 }); w.C(.03, .78, 0, .4, 0, black, { parent: tb }); w.C(.26, .03, 0, .015, 0, black, { parent: tb, seg: 24 });
    const bg = w.group(-.12, .82, .05, tb); const bun = 0xd49a4e;
    w.C(.17, .015, 0, .008, 0, w.mat(0xffffff, { rough: .4 }), { parent: bg, seg: 28 }); w.C(.11, .035, 0, .035, 0, bun, { parent: bg, seg: 20 }); w.C(.118, .012, 0, .058, 0, 0x4f9a3a, { parent: bg, seg: 14 }); w.C(.112, .03, 0, .08, 0, 0x4a2a1a, { parent: bg, seg: 20 }); const ch = w.B(.2, .008, .2, 0, .099, 0, 0xf2b632, bg); ch.rotation.y = .6; w.C(.108, .012, 0, .108, 0, 0xc0392b, { parent: bg, seg: 18 });
    const top = w.M(new THREE.SphereGeometry(.112, 20, 10, 0, 6.2832, 0, Math.PI / 2), 0, .112, 0, bun, bg); top.scale.y = .75;
    const ic = w.group(.2, .82, -.08, tb); w.C(.035, .14, 0, .07, 0, w.mat(0xf2efe8, { rough: .3 }), { parent: ic, r2: .05, seg: 14 }); const cone = w.C(.004, .2, 0, .22, 0, 0xc98b45, { parent: ic, r2: .062, seg: 14 }); w.S(.066, 0, .34, 0, w.mat(0xf6c1cf, { rough: .8 }), ic); w.S(.054, .01, .43, 0, w.mat(0xfff3d6, { rough: .8 }), ic);
    w.B(.2, .03, .16, .02, .835, .26, w.mat(0xd9dbe0, STEEL), tb); w.B(.08, .012, .03, .02, .852, .32, w.mat(0x7dffb0, { glow: 1.6 }), tb);
    // macro rings floating over the table
    const macros = w.group(1.75, 2.0, -1.2);
    [['P 180 g', .78, .2], ['C 320 g', .62, .29], ['F 70 g', .9, .38]].forEach(([txt, frac, r], i) => {
      const ring = w.M(new THREE.TorusGeometry(r, .012, 8, 48, 6.2832 * frac), 0, 0, 0, w.mat(0xD93D1A, { glow: 1.2 }), macros); ring.rotation.z = Math.PI / 2 - 6.2832 * frac;
      w.M(new THREE.TorusGeometry(r, .005, 6, 48), 0, 0, 0, w.mat(0x8a857a), macros);
      w.label(txt, .72, .2 - i * .17, 0, { size: .07, parent: macros });
    });
    w.label('fits your macros', 0, -.56, 0, { size: .08, tone: 'acc', parent: macros });
    w.tick(t => { macros.position.y = 2.0 + Math.sin(t * .7) * .05; macros.rotation.y = Math.sin(t * .4) * .25; });
  });

  // 5. Posing coach: a competition stage.
  mkWorld('posing', { floor: 0x0d0d10, floorRough: .25, floorMetal: .6, acc: 0xffc24a }, w => {
    const gold = w.mat(0xd9a93a, { rough: .25, metal: 1 }), alu = w.mat(0xaeb3bd, { rough: .35, metal: 1 }), black = w.mat(0x0e0e11, { rough: .5, metal: .4 });
    w.C(2.6, .3, 0, -.153, -.2, w.mat(0x17171b, { rough: .2, metal: .7 }), { seg: 48 }); w.M(new THREE.TorusGeometry(2.6, .02, 8, 64), 0, .0, -.2, gold).rotation.x = Math.PI / 2;
    // velvet curtain: a row of folds
    const velvet = w.mat(0x4a0d14, { rough: .95 });
    for (let i = 0; i < 34; i++) { const x = -4.6 + i * .28; w.C(.17, 4.2, x, 2.1, -3.2 + (i % 2) * .08, velvet, { seg: 8 }); }
    w.B(9.6, .5, .5, 0, 4.2, -3.1, w.mat(0x3a0a10, { rough: .95 }));
    // truss with moving lights
    for (const y of [3.3, 3.6]) for (const z of [-1.5, -1.8]) w.C(.03, 6.2, 0, y, z, alu, { axis: 'x', seg: 8 });
    for (let i = 0; i <= 20; i++) { const x = -3.1 + i * .31, d = w.C(.014, .43, x + .15, 3.45, -1.5, alu, { seg: 6 }); d.rotation.z = i % 2 ? .8 : -.8; }
    for (const x of [-3.1, 3.1]) { w.C(.045, 3.9, x, 1.65, -1.65, alu, { seg: 10 }); w.B(.5, .04, .5, x, -.28, -1.65, alu); }
    [[-2.1, 0xffc24a], [-.7, 0xffffff], [.7, 0xffffff], [2.1, 0xffc24a]].forEach(([x, col], i) => {
      const piv = w.group(x, 3.25, -1.5); w.C(.11, .26, 0, -.1, 0, black, { parent: piv, r2: .08, seg: 14 }); w.C(.1, .01, 0, -.235, 0, w.mat(col, { glow: 3 }), { parent: piv, seg: 14 });
      w.M(new THREE.ConeGeometry(.85, 3.7, 32, 1, true), 0, -2.08, 0, w.beam(col, .03), piv);
      w.tick(t => { piv.rotation.z = -x * .2 + Math.sin(t * .7 + i * 1.6) * .14; piv.rotation.x = .4 + Math.sin(t * .5 + i) * .07; });
    });
    // posing-room mirrors at the sides
    for (const s of [-1, 1]) { const mr = w.group(s * 2.9, 0, -1.2, w.g, -s * .8); w.B(1.5, 2.3, .04, 0, 1.25, 0, w.mat(0xa9bccd, { rough: .06, metal: 1 }), mr); w.B(1.6, 2.4, .03, 0, 1.25, -.02, black, mr); for (const x of [-.7, .7]) w.B(.05, .12, .5, x, .06, 0, black, mr); }
    // a trophy
    const tr = w.group(-1.9, 0, -2.2); w.B(.5, .7, .5, 0, .35, 0, black, tr); w.B(.3, .08, .3, 0, .74, 0, gold, tr); w.C(.03, .2, 0, .88, 0, gold, { parent: tr, seg: 10 }); w.C(.05, .28, 0, 1.12, 0, gold, { parent: tr, r2: .15, seg: 20 });
    for (const s of [-1, 1]) w.M(new THREE.TorusGeometry(.07, .012, 6, 12, Math.PI), s * .13, 1.12, 0, gold, tr).rotation.z = -s * Math.PI / 2;
    const call = w.label('1  FRONT DOUBLE BICEPS', 0, 3.0, -2.9, { size: .11, tone: 'acc', sans: true, weight: 700 });
    w.label('hold 0:30 · match the ghost', 0, 2.75, -2.9, { size: .075 });
    w.tick(t => { call.userData.e.mul = .65 + .35 * Math.abs(Math.sin(t * 1.05)); });
  });

  // 6. Supplement ops agent: a small warehouse.
  mkWorld('ops', { floor: 0x2c2d30, floorRough: .9, acc: 0x34c759 }, w => {
    const blue = w.mat(0x1f4f9c, { rough: .5, metal: .4 }), orange = w.mat(0xd9641e, { rough: .5, metal: .3 }), card = w.mat(0xb48a56, { rough: .95 }), tape = w.mat(0xd9c9a3, { rough: .8 }), steel = w.mat(0x8b8f98, STEEL);
    for (const z of [-.6, 1.6]) w.B(9, .004, .08, 0, .003, z, w.mat(0xf2c21a, { rough: .7 })); // safety lines
    w.B(11, 4, .2, 0, 2, -4.3, w.mat(0x34363b, { rough: .95 }));
    for (const x of [-2.5, 0, 2.5]) { w.B(1.2, .05, .3, x, 3.6, -1.6, w.mat(0xf3f7ff, { glow: 1.6 })); }
    const tub = (x, y, z, parent, col) => { w.C(.085, .2, x, y + .1, z, w.mat(0xf4f4f1, { rough: .5 }), { parent, seg: 14 }); w.C(.088, .1, x, y + .1, z, col, { parent, seg: 14 }); w.C(.088, .03, x, y + .215, z, 0x111114, { parent, seg: 14 }); };
    const box = (x, y, z, s, parent) => { w.B(.36 * s, .3 * s, .36 * s, x, y + .15 * s, z, card, parent); w.B(.06 * s, .302 * s, .362 * s, x, y + .15 * s, z, tape, parent); };
    // pallet racking with boxes and product tubs
    [[-2.2, -3.2, .12], [.2, -3.5, 0], [2.6, -3.2, -.12]].forEach(([x, z, ry], ri) => {
      const sh = w.group(x, 0, z, w.g, ry);
      for (const px of [-1.05, 1.05]) for (const pz of [-.3, .3]) w.B(.07, 3.0, .07, px, 1.5, pz, blue, sh);
      for (let lv = 0; lv < 3; lv++) { const y = .15 + lv * .95; for (const pz of [-.3, .3]) w.B(2.1, .09, .05, 0, y, pz, orange, sh); w.B(2.0, .03, .62, 0, y + .05, 0, w.mat(0x9a8566, { rough: .9 }), sh);
        for (let b = 0; b < 5; b++) { const bx = -.8 + b * .4, r = rnd(b + lv * 5, ri + 3); if (r < .15) continue; if (r > .62) { tub(bx - .09, y + .065, .05, sh, [0x2fa85a, 0xd0181d, 0x2f6fdf][(b + lv) % 3]); tub(bx + .09, y + .065, -.06, sh, [0x2fa85a, 0xd0181d, 0x2f6fdf][(b + lv + 1) % 3]); } else box(bx, y + .065, 0, .85 + r * .3, sh); } }
    });
    // conveyor with boxes moving along it
    const cv = w.group(0, 0, -1.9);
    for (const z of [-.26, .26]) w.B(7.6, .08, .04, 0, .62, z, steel, cv); for (let i = -9; i <= 9; i++) { w.C(.035, .5, i * .4, .62, 0, w.mat(0xc4c7cf, { rough: .3, metal: 1 }), { axis: 'z', parent: cv, seg: 10 }); if (i % 3 === 0) for (const z of [-.24, .24]) w.B(.05, .6, .05, i * .4, .3, z, steel, cv); }
    for (let i = 0; i < 5; i++) { const b = w.group(0, .66, 0, cv); box(0, 0, 0, i % 2 ? 1 : .8, b); w.tick(t => { b.position.x = ((t * .45 + i * 1.5) % 7.4) - 3.7; }); }
    // a pallet of boxes and a hand truck
    const pl = w.group(-2.9, 0, -.9, w.g, .4); w.B(1.0, .1, .8, 0, .05, 0, w.mat(0x8a6a44, { rough: .95 }), pl); for (let i = 0; i < 6; i++) box(-.28 + (i % 3) * .3, .1 + Math.floor(i / 3) * .3, i % 2 ? .12 : -.14, .8, pl); box(0, .7, 0, .8, pl);
    // a dashboard screen on a stand
    const ds = w.group(2.55, 0, -1.0, w.g, -.7);
    w.C(.03, 1.5, 0, .75, 0, steel, { parent: ds }); w.C(.3, .03, 0, .015, 0, steel, { parent: ds, seg: 20 }); w.B(1.5, .9, .05, 0, 1.75, 0, w.mat(0x0a0c10, { rough: .3, metal: .6 }), ds); w.B(1.42, .82, .01, 0, 1.75, .03, w.mat(0x101823, { rough: .4 }), ds);
    [.9, .7, .32, .8, .16, .6].forEach((h, i) => { const b = w.B(.14, 1, .01, -.52 + i * .21, 1.42, .04, w.mat(h < .4 ? 0xff453a : 0x34c759, { glow: 1.5 }), ds); w.tick(t => { const gk = Math.min(1, Math.max(.02, (t * .9 - i * .15) % 6)); b.scale.y = h * .6 * gk; b.position.y = 1.42 + h * .3 * gk; }); });
    w.label('days of cover', -.25, 2.08, .05, { size: .06, parent: ds, tone: 'raw' });
    drift(w, [['row 214: unknown SKU → rejected', -1.5, 1.7, -1.6, { size: .075 }], ['reorder WHEY-2KG × 40 · approve?', 1.2, 2.8, -2.6, { size: .075, tone: 'acc' }], ['demo data', 0, 3.3, -3.6, { size: .085 }]], 1.0);
  });

  // 7. Experience: a data center aisle.
  mkWorld('experience', { floor: 0x14171d, floorRough: .25, floorMetal: .6, acc: 0x5ac8fa }, w => {
    for (let i = 0; i < 5; i++) { rack(w, -1.75, -1.0 - i * .95, Math.PI / 2 - .12, 2.15); rack(w, 1.75, -1.0 - i * .95, -Math.PI / 2 + .12, 2.15); }
    for (let i = -4; i <= 4; i++) w.line([[i * .6, .002, -6], [i * .6, .002, 2]], w.lineMat(0x6c7c96, .2)); for (let i = 0; i < 12; i++) w.line([[-2.4, .002, 2 - i * .7], [2.4, .002, 2 - i * .7]], w.lineMat(0x6c7c96, .2));
    for (let i = 0; i < 5; i++) w.B(.9, .03, .14, 0, 3.0, -.6 - i * 1.1, w.mat(0xdfeaff, { glow: 1.6 })); // aisle lights
    for (const x of [-1.2, 1.2]) w.B(.4, .06, 6, x, 2.75, -3, w.mat(0x2a2e38, DARK)); // cable trays
    w.B(4.4, 3.2, .2, 0, 1.6, -6.2, w.mat(0x1b1e26, { rough: .9 }));
    // crash cart with a terminal
    const cart = w.group(-.95, 0, -1.9, w.g, .5); w.B(.6, .04, .45, 0, .95, 0, w.mat(0x30343d, DARK), cart); w.B(.6, .04, .45, 0, .3, 0, w.mat(0x30343d, DARK), cart); for (const [x, z] of [[-.27, -.2], [.27, -.2], [-.27, .2], [.27, .2]]) w.B(.03, .95, .03, x, .475, z, w.mat(0x8b8f98, STEEL), cart);
    w.B(.5, .32, .03, 0, 1.2, -.1, w.mat(0x0a0c10, { rough: .3 }), cart); w.B(.46, .28, .005, 0, 1.2, -.083, w.mat(0x0d2a1a, { glow: .0, rough: .5 }), cart); for (let i = 0; i < 6; i++) w.B(.1 + rnd(i, 7) * .26, .014, .003, -.21 + (.05 + rnd(i, 7) * .13), 1.3 - i * .04, -.08, w.mat(0x4dff9a, { glow: 2 }), cart);
    w.B(.34, .015, .12, 0, .98, .1, w.mat(0x15161a), cart);
    // a padlock
    const lock = w.group(.9, 2.45, -2.4); w.B(.34, .28, .1, 0, 0, 0, w.mat(0xd9a93a, { rough: .3, metal: 1 }), lock); w.M(new THREE.TorusGeometry(.11, .028, 8, 20, Math.PI), 0, .14, 0, w.mat(0xc4c7cf, { rough: .25, metal: 1 }), lock); w.C(.03, .02, 0, -.02, .055, 0x15161a, { axis: 'z', parent: lock });
    w.tick(t => { lock.rotation.y = Math.sin(t * .6) * .6; lock.position.y = 2.45 + Math.sin(t * .8) * .05; });
    drift(w, [['$ sudo dnf update --security\n  15 / 15 findings fixed', -.5, 2.6, -3.2, { size: .07 }], ['ticket · closed complete', .6, 1.6, -2.6, { size: .075, tone: 'acc' }], ['BEGIN TRAN  -- dry run\nROLLBACK    -- 0 conflicts', .2, 3.2, -4.4, { size: .07 }]], 1.0);
  });

  // 8. Contact: a quiet room, a door left open, paper planes going out.
  mkWorld('contact', { floor: 0x1b1c22, floorRough: .5, floorMetal: .2, acc: 0xFF453A }, w => {
    w.B(9, 3.8, .2, 0, 1.9, -3.4, w.mat(0x23252d, { rough: .95 }));
    const door = w.group(0, 0, -3.28); w.B(1.1, 2.3, .02, 0, 1.15, 0, w.mat(0xfff1d6, { glow: 1.4 }), door); for (const x of [-.6, .6]) w.B(.1, 2.4, .12, x, 1.2, 0, w.mat(0x3a3d47, DARK), door); w.B(1.3, .1, .12, 0, 2.4, 0, w.mat(0x3a3d47, DARK), door);
    const leaf = w.group(.55, 0, 0, door); const lf = w.B(1.0, 2.25, .05, .5, 1.13, 0, w.mat(0x5a4632, { rough: .6 }), leaf); leaf.rotation.y = -1.1; w.S(.035, .9, 1.05, .05, w.mat(0xd9a93a, { rough: .3, metal: 1 }), leaf);
    const spill = w.M(new THREE.PlaneGeometry(1.3, 3.2), 0, .004, 1.6, w.beam(0xffe6b8, .08), door); spill.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 4; i++) { const r = w.line(ringPts(1, 80), w.lineMat(0xFF453A, i % 2 ? .25 : .6)); r.position.y = .006; w.tick(t => { const u = (t * .22 + i / 4) % 1; r.scale.setScalar(.6 + u * 3.0); r.visible = u < .96; }); }
    // paper planes
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, .22, -.12, .02, -.12, 0, 0, -.08, 0, 0, .22, 0, 0, -.08, .12, .02, -.12, 0, 0, .22, 0, -.06, -.1, 0, 0, -.08]), 3)); pg.computeVertexNormals();
    const pm = w.mat(0xf4f1ea, { rough: .8 }); pm.side = THREE.DoubleSide;
    for (let i = 0; i < 4; i++) { const p = w.M(pg, 0, 0, 0, pm); w.tick(t => { const a = t * (.5 + i * .08) + i * 1.6, r = 1.9 + i * .25; p.position.set(Math.cos(a) * r, 1.5 + i * .3 + Math.sin(t * 1.3 + i) * .15, Math.sin(a) * r * .7 - .9); p.rotation.set(Math.sin(t * 1.3 + i) * .2, -a, .35); }); }
    [['github.com/naarrzz', '#111111'], ['LinkedIn', '#0A66C2'], ['Email', '#D93D1A'], ['Open to work', '#248A3D']].forEach(([txt, bg], i) => { const s = w.label(txt, -1.5 + i * 1.0, 2.75 + (i % 2) * .22, -3.2, { bg, sans: true, weight: 700, size: .075, tone: 'raw', o: .95 }); w.tick(t => { s.position.y = 2.75 + (i % 2) * .22 + Math.sin(t * .8 + i) * .04; }); });
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
    for (const id in worlds) for (const e of worlds[id].reg) { if (e.tone === 'ink') e.m.color.set(dark ? 0xffffff : 0xffffff); else if (e.tone === 'solid') e.m.color.copy(e.col).lerp(WHITE, dark ? 0 : .3); }
    scene.fog.color.set(dark ? 0x0b0b0d : 0xe9e9ee);
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
    J.hips.position.x += ((p.x || 0) - J.hips.position.x) * (1 - Math.exp(-dt * 5.5)); // weight shifts over the standing leg
    shadow.position.x = J.hips.position.x;
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
      w.g.position.y = (1 - w.k) * -.7;
      if (!reduceMotion) for (const fn of w.ticks) fn(tAll, dt);
      const fading = w.k < .97;
      for (const e of w.reg) {
        if (e.tone === 'solid' || e.tone === 'lit') { if (e.m.transparent !== fading) { e.m.transparent = fading; e.m.needsUpdate = true; } e.m.opacity = fading ? w.k : 1; }
        else e.m.opacity = e.base * e.mul * w.k;
      }
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
