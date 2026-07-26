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

  // ── 1점 투시 방 ──
  // 기존에 1.8 등으로 줄였던 값을 다시 크게! (숫자가 클수록 널널해짐)
const ROOM_W = 46, ROOM_H = 46, ROOM_D = 76, CELL = 5.5;
  const CAM_Z = ROOM_D / 2 - 6;
  const FOV = 50;
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
    // opacity를 1.0에서 0.45 정도로 낮추기
return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.4 }));
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
  // mScale: 모바일에서 키우는 배율(계단 제외 1.2배), mnx/mny: 모바일 전용 위치(겹침 방지)
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

    // pivot: 위치·부유·마우스틸트를 담당. inner: 고유 각도 유지 + 미세 흔들림
    const pivot = new THREE.Group();
    pivot.add(inner);
    scene.add(pivot);

    const near = 1 - (def.d - 17) / 13;            // 0(먼)~1(가까움)
    const mouseAngle = Math.random() * Math.PI * 2;
    const dirX = Math.cos(mouseAngle); // X축 반응 방향 (-1.0 ~ 1.0)
    const dirY = Math.sin(mouseAngle); // Y축 반응 방향 (-1.0 ~ 1.0)

    pivot.userData = {
      def, inner, baseH: size.y || 1,
      fAmp: rnd(0.9, 1.7) * (def.d / 22), fSpeed: rnd(0.35, 0.7), fPhase: Math.random() * 6.28,
      dAmp: rnd(0.05, 0.11), dSpeed: rnd(0.2, 0.42), dPhase: Math.random() * 6.28,
      // 마우스 반응 강도에 랜덤 방향(dirX, dirY)을 곱해서 개체마다 다양한 각도로 움직이게 적용
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
    // 기존: vw / DESIGN_ASPECT 때문에 가로 폭에 맞춰 스케일이 크게 작아짐
    // 수정: 모바일의 좁고 긴 화면에 맞춰 세로 공간을 더 활용하도록 제한 완화
    const MOBILE_ASPECT = 0.9; // 이 숫자가 작을수록 모바일에서 개체가 커짐 (0.8 ~ 1.2 사이 권장)
    const H = Math.min(vh, vw / MOBILE_ASPECT);
    return { H, W: H * MOBILE_ASPECT };
  }
  
  return { H: vh, W: Math.min(vh * DESIGN_ASPECT, vw) };
}
  function layoutOne(pivot) {
    const u = pivot.userData, def = u.def, b = designBox(def.d);
    const mob = window.innerWidth < 768;
    const sc = mob ? (def.mScale || 1) : 1;
    // 모바일에서 커진 만큼 서로 밀어내 겹침 완화 (중심에서 바깥으로 약간 이동)
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
  minFilter: THREE.LinearFilter, // 선을 약간 부드럽게 처리
  magFilter: THREE.LinearFilter, 
  depthBuffer: true, 
  samples: 4 // 안티앨리어싱(MSAA) 추가로 겹치는 선 정돈
});
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postScene = new THREE.Scene();
  const ditherMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) }, uScale: { value: 3.0 } },
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
        v = (v - 0.69) * 4.3 + 0.01;
        float cov = clamp(v, 0.0, 1.0) * clamp(c.a + 0.25, 0.0, 1.0);
        if(c.a > 0.03) cov = max(cov, 0.001);
        return cov;
      }
      void main(){
        vec2 block = floor(gl_FragCoord.xy / uScale);
        vec2 snappedUv = (block + 0.5) / uRes;
        
        vec4 c = texture2D(tDiffuse, snappedUv); 
        float cov = coverage(c);
        float th = bayer(block);
        
        if(cov > th) gl_FragColor = vec4(0.322,0.329,1.0,1.0);
        else discard;
      }`
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));

  // ── 마우스 ──
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
    const scale = ditherMat.uniforms.uScale.value; // 기본값 3.0
    
    renderer.setPixelRatio(PR);
    renderer.setSize(w, h, false);
    
    // ⭐️ 핵심: 렌더타겟 해상도를 3배(scale) 작게 설정해서 선을 도트 픽셀 크기에 꽉 차게 렌더링
    const rw = Math.round((w * PR) / scale);
    const rh = Math.round((h * PR) / scale);
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

    // 각 오브젝트가 개별로: 위아래 부유 + 각도 드리프트 + 마우스 방향 틸트
    objs.forEach(p => {
      const u = p.userData, inner = u.inner;
      p.position.y = u.baseY + Math.sin(t * u.fSpeed + u.fPhase) * u.fAmp;
      const tiltX = my * u.mouseKX + Math.sin(t * u.dSpeed + u.dPhase) * u.dAmp;
      const tiltY = mx * u.mouseKY + Math.cos(t * u.dSpeed * 0.8 + u.dPhase) * u.dAmp;
      p.rotation.x += (tiltX - p.rotation.x) * 0.15;
      p.rotation.y += (tiltY - p.rotation.y) * 0.2;
      p.rotation.z = Math.sin(t * u.dSpeed * 0.6 + u.dPhase) * u.dAmp * 0.7;
      // inner: 고유 각도 유지 + 아주 느린 각도 변화
      // 360도 연속 회전 효과를 주고 싶을 때의 예시
    inner.rotation.x = u.def.rx + Math.sin(t * 0.4 + u.phase) * 0.1;
    inner.rotation.y = u.def.ry + Math.sin(t * 0.3 + u.phase * 1.3) * 0.4;
    inner.rotation.z = u.def.rz + Math.cos(t * 0.35 + u.phase) * 0.05;
    });

    // 1) 씬 → 렌더타겟, 2) 디더 셰이더로 화면에 출력
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCam);

    requestAnimationFrame(loop);
  })();
}
