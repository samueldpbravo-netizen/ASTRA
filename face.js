/* ASTRA // FACE ENGINE: scoring, 3D head, photo scanner, UI. Data lives in face-data.js */
import { CONFIG, SRC, VIEWS, AREAS, FIXES } from './face-data.js';

const DEMO = /[?&]demo(=|&|$)/.test(location.search);
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const round = (v, d) => { const k = Math.pow(10, d == null ? 1 : d); return Math.round(v * k) / k; };
const G2 = g => g === 'female' ? 'f' : 'm';

const FX = {}; AREAS.forEach(a => a.factors.forEach(f => { f.area = a.id; FX[f.id] = f; }));
const labelsFor = (f, g) => Array.isArray(f.labels) ? f.labels : f.labels[G2(g)];
const idealOf = (f, g) => { const i = f.ideal; return !i ? null : Array.isArray(i) ? i : i[G2(g)]; };
const viewsOf = f => Array.isArray(f.view) ? f.view : [f.view];

/* ---------- normalise + score ---------- */
function norm(f, g, raw){
  let v = raw, c = null;
  if (raw && typeof raw === 'object' && 'value' in raw) { v = raw.value; c = raw.confidence != null ? raw.confidence : raw.c; }
  if (v == null || v === '') return null;
  if (f.type === 'num') { v = Number(v); if (!isFinite(v)) return null; }
  else if (f.type === 'cat') { const L = Array.isArray(f.opts) ? f.opts : Object.keys(f.opts); const m = L.find(x => x.toLowerCase() === String(v).toLowerCase()); if (!m) return null; v = m; }
  else if (f.type === 'grade') { const L = labelsFor(f, g); if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < L.length) v = L[v]; const m = L.find(x => x.toLowerCase() === String(v).toLowerCase()); if (!m) return null; v = m; }
  else v = typeof v === 'number' ? v : String(v).slice(0, 80);
  return c == null || isNaN(Number(c)) ? { v } : { v, c: Math.max(0, Math.min(1, Number(c))) };
}
function evalF(f, g, M){
  const rec = M[f.id]; if (!rec || rec.v == null) return { state: 'none' };
  const out = { state: 'info', v: rec.v, c: rec.c };
  if (f.type === 'info') return out;
  if (f.type === 'num') {
    let x = rec.v;
    if (f.ratio) { const a = M[f.ratio[0]], b = M[f.ratio[1]]; if (!a || !b || !b.v) return Object.assign(out, { state: 'pending', note: 'needs ' + FX[f.ratio[1]].abbr }); x = a.v / b.v; out.x = x; }
    const id = idealOf(f, g); if (!id) return Object.assign(out, { state: 'pending' });
    const dev = x < id[0] ? id[0] - x : x > id[1] ? x - id[1] : 0, tol = f.tol || Math.max(id[1] - id[0], Math.abs((id[0] + id[1]) / 2) * .2) || 1;
    out.score = Math.round(100 * Math.max(0, 1 - dev / tol)); out.side = x < id[0] ? 'below' : x > id[1] ? 'above' : 'in'; out.state = 'scored'; return out;
  }
  if (f.type === 'cat') { const s = Array.isArray(f.opts) ? null : f.opts[rec.v]; if (s == null) return Object.assign(out, { state: 'pending' }); out.score = s; out.state = 'scored'; return out; }
  if (f.type === 'grade') { const L = labelsFor(f, g), i = L.indexOf(String(rec.v)); if (i < 0) return out; out.score = Math.round(100 * (1 - i / (L.length - 1))); out.state = 'scored'; return out; }
  return out;
}
function evalAll(g, M){
  const per = {}, ar = {}; let ws = 0, tot = 0;
  AREAS.forEach(a => {
    let done = 0; const sc = [];
    a.factors.forEach(f => { const e = evalF(f, g, M); per[f.id] = e; if (e.state !== 'none') done++; if (e.state === 'scored') sc.push(e.score); });
    const score = sc.length ? sc.reduce((x, y) => x + y, 0) / sc.length : null;
    ar[a.id] = { done, total: a.factors.length, score, scored: sc.length };
    if (score != null) { const w = a.w * Math.min(1, sc.length / Math.max(1, Math.ceil(a.factors.length * .4))); ws += w; tot += w * score; }
  });
  const score = ws >= .5 ? tot / ws : null;
  return { per, ar, score, rating: score == null ? null : Math.max(0, Math.min(10, CONFIG.ratingFromScore(score))) };
}
const verdict = s => s >= 90 ? ['Ideal', 'v1'] : s >= 75 ? ['Good', 'v2'] : s >= 55 ? ['Fair', 'v3'] : ['Needs work', 'v4'];
const unitTxt = f => f.unit && f.unit !== 'ratio' ? ' ' + f.unit : '';
function idealTxt(f, g){
  if (f.type === 'num') { const i = idealOf(f, g); if (!i) return null; const b = i[0] + ' to ' + i[1] + unitTxt(f); return f.ratio ? FX[f.ratio[0]].abbr + ' / ' + FX[f.ratio[1]].abbr + ' ' + b : b; }
  if (f.type === 'cat') return Array.isArray(f.opts) ? null : Object.keys(f.opts).filter(k => f.opts[k] >= 90).join(' or ');
  if (f.type === 'grade') return labelsFor(f, g)[0];
  return null;
}
const valTxt = (f, e) => f.type === 'num' ? round(e.v, 2) + unitTxt(f) + (e.x != null ? '  (ratio ' + round(e.x, 2) + ')' : '') : String(e.v);
function youAre(f, e){
  if (e.state === 'scored' && f.type === 'num') return e.side === 'in' ? 'Within ideal' : e.side === 'below' ? 'Below ideal' : 'Above ideal';
  if (e.state === 'scored') return verdict(e.score)[0];
  return e.state === 'pending' ? 'Ideal pending' : 'Descriptor (not scored)';
}

