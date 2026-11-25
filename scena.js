// Goroz AI · scena 3D del sito (v2, 25/11/2026): direzione A (notte stellata) con le scene di C (dentro il modello).
// Gufo rifinito da Blender (assets/gufo.glb) + oggetti 3D dei reel rifatti qui: tasti volanti (token), lavagnetta,
// portatile con terminale, e la rete neurale di particelle. Tutto guidato dallo scorrimento.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const ridotto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const telefono = () => innerWidth < 760;
const C = { crema: "#F3EFE8", carta: "#F7F2EA", terracotta: "#D97757", corpo: "#D47952", ocra: "#E3B75A", salvia: "#8DBF7A", ardesia: "#8FAACB", inchiostro: "#2B2927", notte: "#141312" };

const canvas = document.getElementById("scena");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
scene.fog = new THREE.FogExp2(0x141312, 0.03);
const nebbiaVerso = new THREE.Color(0x141312);
window.gorozFondo = (c) => nebbiaVerso.set(c);
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.2, 9);

scene.add(new THREE.HemisphereLight(0xf3efe8, 0x1b1a18, 0.8));
const chiave = new THREE.DirectionalLight(0xfff1e2, 2.4); chiave.position.set(3, 4, 5); scene.add(chiave);
const fredda = new THREE.DirectionalLight(0x8faacb, 0.8); fredda.position.set(-5, 1, 3); scene.add(fredda);
const contro = new THREE.DirectionalLight(0xd97757, 3); contro.position.set(0, -1, -6); scene.add(contro);

