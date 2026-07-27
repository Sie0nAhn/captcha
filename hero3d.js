import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('hero-canvas');
if (canvas) initHero(canvas);

function initHero(canvas) {
  const stage = canvas.parentElement;
  const BLUE = 0x5254ff;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  const scene = new THREE.Scene();

  // ── 1점 투시 방 (클로즈업 느낌을 위해 깊이(ROOM_D)를 줄이고 널널하게 조절) ──
  const ROOM_W = 42, ROOM_H = 42, ROOM_D = 55, CELL = 5.5;
  const CAM_Z = ROOM_D / 2 - 4; // 카메라를 조금 더 앞으로 당겨서 클로즈업 효과
  const FOV = 55; // 시야각을 넓혀서 공간감 극대화
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, -ROOM_D / 2);

  // 조명
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfbfe8, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 3.4); key.position.set(6, 9, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2.0); rim.position.set(-7, 4, 6); scene.add(rim);

  // ── 그리드 벽 ──
  function gridPlane(w, h) {
    const cw = Math.round(w / CELL), ch = Math.round(h / CELL), p = [];
    for (let i = 0; i <= cw; i++) { const x = -w / 2 + w * i / cw; p.push(x, -h / 2, 0, x, h / 2, 0); }
    for (let j = 0; j <= ch; j++) { const y = -h / 2 + h * j / ch; p.push(-w / 2, y, 0, w / 2, y, 0); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    
    // ⭐️ 셰이더에서 구별하기 위한 빨간색 마커
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ 
      color: 0xFF0000, 
      transparent: true, 
      opacity: 1.0 
    }));
  }
  const room = new THREE.Group(); scene.add(room);
  let m;
  m = gridPlane(ROOM_W, ROOM_H); m.position.z = -ROOM_D / 2; room.add(m);
  m = gridPlane(ROOM_W, ROOM_D); m.rotation.x = -Math.PI / 2; m.position.y = -ROOM_H / 2; room.add(m);
  m = gridPlane(ROOM_W, ROOM_D); m.rotation.x = Math.PI / 2; m.position.y = ROOM_H / 2; room.add(m);
  m = gridPlane(ROOM_D, ROOM_H); m.rotation.y = Math.PI / 2; m.position.x = -ROOM_W / 2; room.add(m);
  m = gridPlane(ROOM_D, ROOM_H); m.rotation.y = -Math.PI / 2; m.position.x = ROOM_W / 2; room.add(m);

  const material = new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.32, metalness: 0, envMapIntensity: 1.0 });

  const draco = new DRACOLoader(); draco.setDecoderPath('./vendor/draco/');
  const gltfLoader = new GLTFLoader(); gltfLoader.setDRACOLoader(draco);
  const b64ToBuf = b64 => { const s = atob(b64), n = s.length, a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = s.charCodeAt(i); return a.buffer; };

  const DESIGN_ASPECT = 1440 / 754;
  const LAYOUT = [
    { key: 'steps',         nx: -0.651, ny:  0.138, hf: 0.350, d: 30, rx:  0.26, ry:  0.95, rz:  0.20, mScale: 1.0, mnx: -0.55, mny:  0.56 },
    { key: 'fire_hydrant',  nx: -0.296, ny: -0.186, hf: 0.454, d: 22, rx:  0.10, ry:  0.30, rz:  2.19, mScale: 1.2, mnx: -0.34, mny: -0.52 },
    { key: 'road_narrows',  nx:  0.230, ny:  0.108, hf: 0.799, d: 17, rx:  0.15, ry:  0.25, rz: -2.30, mScale: 1.1, mnx:  0.14, mny:  0.02 },
    { key: 'traffic_light', nx:  0.709, ny:  0.284, hf: 0.282, d: 26, rx:  0.10, ry: -0.48, rz:  1.42, mScale: 1.2, mnx:  0.64, mny:  0.46 },
  ];

  const objs = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function placeModel(def, gltf) {
    const inner = new THREE.Group(), geos = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); geos.push(g); } });
    const box = new THREE.Box3();
    geos.forEach(g => { g.computeBoundingBox(); box.union(g.boundingBox); });
    const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    geos.forEach(g => { g.translate(-center.x, -center.y, -center.z); inner.add(new THREE.Mesh(g, material)); });
    inner.rotation.set(def.rx, def.ry, def.rz);

    const pivot = new THREE.Group();
    pivot.add(inner);
    scene.add(pivot);

    const near = 1 - (def.d - 17) / 13;
    const mouseAngle = Math.random() * Math.PI * 2;
    const dirX = Math.cos(mouseAngle);
    const dirY = Math.sin(mouseAngle);

    pivot.userData = {
      def, inner, baseH: size.y || 1,
      fAmp: rnd(0.9, 1.7) * (def.d / 22), fSpeed: rnd(0.35, 0.7), fPhase: Math.random() * 6.28,
      dAmp: rnd(0.05, 0.11), dSpeed: rnd(0.2, 0.42), dPhase: Math.random() * 6.28,
      mouseKY: (0.85 + 0.85 * near) * dirY, 
      mouseKX: (0.30 + 0.35 * near) * dirX,
      phase: Math.random() * 6.28,
    };
    objs.push(pivot);
    layoutOne(pivot);
  }

  function designBox(d) {
    const vh = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * d;
    const vw = vh * camera.aspect;
    if (window.innerWidth < 768) {
      const MOBILE_ASPECT = 0.9;
      const H = Math.min(vh, vw / MOBILE_ASPECT);
      return { H, W: H * MOBILE_ASPECT };
    }
    return { H: vh, W: Math.min(vh * DESIGN_ASPECT, vw) };
  }

  function layoutOne(pivot) {
    const u = pivot.userData, def = u.def, b = designBox(def.d);
    const mob = window.innerWidth < 768;
    const sc = mob ? (def.mScale || 1) : 1;
    const spread = mob ? 1.12 : 1;
    pivot.position.set(def.nx * b.W * spread, def.ny * b.H * spread, camera.position.z - def.d);
    u.baseY = pivot.position.y;
    u.inner.scale.setScalar((def.hf * sc * 2 * b.H) / u.baseH);
  }
  const layoutAll = () => objs.forEach(layoutOne);

  const MODELS = window.CAPTCHA_MODELS || {};
  let li = 0;
  (function loadNext() {
    if (li >= LAYOUT.length) return;
    const def = LAYOUT[li++], buf = MODELS[def.key];
    if (!buf) return loadNext();
    gltfLoader.parse(b64ToBuf(buf), '', gltf => { placeModel(def, gltf); setTimeout(loadNext, 30); },
      err => { console.error('model load error', def.key, err); loadNext(); });
  })();

  // ── 디더(픽셀) 포스트 프로세싱 ──
  const rt = new THREE.WebGLRenderTarget(2, 2, { 
    minFilter: THREE.NearestFilter, 
    magFilter: THREE.NearestFilter, 
    depthBuffer: true 
  });
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postScene = new THREE.Scene();
  const ditherMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) }, uScale: { value: 3.4 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uScale;
      varying vec2 vUv;
      float bayer(vec2 p){
        mat4 B = mat4( 0.0, 8.0, 2.0,10.0, 12.0, 4.0,14.0, 6.0, 3.0,11.0, 1.0, 9.0, 15.0, 7.0,13.0, 5.0)/16.0;
        int x = int(mod(p.x,4.0)); int y = int(mod(p.y,4.0));
        vec4 col = B[y];
        float t = col.x;
        if(x==1) t=col.y; else if(x==2) t=col.z; else if(x==3) t=col.w;
        return t;
      }
      float coverage(vec4 c){
        if(c.a < 0.1) return 0.0;
        vec3 rgb = c.rgb / max(c.a, 0.1);
        float lum = dot(rgb, vec3(0.299,0.587,0.114));
        float v = 1.0 - lum;
        v = (v - 0.65) * 4.5 + 0.01;
        float cov = clamp(v, 0.0, 1.0) * clamp(c.a + 0.25, 0.0, 1.0);
        if(c.a > 0.03) cov = max(cov, 0.001);
        return cov;
      }
      void main(){
        vec2 block = floor(gl_FragCoord.xy / uScale);
        vec2 snappedUv = (block + 0.5) / uRes;
        
        vec4 c = texture2D(tDiffuse, snappedUv); 
        
        if(c.a < 0.05) {
            discard;
        }
        // 그리드 선 처리 (#A0A1FF 컬러 적용 및 예쁜 점선 패턴)
        else if(c.r > c.b + 0.1) {
            float th = bayer(block);
            if(0.5 > th) {
                gl_FragColor = vec4(0.627, 0.631, 1.0, 1.0); // #A0A1FF
            } else {
                discard;
            }
        } 
        // 3D 개체 처리 (오리지널 깔끔한 렌더링 유지)
        else {
            float cov = coverage(c);
            float th = bayer(block);
            
            if(cov > th) {
                gl_FragColor = vec4(0.322, 0.329, 1.0, 1.0);
            } else {
                discard;
            }
        }
      }`
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));

  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  window.addEventListener('pointermove', e => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let PR = 1;
  function resize() {
    const w = stage.clientWidth, h = Math.max(stage.clientHeight - 43, 1);
    PR = Math.min(window.devicePixelRatio, 1.5);
    const scale = ditherMat.uniforms.uScale.value;
    
    renderer.setPixelRatio(PR);
    renderer.setSize(w, h, false);
    
    // ⭐️ 우측 끝 선이 잘리지 않도록 Math.ceil을 사용해 해상도를 넉넉하게 보정
    const rw = Math.ceil((w * PR) / scale);
    const rh = Math.ceil((h * PR) / scale);
    rt.setSize(rw, rh);
    ditherMat.uniforms.uRes.value.set(rw, rh);
    
    camera.aspect = w / h; camera.updateProjectionMatrix();
    layoutAll();
  }
  new ResizeObserver(resize).observe(stage); resize();

  const clock = new THREE.Clock();
  (function loop() {
    const t = clock.getElapsedTime();
    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;
    const mx = reduce ? 0 : cur.x, my = reduce ? 0 : cur.y;

    objs.forEach(p => {
      const u = p.userData, inner = u.inner;
      p.position.y = u.baseY + Math.sin(t * u.fSpeed + u.fPhase) * u.fAmp;
      const tiltX = my * u.mouseKX + Math.sin(t * u.dSpeed + u.dPhase) * u.dAmp;
      const tiltY = mx * u.mouseKY + Math.cos(t * u.dSpeed * 0.8 + u.dPhase) * u.dAmp;
      p.rotation.x += (tiltX - p.rotation.x) * 0.15;
      p.rotation.y += (tiltY - p.rotation.y) * 0.2;
      p.rotation.z = Math.sin(t * u.dSpeed * 0.6 + u.dPhase) * u.dAmp * 0.7;
      
      inner.rotation.x = u.def.rx + Math.sin(t * 0.4 + u.phase) * 0.1;
      inner.rotation.y = u.def.ry + Math.sin(t * 0.3 + u.phase * 1.3) * 0.4;
      inner.rotation.z = u.def.rz + Math.cos(t * 0.35 + u.phase) * 0.05;
    });

    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCam);

    requestAnimationFrame(loop);
  })();
}