/* ---------- demo values (only with ?demo=1) ---------- */
function demoValues(g){
  const M = {};
  AREAS.forEach(a => a.factors.forEach(f => {
    let v;
    if (f.type === 'num') { const id = idealOf(f, g); if (id && !f.ratio) { const mid = (id[0] + id[1]) / 2, tol = f.tol || (id[1] - id[0]) || 1; v = mid + (Math.random() * 2 - 1) * tol * .9; } else v = f.demo[0] + Math.random() * (f.demo[1] - f.demo[0]); }
    else if (f.type === 'cat') { const L = Array.isArray(f.opts) ? f.opts : Object.keys(f.opts); v = L[Math.floor(Math.random() * L.length)]; }
    else if (f.type === 'grade') { const L = labelsFor(f, g); v = L[Math.min(L.length - 1, Math.floor(Math.random() * Math.random() * L.length * 1.4))]; }
    else if (f.opts) v = f.opts[Math.floor(Math.random() * f.opts.length)];
    else v = f.demo ? round(f.demo[0] + Math.random() * (f.demo[1] - f.demo[0]), 1) : 'recorded';
    M[f.id] = { value: v, confidence: round(.6 + Math.random() * .35, 2) };
  }));
  return M;
}

/* ---------- css ---------- */
const CSS = `
.f-tabs{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);margin:0 0 18px;position:relative;overflow:hidden}
.f-tabs:before{content:"";position:absolute;top:0;bottom:0;left:0;width:33.333%;background:#fff;box-shadow:0 0 24px rgba(255,255,255,.5);transition:transform .45s cubic-bezier(.7,0,.2,1)}
.f-tabs[data-i="1"]:before{transform:translateX(100%)}.f-tabs[data-i="2"]:before{transform:translateX(200%)}
.f-tabs button{position:relative;z-index:1;font:inherit;font-family:var(--mono);letter-spacing:.22em;font-size:12px;text-transform:uppercase;padding:14px 4px;background:none;border:0;color:var(--dim);cursor:pointer;transition:color .3s}
.f-tabs button.on{color:#000}
.f-wrap{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:18px;align-items:start}
@media(max-width:900px){.f-wrap{grid-template-columns:1fr}}
.f-stage{position:relative;border:1px solid var(--line);background:radial-gradient(ellipse at 50% 42%,rgba(255,255,255,.08),transparent 66%),rgba(0,0,0,.55);height:min(72vh,620px);min-height:440px;overflow:hidden}
.f-stage canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y;cursor:grab}
.f-hsl{position:absolute;inset:0;pointer-events:none}
.f-hs{position:absolute;left:0;top:0;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;border:0;background:#ff2442;color:#fff;font:700 15px/28px var(--mono);text-align:center;cursor:pointer;padding:0;pointer-events:auto;transition:opacity .25s;box-shadow:0 0 18px #ff2442;will-change:transform}
.f-hs:before{content:"";position:absolute;inset:-2px;border-radius:50%;border:2px solid #ff2442;animation:fpulse 1.4s ease-out infinite}
@keyframes fpulse{from{transform:scale(1);opacity:.9}to{transform:scale(2.5);opacity:0}}
.f-hs.ok{background:#fff;color:#000;box-shadow:0 0 18px #fff}.f-hs.ok:before{display:none}
.f-hs.sel{outline:2px solid #fff;outline-offset:3px}
.f-hs:after{content:attr(data-n);position:absolute;left:36px;top:50%;transform:translateY(-50%);white-space:nowrap;font:10px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:#fff;background:#000;border:1px solid var(--line);padding:4px 8px;opacity:0;pointer-events:none;transition:.2s}
.f-hs:hover:after,.f-hs.sel:after{opacity:1}
.f-hud{position:absolute;left:14px;top:12px;font:10px/1.8 var(--mono);letter-spacing:.22em;color:var(--dim);text-transform:uppercase;pointer-events:none}
.f-sbtn{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);white-space:nowrap}
.f-msg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:30px;color:var(--dim);font:11px var(--mono);letter-spacing:.2em;text-transform:uppercase}
.f-panel{display:grid;gap:12px;min-width:0}
.f-big{font-family:var(--disp);font-size:clamp(26px,4vw,40px);letter-spacing:.08em;text-shadow:0 0 24px rgba(255,255,255,.5);margin:6px 0 2px}
.f-arow{display:flex;align-items:center;gap:14px;padding:13px 14px;border:1px solid var(--line);background:rgba(255,255,255,.03);cursor:pointer;transition:.25s}
.f-arow:hover{border-color:#fff;box-shadow:0 0 22px rgba(255,255,255,.16)}
.f-dot{width:22px;height:22px;border-radius:50%;flex:none;display:grid;place-items:center;font:700 12px var(--mono);background:#ff2442;color:#fff;box-shadow:0 0 12px #ff2442;animation:bp 1.6s infinite}
.f-dot.ok{background:#fff;color:#000;box-shadow:0 0 12px #fff;animation:none}
.f-an{flex:1;min-width:0;font-size:15px}.f-an small{display:block;color:var(--dim);font:10px var(--mono);letter-spacing:.14em;text-transform:uppercase;margin-top:2px}
.f-sc{font:12px var(--mono);letter-spacing:.1em}
.f-row{border:1px solid var(--line);padding:14px 16px;background:rgba(255,255,255,.03)}
.f-row.miss{border-color:rgba(255,36,66,.45)}
.f-rh{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.f-nm{font-size:15px;font-weight:500}.f-ds{color:var(--dim);font-size:12.5px;margin:6px 0 10px;line-height:1.45}
.f-vals{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;margin:8px 0}.f-vals span{display:block;color:var(--dim);font:10px var(--mono);letter-spacing:.18em;text-transform:uppercase;margin-bottom:2px}.f-vals b{font-weight:500}
.f-bar{height:3px;background:var(--line);margin:8px 0}.f-bar i{display:block;height:100%;background:#fff;box-shadow:0 0 8px #fff}
.f-chip{display:inline-block;font:10px var(--mono);letter-spacing:.16em;text-transform:uppercase;border:1px solid var(--line);border-radius:999px;padding:4px 10px;margin:0 6px 6px 0}
.f-chip.v1{background:#fff;color:#000}.f-chip.v2{border-color:#fff}.f-chip.v4{border-color:#ff6b7a;color:#ff8c99}.f-chip.bad{border-color:#ff2442;color:#ff8c99}
.f-fix{margin-top:10px;display:grid;gap:8px;animation:pin .3s}
.f-fixc{border:1px solid var(--line);padding:12px 14px}.f-fixc.lock{opacity:.6;border-style:dashed}
.f-mt{display:flex;gap:16px;font:10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin:8px 0}.f-mt b{color:#fff;font-weight:400}
.f-back{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.f-list .f-row{display:grid;grid-template-columns:1fr auto;gap:4px 16px;padding:12px 14px}
.f-lr{display:grid;gap:8px;margin-top:12px}
.f-seg{display:inline-flex;gap:3px;margin:0 8px}.f-seg i{width:14px;height:5px;background:var(--line)}.f-seg i.on{background:#fff;box-shadow:0 0 6px #fff}.f-mt div{display:flex;align-items:center}.f-fs{color:#cfcfcf;font-size:13px;line-height:1.5;margin-top:8px}.f-risk{color:#ff9aa6}.f-src{margin-top:8px;font-size:9px}
/* scanner */
.f-scanm .f-sbox{width:min(560px,100%);max-height:96vh;overflow:auto;padding:22px}
.f-cam{position:relative;aspect-ratio:3/4;max-height:56vh;margin:0 auto;background:#000;border:1px solid var(--line);overflow:hidden}
.f-cam video,.f-cam img.shot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.f-cam video{transform:scaleX(-1)}
.f-guide{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.f-cd{position:absolute;inset:0;display:grid;place-items:center;font:700 90px var(--disp);color:#fff;text-shadow:0 0 30px #fff;pointer-events:none}
.f-thumbs{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:14px 0}
.f-th{aspect-ratio:1;border:1px solid var(--line);background:#000 center/cover;display:grid;place-items:end center;font:9px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--dim);cursor:pointer;position:relative}
.f-th.on{border-color:#fff;box-shadow:0 0 14px rgba(255,255,255,.5)}.f-th.got:after{content:"\\2713";position:absolute;top:2px;right:4px;color:#fff;font-size:11px}
.f-th span{background:rgba(0,0,0,.7);width:100%;text-align:center;padding:2px 0}
.f-tip{color:#cfcfcf;font-size:14px;margin:10px 0}
.f-chk{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:#cfcfcf;margin:12px 0;cursor:pointer}.f-chk input{width:18px;height:18px;margin-top:2px;flex:none}
.f-busy{padding:40px 10px;text-align:center}
`;