// ---------- utilità ----------
const mix = (a, b, t) => a + (b - a) * t;
function etichetta(testo, { w = 256, h = 128, fondo = null, colore = C.inchiostro, font = "700 64px 'JetBrains Mono', monospace" } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (fondo) { g.fillStyle = fondo; g.fillRect(0, 0, w, h); }
  g.fillStyle = colore; g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  let size = parseInt(font.match(/(\d+)px/)[1], 10);
  while (g.measureText(testo).width > w * 0.84 && size > 18) { size -= 4; g.font = font.replace(/\d+px/, size + "px"); }
  g.fillText(testo, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const puntoTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

// ---------- cielo di token ----------
const N = telefono() ? 700 : 1500;
const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
const tinte = [C.crema, C.terracotta, C.ocra, C.ardesia].map((c) => new THREE.Color(c));
for (let i = 0; i < N; i++) {
  pos.set([(Math.random() - 0.5) * 32, (Math.random() - 0.5) * 20, -Math.random() * 24 + 2], i * 3);
  const c = tinte[Math.random() < 0.72 ? 0 : 1 + Math.floor(Math.random() * 3)];
  col.set([c.r, c.g, c.b], i * 3);
}
const geoS = new THREE.BufferGeometry();
geoS.setAttribute("position", new THREE.BufferAttribute(pos, 3));
geoS.setAttribute("color", new THREE.BufferAttribute(col, 3));
const stelle = new THREE.Points(geoS, new THREE.PointsMaterial({ size: 0.085, map: puntoTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
scene.add(stelle);

// ---------- gufo ----------
const perno = new THREE.Group(), sguardo = new THREE.Group();
perno.add(sguardo); scene.add(perno);
let mixer = null, saluto = null, gufo = null;
const occhi = { aperti: [], chiusi: [] };
function occhiAperti(v) { occhi.aperti.forEach((o) => (o.visible = v)); occhi.chiusi.forEach((o) => (o.visible = !v)); }

const cacheRicolora = new Map();
function ricolora(tex) {
  if (cacheRicolora.has(tex)) return cacheRicolora.get(tex);
  const img = tex.image, c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const corpo = [0xD4, 0x79, 0x52], placca = [0x9C, 0x52, 0x37];
  for (let i = 0; i < p.length; i += 4) { const k = (p[i] + p[i + 1] + p[i + 2]) / 765; for (let j = 0; j < 3; j++) p[i + j] = corpo[j] + (placca[j] - corpo[j]) * k; }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = tex.flipY; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT;
  cacheRicolora.set(tex, t); return t;
}

const draco = new DRACOLoader().setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/");
new GLTFLoader().setDRACOLoader(draco).load("assets/gufo.glb", (gltf) => {
  gufo = gltf.scene;
  const via = [];
  gufo.traverse((o) => {
    if (/fondale|studio|^cam/i.test(o.name) && !o.isBone) via.push(o);
    // archi = occhi chiusi ad arco; occhi.aperti.* = iride, pupilla, riflesso (nel .blend li alterna la proprietà occhi_aperti)
    if (/^archi/i.test(o.name)) occhi.chiusi.push(o);
    // GLTFLoader toglie i punti dai nomi: "occhi.aperti.iride.L" arriva come "occhiapertiirideL"
    if (/^occhi[._]?aperti/i.test(o.name)) occhi.aperti.push(o);
    if (o.isMesh) {
      o.frustumCulled = false;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => { if (m && "metalness" in m) { m.metalness = Math.min(m.metalness, 0.05); m.roughness = Math.max(m.roughness, 0.45); } });
      if (!o.geometry.attributes.uv && ms.some((m) => m && m.map)) { o.material = ms[0].clone(); o.material.map = null; o.material.color.set(C.corpo); }
      else if (ms[0] && ms[0].map && /corpo/i.test(ms[0].name)) { o.material = ms[0].clone(); o.material.map = ricolora(ms[0].map); }
    }
  });
  via.forEach((o) => o.parent && o.parent.remove(o));
  occhiAperti(true);
  const box = new THREE.Box3().setFromObject(gufo);
  const dim = box.getSize(new THREE.Vector3()), centro = box.getCenter(new THREE.Vector3());
  const s = 2.6 / dim.y;
  gufo.scale.setScalar(s);
  gufo.position.set(-centro.x * s, -box.min.y * s - 1.3, -centro.z * s);
  sguardo.add(gufo);
  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(gufo);
    saluto = mixer.clipAction(gltf.animations[0]);
    saluto.setLoop(THREE.LoopOnce, 1);
    saluto.play(); mixer.setTime(0); saluto.stop();
  }
  document.documentElement.classList.add("gufo-pronto");
  if (!ridotto) {
    gsap.from(perno.position, { y: -4, duration: 1.6, ease: "expo.out" });
    gsap.from(perno.rotation, { y: -Math.PI, duration: 1.8, ease: "expo.out" });
  }
  battito();
});

// Battito casuale e occhi chiusi al clic
let chiusiFino = 0;
function battito() {
  if (ridotto) return;
  setTimeout(() => { if (performance.now() > chiusiFino) { occhiAperti(false); setTimeout(() => performance.now() > chiusiFino && occhiAperti(true), 140); } battito(); }, 2600 + Math.random() * 3800);
}
function salutaEChiudi() {
  chiusiFino = performance.now() + 1300;
  occhiAperti(false); setTimeout(() => occhiAperti(true), 1300);
  if (saluto) saluto.reset().play();
  if (!ridotto) gsap.fromTo(sguardo.position, { y: 0 }, { y: 0.3, duration: 0.22, yoyo: true, repeat: 1, ease: "power2.out" });
}
window.gorozSaluta = salutaEChiudi;

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function suGufo(x, y) {
  if (!gufo) return false;
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(gufo, true).length > 0;
}
addEventListener("click", (e) => {
  if (e.target.closest("a, button, input, label, .testo")) return;
  if (suGufo(e.clientX, e.clientY)) salutaEChiudi();
});
let ultimoHover = 0;
addEventListener("pointermove", (e) => {
  const t = performance.now(); if (t - ultimoHover < 90) return; ultimoHover = t;
  document.body.classList.toggle("sul-gufo", !e.target.closest("a, button, input, .testo") && suGufo(e.clientX, e.clientY));
}, { passive: true });

// ---------- tasti volanti = token ----------
const TOKEN = ["Il", " gufo", " spieg", "a", " l'", "intellig", "enza", " artific", "iale", " a", " chi", " parte", " da", " zero", "."];
const tasti = new THREE.Group(); scene.add(tasti);
const geoTasto = new RoundedBoxGeometry(1, 0.62, 0.36, 4, 0.12);
const tastiDati = TOKEN.map((tok, i) => {
  const largo = Math.max(0.62, 0.18 + tok.trim().length * 0.17);
  const caldo = i % 4 === 1;
  const corpo = new THREE.Mesh(geoTasto, new THREE.MeshStandardMaterial({ color: caldo ? C.terracotta : "#E9E3DA", roughness: 0.55 }));
  corpo.scale.x = largo;
  const faccia = new THREE.Mesh(new THREE.PlaneGeometry(largo * 0.86, 0.46), new THREE.MeshBasicMaterial({
    map: etichetta(tok.replace(/ /g, "·"), { w: 64 + Math.round(largo * 180), h: 128, colore: caldo ? C.crema : C.inchiostro }), transparent: true, toneMapped: false }));
  faccia.position.z = 0.185;
  const g = new THREE.Group(); g.add(corpo, faccia); tasti.add(g);
  return { g, largo, fase: Math.random() * Math.PI * 2, r: 2.0 + Math.random() * 1.3, h: (Math.random() - 0.5) * 2.6, vel: 0.12 + Math.random() * 0.1, rot: new THREE.Euler((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.6) };
});
function posRiga(mob) {
  // Disposizione in righe, come la frase divisa in token
  const maxW = mob ? 3.4 : 5.2, gap = 0.08, righe = [[]]; let w = 0;
  tastiDati.forEach((d) => { if (w + d.largo > maxW && righe.at(-1).length) { righe.push([]); w = 0; } righe.at(-1).push(d); w += d.largo + gap; });
  const out = new Map();
  righe.forEach((r, ri) => {
    const tot = r.reduce((a, d) => a + d.largo + gap, -gap); let x = -tot / 2;
    r.forEach((d) => { out.set(d, new THREE.Vector3(x + d.largo / 2, -ri * 0.74, 0)); x += d.largo + gap; });
  });
  return out;
}

// ---------- lavagnetta ----------
const lavagna = new THREE.Group(); scene.add(lavagna);
const cornice = new THREE.Mesh(new RoundedBoxGeometry(2.5, 1.75, 0.12, 3, 0.04), new THREE.MeshStandardMaterial({ color: "#C9A46A", roughness: 0.7 }));
const lavCanvas = document.createElement("canvas"); lavCanvas.width = 1024; lavCanvas.height = 700;
const lavTex = new THREE.CanvasTexture(lavCanvas); lavTex.colorSpace = THREE.SRGBColorSpace;
const piano = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.56), new THREE.MeshStandardMaterial({ map: lavTex, roughness: 0.95 }));
piano.position.z = 0.065;
const gesso = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.06, 0.06, 2, 0.02), new THREE.MeshStandardMaterial({ color: "#F7F2EA" }));
gesso.position.set(0.7, -0.92, 0.1);
lavagna.add(cornice, piano, gesso);
function disegnaLavagna(parola = "notte", perc = 69, frase = "Il gufo vola di …") {
  const g = lavCanvas.getContext("2d");
  g.fillStyle = "#3F5C50"; g.fillRect(0, 0, 1024, 700);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`; g.fillRect(Math.random() * 1024, Math.random() * 700, 3, 3); }
  g.fillStyle = "rgba(247,242,234,.75)"; g.font = "600 52px Figtree, sans-serif"; g.textAlign = "left"; g.fillText(frase, 70, 120);
  g.fillStyle = "#F7F2EA"; g.font = "900 190px Figtree, sans-serif"; g.fillText(parola, 70, 380);
  g.fillStyle = C.ocra; g.font = "900 120px 'JetBrains Mono', monospace"; g.fillText(perc + "%", 70, 590);
  lavTex.needsUpdate = true;
}
disegnaLavagna();
window.gorozLavagna = (p, n) => disegnaLavagna(p, n);
document.fonts?.ready.then(() => disegnaLavagna());

// ---------- portatile con terminale ----------
const portatile = new THREE.Group(); scene.add(portatile);
const metallo = new THREE.MeshStandardMaterial({ color: "#2E2C2A", roughness: 0.4, metalness: 0.05 });
const base = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.1, 1.75, 3, 0.04), metallo);
const coperchio = new THREE.Group(); coperchio.position.set(0, 0.05, -0.86);
const schermoScatola = new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.7, 0.07, 3, 0.03), metallo);
schermoScatola.position.y = 0.85;
const termCanvas = document.createElement("canvas"); termCanvas.width = 1024; termCanvas.height = 640;
const termTex = new THREE.CanvasTexture(termCanvas); termTex.colorSpace = THREE.SRGBColorSpace;
const schermo = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 1.52), new THREE.MeshBasicMaterial({ map: termTex, toneMapped: false }));
schermo.position.set(0, 0.85, 0.04);
coperchio.add(schermoScatola, schermo); coperchio.rotation.x = -0.18;
const tastiera = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), new THREE.MeshStandardMaterial({ color: "#1E1D1B", roughness: 0.8 }));
tastiera.rotation.x = -Math.PI / 2; tastiera.position.set(0, 0.052, -0.15);
portatile.add(base, tastiera, coperchio);
const luceSchermo = new THREE.PointLight(0xe3b75a, 0, 4); luceSchermo.position.set(0, 1.1, 0.6); portatile.add(luceSchermo);
function disegnaTerminale(righe) {
  const g = termCanvas.getContext("2d");
  g.fillStyle = "#0E0D0C"; g.fillRect(0, 0, 1024, 640);
  g.fillStyle = "#1E1D1B"; g.fillRect(0, 0, 1024, 54);
  [C.terracotta, "#3A3633", "#3A3633"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(34 + i * 30, 27, 9, 0, 7); g.fill(); });
  g.font = "500 30px 'JetBrains Mono', monospace";
  const colori = { io: "#E8A07E", chiede: C.ocra, ok: C.salvia, "": "#EDE6DD" };
  let y = 110;
  righe.forEach(([c, t]) => {
    const parole = t.split(" "); let riga = "";
    parole.forEach((p) => { if (g.measureText(riga + p).width > 940) { g.fillStyle = colori[c]; g.fillText(riga, 36, y); y += 44; riga = ""; } riga += p + " "; });
    g.fillStyle = colori[c]; g.fillText(riga, 36, y); y += 52;
  });
  termTex.needsUpdate = true;
}
disegnaTerminale([["", "_"]]);
window.gorozTerminale = disegnaTerminale;

// ---------- rete neurale (dentro il modello) ----------
const rete = new THREE.Group(); scene.add(rete);
const strati = [5, 8, 8, 8, 4], nodi = [];
strati.forEach((n, si) => { for (let i = 0; i < n; i++) nodi.push({ s: si, p: new THREE.Vector3((si - 2) * 1.35, (i - (n - 1) / 2) * 0.52, (Math.random() - 0.5) * 0.8) }); });
const archi = [];
nodi.forEach((a, ia) => nodi.forEach((b, ib) => { if (b.s === a.s + 1 && Math.random() < 0.55) archi.push([ia, ib]); }));
const geoN = new THREE.BufferGeometry().setFromPoints(nodi.map((n) => n.p));
const puntiRete = new THREE.Points(geoN, new THREE.PointsMaterial({ size: 0.32, map: puntoTex, color: C.crema, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
const geoL = new THREE.BufferGeometry().setFromPoints(archi.flatMap(([a, b]) => [nodi[a].p, nodi[b].p]));
const lineeRete = new THREE.LineSegments(geoL, new THREE.LineBasicMaterial({ color: C.ardesia, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
// percorso "inventato": una catena che si accende in ocra e poi sfarfalla
const percorso = [];
let cur = nodi.findIndex((n) => n.s === 0) + 2;
for (let s = 0; s < strati.length - 1; s++) { const prossimi = archi.filter(([a]) => a === cur); if (!prossimi.length) break; const e = prossimi[Math.floor(prossimi.length / 2)]; percorso.push(e); cur = e[1]; }
const geoP = new THREE.BufferGeometry().setFromPoints(percorso.flatMap(([a, b]) => [nodi[a].p, nodi[b].p]));
const lineaPercorso = new THREE.LineSegments(geoP, new THREE.LineBasicMaterial({ color: C.ocra, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
const NP = 60, impulsi = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(NP * 3), 3)),
  new THREE.PointsMaterial({ size: 0.16, map: puntoTex, color: C.terracotta, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
const impDati = Array.from({ length: NP }, () => ({ e: Math.floor(Math.random() * archi.length), t: Math.random(), v: 0.4 + Math.random() * 0.6 }));
rete.add(lineeRete, puntiRete, lineaPercorso, impulsi);

// ---------- pose per capitolo ----------
// owl: x y ry rx s · tasti: presenza, allinea, tx ty ts · lav: presenza, lx ly ls · rete: presenza, nx ny ns · pc: presenza, px py ps
const P = (o) => Object.assign({ x: 0, y: -0.75, ry: 0, rx: 0.02, s: 1.18, tasti: 0, allinea: 0, tx: 0, ty: 1.2, ts: 1, lav: 0, lx: -1.2, ly: 0.1, ls: 1, rete: 0, nx: 0, ny: 0.2, ns: 1, pc: 0, px: -1, py: -1, ps: 1, cz: 9 }, o);
const POSE = {
  desk: [
    P({}),
    P({ x: 3.1, y: -1.05, ry: -0.5, s: 0.86, tasti: 1, allinea: 1, tx: 2.0, ty: 1.2, ts: 0.72 }),
    P({ x: -3.25, y: -1.0, ry: 0.55, s: 0.84, lav: 1, lx: -1.45, ly: 0.3, ls: 1.08 }),
    P({ x: 3.35, y: -1.3, ry: -0.75, rx: 0.1, s: 0.52, rete: 1, nx: 2.05, ny: 0.25, ns: 0.98, cz: 8.2 }),
    P({ x: -3.35, y: -1.0, ry: 0.65, s: 0.84, pc: 1, px: -1.4, py: -0.95, ps: 1.02 }),
    P({ x: 3.1, y: -0.7, ry: -0.35, s: 0.78, tasti: 1, allinea: 0 }),
  ],
  mob: [
    P({ y: -0.6, s: 0.92 }),
    P({ x: 0.75, y: 0.75, ry: -0.4, s: 0.46, tasti: 1, allinea: 1, tx: -0.15, ty: 1.75, ts: 0.4 }),
    P({ x: 0.95, y: 0.8, ry: 0.4, s: 0.44, lav: 1, lx: -0.45, ly: 1.35, ls: 0.62 }),
    P({ x: 0.95, y: 0.55, ry: -0.6, s: 0.36, rete: 1, nx: 0, ny: 1.45, ns: 0.62, cz: 8.6 }),
    P({ x: 1.0, y: 0.75, ry: 0.5, s: 0.42, pc: 1, px: -0.45, py: 0.8, ps: 0.58 }),
    P({ x: 0.55, y: 1.6, s: 0.36, tasti: 1, allinea: 0 }),
  ],
};
const stato = { ...POSE.desk[0] };

function costruisciTimeline() {
  ScrollTrigger.getById("gufo")?.kill();
  const pose = telefono() ? POSE.mob : POSE.desk;
  Object.assign(stato, pose[0]);
  const sezioni = [...document.querySelectorAll("[data-cap]")];
  const tl = gsap.timeline({ scrollTrigger: { id: "gufo", trigger: "main", start: "top top", end: "bottom bottom", scrub: ridotto ? true : 1.1 } });
  const totale = document.querySelector("main").offsetHeight - innerHeight;
  sezioni.forEach((sez, i) => {
    if (i === 0) return;
    const inizio = Math.max(0, (sez.offsetTop - innerHeight * 0.95) / totale);
    const fine = Math.min(1, (sez.offsetTop - innerHeight * 0.05) / totale);
    const dur = Math.max(0.01, fine - inizio), prima = pose[i - 1], dopo = pose[i];
    if (Math.sign(prima.x) !== Math.sign(dopo.x) && Math.abs(prima.x - dopo.x) > 2) {
      // cambio di lato: il gufo scende sotto la scena, attraversa in basso e risale (mai sopra il testo)
      tl.to(stato, { ...dopo, x: prima.x, y: -4.6, s: prima.s, ease: "power2.in", duration: dur * 0.45 }, inizio)
        .set(stato, { x: dopo.x }, inizio + dur * 0.45)
        .to(stato, { y: dopo.y, s: dopo.s, ease: "power2.out", duration: dur * 0.55 }, inizio + dur * 0.45);
    } else tl.to(stato, { ...dopo, ease: "power2.inOut", duration: dur }, inizio);
  });
  tl.to({}, { duration: Math.max(0, 1 - tl.duration()) });
}

const mira = { x: 0, y: 0 };
addEventListener("pointermove", (e) => { mira.x = e.clientX / innerWidth - 0.5; mira.y = e.clientY / innerHeight - 0.5; }, { passive: true });

const orologio = new THREE.Clock(), v = new THREE.Vector3();
let righeTasti = posRiga(false);
function giro() {
  const dt = Math.min(orologio.getDelta(), 0.05), t = ridotto ? 0 : orologio.elapsedTime;
  if (mixer) mixer.update(dt);
  // gufo
  perno.position.set(stato.x, stato.y + Math.sin(t * 1.3) * 0.04, 0);
  perno.rotation.set(stato.rx, stato.ry, 0); perno.scale.setScalar(stato.s);
  sguardo.rotation.y += (mira.x * 0.45 - sguardo.rotation.y) * 0.06;
  sguardo.rotation.x += (mira.y * 0.18 - sguardo.rotation.x) * 0.06;
  camera.position.z = stato.cz;
  scene.fog.color.lerp(nebbiaVerso, 0.04);
  // tasti: in orbita intorno al gufo, poi in riga come una frase
  tasti.visible = stato.tasti > 0.01;
  tastiDati.forEach((d, i) => {
    const a = d.fase + t * d.vel;
    const orbita = v.set(stato.x + Math.cos(a) * d.r * stato.s * 1.1, stato.y + 0.9 * stato.s + d.h * stato.s, Math.sin(a) * d.r * 0.6 - 0.4);
    const riga = righeTasti.get(d);
    const k = stato.allinea;
    d.g.position.set(mix(orbita.x, stato.tx + riga.x * stato.ts, k), mix(orbita.y, stato.ty + riga.y * stato.ts, k) + Math.sin(t * 1.6 + i) * 0.03, mix(orbita.z, 0.6, k));
    d.g.rotation.set(mix(d.rot.x + Math.sin(t * 0.7 + i) * 0.2, 0.08, k), mix(d.rot.y + t * 0.25, -0.12, k), mix(d.rot.z, 0, k));
    d.g.scale.setScalar(stato.tasti * mix(0.7, stato.ts, k));
  });
  // lavagna
  lavagna.visible = stato.lav > 0.01;
  lavagna.position.set(stato.lx, stato.ly + Math.sin(t * 0.9) * 0.03, 0.3);
  lavagna.rotation.set(-0.04, stato.lx < 0 ? 0.32 : -0.32, -0.03);
  lavagna.scale.setScalar(stato.lav * stato.ls);
  // rete
  rete.visible = stato.rete > 0.01;
  rete.position.set(stato.nx, stato.ny, 0);
  rete.rotation.y = -0.35 + Math.sin(t * 0.25) * 0.15;
  rete.scale.setScalar(stato.ns * (0.6 + 0.4 * stato.rete));
  puntiRete.material.opacity = stato.rete; lineeRete.material.opacity = 0.22 * stato.rete; impulsi.material.opacity = stato.rete;
  lineaPercorso.material.opacity = stato.rete * (0.55 + 0.45 * Math.max(0, Math.sin(t * 3.1)) * (Math.sin(t * 11) > -0.2 ? 1 : 0.15));
  const ip = impulsi.geometry.attributes.position;
  impDati.forEach((d, i) => {
    d.t += dt * d.v; if (d.t > 1) { d.t = 0; d.e = Math.floor(Math.random() * archi.length); }
    const [a, b] = archi[d.e]; v.lerpVectors(nodi[a].p, nodi[b].p, d.t); ip.setXYZ(i, v.x, v.y, v.z);
  });
  ip.needsUpdate = true;
  // portatile
  portatile.visible = stato.pc > 0.01;
  portatile.position.set(stato.px, stato.py, 0.4);
  portatile.rotation.set(0.32, (stato.px < 0 ? 0.5 : -0.5) + Math.sin(t * 0.4) * 0.04, 0);
  portatile.scale.setScalar(stato.pc * stato.ps);
  luceSchermo.intensity = stato.pc * 2.5;
  // cielo
  const avanz = ScrollTrigger.getById("gufo")?.progress ?? 0;
  stelle.rotation.y = t * 0.012 + avanz * 0.8; stelle.position.z = avanz * 6;
  renderer.render(scene, camera);
  requestAnimationFrame(giro);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  righeTasti = posRiga(telefono());
  costruisciTimeline(); ScrollTrigger.refresh();
});

gsap.registerPlugin(ScrollTrigger);
if (!ridotto && window.Lenis) {
  const lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
righeTasti = posRiga(telefono());
addEventListener("load", () => { costruisciTimeline(); ScrollTrigger.refresh(); });
costruisciTimeline();
giro();
