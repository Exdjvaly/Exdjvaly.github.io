/* VOLTHERM Hub Core / Hub Pro als drehbares 3D-Modell (aus den CAD-Daten der Gehäuse).
   Displays sind lebende Canvas-Texturen mit Beispielwerten. */
import * as THREE from 'three';
import { STLLoader } from 'three/addons/STLLoader.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const box = document.getElementById('fx-3d');
const cv = document.getElementById('hub3d-canvas');
if (box && cv) {
  let gestartet = false;
  const los = () => { if (!gestartet) { gestartet = true; init(); } };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { io.disconnect(); los(); } }, { rootMargin: '300px' });
    io.observe(box);
  } else los();
}

function init() {
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); }
  catch (e) { box.classList.add('fehler'); box.querySelector('.fx-3d-laden').textContent = '3D wird von diesem Browser nicht unterstützt.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const cam = new THREE.PerspectiveCamera(30, 1, 10, 5000);
  cam.position.set(330, 150, 620);
  const ctl = new OrbitControls(cam, cv);
  ctl.enableZoom = false; ctl.enablePan = false; ctl.enableDamping = true; ctl.dampingFactor = .08;
  ctl.minPolarAngle = Math.PI * .22; ctl.maxPolarAngle = Math.PI * .58;
  ctl.autoRotate = !ruhig; ctl.autoRotateSpeed = 1.1;
  ctl.target.set(0, -6, 0);
  cv.addEventListener('pointerdown', () => { ctl.autoRotate = false; box.classList.add('angefasst'); });

  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(300, 500, 400); scene.add(key);
  const rim = new THREE.DirectionalLight(0x3c8aff, 2.2); rim.position.set(-500, 200, -400); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x19c3e6, 1.2); rim2.position.set(500, 0, -300); scene.add(rim2);

  // weicher Schatten
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sg = sc.getContext('2d'), sr = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  sr.addColorStop(0, 'rgba(0,0,0,.7)'); sr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = sr; sg.fillRect(0, 0, 256, 256);
  const schatten = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  schatten.rotation.x = -Math.PI / 2; schatten.position.y = -68; scene.add(schatten);

  const M = {
    gehaeuse: new THREE.MeshPhysicalMaterial({ color: 0x14171b, metalness: .35, roughness: .42, clearcoat: .6, clearcoatRoughness: .3 }),
    front: new THREE.MeshPhysicalMaterial({ color: 0x1d4f93, metalness: .25, roughness: .35, clearcoat: 1, clearcoatRoughness: .15 }),
    schwarz: new THREE.MeshPhysicalMaterial({ color: 0x08090b, metalness: .2, roughness: .3, clearcoat: 1 }),
    metall: new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 1, roughness: .25 }),
  };

  const loader = new STLLoader();
  const laden = (url, mat) => new Promise((ok, err) => loader.load(url, (g) => { g.computeVertexNormals(); ok(new THREE.Mesh(g, mat)); }, undefined, err));
  const modelle = {};
  let aktiv = null, bild = null, bildTex = null;

  function bildschirm(typ) {
    const c = document.createElement('canvas');
    if (typ === 'core') { c.width = c.height = 512; } else { c.width = 1024; c.height = 600; }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { c, g: c.getContext('2d'), tex, typ };
  }
  function zeichneCore(b, t) {
    const g = b.g, w = 512, kw = (6.4 + Math.sin(t / 2200) * .4);
    g.fillStyle = '#05080d'; g.fillRect(0, 0, w, w);
    const r = g.createRadialGradient(256, 256, 40, 256, 256, 256); r.addColorStop(0, '#1b2a3d'); r.addColorStop(1, '#05080d');
    g.fillStyle = r; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
    g.lineCap = 'round'; g.lineWidth = 22;
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(256, 256, 200, Math.PI * .75, Math.PI * 2.25); g.stroke();
    const anteil = kw / 10, gr = g.createLinearGradient(60, 0, 450, 0); gr.addColorStop(0, '#FFB23F'); gr.addColorStop(1, '#FFE07A');
    g.strokeStyle = gr; g.beginPath(); g.arc(256, 256, 200, Math.PI * .75, Math.PI * (.75 + 1.5 * anteil)); g.stroke();
    // Sonne
    g.fillStyle = '#FFC94A'; g.beginPath(); g.arc(256, 150, 20, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#FFC94A'; g.lineWidth = 5;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t / 3000; g.beginPath(); g.moveTo(256 + Math.cos(a) * 30, 150 + Math.sin(a) * 30); g.lineTo(256 + Math.cos(a) * 40, 150 + Math.sin(a) * 40); g.stroke(); }
    g.textAlign = 'center'; g.fillStyle = '#FFC94A'; g.font = '700 26px Inter, system-ui, sans-serif'; g.fillText('ENERGIE', 256, 210);
    g.fillStyle = '#fff'; g.font = '800 104px Inter, system-ui, sans-serif'; g.fillText(kw.toFixed(1).replace('.', ','), 240, 300);
    g.font = '600 34px Inter, system-ui, sans-serif'; g.fillStyle = '#c9d2de'; g.fillText('kW', 372, 300);
    g.font = '500 26px Inter, system-ui, sans-serif'; g.fillStyle = '#9aa6b8'; g.fillText('von der Sonne', 256, 340);
    g.fillText('Speicher 82 %', 256, 376);
    b.tex.needsUpdate = true;
  }
  function kachel(g, x, y, w, h, titel, wert, farbe) {
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill();
    g.fillStyle = '#9aa6b8'; g.font = '500 22px Inter, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(titel, x + 16, y + 32);
    g.fillStyle = farbe; g.font = '800 38px Inter, system-ui, sans-serif'; g.fillText(wert, x + 16, y + 76);
  }
  function zeichnePro(b, t) {
    const g = b.g, W = 1024, H = 600, kw = 6.8 + Math.sin(t / 2200) * .3;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1422'); bg.addColorStop(1, '#060a12');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.font = '800 34px Inter, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('VOLTHERM', 32, 58);
    const d = new Date(); g.textAlign = 'right'; g.font = '600 28px Inter, system-ui, sans-serif';
    g.fillText(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), 992, 58);
    kachel(g, 32, 86, 160, 96, 'Sonne', kw.toFixed(1).replace('.', ',') + ' kW', '#FFC94A');
    kachel(g, 204, 86, 160, 96, 'Haus', '1,4 kW', '#ffffff');
    kachel(g, 376, 86, 160, 96, 'Speicher', '82 %', '#2FD18B');
    kachel(g, 548, 86, 160, 96, 'Netz', '0,2 kW', '#5FD4F0');
    // Kurve
    g.fillStyle = 'rgba(255,255,255,.04)'; g.beginPath(); g.roundRect(32, 196, 676, 250, 16); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#FFC94A'; g.beginPath();
    for (let x = 0; x <= 640; x += 8) { const u = x / 640, y = 420 - Math.exp(-Math.pow((u - .5) / .16, 2)) * 180; x ? g.lineTo(50 + x, y) : g.moveTo(50, y); } g.stroke();
    g.strokeStyle = '#5FD4F0'; g.beginPath();
    for (let x = 0; x <= 640; x += 8) { const u = x / 640, y = 380 + Math.sin(u * 6.28 + 1) * 18; x ? g.lineTo(50 + x, y) : g.moveTo(50, y); } g.stroke();
    const jetzt = ((t / 40) % 640); const yj = 420 - Math.exp(-Math.pow((jetzt / 640 - .5) / .16, 2)) * 180;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(50 + jetzt, yj, 8, 0, Math.PI * 2); g.fill();
    kachel(g, 32, 462, 216, 104, 'Warmwasser', '52 °C', '#FF7A3D');
    kachel(g, 262, 462, 216, 104, 'Wallbox', '11 kW', '#3C9BFF');
    kachel(g, 492, 462, 216, 104, 'Klima', '22 °C', '#ffffff');
    // KI
    g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.roundRect(724, 86, 268, 480, 16); g.fill();
    g.textAlign = 'left'; g.fillStyle = '#5FD4F0'; g.font = '700 22px Inter, system-ui, sans-serif'; g.fillText('VOLTHERM KI', 744, 122);
    g.fillStyle = 'rgba(95,212,240,.18)'; g.beginPath(); g.roundRect(744, 140, 228, 84, 14); g.fill();
    g.fillStyle = '#dff6fc'; g.font = '500 21px Inter, system-ui, sans-serif'; g.fillText('Lohnt sich jetzt', 760, 174); g.fillText('die Waschmaschine?', 760, 202);
    g.fillStyle = '#e8eef9'; g.font = '500 21px Inter, system-ui, sans-serif';
    ['Ja. Gerade kommen', kw.toFixed(1).replace('.', ',') + ' kW vom Dach,', 'der Speicher ist', 'zu 82 % voll.'].forEach((z, i) => g.fillText(z, 744, 262 + i * 30));
    b.tex.needsUpdate = true;
  }

  async function baue(typ) {
    const p = '/assets/hub3d/' + typ + '/';
    const grp = new THREE.Group();
    const teile = typ === 'core'
      ? [['1-korpus', M.gehaeuse], ['2-frontplatte', M.front], ['3-rueckwand', M.gehaeuse], ['ref-drehdisplay', M.schwarz], ['ref-kippschalter', M.metall], ['ref-taster', M.metall]]
      : [['1-korpus', M.gehaeuse], ['2-frontplatte', M.front], ['3-rueckwand', M.gehaeuse], ['ref-display', M.schwarz], ['ref-kippschalter', M.metall], ['ref-taster', M.metall]];
    const meshes = await Promise.all(teile.map(([n, m]) => laden(p + n + '.stl', m)));
    meshes.forEach((m) => grp.add(m));
    const b = bildschirm(typ);
    const scr = new THREE.MeshBasicMaterial({ map: b.tex, toneMapped: false });
    if (typ === 'core') {
      const s = new THREE.Mesh(new THREE.CircleGeometry(27.5, 64), scr); s.position.set(6, -3, 189.4); grp.add(s);
    } else {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(156, 91.5), scr); s.position.set(-48, 0, 172.4); grp.add(s);
    }
    // Ursprung in die Mitte des Gehäuses
    grp.position.z = -88;
    const holder = new THREE.Group(); holder.add(grp);
    return { holder, b, breite: typ === 'core' ? 244 : 360 };
  }

  async function zeige(typ) {
    box.classList.add('laedt');
    if (!modelle[typ]) {
      try { modelle[typ] = await baue(typ); }
      catch (e) { box.querySelector('.fx-3d-laden').textContent = '3D-Modell konnte nicht geladen werden.'; return; }
    }
    if (aktiv) scene.remove(aktiv.holder);
    aktiv = modelle[typ]; scene.add(aktiv.holder);
    bild = aktiv.b;
    schatten.scale.set(aktiv.breite * 1.5, 220, 1);
    const dist = typ === 'core' ? 640 : 820;
    const dir = cam.position.clone().sub(ctl.target).normalize();
    cam.position.copy(ctl.target).addScaledVector(dir, dist);
    box.classList.remove('laedt'); box.classList.add('bereit');
  }

  function groesse() {
    const r = box.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
  }
  groesse(); addEventListener('resize', groesse);

  let sichtbar = true, letzteBild = 0;
  new IntersectionObserver((e) => { sichtbar = e[0].isIntersecting; if (sichtbar) requestAnimationFrame(schleife); }).observe(box);
  function schleife(t) {
    if (!sichtbar) return;
    ctl.update();
    if (bild && t - letzteBild > 120) { letzteBild = t; bild.typ === 'core' ? zeichneCore(bild, t) : zeichnePro(bild, t); }
    renderer.render(scene, cam);
    requestAnimationFrame(schleife);
  }

  document.querySelectorAll('.fx-wahl button').forEach((btn) => btn.addEventListener('click', () => {
    const typ = btn.dataset.modell;
    document.querySelectorAll('.fx-wahl button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    document.querySelectorAll('.fx-specs').forEach((s) => { s.hidden = s.dataset.specs !== typ; });
    zeige(typ);
  }));
  zeige('core').then(() => requestAnimationFrame(schleife));
}