/* ================================================================== */
export function initFace(ctx){
  const { $, el, B, ICO, toast, showM, closeM } = ctx;
  const st = { gender: 'male', age: null, uid: null, data: null, area: null, sub: 0, open: {}, sort: 'best', all: false };
  if (!document.getElementById('f-css')) { const s = document.createElement('style'); s.id = 'f-css'; s.textContent = CSS; document.head.appendChild(s); }
  const root = ctx.root;
  let ev = evalAll('male', {});
  const recompute = () => { ev = evalAll(st.gender, st.data ? st.data.m : {}); };

  /* ---------- 3D head ---------- */
  const stage = el('div', 'f-stage'), cv = document.createElement('canvas'), hsL = el('div', 'f-hsl'), hud = el('div', 'f-hud');
  stage.append(cv, hsL, hud);
  const scanBtn = B('solid f-sbtn', 'Start face scan', 'plus'); stage.append(scanBtn);
  const ANCH = [['eyes', -.28, .13], ['eyebrows', .31, .34], ['hair', 0, .86, 1.06], ['skin', 0, .62], ['nose', 0, -.19], ['mouth', 0, -.50], ['cheeks', .52, -.06], ['maxilla', -.21, -.37], ['underjaw', .34, -.74]];
  const hs = {};
  ANCH.forEach(a => { const area = AREAS.find(x => x.id === a[0]), b = el('button', 'f-hs', '!'); b.type = 'button'; b.dataset.n = area.name; b.setAttribute('aria-label', area.name); b.onclick = () => selectArea(a[0]); hsL.append(b); hs[a[0]] = { b, p: null, n: null }; });
  let T = null, R = null, scene, cam, grp, rings = [], uni = { uT: { value: 0 } }, rotY = 0, rotX = 0, velY = 0, idleAt = 0, drag = null, visible = false, raf = 0, built = null, t0 = performance.now(), ro = null;

  const loadThree = () => window.THREE ? Promise.resolve(window.THREE) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = THREE_URL; s.onload = () => window.THREE ? res(window.THREE) : rej(); s.onerror = rej; document.head.appendChild(s); });
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function buildHead(g){
    const male = g !== 'female', M = male ? 1 : 0, X = .76, Y = 1, Z = .90, grpN = new T.Group();
    const dir = (xw, yw) => { const x = xw / X, y = yw / Y; return new T.Vector3(x, y, Math.sqrt(Math.max(.02, 1 - x * x - y * y))); };
    const F = [], add = (xw, yw, s, a, mir) => { F.push({ d: dir(xw, yw), s, a }); if (mir) F.push({ d: dir(-xw, yw), s, a }); };
    add(0, .31, .16, .03 + .06 * M); add(.22, .30, .13, .03 + .06 * M, 1);          // brow ridge
    add(.30, .13, .12, -(.07 + .02 * M), 1);                                          // eye sockets
    add(0, .60, .30, .03);                                                           // forehead
    add(0, .10, .07, .10); add(0, -.05, .075, .16 + .03 * M); add(0, -.19, .09, .27 + .05 * M); add(.10, -.23, .065, .13 + .02 * M, 1); // nose
    add(.52, -.02, .15, .05 + .015 * M, 1); add(.40, -.30, .15, -.03, 1); add(.42, -.18, .16, .03 - .01 * M, 1); // cheeks
    add(.17, -.34, .11, .035, 1);                                                    // maxilla
    add(0, -.43, .10, .075 + (1 - M) * .02); add(0, -.545, .105, .09 + (1 - M) * .025); add(0, -.485, .045, -.05); // lips
    add(0, -.64, .07, -.04); add(0, -.79, .13, .09 + .04 * M);                      // sulcus + chin
    add(.62, -.50, .15, .01 + .05 * M, 1);                                           // jaw angle
    F.push({ d: new T.Vector3(1, .03, 0), s: .22, a: .13 }, { d: new T.Vector3(-1, .03, 0), s: .22, a: .13 }); // ears
    const shape = v => {
      const taper = 1 - (male ? .16 : .26) * sm(.0, -.85, v.y); let k = 0;
      for (let i = 0; i < F.length; i++) { const q = F[i], dx = v.x - q.d.x, dy = v.y - q.d.y, dz = v.z - q.d.z; k += q.a * Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * q.s * q.s)); }
      const sq = (a, e) => Math.sign(a) * Math.pow(Math.abs(a), e);
      const yy = v.y < 0 ? -Math.pow(-v.y, .78) * .93 : v.y, ex = male ? .80 : .86;
      return new T.Vector3(sq(v.x, ex) * X * taper, yy * Y, sq(v.z, .88) * Z).multiplyScalar(1 + k);
    };
    const vs = 'varying vec3 vN;varying vec3 vP;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vP=position;vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
    const fs = 'uniform float uT;uniform float uL;uniform float uA;uniform float uR;varying vec3 vN;varying vec3 vP;varying vec3 vV;void main(){float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.4);float l=abs(fract(vP.y*uL)-.5);float line=1.0-smoothstep(.0,.09,l);float ang=atan(vP.x,vP.z)*uL*.16;float m=1.0-smoothstep(.0,.07,abs(fract(ang)-.5));float band=exp(-pow((vP.y-sin(uT*.8)*1.1)*7.0,2.0));float lam=max(dot(normalize(vN),normalize(vec3(.25,.45,1.0))),0.0);float a=uA+.34*line+.08*m+uR*rim+.32*band+.22*lam*uR;gl_FragColor=vec4(vec3(1.0),clamp(a,0.,1.));}';
    const mat = (L, A, Rm) => new T.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, transparent: true, uniforms: { uT: uni.uT, uL: { value: L }, uA: { value: A }, uR: { value: Rm == null ? .95 : Rm } } });
    const sk = new T.SphereGeometry(1, 80, 60), pos = sk.attributes.position, V = new T.Vector3();
    for (let i = 0; i < pos.count; i++) { V.fromBufferAttribute(pos, i); const p = shape(V); pos.setXYZ(i, p.x, p.y, p.z); }
    sk.computeVertexNormals(); grpN.add(new T.Mesh(sk, mat(26, .05)));
    // hair shell
    const hg = new T.SphereGeometry(1, 72, 54), hp = hg.attributes.position;
    for (let i = 0; i < hp.count; i++) { V.fromBufferAttribute(hp, i); const p = shape(V).multiplyScalar(1.05); hp.setXYZ(i, p.x, p.y + .02, p.z); }
    const ix = hg.index.array, keep = [], thr = (x, z) => .60 - .52 * sm(.5, .74, Math.abs(x)) - (male ? .9 : 1.45) * sm(.1, -.5, z);
    for (let i = 0; i < ix.length; i += 3) { const a = ix[i], b = ix[i + 1], c = ix[i + 2]; if ((hp.getY(a) + hp.getY(b) + hp.getY(c)) / 3 > thr((hp.getX(a) + hp.getX(b) + hp.getX(c)) / 3, (hp.getZ(a) + hp.getZ(b) + hp.getZ(c)) / 3)) keep.push(a, b, c); }
    hg.setIndex(keep); hg.computeVertexNormals(); grpN.add(new T.Mesh(hg, mat(34, 0, .35)));
    // neck
    const nk = new T.Mesh(new T.CylinderGeometry(.30, .36, .9, 36, 14, true), mat(26, .02, .6)); nk.position.y = -1.18; grpN.add(nk);
    // eyes
    const wm = o => new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: o });
    [-1, 1].forEach(s => {
      const p = shape(dir(s * .30, .13)), eye = new T.Mesh(new T.SphereGeometry(.07, 16, 12), wm(.2)); eye.position.copy(p).add(new T.Vector3(0, 0, -.03)); grpN.add(eye);
      const ring = new T.Mesh(new T.RingGeometry(.026, .042, 24), wm(.95)); ring.position.copy(p).add(new T.Vector3(0, 0, .04)); grpN.add(ring);
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(shape(dir(s * (.12 + .34 * t), .315 + (male ? .012 : .04) * Math.sin(t * Math.PI * .9))).multiplyScalar(1.012)); }
      grpN.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, male ? .012 : .008, 6), wm(.9)));
    });
    // base rings
    rings = [1.0, 1.28].map((r, i) => { const m = new T.Mesh(new T.RingGeometry(r, r + .012, 80), wm(i ? .25 : .5)); m.rotation.x = -Math.PI / 2; m.position.y = -1.62; grpN.add(m); return m; });
    ANCH.forEach(a => { const p = shape(dir(a[1], a[2])).multiplyScalar(a[3] || 1); hs[a[0]].p = p; hs[a[0]].n = p.clone().normalize(); });
    return grpN;
  }

  function stageMsg(t){ let m = stage.querySelector('.f-msg'); if (!m) { m = el('div', 'f-msg'); stage.append(m); } m.textContent = t; hsL.style.display = 'none'; }
  async function mount(){
    if (!T) { try { T = await loadThree(); } catch (e) { stageMsg('3D view needs an internet connection'); return; } }
    try {
      if (!R) {
        R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
        scene = new T.Scene(); cam = new T.PerspectiveCamera(32, 1, .1, 50); cam.position.set(0, -.05, 5.1); cam.lookAt(0, -.1, 0);
        cv.addEventListener('pointerdown', e => { drag = { x: e.clientX }; velY = 0; cv.setPointerCapture(e.pointerId); });
        cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; drag.x = e.clientX; rotY += dx * .008; velY = dx * .002; idleAt = performance.now(); });
        const up = () => { drag = null; idleAt = performance.now(); }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
        ro = new ResizeObserver(resize); ro.observe(stage);
      }
      if (built !== st.gender) { if (grp) { scene.remove(grp); grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } grp = buildHead(st.gender); scene.add(grp); built = st.gender; }
      resize(); if (!raf) raf = requestAnimationFrame(frame);
    } catch (e) { console.error(e); stageMsg('3D view is not supported on this device'); }
  }
  function resize(){ if (!R) return; const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  function frame(now){
    raf = requestAnimationFrame(frame); if (!visible || !R || !grp) return;
    const t = (now - t0) / 1000;
    if (!drag) { if (now - idleAt > 1800) { rotY += (Math.sin(t * .35) * .6 - rotY) * .02; rotX += (0 - rotX) * .03; } rotY += velY; velY *= .92; }
    grp.rotation.set(rotX, rotY, 0); uni.uT.value = t; rings.forEach((r, i) => r.rotation.z += i ? -.003 : .002);
    grp.updateMatrixWorld(); R.render(scene, cam);
    const w = stage.clientWidth, h = stage.clientHeight;
    for (const id in hs) { const a = hs[id]; if (!a.p) continue; const v = a.p.clone().applyMatrix4(grp.matrixWorld), n = a.n.clone().transformDirection(grp.matrixWorld), vis = n.dot(cam.position.clone().sub(v).normalize()) > .22; v.project(cam); a.b.style.transform = 'translate(' + ((v.x * .5 + .5) * w) + 'px,' + ((-v.y * .5 + .5) * h) + 'px)'; a.b.style.opacity = vis ? 1 : 0; a.b.style.pointerEvents = vis ? 'auto' : 'none'; }
  }

  /* ---------- panel ---------- */
  const panel = el('div', 'f-panel'), tabs = el('div', 'f-tabs'), faceEl = el('div', 'f-wrap'), phEl = el('div', 'card static hide');
  faceEl.append(stage, panel);
  ['Face', 'Body', 'Mind'].forEach((n, i) => { const b = el('button', null, n); b.type = 'button'; b.onclick = () => setSub(i); tabs.append(b); });
  root.append(tabs, faceEl, phEl);
  function setSub(i){
    st.sub = i; tabs.dataset.i = i; [...tabs.children].forEach((b, k) => b.classList.toggle('on', k === i));
    faceEl.classList.toggle('hide', i !== 0); phEl.classList.toggle('hide', i === 0);
    if (i) { phEl.replaceChildren(el('div', 'mono', (i === 1 ? 'Body' : 'Mind') + ' // coming next'), el('p', 'dim', 'Face comes first. This section is built after the face system.')); phEl.style.textAlign = 'center'; phEl.style.padding = '60px 20px'; }
    else if (visible) mount();
  }
  const aName = id => AREAS.find(a => a.id === id).name;
  function selectArea(id){ st.area = id; renderPanel(); panel.scrollIntoView && innerWidth < 900 && panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function renderHs(){ AREAS.forEach(a => { const r = ev.ar[a.id], b = hs[a.id].b, ok = r.done === r.total; b.classList.toggle('ok', ok); b.textContent = ok ? '\u2713' : '!'; b.classList.toggle('sel', st.area === a.id); }); hud.innerHTML = 'SUBJECT // ' + (st.gender === 'female' ? 'FEMALE' : 'MALE') + '<br>DRAG TO ROTATE'; scanBtn.lastChild.textContent = st.data ? 'Rescan face' : 'Start face scan'; }
  function render(){ recompute(); renderHs(); renderPanel(); }

  function renderPanel(){
    panel.replaceChildren(st.area ? areaView(st.area) : overview());
  }
  function overview(){
    const w = el('div', 'f-panel'), c = el('div', 'card static'), done = AREAS.filter(a => ev.ar[a.id].done === ev.ar[a.id].total).length, ti = ev.rating != null ? ctx.tierOf(ev.rating, st.gender) : null;
    c.append(el('div', 'n', 'FACE ANALYSIS'));
    if (ev.rating != null) { c.append(el('div', 'f-big', round(ev.rating, 1) + ' / 10'), el('div', 'dim', 'Tier ' + ti.code + ' \u00b7 ' + ti.full + (st.data && st.data.demo ? ' \u00b7 DEMO DATA' : ''))); }
    else c.append(el('div', 'f-big', done + ' / ' + AREAS.length), el('div', 'dim', st.data ? 'Areas fully rated. Missing photos leave some factors unrated.' : 'Areas rated. Scan your face with photos to fill every red marker.'));
    const row = el('div', 'prow'); row.style.marginTop = '14px'; const sb = B('solid', st.data ? 'Rescan' : 'Start face scan', 'plus'); sb.onclick = openScan; row.append(sb); c.append(row); w.append(c);
    AREAS.forEach(a => {
      const r = ev.ar[a.id], ok = r.done === r.total, row = el('div', 'f-arow'), d = el('div', 'f-dot' + (ok ? ' ok' : ''), ok ? '\u2713' : '!'), n = el('div', 'f-an', a.name);
      n.append(el('small', null, r.done + ' / ' + r.total + ' factors' + (r.score != null ? ' \u00b7 score ' + Math.round(r.score) : '')));
      row.append(d, n, el('div', 'f-sc', r.score != null ? verdict(r.score)[0] : 'Not rated')); row.onclick = () => selectArea(a.id); w.append(row);
    });
    return w;
  }
  function areaView(id){
    const a = AREAS.find(x => x.id === id), r = ev.ar[id], w = el('div', 'f-panel'), bk = el('div', 'f-back'), bb = el('button', 'ibtn'); bb.type = 'button'; bb.innerHTML = ICO('back'); bb.onclick = () => { st.area = null; render(); };
    bk.append(bb, el('div', null)); bk.lastChild.append(el('div', 'mono', 'Face area'), el('h3', 'ph', a.name)); bk.lastChild.lastChild.style.margin = '2px 0 0'; w.append(bk);
    const s = el('div', 'card static'); s.append(el('div', 'n', 'STATUS'), el('div', 'f-big', r.done + ' / ' + r.total), el('div', 'dim', r.score != null ? 'Area score ' + Math.round(r.score) + ' / 100 \u00b7 ' + verdict(r.score)[0] : 'Not rated yet. Rate every factor with a photo scan, then fixes unlock.'));
    const need = new Set(); a.factors.forEach(f => { if (ev.per[f.id].state === 'none') viewsOf(f).forEach(v => need.add(v)); });
    if (need.size) { const nw = el('div'); nw.style.marginTop = '10px'; need.forEach(v => nw.append(el('span', 'f-chip bad', 'photo: ' + VIEWS.find(x => x.id === v).name))); s.append(nw); }
    w.append(s); a.factors.forEach(f => w.append(factorRow(f))); return w;
  }
  function factorRow(f){
    const e = ev.per[f.id], r = el('div', 'f-row' + (e.state === 'none' ? ' miss' : '')), h = el('div', 'f-rh');
    h.append(el('div', 'f-nm', f.name), el('div', 'mono', f.abbr)); r.append(h, el('div', 'f-ds', f.desc));
    if (e.state === 'none') { const v = viewsOf(f).map(x => VIEWS.find(y => y.id === x).name).join(' + '); r.append(el('span', 'f-chip bad', '! Not rated'), el('span', 'f-chip', 'needs: ' + v)); return r; }
    const it = idealTxt(f, st.gender), vl = el('div', 'f-vals'), mk = (k, v) => { const d = el('div'); d.append(el('span', null, k), el('b', null, v)); return d; };
    vl.append(mk('You', valTxt(f, e)), mk('Ideal', it || (f.type === 'info' ? 'not scored' : 'pending')), mk('Status', youAre(f, e))); r.append(vl);
    if (e.state === 'scored') { const bar = el('div', 'f-bar'), i = document.createElement('i'); i.style.width = e.score + '%'; bar.append(i); const vd = verdict(e.score); r.append(bar, el('span', 'f-chip ' + vd[1], vd[0] + ' \u00b7 ' + e.score)); }
    if (e.state === 'scored') r.append(el('span', 'f-chip', 'ideal source: ' + SRC[f.src || 'app']));
    if (e.c != null) r.append(el('span', 'f-chip', 'confidence ' + Math.round(e.c * 100) + '%'));
    const fb = B('ghost sm', st.open[f.id] ? 'Hide fixes' : 'How to fix', null); fb.onclick = () => { st.open[f.id] = !st.open[f.id]; renderPanel(); }; fb.style.marginTop = '6px'; r.append(fb);
    if (st.open[f.id]) r.append(fixList(f));
    return r;
  }
  const seg = (n, cls) => { const s = el('span', 'f-seg ' + (cls || '')); for (let i = 0; i < 5; i++) s.append(el('i', i < n ? 'on' : '')); return s; };
  const EV = { verified: ['Verified', 'v1'], mixed: ['Mixed evidence', 'v3'], unverified: ['Unverified claim', 'bad'] };
  const INV = ['procedure', 'surgical', 'medical'];
  const rankFix = x => x.works * 2 + x.safe + (x.evidence === 'verified' ? 3 : x.evidence === 'mixed' ? 1 : 0);
  function fixList(f){
    const box = el('div', 'f-fix'), L = (FIXES[f.id] || []).slice().sort((p, q) => rankFix(q) - rankFix(p));
    if (!L.length) { box.append(el('div', 'dim', 'Fix guides for this factor are being added. Each one will show how well it works, how safe it is, and whether the claim is verified.')); return box; }
    box.append(el('div', 'dim', 'Sorted by how well they work, how safe they are and how well proven. "Unverified claim" means people say it works but it has not been verified.'));
    L.forEach(x => {
      const min = x.minAge != null ? x.minAge : (INV.includes(x.kind) ? CONFIG.minAgeInvasive : 0), lock = min && (st.age == null || st.age < min), c = el('div', 'f-fixc' + (lock ? ' lock' : ''));
      if (lock) { c.append(el('div', 'mono', 'Locked'), el('div', 'dim', 'Procedures, surgery and prescription drugs are only shown to users aged ' + min + ' and over.')); box.append(c); return; }
      const ev = EV[x.evidence] || EV.unverified;
      c.append(el('div', 'f-nm', x.title), el('span', 'f-chip', x.kind), el('span', 'f-chip ' + ev[1], ev[0]));
      const mt = el('div', 'f-mt'); [['Works', x.works], ['Safe', x.safe]].forEach(m => { const s = el('div'); s.append(el('span', null, m[0]), seg(m[1]), el('b', null, m[1] + '/5')); mt.append(s); }); c.append(mt);
      if (x.summary) c.append(el('div', 'f-fs', x.summary)); if (x.risks) c.append(el('div', 'f-fs f-risk', 'Risks: ' + x.risks)); if (x.source) c.append(el('div', 'mono f-src', 'Source: ' + x.source));
      box.append(c);
    });
    return box;
  }

  /* ---------- profile list: best -> worst -> ideal ---------- */
  function listCard(){
    const c = el('div', 'card static f-list'); c.append(el('div', 'n', 'FACE ANALYSIS // ALL FACTORS'));
    if (!st.data) { c.append(el('p', 'dim', 'No scan yet. Scan your face and every factor shows here, ranked from best to worst against the ideal.')); const b = B('solid', 'Open face scan', 'plus'); b.onclick = () => ctx.goHome(); c.append(b); return c; }
    recompute(); const sc = [], other = [];
    AREAS.forEach(a => a.factors.forEach(f => { const e = ev.per[f.id]; if (e.state === 'scored') sc.push([f, e, a]); else if (e.state !== 'none') other.push([f, e, a]); }));
    sc.sort((x, y) => st.sort === 'best' ? y[1].score - x[1].score : x[1].score - y[1].score);
    const top = el('div', 'prow'); top.style.justifyContent = 'space-between';
    const l = el('div'); l.append(el('div', 'f-big', ev.rating != null ? round(ev.rating, 1) + ' / 10' : '--'), el('div', 'dim', (ev.rating != null ? 'Tier ' + ctx.tierOf(ev.rating, st.gender).code : 'Not enough rated areas for a tier') + (st.data.demo ? ' \u00b7 DEMO DATA' : '')));
    const sb = B('ghost sm', st.sort === 'best' ? 'Best first' : 'Worst first', null); sb.onclick = () => { st.sort = st.sort === 'best' ? 'worst' : 'best'; ctx.onChange(); }; top.append(l, sb); c.append(top);
    const list = el('div', 'f-lr');
    (st.all ? sc : sc.slice(0, 8)).forEach(x => { const f = x[0], e = x[1], r = el('div', 'f-row'), vd = verdict(e.score); r.append(el('div', null), el('div', 'f-sc', e.score)); r.firstChild.append(el('div', 'f-nm', f.name), el('div', 'dim', x[2].name + ' \u00b7 you ' + valTxt(f, e) + ' \u00b7 ideal ' + (idealTxt(f, st.gender) || 'pending'))); const bar = el('div', 'f-bar'), i = document.createElement('i'); i.style.width = e.score + '%'; bar.append(i); bar.style.gridColumn = '1 / -1'; r.append(bar); const ch = el('span', 'f-chip ' + vd[1], vd[0]); ch.style.gridColumn = '1 / -1'; r.append(ch); list.append(r); });
    c.append(list);
    if (sc.length > 8) { const m = B('ghost sm', st.all ? 'Show top 8 only' : 'Show all ' + sc.length + ' factors', null); m.style.marginTop = '12px'; m.onclick = () => { st.all = !st.all; ctx.onChange(); }; c.append(m); }
    if (other.length) { const d = document.createElement('details'); d.style.marginTop = '14px'; const s = document.createElement('summary'); s.textContent = 'Measured but not scored (' + other.length + ')'; s.className = 'mono'; s.style.cursor = 'pointer'; d.append(s); other.forEach(x => { const r = el('div', 'f-row'); r.style.marginTop = '8px'; r.append(el('div', 'f-nm', x[0].name), el('div', 'dim', x[2].name + ' \u00b7 ' + valTxt(x[0], x[1]) + ' \u00b7 ' + youAre(x[0], x[1]))); d.append(r); }); c.append(d); }
    const del = B('ghost sm', 'Delete my face data', null); del.style.marginTop = '16px'; del.onclick = async () => { if (!confirm('Delete all stored face measurements and your rating?')) return; try { await ctx.store.clear(); api.setData(null); toast('Face data deleted'); } catch (e) { toast('Could not delete'); } }; c.append(del);
    return c;
  }

  /* ---------- scanner ---------- */
  const sc = { i: 0, shots: {}, stream: null, busy: false, camOk: false };
  let modal = null, vid, shot, cd, guide, tipEl, ttl, chips, btnRow, thumbs, finalBox, chk, goBtn, camBox, fileIn;
  const guideSvg = v => {
    const prof = v === 'right' || v === 'left';
    return '<svg class="f-guide" viewBox="0 0 100 133" preserveAspectRatio="none" fill="none" stroke="#fff" stroke-width=".5" stroke-dasharray="2 1.5" opacity=".8">' +
      (prof ? '<path d="M' + (v === 'right' ? '62' : '38') + ' 20 C' + (v === 'right' ? '84 24 84 60 74 72 C70 84 64 96 54 106' : '16 24 16 60 26 72 C30 84 36 96 46 106') + '"/><line x1="10" y1="52" x2="90" y2="52"/><line x1="50" y1="14" x2="50" y2="118"/>'
        : '<ellipse cx="50" cy="62" rx="27" ry="38"/><line x1="50" y1="14" x2="50" y2="118"/><line x1="14" y1="52" x2="86" y2="52"/><line x1="14" y1="82" x2="86" y2="82"/>') + '</svg>';
  };
  function buildScan(){
    modal = el('div', 'modal hide f-scanm'); modal.id = 'mScan';
    const box = el('div', 'glowb f-sbox'); modal.append(box);
    const hd = el('div', 'prow'); hd.style.justifyContent = 'space-between'; hd.append(el('div', 'mono', '// Face scan')); const x = el('button', 'ibtn'); x.type = 'button'; x.textContent = '\u2715'; x.onclick = closeScan; hd.append(x); box.append(hd);
    ttl = el('h3', 'ph'); tipEl = el('p', 'f-tip'); camBox = el('div', 'f-cam'); vid = document.createElement('video'); vid.playsInline = true; vid.muted = true; vid.autoplay = true;
    shot = document.createElement('img'); shot.className = 'shot hide'; cd = el('div', 'f-cd'); guide = el('div'); guide.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    camBox.append(vid, shot, guide, cd); chips = el('div'); chips.style.marginTop = '10px'; btnRow = el('div', 'prow'); btnRow.style.cssText = 'justify-content:center;margin-top:12px'; thumbs = el('div', 'f-thumbs');
    fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.className = 'hide'; fileIn.onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const bm = await createImageBitmap(f); await keep(frameCanvas(bm)); } catch (er) { toast('Could not read that image'); } };
    finalBox = el('div', 'hide'); const lb = el('label', 'f-chk'); chk = document.createElement('input'); chk.type = 'checkbox'; lb.append(chk, el('span', null, 'I agree to a biometric analysis of these photos. They are used only to produce this scan and are never saved to my account; only the resulting measurements are stored.')); goBtn = B('solid', 'Analyze my face', null); goBtn.style.width = '100%'; goBtn.onclick = analyze; finalBox.append(lb, goBtn);
    box.append(ttl, tipEl, camBox, chips, btnRow, thumbs, fileIn, finalBox); ($('app') || document.body).append(modal);
  }
  function drawThumbs(){
    thumbs.replaceChildren(...VIEWS.map((v, i) => { const t = el('div', 'f-th' + (i === sc.i ? ' on' : '') + (sc.shots[v.id] ? ' got' : '')); if (sc.shots[v.id]) t.style.backgroundImage = 'url(' + sc.shots[v.id].url + ')'; t.append(el('span', null, v.name.split(' ')[0])); t.onclick = () => { if (!sc.busy) { sc.i = i; scanUI(); } }; return t; }));
  }
  function scanUI(){
    const v = VIEWS[sc.i], got = sc.shots[v.id]; ttl.textContent = (sc.i + 1) + ' / ' + VIEWS.length + '  ' + v.name + (v.req ? '' : ' (recommended)'); tipEl.textContent = v.tip;
    guide.innerHTML = guideSvg(v.id); shot.classList.toggle('hide', !got); if (got) shot.src = got.url; vid.classList.toggle('hide', !!got);
    chips.replaceChildren(); if (got) { const q = got.q; chips.append(el('span', 'f-chip ' + (q.lum < 60 || q.lum > 205 ? 'bad' : 'v2'), q.lum < 60 ? 'Too dark' : q.lum > 205 ? 'Too bright' : 'Light OK'), el('span', 'f-chip ' + (q.sharp < 25 ? 'bad' : 'v2'), q.sharp < 25 ? 'Blurry, retake' : 'Sharp'), el('span', 'f-chip ' + (Math.min(q.w, q.h) < 600 ? 'bad' : 'v2'), q.w + 'x' + q.h)); }
    btnRow.replaceChildren();
    if (!got) { if (sc.camOk) { const c = B('solid', 'Capture', 'plus'); c.onclick = capture; btnRow.append(c); } const u = B('ghost', 'Upload photo', null); u.onclick = () => fileIn.click(); btnRow.append(u); if (!sc.camOk) chips.append(el('span', 'f-chip', 'Camera unavailable, upload instead')); }
    else { const r = B('ghost', 'Retake', null); r.onclick = () => { delete sc.shots[v.id]; scanUI(); }; btnRow.append(r); if (sc.i < VIEWS.length - 1) { const n = B('solid', 'Next', null); n.onclick = () => { sc.i++; scanUI(); }; btnRow.append(n); } }
    drawThumbs(); const need = VIEWS.filter(x => x.req && !sc.shots[x.id]).length; finalBox.classList.toggle('hide', need > 0); if (need) { chips.append(el('span', 'f-chip', 'required left: ' + need)); }
  }
  async function startCam(){
    stopCam(); sc.camOk = false; if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    try { sc.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); vid.srcObject = sc.stream; await vid.play().catch(() => { }); sc.camOk = true; } catch (e) { sc.camOk = false; }
  }
  function stopCam(){ if (sc.stream) sc.stream.getTracks().forEach(t => t.stop()); sc.stream = null; }
  function frameCanvas(s){ const w0 = s.videoWidth || s.naturalWidth || s.width, h0 = s.videoHeight || s.naturalHeight || s.height, k = Math.min(1, 1600 / Math.max(w0, h0)), c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k); c.getContext('2d').drawImage(s, 0, 0, c.width, c.height); return c; }
  function quality(c){
    const w = 256, h = Math.max(3, Math.round(c.height * w / c.width)), s = document.createElement('canvas'); s.width = w; s.height = h; const x = s.getContext('2d'); x.drawImage(c, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h); let sum = 0; for (let i = 0; i < w * h; i++) { const v = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]; g[i] = v; sum += v; }
    let m = 0, m2 = 0, n = 0; for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) { const i = y * w + xx, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]; m += l; m2 += l * l; n++; }
    return { lum: sum / (w * h), sharp: m2 / n - (m / n) * (m / n), w: c.width, h: c.height };
  }
  async function keep(c){
    const v = VIEWS[sc.i], q = quality(c), blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92)); if (sc.shots[v.id]) URL.revokeObjectURL(sc.shots[v.id].url);
    sc.shots[v.id] = { blob, url: URL.createObjectURL(blob), q }; scanUI();
  }
  async function capture(){
    if (sc.busy) return; sc.busy = true; const n = DEMO ? 1 : 3;
    for (let i = n; i > 0; i--) { cd.textContent = i; await sleep(DEMO ? 120 : 800); } cd.textContent = '';
    const fr = []; for (let i = 0; i < 3; i++) { fr.push(frameCanvas(vid)); await sleep(180); }
    const best = fr.map(c => ({ c, q: quality(c) })).sort((a, b) => b.q.sharp - a.q.sharp)[0]; sc.busy = false; await keep(best.c);
  }
  const toDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  async function analyze(){
    if (!chk.checked) { toast('Please tick the consent box'); return; }
    sc.busy = true; goBtn.disabled = true; goBtn.textContent = 'Analyzing...';
    try {
      const views = {}; for (const id in sc.shots) views[id] = await toDataURL(sc.shots[id].blob);
      const schema = []; AREAS.forEach(a => a.factors.forEach(f => schema.push({ id: f.id, name: f.name, area: a.id, type: f.type, unit: f.unit || null, options: f.type === 'cat' ? (Array.isArray(f.opts) ? f.opts : Object.keys(f.opts)) : f.type === 'grade' ? labelsFor(f, st.gender) : f.opts || null, views: viewsOf(f), description: f.desc })));
      const payload = { gender: st.gender, age: st.age, scale: 'iris', views, schema };
      let res;
      if (typeof window.ASTRA_ANALYZER === 'function') res = await window.ASTRA_ANALYZER(payload);
      else if (CONFIG.aiEndpoint) { const r = await fetch(CONFIG.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await ctx.token() }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error('ai-' + r.status); res = await r.json(); }
      else if (DEMO) res = { measurements: demoValues(st.gender) };
      else { const e = new Error('not-connected'); e.nc = true; throw e; }
      const raw = res.measurements || res, m = {}; AREAS.forEach(a => a.factors.forEach(f => { const n = norm(f, st.gender, raw[f.id]); if (n) m[f.id] = n; }));
      if (!Object.keys(m).length) throw new Error('empty');
      const data = { m, at: Date.now(), views: Object.keys(sc.shots), scale: 'iris' }; if (DEMO) data.demo = true;
      st.data = data; recompute();
      if (!DEMO) await ctx.store.save(JSON.parse(JSON.stringify(data)), ev.rating, ev.score != null ? Math.round(ev.score) : null);
      closeScan(); render(); ctx.onChange(); toast(DEMO ? 'Demo scan (not saved)' : 'Scan complete');
    } catch (e) {
      console.error(e);
      if (e.nc) { finalBox.replaceChildren(el('div', 'mono', 'AI scanner not connected'), el('p', 'dim', 'Your photos stayed on this device and were not sent anywhere. Connect your AI in face-data.js (aiEndpoint) or set window.ASTRA_ANALYZER, then scan again.')); }
      else toast('Scan failed. Try again.');
      goBtn.disabled = false; goBtn.textContent = 'Analyze my face';
    }
    sc.busy = false;
  }
  async function openScan(){
    Object.values(sc.shots).forEach(s => URL.revokeObjectURL(s.url)); sc.shots = {}; sc.i = 0; sc.busy = false;
    if (modal) modal.remove(); buildScan(); showM('mScan'); scanUI(); await startCam(); scanUI();
  }
  function closeScan(){ stopCam(); if (modal) modal.classList.add('hide'); Object.values(sc.shots).forEach(s => URL.revokeObjectURL(s.url)); sc.shots = {}; }
  scanBtn.onclick = openScan;

  /* ---------- api ---------- */
  const api = {
    setUser(u){ const g = u.gender === 'female' ? 'female' : 'male', ch = g !== st.gender; Object.assign(st, { uid: u.uid, gender: g, age: u.age }); if (ch && visible && T) mount(); render(); },
    setData(d){ st.data = d && d.m ? d : null; render(); ctx.onChange(); },
    reset(){ st.data = null; st.area = null; st.open = {}; closeScan(); render(); },
    rating(){ recompute(); return st.data ? ev.rating : null; },
    listCard,
    show(){ visible = true; mount(); },
    hide(){ visible = false; },
    openScan
  };
  api.rot = (y, x) => { rotY = y; rotX = x || 0; velY = 0; idleAt = performance.now() + 1e9; };
  if (DEMO) window.__face = api;
  setSub(0); render();
  return api;
}
