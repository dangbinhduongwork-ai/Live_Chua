/**
 * templeScene.js - Không Gian Chùa 3D Tam Thế Phật (Three.js)
 * Tái hiện chân thực 100% Chánh Điện "CHÙA THIÊNG LIÊNG" từ ảnh mẫu:
 * Tam Thế Phật uy nghiêm (Trung tâm + Tả Hữu), Tòa sen hồng kim sa, Lư hương tỏa khói,
 * Cột rồng sơn son thếp vàng, Hoành phi Cầu An, 6 hàng bồ đoàn và đèn lồng đỏ đung đưa.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextureGenerator } from './textureGenerator.js';
import { templeAudio } from './audioSystem.js';

export class TempleScene {
  constructor(containerElement) {
    this.container = containerElement;
    this.prevTime = performance.now();
    this.elapsedTime = 0;

    // Scene & Camera
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Dynamic objects
    this.halos = [];
    this.lanterns = [];
    this.candles = [];
    this.cushions = [];
    this.smokeParticles = null;
    this.sparkleParticles = null;
    this.floatingLotuses = [];
    this.incenseLight = null;
    this.buddhaPointLight = null;

    // Raycaster for cushions
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Camera animation state
    this.cameraTargetPos = null;
    this.cameraTargetLook = null;
    this.isCameraAnimating = false;
    this.activeCushion = null;
    this.cinematicMode = false;

    // Textures cache
    this.textures = {};

    // Quản lý Nhân vật người xem & Hàng đợi dâng hương
    this.userCharacters = new Map(); // key: userId -> { userId, nickname, avatarUrl, cushion, devotee }
    this.incenseQueue = [];          // Hàng đợi quà dâng hương khi nhiều người tặng cùng lúc
    this.activeOffering = null;      // Trạng thái nhân vật đang đi lên dâng hương
    this.commentZoomTimer = null;    // Timer zoom nhẹ camera khi Phật tử bình luận

    this.init();
  }

  init() {
    // 1. Scene & Fog ấm áp
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0304);
    this.scene.fog = new THREE.FogExp2(0x180507, 0.015);

    // 2. Camera Setup (Góc Chánh Điện bao quát toàn cảnh Tam Thế Phật và toàn bộ các hàng Bồ Đoàn)
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 100);
    this.defaultCameraPos = new THREE.Vector3(0, 6.3, 28.6);
    this.defaultCameraLook = new THREE.Vector3(0, 4.0, -4.5);
    this.camera.position.copy(this.defaultCameraPos);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.defaultCameraLook);
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 40;

    // 5. Textures
    this.buildTextures();

    // 6. Ánh sáng
    this.setupLighting();

    // 7. Kiến trúc Chánh Điện
    this.buildArchitecture();

    // 8. Tạc Tượng Tam Thế Phật & Tòa Sen
    this.buildBuddhaStatues();

    // 9. Bàn Hương Án, Lư Hương & Đồ Thờ
    this.buildAltar();

    // 10. Hoành Phi, Biển Hiệu & Liễn Đối "CẦU AN"
    this.buildBanners();

    // 11. Hàng Bồ Đoàn Ngồi Thiền (6 cột)
    this.buildCushions();

    // 12. Dàn Đèn Lồng Đỏ Treo
    this.buildLanterns();

    // 13. Hệ thống Hạt: Khói Trầm & Bụi Vàng Phước Quang
    this.buildParticleSystems();

    // 14. Event listeners
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));

    // Bắt đầu Render Loop
    this.animate();
  }

  buildTextures() {
    this.textures.bannerMain = TextureGenerator.createBannerMain();
    this.textures.bannerSub = TextureGenerator.createBannerSub();
    this.textures.bannerCauAn = TextureGenerator.createBannerCauAn();
    this.textures.vanPhat = TextureGenerator.createVanPhatWall();
    this.textures.floor = TextureGenerator.createFloorTexture();
    this.textures.pillar = TextureGenerator.createPillarTexture();
    this.textures.cushion = TextureGenerator.createCushionTexture();
    this.textures.halo = TextureGenerator.createHaloTexture();
    this.textures.smoke = TextureGenerator.createSmokeParticle();
    this.textures.sparkle = TextureGenerator.createSparkleParticle();
  }

  setupLighting() {
    // Ánh sáng môi trường vàng ấm
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.85);
    this.scene.add(ambientLight);

    // Ánh sáng chiếu chính từ trên xuống điện thờ
    const mainDirLight = new THREE.DirectionalLight(0xffdf99, 1.8);
    mainDirLight.position.set(0, 16, 9);
    mainDirLight.target.position.set(0, 4.0, -4.5);
    mainDirLight.castShadow = true;
    mainDirLight.shadow.mapSize.width = 2048;
    mainDirLight.shadow.mapSize.height = 2048;
    mainDirLight.shadow.bias = -0.0005;
    this.scene.add(mainDirLight);
    this.scene.add(mainDirLight.target);

    // Ánh sáng chiếu rọi trực diện tôn tượng (Front Warm Fill Light)
    const frontFillLight = new THREE.PointLight(0xfff2cc, 3.2, 22, 1.1);
    frontFillLight.position.set(0, 4.5, 2.2);
    this.scene.add(frontFillLight);

    // Hào quang Đức Phật trung tâm
    this.buddhaPointLight = new THREE.PointLight(0xffd566, 4.2, 35, 1.2);
    this.buddhaPointLight.position.set(0, 5.8, -3.8);
    this.scene.add(this.buddhaPointLight);

    // Hào quang 2 Tôn tượng Tả Hữu
    const leftLight = new THREE.PointLight(0xffca45, 2.4, 20, 1.2);
    leftLight.position.set(-3.8, 5.0, -3.8);
    this.scene.add(leftLight);

    const rightLight = new THREE.PointLight(0xffca45, 2.4, 20, 1.2);
    rightLight.position.set(3.8, 5.0, -3.8);
    this.scene.add(rightLight);

    // Than hồng lư hương
    this.incenseLight = new THREE.PointLight(0xff3300, 1.4, 5, 2.0);
    this.incenseLight.position.set(0, 2.2, -0.6);
    this.scene.add(this.incenseLight);
  }

  buildArchitecture() {
    // 1. Mặt Sàn Chánh Điện bóng loáng phản chiếu
    const floorGeo = new THREE.PlaneGeometry(36, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.textures.floor,
      roughness: 0.16,
      metalness: 0.58,
      color: 0x152230
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 6);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. Vách Tường Hậu Vạn Phật (Thousand Buddhas Wall)
    const wallGeo = new THREE.PlaneGeometry(36, 22);
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.textures.vanPhat,
      roughness: 0.6,
      metalness: 0.35,
      bumpMap: this.textures.vanPhat,
      bumpScale: 0.08
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 9.5, -6.8);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // 3. Tường Hông Tả Hữu
    const sideWallGeo = new THREE.PlaneGeometry(50, 22);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-16, 9.5, 6);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(16, 9.5, 6);
    this.scene.add(rightWall);

    // 4. Trần Nhà Gỗ & Hệ Xà Ngang (Nâng cao lên y = 17.6 để không bao giờ che khuất Hoành Phi khi đổi góc cam)
    const ceilingGeo = new THREE.PlaneGeometry(36, 50);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x200708, roughness: 0.85 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 18.5, 6);
    this.scene.add(ceiling);

    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3a0c0e, roughness: 0.45, metalness: 0.15 });
    [-4, 2, 8, 14, 20, 26].forEach(z => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(34, 0.75, 0.8), beamMat);
      beam.position.set(0, 17.6, z);
      this.scene.add(beam);
    });

    // 5. Các Cột Đình Sơn Son Thếp Vàng Cuộn Rồng
    // Mở rộng sang hai bên (x = ±6.2) để nhìn trọn vẹn, thông thoáng cả 3 Tôn tượng Tam Thế Phật
    const pillarPositions = [
      [-6.2, -1.0], [6.2, -1.0],
      [-6.2, 7.0],  [6.2, 7.0],
      [-6.2, 15.0], [6.2, 15.0],
      [-6.2, 23.0], [6.2, 23.0]
    ];

    const pillarMat = new THREE.MeshStandardMaterial({
      map: this.textures.pillar,
      roughness: 0.35,
      metalness: 0.45
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd49a26,
      metalness: 0.85,
      roughness: 0.25
    });

    pillarPositions.forEach(([x, z]) => {
      // Cột chính
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 18, 24), pillarMat);
      pillar.position.set(x, 9.0, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);

      // Chân tảng đá bệ sen mạ vàng
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.7, 24), goldTrimMat);
      base.position.set(x, 0.35, z);
      base.castShadow = true;
      this.scene.add(base);

      // Đầu cột đỡ xà
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 0.6, 24), goldTrimMat);
      cap.position.set(x, 17.6, z);
      this.scene.add(cap);
    });
  }

  /**
   * Tạo Tòa Sen (Lotus Throne) nhiều tầng cánh
   */
  createLotusThrone(radius, height, isPink = true) {
    const throneGroup = new THREE.Group();

    // Bệ vàng đa tầng
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xebb434,
      metalness: 0.88,
      roughness: 0.25
    });

    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.95, radius * 1.15, height * 0.28, 32), baseMat);
    b1.position.y = height * 0.14;
    b1.castShadow = true;
    throneGroup.add(b1);

    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius * 0.96, height * 0.22, 32), baseMat);
    b2.position.y = height * 0.38;
    b2.castShadow = true;
    throneGroup.add(b2);

    // Cánh sen hồng kim sa uốn cong
    const petalMat = new THREE.MeshStandardMaterial({
      color: isPink ? 0xde4874 : 0xf2b52e,
      roughness: 0.35,
      metalness: isPink ? 0.3 : 0.85,
      emissive: isPink ? 0x480816 : 0x402503
    });

    const numPetals = 16;
    for (let layer = 0; layer < 2; layer++) {
      const layerRadius = radius * (0.85 + layer * 0.12);
      const layerY = height * (0.46 + layer * 0.18);
      const tilt = layer === 0 ? 0.35 : 0.55;

      for (let i = 0; i < numPetals; i++) {
        const angle = (i / numPetals) * Math.PI * 2 + (layer * Math.PI / numPetals);
        const petalGeo = new THREE.ConeGeometry(radius * 0.22, height * 0.42, 6);
        petalGeo.scale(1, 1, 0.35);
        const petal = new THREE.Mesh(petalGeo, petalMat);

        petal.position.set(
          Math.cos(angle) * layerRadius,
          layerY,
          Math.sin(angle) * layerRadius
        );
        petal.rotation.y = -angle + Math.PI / 2;
        petal.rotation.x = tilt;
        petal.castShadow = true;
        throneGroup.add(petal);
      }
    }

    // Tâm đài sen vàng
    const centerDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0xffd23d, roughness: 0.25, metalness: 0.8 })
    );
    centerDisc.position.y = height * 0.88;
    throneGroup.add(centerDisc);

    return throneGroup;
  }

  /**
   * Tạc Tôn Tượng Đức Phật Thích Ca Mâu Ni (Gautama Buddha Figure)
   * Tướng hảo quang minh: Kiết già trang nghiêm, y cà sa vắt chéo vai trái hở vai phải,
   * Thủ ấn Thiền Định (Dhyana Mudra), cổ tam đạo, khuôn mặt từ bi, bạch hào tướng giữa trán,
   * nhục kế ushnisha nổi cao với tóc xoắn ốc và đảnh ngọc cintamani tỏa sáng.
   */
  createBuddhaFigure(scale = 1.0) {
    const group = new THREE.Group();

    // Vàng ròng kim cương phản chiếu ánh sáng uy nghiêm của Đức Thế Tôn
    const goldSkinMat = new THREE.MeshStandardMaterial({
      color: 0xffcf40,
      metalness: 0.85,
      roughness: 0.20,
      emissive: 0x361b03
    });

    const kasayaMat = new THREE.MeshStandardMaterial({
      color: 0xeb9e18,
      metalness: 0.72,
      roughness: 0.28,
      emissive: 0x331402
    });

    const kasayaTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffe47a,
      metalness: 0.92,
      roughness: 0.16,
      emissive: 0x452804
    });

    // 1. Tọa Thiền Kiết Già (Vajrasana) Chi Tiết Nhiều Lớp Nếp Y
    const lapGroup = new THREE.Group();
    lapGroup.position.set(0, 0.32 * scale, 0.12 * scale);

    const legsGeo = new THREE.TorusGeometry(1.05 * scale, 0.34 * scale, 20, 36, Math.PI);
    const legs = new THREE.Mesh(legsGeo, kasayaMat);
    legs.rotation.x = Math.PI / 2;
    legs.rotation.z = Math.PI;
    legs.castShadow = true;
    lapGroup.add(legs);

    // Các nếp gấp y cà sa mềm mại phủ qua hai đầu gối
    [-0.58, -0.32, 0.32, 0.58].forEach((kx, idx) => {
      const kneeFold = new THREE.Mesh(
        new THREE.TorusGeometry(0.32 * scale, 0.026 * scale, 10, 20, Math.PI * 0.85),
        kasayaTrimMat
      );
      kneeFold.position.set(kx * scale, 0.04 * scale, (idx === 1 || idx === 2 ? 0.34 : 0.22) * scale);
      kneeFold.rotation.x = Math.PI * 0.35;
      kneeFold.rotation.y = kx > 0 ? 0.35 : -0.35;
      lapGroup.add(kneeFold);
    });

    // Hai bàn chân hoa sen ngửa lên trên đùi (Kiết già hàng ma / cát tường)
    const footGeo = new THREE.SphereGeometry(0.19 * scale, 16, 16);
    footGeo.scale(1.45, 0.55, 0.92);
    [-1, 1].forEach(side => {
      const foot = new THREE.Mesh(footGeo, goldSkinMat);
      foot.position.set(side * 0.35 * scale, 0.14 * scale, 0.26 * scale);
      foot.rotation.x = -0.18;
      foot.rotation.z = -side * 0.22;
      lapGroup.add(foot);

      // 5 ngón chân tròn đều trên mỗi bàn chân Phật
      for (let t = 0; t < 5; t++) {
        const toe = new THREE.Mesh(
          new THREE.SphereGeometry((0.032 - t * 0.002) * scale, 8, 8),
          goldSkinMat
        );
        const tx = (side * 0.22 + side * (t - 2) * 0.038) * scale;
        toe.position.set(tx, 0.17 * scale, (0.34 - Math.abs(t - 2) * 0.015) * scale);
        lapGroup.add(toe);
      }
    });

    // Tà áo cà sa xếp nếp rủ xuống đài sen
    const skirtGeo = new THREE.CylinderGeometry(0.92 * scale, 1.28 * scale, 0.38 * scale, 32, 1, true);
    const skirt = new THREE.Mesh(skirtGeo, kasayaMat);
    skirt.position.y = -0.06 * scale;
    lapGroup.add(skirt);

    const skirtHem = new THREE.Mesh(
      new THREE.TorusGeometry(1.12 * scale, 0.028 * scale, 10, 32, Math.PI * 0.92),
      kasayaTrimMat
    );
    skirtHem.rotation.x = Math.PI / 2;
    skirtHem.rotation.z = Math.PI * 0.04;
    skirtHem.position.y = -0.18 * scale;
    lapGroup.add(skirtHem);

    group.add(lapGroup);

    // 2. Thân Mình Tướng Hảo (Ngực nở eo thon, y cà sa xếp nếp tinh xảo & Chữ Vạn trước ngực)
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 1.05 * scale;

    const torsoGeo = new THREE.CylinderGeometry(0.68 * scale, 0.88 * scale, 1.52 * scale, 36);
    torsoGeo.scale(1.04, 1.0, 0.92);
    const torso = new THREE.Mesh(torsoGeo, goldSkinMat);
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Tướng Chữ Vạn (卍 - Vạn Đức Cát Tường) chạm nổi bằng vàng sáng rực phía trước ngực Đức Phật
    const swastikaGroup = new THREE.Group();
    swastikaGroup.position.set(0.06 * scale, 0.26 * scale, 0.72 * scale);
    swastikaGroup.rotation.x = -0.13;
    const barThick = 0.024 * scale;
    const barLen = 0.16 * scale;
    const armLen = 0.084 * scale;
    const swasMat = new THREE.MeshStandardMaterial({
      color: 0xfff6b8,
      emissive: 0xffb700,
      emissiveIntensity: 0.85,
      metalness: 0.92,
      roughness: 0.1
    });
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(barThick, barLen, barThick), swasMat);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(barLen, barThick, barThick), swasMat);
    swastikaGroup.add(vBar, hBar);
    // 4 cánh chữ Vạn cân đối
    const armTop = new THREE.Mesh(new THREE.BoxGeometry(armLen, barThick, barThick), swasMat);
    armTop.position.set(-armLen / 2 + barThick / 2, barLen / 2 - barThick / 2, 0);
    const armBot = new THREE.Mesh(new THREE.BoxGeometry(armLen, barThick, barThick), swasMat);
    armBot.position.set(armLen / 2 - barThick / 2, -barLen / 2 + barThick / 2, 0);
    const armLeft = new THREE.Mesh(new THREE.BoxGeometry(barThick, armLen, barThick), swasMat);
    armLeft.position.set(-barLen / 2 + barThick / 2, -armLen / 2 + barThick / 2, 0);
    const armRight = new THREE.Mesh(new THREE.BoxGeometry(barThick, armLen, barThick), swasMat);
    armRight.position.set(barLen / 2 - barThick / 2, armLen / 2 - barThick / 2, 0);
    swastikaGroup.add(armTop, armBot, armLeft, armRight);
    bodyGroup.add(swastikaGroup);

    // Nhiều lớp nếp gấp Áo Cà Sa Thích Ca vắt chéo từ vai trái qua dưới cánh tay phải
    for (let f = 0; f < 4; f++) {
      const rScale = (0.70 + f * 0.035) * scale;
      const tubeR = (f === 0 ? 0.045 : 0.085) * scale;
      const foldMat = f === 0 ? kasayaTrimMat : kasayaMat;
      const drapeFold = new THREE.Mesh(
        new THREE.TorusGeometry(rScale, tubeR, 14, 28, Math.PI * 0.98),
        foldMat
      );
      drapeFold.rotation.z = -0.54 + f * 0.04;
      drapeFold.rotation.x = 0.34;
      drapeFold.position.set((-0.12 + f * 0.02) * scale, (0.28 - f * 0.09) * scale, (0.31 - f * 0.015) * scale);
      bodyGroup.add(drapeFold);
    }

    // Vai trái đắp y cà sa nhiều nếp
    const shoulderRobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.34 * scale, 20, 20),
      kasayaMat
    );
    shoulderRobe.scale.set(0.95, 1.22, 0.85);
    shoulderRobe.position.set(-0.72 * scale, 0.54 * scale, 0.06 * scale);
    bodyGroup.add(shoulderRobe);

    // Vai phải tròn đầy uy nghiêm
    const rightShoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.31 * scale, 20, 20),
      goldSkinMat
    );
    rightShoulder.position.set(0.72 * scale, 0.52 * scale, 0.06 * scale);
    bodyGroup.add(rightShoulder);

    // 3. Hai Cánh Tay & Thủ Ấn Thiền Định (Dhyana Mudra) Tinh Xảo
    const armGeo = new THREE.CylinderGeometry(0.165 * scale, 0.195 * scale, 1.05 * scale, 20);

    const leftArm = new THREE.Mesh(armGeo, kasayaMat);
    leftArm.position.set(-0.72 * scale, 0.05 * scale, 0.14 * scale);
    leftArm.rotation.z = -0.42;
    leftArm.rotation.x = 0.36;
    bodyGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, goldSkinMat);
    rightArm.position.set(0.72 * scale, 0.05 * scale, 0.14 * scale);
    rightArm.rotation.z = 0.42;
    rightArm.rotation.x = 0.36;
    bodyGroup.add(rightArm);

    // Cẳng tay hướng vào lòng kết ấn Thiền Định
    const forearmGeo = new THREE.CylinderGeometry(0.13 * scale, 0.155 * scale, 0.65 * scale, 16);
    [-1, 1].forEach(side => {
      const forearm = new THREE.Mesh(forearmGeo, side < 0 ? kasayaMat : goldSkinMat);
      forearm.position.set(side * 0.42 * scale, -0.32 * scale, 0.34 * scale);
      forearm.rotation.z = side * 1.15;
      forearm.rotation.y = -side * 0.35;
      bodyGroup.add(forearm);
    });

    // Hai bàn tay ngửa xếp chồng lên nhau với các ngón tay thon dài
    const handMat = goldSkinMat;
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.065 * scale, 0.21 * scale), handMat);
    leftHand.position.set(0, -0.41 * scale, 0.46 * scale);
    bodyGroup.add(leftHand);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.30 * scale, 0.065 * scale, 0.19 * scale), handMat);
    rightHand.position.set(0, -0.34 * scale, 0.46 * scale);
    bodyGroup.add(rightHand);

    // Các ngón tay thon mềm mại
    for (let f = -1.5; f <= 1.5; f += 1) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016 * scale, 0.02 * scale, 0.18 * scale, 8),
        handMat
      );
      finger.rotation.z = Math.PI / 2;
      finger.position.set(0, -0.33 * scale, (0.46 + f * 0.04) * scale);
      bodyGroup.add(finger);
    }

    // Hai đầu ngón cái chạm nhẹ tạo ấn tam giác Thiền Định cân xứng
    [-1, 1].forEach(side => {
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.026 * scale, 0.03 * scale, 0.15 * scale, 10), handMat);
      thumb.position.set(side * 0.068 * scale, -0.27 * scale, 0.49 * scale);
      thumb.rotation.z = -side * 0.62;
      bodyGroup.add(thumb);
    });

    // Đài sen nhỏ & Bảo Châu Ma Ni tỏa sáng trong lòng bàn tay Phật
    const palmLotus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14 * scale, 0.08 * scale, 0.06 * scale, 16),
      kasayaTrimMat
    );
    palmLotus.position.set(0, -0.29 * scale, 0.46 * scale);
    bodyGroup.add(palmLotus);

    const jewel = new THREE.Mesh(
      new THREE.SphereGeometry(0.115 * scale, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffe875,
        emissiveIntensity: 0.95,
        roughness: 0.08
      })
    );
    jewel.position.set(0, -0.20 * scale, 0.46 * scale);
    bodyGroup.add(jewel);

    group.add(bodyGroup);

    // 4. Cổ Tam Đạo (Ba ngấn cổ cát tường cân đối)
    const neckGroup = new THREE.Group();
    neckGroup.position.y = 1.95 * scale;
    const neckBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale, 0.32 * scale, 0.32 * scale, 24), goldSkinMat);
    neckGroup.add(neckBase);

    for (let i = -1; i <= 1; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.285 * scale, 0.022 * scale, 10, 24),
        kasayaTrimMat
      );
      ring.position.y = i * 0.068 * scale;
      ring.rotation.x = Math.PI / 2;
      neckGroup.add(ring);
    }
    group.add(neckGroup);

    // 5. KHUÔN MẶT TỪ BI ĐỐI XỨNG TUYỆT ĐỐI & NỤ CƯỜI MỈM ĐỀU ĐẶN HIỀN HÒA
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.46 * scale;

    // Bầu mặt tròn đầy phúc hậu như trăng rằm (Mặt chữ điền viên mãn, điêu khắc liền khối không vết nối)
    const faceGeo = new THREE.SphereGeometry(0.435 * scale, 48, 48);
    const posAttr = faceGeo.attributes.position;
    for (let vi = 0; vi < posAttr.count; vi++) {
      let vx = posAttr.getX(vi) / scale;
      let vy = posAttr.getY(vi) / scale;
      let vz = posAttr.getZ(vi) / scale;
      // Tỷ lệ khuôn mặt Phật từ bi phúc hậu
      vx *= 0.93;
      vy *= 1.14;
      vz *= 0.96;
      // Làm đầy hai gò má & cằm tròn phúc tướng một cách liền mạch
      if (vz > 0 && vy < 0.08 && vy > -0.35) {
        const cheekFullness = Math.exp(-Math.pow((vy + 0.08) / 0.16, 2)) * 0.025;
        vz += cheekFullness;
        vx *= (1 + cheekFullness * 0.6);
      }
      posAttr.setXYZ(vi, vx * scale, vy * scale, vz * scale);
    }
    faceGeo.computeVertexNormals();
    const face = new THREE.Mesh(faceGeo, goldSkinMat);
    face.castShadow = true;
    headGroup.add(face);

    // Sống mũi dọc dừa thanh tú & Chóp mũi tròn đều
    const noseBridgeGeo = new THREE.CylinderGeometry(0.024 * scale, 0.046 * scale, 0.23 * scale, 14);
    const noseBridge = new THREE.Mesh(noseBridgeGeo, goldSkinMat);
    noseBridge.position.set(0, 0.04 * scale, 0.398 * scale);
    noseBridge.rotation.x = -0.16;
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.052 * scale, 16, 16),
      goldSkinMat
    );
    noseTip.scale.set(1.08, 0.88, 0.95);
    noseTip.position.set(0, -0.068 * scale, 0.422 * scale);
    headGroup.add(noseTip);

    // Hai cánh mũi đối xứng
    [-1, 1].forEach(side => {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.032 * scale, 12, 12),
        goldSkinMat
      );
      nostril.position.set(side * 0.045 * scale, -0.076 * scale, 0.402 * scale);
      headGroup.add(nostril);
    });

    // ĐÔI MÀY LÁ LIỄU & ĐÔI MẮT TỪ BI NHÌN XUỐNG CÂN ĐỐI 100% HAI BÊN
    const featureDarkMat = new THREE.MeshStandardMaterial({
      color: 0x2b1204,
      roughness: 0.35,
      metalness: 0.25
    });

    [-1, 1].forEach(side => {
      // Chân mày cánh cung thanh thoát đối xứng qua trục X = 0 bằng đường cong Bezier
      const browCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 0.055 * scale, 0.195 * scale, 0.392 * scale),
        new THREE.Vector3(side * 0.155 * scale, 0.255 * scale, 0.378 * scale),
        new THREE.Vector3(side * 0.255 * scale, 0.175 * scale, 0.325 * scale)
      );
      const browGeo = new THREE.TubeGeometry(browCurve, 20, 0.014 * scale, 8, false);
      const browMesh = new THREE.Mesh(browGeo, featureDarkMat);
      headGroup.add(browMesh);

      // Bầu mí mắt trên khép hờ thiền định
      const eyelidSocket = new THREE.Mesh(
        new THREE.SphereGeometry(0.078 * scale, 16, 14),
        goldSkinMat
      );
      eyelidSocket.scale.set(1.35, 0.62, 0.55);
      eyelidSocket.position.set(side * 0.148 * scale, 0.115 * scale, 0.365 * scale);
      eyelidSocket.rotation.z = -side * 0.05;
      headGroup.add(eyelidSocket);

      // Đường khe mắt từ bi hơi võng nhẹ đều đặn nhìn xuống chúng sinh
      const eyeLineCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 0.078 * scale, 0.105 * scale, 0.388 * scale),
        new THREE.Vector3(side * 0.148 * scale, 0.082 * scale, 0.402 * scale),
        new THREE.Vector3(side * 0.222 * scale, 0.112 * scale, 0.358 * scale)
      );
      const eyeLineGeo = new THREE.TubeGeometry(eyeLineCurve, 18, 0.011 * scale, 8, false);
      const eyeLineMesh = new THREE.Mesh(eyeLineGeo, featureDarkMat);
      headGroup.add(eyeLineMesh);
    });

    // NỤ CƯỜI MỈM TỪ HÒA CÂN ĐỐI TUYỆT ĐỐI (Symmetrical Compassionate Buddha Smile)
    // Dùng đường cong đối xứng qua X = 0 để hai khóe môi nâng đều tăm tắp, không bao giờ lệch
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xb84a1e,
      roughness: 0.32,
      metalness: 0.35,
      emissive: 0x380d03
    });
    const smileLineMat = new THREE.MeshBasicMaterial({ color: 0x4a1606 });

    // 1. Đường mỉm cười chính giữa hai môi: Cân xứng từ (-0.115, -0.155) qua (0, -0.195) tới (+0.115, -0.155)
    const smileCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.118 * scale, -0.148 * scale, 0.372 * scale),
      new THREE.Vector3(-0.062 * scale, -0.182 * scale, 0.398 * scale),
      new THREE.Vector3(0.0,            -0.192 * scale, 0.408 * scale),
      new THREE.Vector3(0.062 * scale,  -0.182 * scale, 0.398 * scale),
      new THREE.Vector3(0.118 * scale,  -0.148 * scale, 0.372 * scale)
    ]);
    const smileLineMesh = new THREE.Mesh(
      new THREE.TubeGeometry(smileCurve, 28, 0.011 * scale, 10, false),
      smileLineMat
    );
    headGroup.add(smileLineMesh);

    // 2. Môi trên dáng cánh cung hiền từ đối xứng
    const upperLipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.112 * scale, -0.148 * scale, 0.370 * scale),
      new THREE.Vector3(-0.048 * scale, -0.165 * scale, 0.402 * scale),
      new THREE.Vector3(0.0,            -0.172 * scale, 0.410 * scale),
      new THREE.Vector3(0.048 * scale,  -0.165 * scale, 0.402 * scale),
      new THREE.Vector3(0.112 * scale,  -0.148 * scale, 0.370 * scale)
    ]);
    const upperLipMesh = new THREE.Mesh(
      new THREE.TubeGeometry(upperLipCurve, 24, 0.015 * scale, 10, false),
      lipMat
    );
    headGroup.add(upperLipMesh);

    // 3. Môi dưới đầy đặn phúc hậu ôm lấy đường cười
    const lowerLipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.106 * scale, -0.152 * scale, 0.368 * scale),
      new THREE.Vector3(-0.055 * scale, -0.198 * scale, 0.398 * scale),
      new THREE.Vector3(0.0,            -0.210 * scale, 0.408 * scale),
      new THREE.Vector3(0.055 * scale,  -0.198 * scale, 0.398 * scale),
      new THREE.Vector3(0.106 * scale,  -0.152 * scale, 0.368 * scale)
    ]);
    const lowerLipMesh = new THREE.Mesh(
      new THREE.TubeGeometry(lowerLipCurve, 24, 0.017 * scale, 10, false),
      lipMat
    );
    headGroup.add(lowerLipMesh);

    // 4. Hai khóe môi vểnh nhẹ mỉm cười an nhiên (Smile corners)
    [-1, 1].forEach(side => {
      const cornerDimple = new THREE.Mesh(
        new THREE.SphereGeometry(0.014 * scale, 10, 10),
        smileLineMat
      );
      cornerDimple.position.set(side * 0.120 * scale, -0.144 * scale, 0.370 * scale);
      headGroup.add(cornerDimple);
    });

    // Bạch Hào Tướng (Urna ngọc trắng phát quang giữa hai chân mày)
    const urnaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046 * scale, 0.046 * scale, 0.015 * scale, 16),
      kasayaTrimMat
    );
    urnaBase.rotation.x = Math.PI / 2;
    urnaBase.position.set(0, 0.235 * scale, 0.392 * scale);
    headGroup.add(urnaBase);

    const urna = new THREE.Mesh(
      new THREE.SphereGeometry(0.036 * scale, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfff8cc,
        emissiveIntensity: 1.1,
        roughness: 0.05
      })
    );
    urna.position.set(0, 0.235 * scale, 0.402 * scale);
    headGroup.add(urna);

    // Đôi tai dài phúc tuệ rủ xuống gần vai cân đối hai bên
    [-1, 1].forEach(side => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.395 * scale, 0.02 * scale, 0.02 * scale);

      const earTop = new THREE.Mesh(
        new THREE.TorusGeometry(0.115 * scale, 0.038 * scale, 12, 20, Math.PI),
        goldSkinMat
      );
      earTop.rotation.y = side * (Math.PI / 2 - 0.15);
      earGroup.add(earTop);

      const earLobe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038 * scale, 0.046 * scale, 0.36 * scale, 14),
        goldSkinMat
      );
      earLobe.position.set(0, -0.22 * scale, 0.02 * scale);
      earLobe.rotation.z = side * 0.06;
      earGroup.add(earLobe);

      const lobeTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.046 * scale, 14, 14),
        goldSkinMat
      );
      lobeTip.position.set(-side * 0.01 * scale, -0.40 * scale, 0.02 * scale);
      earGroup.add(lobeTip);

      headGroup.add(earGroup);
    });

    // 6. Mũ Tóc Xoắn Ốc Nhiều Tầng & Nhục Kế (Ushnisha) Đính Bảo Châu
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x2d1e08,
      roughness: 0.38,
      metalness: 0.72,
      emissive: 0x120902
    });

    // Vòm nền tóc ôm sát đỉnh đầu
    const hairDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.425 * scale, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat
    );
    hairDome.scale.set(0.91, 1.12, 0.96);
    hairDome.position.set(0, 0.04 * scale, -0.02 * scale);
    hairDome.rotation.x = -0.12;
    headGroup.add(hairDome);

    // Đường viền chân tóc vàng kim tinh tế trên trán
    const hairlineBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.365 * scale, 0.014 * scale, 10, 28, Math.PI * 0.85),
      kasayaTrimMat
    );
    hairlineBand.position.set(0, 0.31 * scale, 0.05 * scale);
    hairlineBand.rotation.x = Math.PI * 0.42;
    hairlineBand.rotation.z = Math.PI * 0.075;
    headGroup.add(hairlineBand);

    // Nhục kế (Ushnisha) nổi cao trên đỉnh đầu
    const ushnisha = new THREE.Mesh(
      new THREE.SphereGeometry(0.225 * scale, 22, 22),
      hairMat
    );
    ushnisha.scale.set(0.95, 1.05, 0.95);
    ushnisha.position.set(0, 0.55 * scale, -0.02 * scale);
    headGroup.add(ushnisha);

    // Ngọc Kế Châu (Ushnisha Gem) giữa Nhục Kế tỏa ánh sáng trí tuệ
    const ushnishaGem = new THREE.Mesh(
      new THREE.SphereGeometry(0.052 * scale, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfff5b8,
        emissive: 0xffbb00,
        emissiveIntensity: 0.95,
        roughness: 0.1
      })
    );
    ushnishaGem.scale.set(1.2, 0.85, 0.7);
    ushnishaGem.position.set(0, 0.51 * scale, 0.195 * scale);
    headGroup.add(ushnishaGem);

    // Đảnh ngọc Cintamani trên cùng
    const crownBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075 * scale, 0.10 * scale, 0.05 * scale, 16),
      kasayaTrimMat
    );
    crownBase.position.set(0, 0.75 * scale, -0.02 * scale);
    headGroup.add(crownBase);

    const crownJewel = new THREE.Mesh(
      new THREE.ConeGeometry(0.065 * scale, 0.18 * scale, 16),
      new THREE.MeshStandardMaterial({ color: 0xffdf40, emissive: 0xffaa00, emissiveIntensity: 0.8, metalness: 0.85, roughness: 0.15 })
    );
    crownJewel.position.set(0, 0.85 * scale, -0.02 * scale);
    headGroup.add(crownJewel);

    // Các vòng lọn tóc xoắn ốc Thích Ca (Spiral Curls) dày đặc, đều đặn trên đầu & Nhục Kế
    const curlGeo = new THREE.SphereGeometry(0.048 * scale, 10, 10);
    const curlRings = [
      { y: 0.30, r: 0.38, count: 16 },
      { y: 0.38, r: 0.35, count: 14 },
      { y: 0.45, r: 0.29, count: 12 },
      { y: 0.54, r: 0.22, count: 10 },
      { y: 0.63, r: 0.18, count: 8 },
      { y: 0.70, r: 0.12, count: 6 }
    ];
    curlRings.forEach((ring, rIdx) => {
      for (let i = 0; i < ring.count; i++) {
        const ang = (i / ring.count) * Math.PI * 2 + (rIdx % 2) * (Math.PI / ring.count);
        const curl = new THREE.Mesh(curlGeo, hairMat);
        curl.position.set(
          Math.cos(ang) * ring.r * scale,
          ring.y * scale,
          (Math.sin(ang) * ring.r - 0.02) * scale
        );
        headGroup.add(curl);
      }
    });

    group.add(headGroup);

    return group;
  }

  createBuddhaHalo(radius) {
    const haloGeo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const haloMat = new THREE.MeshBasicMaterial({
      map: this.textures.halo,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    return new THREE.Mesh(haloGeo, haloMat);
  }

  buildBuddhaStatues() {
    // 1. TÔN TƯỢNG TRUNG TÂM: ĐỨC PHẬT THÍCH CA MÂU NI (Central Buddha)
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 1.35, -4.5);

    // Tòa sen hồng lớn
    const centerThrone = this.createLotusThrone(2.4, 2.0, true);
    centerGroup.add(centerThrone);

    // Tôn tượng Thích Ca Mâu Ni
    const centerFigure = this.createBuddhaFigure(1.35);
    centerFigure.position.y = 1.8;
    centerGroup.add(centerFigure);

    // Đĩa hào quang tỏa sáng
    const centerHalo = this.createBuddhaHalo(3.2);
    centerHalo.position.set(0, 4.8, -0.4);
    centerGroup.add(centerHalo);
    this.halos.push({ mesh: centerHalo, speed: 0.12, baseScale: 1.0 });

    this.scene.add(centerGroup);

    // 2. TÔN TƯỢNG BÊN TRÁI (Left Buddha) - Đặt gần trung tâm để vừa vặn khung hình 9:16
    const leftGroup = new THREE.Group();
    leftGroup.position.set(-3.8, 1.15, -4.5);

    const leftThrone = this.createLotusThrone(1.7, 1.6, false);
    leftGroup.add(leftThrone);

    const leftFigure = this.createBuddhaFigure(1.05);
    leftFigure.position.y = 1.45;
    leftGroup.add(leftFigure);

    const leftHalo = this.createBuddhaHalo(2.3);
    leftHalo.position.set(0, 3.8, -0.35);
    leftGroup.add(leftHalo);
    this.halos.push({ mesh: leftHalo, speed: -0.14, baseScale: 1.0 });

    this.scene.add(leftGroup);

    // 3. TÔN TƯỢNG BÊN PHẢI (Right Buddha)
    const rightGroup = new THREE.Group();
    rightGroup.position.set(3.8, 1.15, -4.5);

    const rightThrone = this.createLotusThrone(1.7, 1.6, false);
    rightGroup.add(rightThrone);

    const rightFigure = this.createBuddhaFigure(1.05);
    rightFigure.position.y = 1.45;
    rightGroup.add(rightFigure);

    const rightHalo = this.createBuddhaHalo(2.3);
    rightHalo.position.set(0, 3.8, -0.35);
    rightGroup.add(rightHalo);
    this.halos.push({ mesh: rightHalo, speed: 0.13, baseScale: 1.0 });

    this.scene.add(rightGroup);
  }

  buildAltar() {
    const altarGroup = new THREE.Group();
    altarGroup.position.set(0, 0, -1.2);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3b0f0b, roughness: 0.4, metalness: 0.15 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xc89230, metalness: 0.88, roughness: 0.28 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd9a22e, roughness: 0.25, metalness: 0.85 });

    // Bàn thờ tam cấp
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.1, 2.6), woodMat);
    t1.position.y = 0.55;
    t1.castShadow = true;
    t1.receiveShadow = true;
    altarGroup.add(t1);

    const t2 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.85, 1.8), woodMat);
    t2.position.set(0, 1.4, -0.25);
    t2.castShadow = true;
    altarGroup.add(t2);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.08, 2.7), goldTrimMat);
    trim.position.y = 1.12;
    altarGroup.add(trim);

    // LƯ HƯƠNG ĐỒNG TAM KHÍ CỔ TRUYỀN (Incense Burner)
    const burnerGroup = new THREE.Group();
    burnerGroup.position.set(0, 1.25, 0.4);

    const bodyGeo = new THREE.SphereGeometry(0.62, 24, 16);
    bodyGeo.scale(1.15, 0.8, 1.15);
    const burnerBody = new THREE.Mesh(bodyGeo, bronzeMat);
    burnerBody.position.y = 0.48;
    burnerBody.castShadow = true;
    burnerGroup.add(burnerBody);

    const rimGeo = new THREE.CylinderGeometry(0.68, 0.56, 0.22, 24);
    const burnerRim = new THREE.Mesh(rimGeo, bronzeMat);
    burnerRim.position.y = 0.85;
    burnerGroup.add(burnerRim);

    // 3 Chân quỳ dạ cá
    for (let i = 0; i < 3; i++) {
      const legAngle = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.45, 12), bronzeMat);
      leg.position.set(Math.cos(legAngle) * 0.46, 0.18, Math.sin(legAngle) * 0.46);
      leg.rotation.z = Math.cos(legAngle) * 0.25;
      burnerGroup.add(leg);
    }

    // Đôi tai mây rồng
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 12, 20, Math.PI * 1.2), bronzeMat);
      ear.position.set(side * 0.74, 0.6, 0);
      ear.rotation.y = Math.PI / 2;
      ear.rotation.x = side * 0.3;
      burnerGroup.add(ear);
    });

    // Tro hương & Lòng than
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 0.9 }));
    ash.position.y = 0.84;
    burnerGroup.add(ash);

    // Chân hương đỏ & Than hồng
    const stickMat = new THREE.MeshBasicMaterial({ color: 0xa81c1c });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

    for (let i = 0; i < 9; i++) {
      const stickGroup = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 8), stickMat);
      stick.position.y = 0.32;
      stickGroup.add(stick);

      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), emberMat);
      ember.position.y = 0.65;
      stickGroup.add(ember);

      const rad = Math.random() * 0.22;
      const ang = Math.random() * Math.PI * 2;
      stickGroup.position.set(Math.cos(ang) * rad, 0.84, Math.sin(ang) * rad);
      stickGroup.rotation.x = (Math.random() - 0.5) * 0.15;
      stickGroup.rotation.z = (Math.random() - 0.5) * 0.15;
      burnerGroup.add(stickGroup);
    }

    altarGroup.add(burnerGroup);

    // ĐÔI NẾN ĐỎ ĐẠI THẮP SÁNG BẬP BÙNG
    [-1.7, 1.7].forEach((xPos, idx) => {
      const candleGroup = new THREE.Group();
      candleGroup.position.set(xPos, 1.15, 0.15);

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.4, 16), bronzeMat);
      stand.position.y = 0.2;
      stand.castShadow = true;
      candleGroup.add(stand);

      const waxMat = new THREE.MeshStandardMaterial({ color: 0xc4141e, roughness: 0.3, emissive: 0x3d0004 });
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 16), waxMat);
      candle.position.y = 0.78;
      candle.castShadow = true;
      candleGroup.add(candle);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 12), new THREE.MeshBasicMaterial({ color: 0xffdf55 }));
      flame.position.y = 1.38;
      candleGroup.add(flame);

      const candleLight = new THREE.PointLight(0xff7722, 1.6, 8, 1.8);
      candleLight.position.y = 1.42;
      candleLight.castShadow = true;
      candleGroup.add(candleLight);

      this.candles.push({ mesh: flame, light: candleLight, seed: idx * 5 });
      altarGroup.add(candleGroup);
    });

    // CHUÔNG ĐỒNG & MÕ TỤNG KINH
    const bowlGroup = new THREE.Group();
    bowlGroup.position.set(2.6, 1.15, 0.3);
    const cushionRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.1, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xb51b22, roughness: 0.6 })
    );
    cushionRing.rotation.x = Math.PI / 2;
    cushionRing.position.y = 0.1;
    bowlGroup.add(cushionRing);

    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
      bronzeMat
    );
    bowl.position.y = 0.4;
    bowl.rotation.x = Math.PI;
    bowlGroup.add(bowl);
    altarGroup.add(bowlGroup);

    const moktak = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x542616, roughness: 0.45 })
    );
    moktak.scale.set(1.1, 0.85, 1.0);
    moktak.position.set(-2.6, 1.42, 0.3);
    moktak.castShadow = true;
    altarGroup.add(moktak);

    // MÂM NGŨ QUẢ DÂNG CÚNG
    [-0.95, 0.95].forEach(x => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.22, 0.18, 16), goldTrimMat);
      plate.position.set(x, 1.25, 0.7);
      altarGroup.add(plate);

      const fruitMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.3 });
      for (let f = 0; f < 5; f++) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), fruitMat);
        const a = (f / 4) * Math.PI * 2;
        fruit.position.set(x + Math.cos(a) * 0.15, 1.38, 0.7 + Math.sin(a) * 0.15);
        altarGroup.add(fruit);
      }
      const topFruit = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), fruitMat);
      topFruit.position.set(x, 1.55, 0.7);
      altarGroup.add(topFruit);
    });

    this.scene.add(altarGroup);
  }

  buildBanners() {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x9e6c1a, metalness: 0.85, roughness: 0.25 });

    // 1. HOÀNH PHI "CHÙA THIÊNG LIÊNG"
    // Tách biệt hoàn toàn mặt phẳng chữ (z = -0.55) và khung gỗ phía sau (z = -0.72) để tuyệt đối không bị Z-fighting
    const bannerMainMat = new THREE.MeshStandardMaterial({
      map: this.textures.bannerMain,
      roughness: 0.28,
      metalness: 0.35,
      emissive: 0x2a0c04,
      emissiveIntensity: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });
    const bannerMain = new THREE.Mesh(
      new THREE.PlaneGeometry(6.6, 1.8),
      bannerMainMat
    );
    bannerMain.position.set(0, 9.8, -0.55);
    bannerMain.castShadow = false;
    bannerMain.receiveShadow = false;
    this.scene.add(bannerMain);

    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(6.85, 1.95, 0.10), frameMat);
    frameBox.position.set(0, 9.8, -0.72);
    frameBox.castShadow = false;
    frameBox.receiveShadow = false;
    this.scene.add(frameBox);

    // 2. BIỂN PHỤ "THÀNH KÍNH DÂNG HƯƠNG"
    const bannerSubMat = new THREE.MeshStandardMaterial({
      map: this.textures.bannerSub,
      roughness: 0.3,
      metalness: 0.3,
      emissive: 0x240903,
      emissiveIntensity: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });
    const bannerSub = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 0.88),
      bannerSubMat
    );
    bannerSub.position.set(0, 7.65, -1.15);
    bannerSub.castShadow = false;
    bannerSub.receiveShadow = false;
    this.scene.add(bannerSub);

    // 3. LIỄN ĐỐI TREO DỌC "CẦU AN" (Treo cạnh cột đình bên trái mở rộng, không che tượng Phật)
    const bannerCauAn = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 4.4),
      new THREE.MeshStandardMaterial({ map: this.textures.bannerCauAn, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide })
    );
    bannerCauAn.position.set(-5.3, 6.4, 4.0);
    bannerCauAn.castShadow = true;
    this.scene.add(bannerCauAn);

    // Thanh ngang treo liễn
    const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 16);
    rodGeo.rotateZ(Math.PI / 2);
    const topRod = new THREE.Mesh(rodGeo, frameMat);
    topRod.position.set(-5.3, 8.65, 4.0);
    this.scene.add(topRod);

    const botRod = new THREE.Mesh(rodGeo, frameMat);
    botRod.position.set(-5.3, 4.15, 4.0);
    this.scene.add(botRod);
  }

  /**
   * Tạo Thẻ Tên Phát Quang Trên Đầu Nhân Vật (Name Tag Billboard Sprite)
   * Độ phân giải cao 512x128, Mipmaps & Anisotropic Filtering, viền dày siêu nét, không bị mờ nhòe ở xa
   */
  createNameTagSprite(name = 'Phật tử') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    let cleanName = String(name || 'Phật tử').trim();
    if (cleanName.length > 22) {
      cleanName = cleanName.slice(0, 20) + '...';
    }

    // 1. Nền thẻ bài gấm đỏ viền vàng hoàng kim bo góc
    ctx.fillStyle = 'rgba(28, 5, 8, 0.94)';
    const rx = 10, ry = 10, rw = 492, rh = 108, rad = 22;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, rad);
      ctx.fill();
      ctx.strokeStyle = '#ffc83b';
      ctx.lineWidth = 6;
      ctx.stroke();
    } else {
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#ffc83b';
      ctx.lineWidth = 6;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    // 2. Viền chỉ vàng kép tinh xảo bên trong
    ctx.strokeStyle = 'rgba(255, 235, 150, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(18, 18, 476, 92);

    // 3. Hoa văn 4 góc thếp vàng
    ctx.fillStyle = '#ffe072';
    const corners = [[22, 22], [490, 22], [22, 106], [490, 106]];
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Chữ tên Phật tử: Font Sans-serif siêu đậm (900), viền đen tương phản cực cao, chữ vàng kim rõ nét
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 46px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif';

    // Viền đen đậm chống nhòe
    ctx.strokeStyle = '#050102';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.strokeText(`🙏 ${cleanName}`, 256, 66);

    // Lõi chữ sáng vàng kim
    ctx.fillStyle = '#fffce0';
    ctx.fillText(`🙏 ${cleanName}`, 256, 66);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    if (this.renderer && this.renderer.capabilities) {
      texture.anisotropy = Math.min(16, this.renderer.capabilities.getMaxAnisotropy());
    }

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    // Tăng kích thước thế giới lên (1.9m x 0.48m) để đứng từ xa 20m vẫn đọc rõ từng chữ
    sprite.scale.set(1.9, 0.48, 1.0);
    sprite.position.set(0, 0.98, 0);
    return sprite;
  }

  /**
   * Tạo Bong Bóng Thoại Bình Luận Trên Đầu Nhân Vật (Speech Bubble Billboard Sprite)
   * Độ phân giải siêu cao 1024x320, nền đặc 100% không xuyên thấu, chữ cực đậm tương phản cao
   */
  createSpeechBubbleSprite(text = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    let displayMsg = String(text || '').trim();
    if (displayMsg.length > 52) {
      displayMsg = displayMsg.slice(0, 50) + '...';
    }

    // Nền bong bóng thoại đặc 100% (không bị xuyên thấu bởi thẻ tên phía sau)
    ctx.fillStyle = '#fffcf2';
    ctx.strokeStyle = '#c88d14';
    ctx.lineWidth = 10;

    // Khung bo góc lớn
    const x = 20, y = 20, w = 984, h = 228, r = 38;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);

    // Đuôi bóng thoại trỏ xuống đỉnh đầu nhân vật
    ctx.lineTo(x + w / 2 + 36, y + h);
    ctx.lineTo(x + w / 2, y + h + 52);
    ctx.lineTo(x + w / 2 - 36, y + h);

    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Viền chỉ vàng bên trong
    ctx.strokeStyle = '#e0a92b';
    ctx.lineWidth = 4;
    ctx.strokeRect(34, 34, 956, 200);

    // Tự động chia 1 hoặc 2 dòng chữ to, siêu đậm, sắc nét tuyệt đối
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const fullText = `“${displayMsg}”`;
    if (displayMsg.length <= 24) {
      const fontSize = displayMsg.length <= 16 ? 68 : 58;
      ctx.font = `900 ${fontSize}px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif`;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.strokeText(fullText, 512, 134);
      ctx.fillStyle = '#140200';
      ctx.fillText(fullText, 512, 134);
    } else {
      // Chia thành 2 dòng cân đối theo từ
      const words = fullText.split(' ');
      let line1 = '';
      let line2 = '';
      const halfLen = Math.ceil(fullText.length / 2);
      for (const word of words) {
        if ((line1 + ' ' + word).trim().length <= halfLen + 4 || !line1) {
          line1 = (line1 + ' ' + word).trim();
        } else {
          line2 = (line2 + ' ' + word).trim();
        }
      }
      ctx.font = `900 50px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif`;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 7;
      ctx.strokeText(line1, 512, 102);
      ctx.strokeText(line2, 512, 166);
      ctx.fillStyle = '#140200';
      ctx.fillText(line1, 512, 102);
      ctx.fillText(line2, 512, 166);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    if (this.renderer && this.renderer.capabilities) {
      texture.anisotropy = Math.min(16, this.renderer.capabilities.getMaxAnisotropy());
    }

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.renderOrder = 999; // Luôn nổi rõ trên cùng, không bị bảng tên phía sau đè hay xuyên qua
    sprite.scale.set(2.15, 0.67, 1.0);
    sprite.position.set(0, 1.62, 0);
    return sprite;
  }

  /**
   * Tạo Đôi Tay Phật Tử (Dâng Hương hoặc Chắp Tay Búp Sen)
   */
  buildDevoteeArms(isOfferingIncense = false, skinMat) {
    const armGroup = new THREE.Group();

    if (isOfferingIncense) {
      armGroup.position.set(0, 0.54, 0.16);

      const hands = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.09), skinMat);
      hands.position.set(0, 0.06, 0.08);
      armGroup.add(hands);

      const stickMat = new THREE.MeshBasicMaterial({ color: 0xb52b27, transparent: true });
      const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true });

      for (let i = -1; i <= 1; i++) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.42, 6), stickMat);
        stick.position.set(i * 0.03, 0.28, 0.08);
        stick.rotation.x = -0.15;
        armGroup.add(stick);

        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), emberMat);
        ember.position.set(i * 0.03, 0.48, 0.05);
        armGroup.add(ember);
      }
    } else {
      armGroup.position.set(0, 0.38, 0.12);
      const hands = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), skinMat);
      hands.position.set(0, 0.06, 0.14);
      hands.rotation.x = -0.3;
      armGroup.add(hands);
    }

    return armGroup;
  }

  /**
   * Tạo Nhân Vật Phật Tử Tối Ưu Hóa (Cực nhẹ, 0 lag, hỗ trợ làm mờ/hiện dần, có bảng tên)
   */
  createSittingDevotee(robeColor = 0x5b7088, name = 'Phật tử', isOfferingIncense = false) {
    const devotee = new THREE.Group();
    // Quay mặt về hướng Chánh Điện / Án thờ Tam Thế Phật (-Z)
    devotee.rotation.y = Math.PI;

    // Vải áo tràng Phật tử
    const clothMat = new THREE.MeshStandardMaterial({
      color: robeColor,
      roughness: 0.6,
      metalness: 0.08,
      transparent: true,
      opacity: 1.0
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdeb38a,
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: 1.0
    });

    // 1. Thân mình & Chân kiết già (Seated Body in Robe - Tối ưu gộp hình khối)
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.38, 0.52, 12);
    const body = new THREE.Mesh(bodyGeo, clothMat);
    body.position.y = 0.26;
    body.scale.set(1.15, 1.0, 0.95);
    body.castShadow = true;
    devotee.add(body);

    // 2. Hai tay chắp búp sen hoặc nâng nhang trầm dâng hương
    const armGroup = this.buildDevoteeArms(isOfferingIncense, skinMat);
    devotee.add(armGroup);
    devotee.userData.armGroup = armGroup;
    devotee.userData.skinMat = skinMat;

    // 3. Đầu & Mái tóc búi gọn gàng
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.62;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skinMat);
    head.scale.set(0.9, 1.1, 0.95);
    head.position.set(0, 0.08, 0.02);
    head.rotation.x = 0.12;
    head.castShadow = true;
    headGroup.add(head);

    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.8, transparent: true, opacity: 1.0 });
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65),
      hairMat
    );
    hair.position.set(0, 0.1, 0.01);
    hair.rotation.x = 0.15;
    headGroup.add(hair);

    const bun = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      hairMat
    );
    bun.position.set(0, 0.12, -0.1);
    headGroup.add(bun);

    devotee.add(headGroup);

    // 4. BẢNG TÊN TRÊN ĐẦU NHÂN VẬT
    const nameSprite = this.createNameTagSprite(name);
    nameSprite.position.set(0, isOfferingIncense ? 1.18 : 0.95, 0);
    devotee.add(nameSprite);
    devotee.userData.nameSprite = nameSprite;
    devotee.userData.name = name;
    devotee.userData.isOfferingIncense = isOfferingIncense;
    devotee.userData.fadeOpacity = 1.0;
    devotee.userData.isFadingIn = false;
    devotee.userData.isFadingOut = false;

    // Helper đổi opacity cho toàn bộ mesh & sprite khi vào / out phòng
    devotee.setDevoteeOpacity = (alpha) => {
      devotee.userData.fadeOpacity = alpha;
      devotee.traverse(child => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = alpha;
        }
      });
    };

    // Helper đổi tư thế tay dâng hương / chắp tay
    devotee.setOfferingPose = (offering) => {
      if (devotee.userData.armGroup) {
        devotee.remove(devotee.userData.armGroup);
      }
      const newArms = this.buildDevoteeArms(offering, skinMat);
      devotee.add(newArms);
      devotee.userData.armGroup = newArms;
      devotee.userData.isOfferingIncense = offering;
      if (devotee.userData.nameSprite) {
        devotee.userData.nameSprite.position.set(0, offering ? 1.18 : 0.95, 0);
      }
      devotee.setDevoteeOpacity(devotee.userData.fadeOpacity ?? 1.0);
    };

    return devotee;
  }

  /**
   * Đảm bảo nhân vật người xem xuất hiện khi vào phòng live hoặc tương tác
   */
  ensureUserCharacter(userId, nickname = 'Phật tử', avatarUrl = '') {
    if (!userId) userId = `user_${nickname.replace(/\s+/g, '_')}`;

    // Nếu nhân vật đã tồn tại
    if (this.userCharacters.has(userId)) {
      const existing = this.userCharacters.get(userId);
      // Hủy trạng thái out nếu đang mờ dần
      if (existing.devotee && existing.devotee.userData.isFadingOut) {
        existing.devotee.userData.isFadingOut = false;
        existing.devotee.userData.isFadingIn = true;
      }
      return existing;
    }

    // Tìm bồ đoàn còn trống (không phải bồ đoàn Chủ Lễ ở giữa sân)
    let targetCushion = this.cushions.find(c => !c.userData.isMaster && !c.userData.occupiedUserId && !c.userData.devotee);
    if (!targetCushion) {
      targetCushion = this.cushions.find(c => !c.userData.isMaster && !c.userData.occupiedUserId);
    }
    if (!targetCushion) {
      // Nếu đã đầy, chọn bồ đoàn ngẫu nhiên (trừ master)
      const regularCushions = this.cushions.filter(c => !c.userData.isMaster);
      targetCushion = regularCushions[Math.floor(Math.random() * regularCushions.length)] || this.cushions[1];
    }

    // Xóa devotee cũ nếu có trên bồ đoàn này
    if (targetCushion.userData.devotee) {
      targetCushion.remove(targetCushion.userData.devotee);
      targetCushion.userData.devotee = null;
    }

    const robePalettes = [0x5b7088, 0x5c3d2e, 0x48586c, 0x6e5241, 0x7a8a9e, 0x6d5f78];
    const color = robePalettes[Math.floor(Math.random() * robePalettes.length)];

    const devotee = this.createSittingDevotee(color, nickname, false);
    devotee.position.set(0, 0.06, 0);
    devotee.rotation.y = Math.PI;

    // Bắt đầu với hiệu ứng hiện dần mượt mà
    devotee.userData.fadeOpacity = 0.05;
    devotee.userData.isFadingIn = true;
    devotee.userData.isFadingOut = false;
    devotee.setDevoteeOpacity(0.05);

    targetCushion.add(devotee);
    targetCushion.userData.devotee = devotee;
    targetCushion.userData.occupiedUserId = userId;
    targetCushion.userData.occupiedBy = nickname;

    const userObj = {
      userId,
      nickname,
      avatarUrl,
      cushion: targetCushion,
      devotee
    };

    this.userCharacters.set(userId, userObj);
    return userObj;
  }

  /**
   * Xử lý khi khán giả rời phòng live: Nhân vật mờ dần rồi biến mất hoàn toàn
   */
  removeUserCharacter(userId, nickname) {
    if (!userId && !nickname) return;

    let targetKey = null;
    let userObj = null;

    if (userId && this.userCharacters.has(userId)) {
      userObj = this.userCharacters.get(userId);
      targetKey = userId;
    }

    if (!userObj) {
      for (const [key, val] of this.userCharacters.entries()) {
        if (
          (nickname && val.nickname === nickname) ||
          (userId && val.nickname === userId) ||
          (nickname && val.userId === nickname) ||
          (userId && key.includes(String(userId))) ||
          (nickname && key.includes(String(nickname)))
        ) {
          userObj = val;
          targetKey = key;
          break;
        }
      }
    }

    if (userObj && userObj.devotee) {
      // Nếu nhân vật đang đi dâng hương thì đánh dấu đợi về bồ đoàn mới out
      if (this.activeOffering && (this.activeOffering.userId === userObj.userId || this.activeOffering.userId === targetKey)) {
        userObj.devotee.userData.pendingOut = true;
      } else {
        userObj.devotee.userData.isFadingOut = true;
        userObj.devotee.userData.isFadingIn = false;
      }
    }
  }

  /**
   * Zoom nhẹ camera vào vị trí Phật tử đang bình luận để đọc rõ nội dung sớ thoại
   * Căn giữa hoàn hảo trong khung hình 9:16 dọc, không bị tràn viền hay mất chữ
   */
  zoomToDevoteeComment(userObj) {
    if (!userObj || !userObj.cushion || this.activeOffering) return;

    const cushionPos = userObj.cushion.position;
    const cX = cushionPos.x;
    const cZ = cushionPos.z;

    // Điểm nhìn: Ngay trung tâm sớ thoại trên đầu Phật tử
    const targetLook = new THREE.Vector3(cX, 1.58, cZ);

    // Vị trí camera:
    // Căn thẳng trục X của nhân vật để sớ thoại nằm chính giữa màn hình dọc 9:16
    // Giữ khoảng cách chuẩn ~7.2m - 7.8m để khung sớ và toàn bộ chữ hiển thị trọn vẹn, không bị mất nét
    let targetCamZ = THREE.MathUtils.clamp(cZ + 7.4, 13.6, 28.5);
    const targetCamX = cX;
    const targetCamY = 3.65;

    const targetPos = new THREE.Vector3(targetCamX, targetCamY, targetCamZ);

    // Bắt đầu di chuyển camera mượt mà
    this.smoothMoveCamera(targetPos, targetLook);

    // Zoom vào khung sớ thoại 1.8 giây (trong khoảng 1-2s theo yêu cầu) rồi nhẹ nhàng lùi về góc Chánh Điện
    clearTimeout(this.commentZoomTimer);
    this.commentZoomTimer = setTimeout(() => {
      if (!this.activeOffering) {
        this.smoothMoveCamera(this.defaultCameraPos, this.defaultCameraLook);
      }
    }, 1800);
  }

  /**
   * Hiển thị dòng chữ bình luận trực tiếp trên đầu nhân vật đang ngồi
   * và kích hoạt zoom nhẹ camera vào nội dung sớ thoại của Phật tử
   */
  showDevoteeSpeech(userId, message) {
    let userObj = this.userCharacters.get(userId);
    if (!userObj || !userObj.devotee) {
      userObj = this.ensureUserCharacter(userId);
    }
    if (!userObj || !userObj.devotee) return;

    const dev = userObj.devotee;

    // Gỡ bong bóng thoại cũ nếu còn
    if (dev.userData.speechBubble) {
      dev.remove(dev.userData.speechBubble);
      if (dev.userData.speechBubble.material.map) dev.userData.speechBubble.material.map.dispose();
      dev.userData.speechBubble.material.dispose();
      dev.userData.speechBubble = null;
    }

    const bubble = this.createSpeechBubbleSprite(message);
    dev.add(bubble);
    dev.userData.speechBubble = bubble;

    // Kích hoạt Zoom nhẹ camera vào Phật tử vừa bình luận
    this.zoomToDevoteeComment(userObj);

    clearTimeout(dev.userData.speechTimer);
    dev.userData.speechTimer = setTimeout(() => {
      if (dev.userData.speechBubble === bubble) {
        dev.remove(bubble);
        if (bubble.material.map) bubble.material.map.dispose();
        bubble.material.dispose();
        dev.userData.speechBubble = null;
      }
    }, 5500);
  }

  /**
   * Khi ai tặng quà: Nhân vật của người đó đi dần lên dâng hương và camera zoom lại gần rồi quay về chỗ cũ
   */
  triggerGiftOffering(userId, nickname = 'Phật tử', deltaCoins = 1, giftName = 'Hoa Sen') {
    let userObj = this.userCharacters.get(userId);
    if (!userObj) {
      userObj = this.ensureUserCharacter(userId, nickname);
    }

    // Nếu đang có người dâng hương, đưa vào hàng đợi
    if (this.activeOffering) {
      this.incenseQueue.push({ userId, nickname, deltaCoins, giftName, userObj });
      return;
    }

    this.startWalkIncenseOffering({ userId, nickname, deltaCoins, giftName, userObj });
  }

  startWalkIncenseOffering({ userId, nickname, deltaCoins, giftName, userObj }) {
    clearTimeout(this.commentZoomTimer);
    if (!userObj || !userObj.devotee || !userObj.cushion) {
      // Trường hợp dự phòng nếu là Chủ Lễ trực tiếp
      this.offerIncense(nickname, giftName);
      return;
    }

    const devotee = userObj.devotee;
    const cushion = userObj.cushion;

    // Lấy tọa độ thế giới ban đầu của nhân vật trên bồ đoàn
    const originWorldPos = new THREE.Vector3();
    cushion.getWorldPosition(originWorldPos);
    originWorldPos.y += 0.06;

    // Gắn nhân vật vào scene để tự do di chuyển trong không gian
    this.scene.attach(devotee);

    // Chuyển sang tư thế nâng 3 nén nhang trầm dâng hương
    devotee.setOfferingPose(true);

    // Điểm đến: Bồ đoàn Đại Chủ Lễ ở giữa sân dâng hương (z = 2.8)
    const altarTargetPos = new THREE.Vector3(0, 0.06, 2.8);

    this.activeOffering = {
      userId,
      nickname,
      giftName,
      devotee,
      cushion,
      originWorldPos,
      altarTargetPos,
      phase: 'WALK_TO_ALTAR', // 'WALK_TO_ALTAR' -> 'HOLD_OFFERING' -> 'WALK_BACK'
      phaseTimer: 0,
      walkDuration: 1.8,
      holdDuration: 3.0,     // Zoom vào dâng hương đúng 3 giây theo yêu cầu
      walkBackDuration: 1.8,
      cameraZoomStarted: false
    };
  }

  updateActiveOffering(delta) {
    const act = this.activeOffering;
    if (!act) return;
    act.phaseTimer += delta;
    const dev = act.devotee;
    if (!dev) {
      this.activeOffering = null;
      return;
    }

    if (act.phase === 'WALK_TO_ALTAR') {
      const t = Math.min(1.0, act.phaseTimer / act.walkDuration);
      // Hai đoạn đường đi tự nhiên:
      // Chặng 1 (0 -> 0.35): Đi ngang từ vị trí bồ đoàn ra giữa lối đi chánh điện (x = 0)
      // Chặng 2 (0.35 -> 1.0): Đi thẳng theo trục Z từ z gốc về trước án thờ (z = 2.7)
      let curX, curZ;
      if (t < 0.35) {
        const subT = t / 0.35;
        curX = THREE.MathUtils.lerp(act.originWorldPos.x, 0, subT);
        curZ = act.originWorldPos.z;
      } else {
        const subT = (t - 0.35) / 0.65;
        curX = 0;
        curZ = THREE.MathUtils.lerp(act.originWorldPos.z, act.altarTargetPos.z, subT);
      }

      // Bước chân nhấp nhô nhịp nhàng
      const bob = Math.abs(Math.sin(t * Math.PI * 6)) * 0.06;
      dev.position.set(curX, 0.06 + bob, curZ);
      dev.rotation.y = Math.PI; // Hướng mặt về án thờ & Đức Phật

      // Khi đi đến gần bàn thờ, camera zoom lại gần người đó và cất giọng đọc lời chúc bình an
      if (t > 0.45 && !act.cameraZoomStarted) {
        act.cameraZoomStarted = true;
        const zoomInPos = new THREE.Vector3(0, 1.70, 5.7);
        const zoomInLook = new THREE.Vector3(0, 1.85, -1.8);
        this.smoothMoveCamera(zoomInPos, zoomInLook);
        templeAudio.speakBlessing(act.nickname, act.giftName);
      }

      if (t >= 1.0) {
        act.phase = 'HOLD_OFFERING';
        act.phaseTimer = 0;

        // Chuông bát đồng ngân vang & phước quang bừng sáng
        templeAudio.playSingingBowl();
        this.triggerDivineBlessing(1.2);

        if (this.incenseLight) {
          this.incenseLight.intensity = 2.8;
          setTimeout(() => {
            if (this.incenseLight) this.incenseLight.intensity = 1.4;
          }, 3500);
        }

        if (this.smokeParticles && this.smokeParticles.points) {
          this.smokeParticles.points.material.opacity = 0.7;
          setTimeout(() => {
            if (this.smokeParticles && this.smokeParticles.points) {
              this.smokeParticles.points.material.opacity = 0.42;
            }
          }, 4500);
        }
      }
    } else if (act.phase === 'HOLD_OFFERING') {
      if (act.phaseTimer >= act.holdDuration) {
        act.phase = 'WALK_BACK';
        act.phaseTimer = 0;

        // Camera zoom trở về chỗ cũ (góc Chánh Điện mặc định)
        this.smoothMoveCamera(this.defaultCameraPos, this.defaultCameraLook);
      }
    } else if (act.phase === 'WALK_BACK') {
      const t = Math.min(1.0, act.phaseTimer / act.walkBackDuration);
      let curX, curZ;
      if (t < 0.65) {
        const subT = t / 0.65;
        curX = 0;
        curZ = THREE.MathUtils.lerp(act.altarTargetPos.z, act.originWorldPos.z, subT);
      } else {
        const subT = (t - 0.65) / 0.35;
        curX = THREE.MathUtils.lerp(0, act.originWorldPos.x, subT);
        curZ = act.originWorldPos.z;
      }

      const bob = Math.abs(Math.sin(t * Math.PI * 6)) * 0.06;
      dev.position.set(curX, 0.06 + bob, curZ);
      dev.rotation.y = Math.PI;

      if (t >= 1.0) {
        // Gắn lại nhân vật vào bồ đoàn
        act.cushion.attach(dev);
        dev.position.set(0, 0.06, 0);
        dev.rotation.y = Math.PI;

        // Trở về tư thế chắp búp sen tĩnh tâm
        dev.setOfferingPose(false);

        // Nếu người này đã out phòng trong lúc dâng hương, bắt đầu làm mờ biến mất
        if (dev.userData.pendingOut) {
          dev.userData.isFadingOut = true;
          dev.userData.isFadingIn = false;
        }

        this.activeOffering = null;

        // Nếu có người tiếp theo trong hàng đợi quà tặng, tiếp tục cho người đó bước lên
        if (this.incenseQueue.length > 0) {
          const nextOffering = this.incenseQueue.shift();
          this.startWalkIncenseOffering(nextOffering);
        }
      }
    }
  }

  buildCushions() {
    // CÁC HÀNG BỒ ĐOÀN ĐƯỢC XẾP SO LE (STAGGERED) ĐỂ BẢNG TÊN KHÔNG BAO GIỜ BỊ CHE CHẮN
    // Nâng cấp lên 11 hàng x 6 cột = 66 bồ đoàn trang nghiêm, giúp nhìn thấy đông đảo Phật tử tề tựu chiêm bái
    const numRows = 11;
    const startZ = 5.2;
    const rowStep = 1.85;

    const cushionGeo = new THREE.CylinderGeometry(0.36, 0.40, 0.12, 24);
    const cushionMat = new THREE.MeshStandardMaterial({
      map: this.textures.cushion,
      roughness: 0.45,
      metalness: 0.15
    });

    let index = 1;
    for (let r = 0; r < numRows; r++) {
      const zPos = startZ + r * rowStep;
      // So le cột giữa các hàng:
      // Hàng chẵn: [-3.8, -2.5, -1.2, 1.2, 2.5, 3.8] (6 bồ đoàn)
      // Hàng lẻ:   [-3.2, -1.9, -0.65, 0.65, 1.9, 3.2] (6 bồ đoàn)
      // Đảm bảo không có 2 thẻ tên nào nằm trùng trục nhìn với nhau, lối đi giữa luôn rộng thoáng
      const colX = (r % 2 === 0)
        ? [-3.8, -2.5, -1.2, 1.2, 2.5, 3.8]
        : [-3.2, -1.9, -0.65, 0.65, 1.9, 3.2];

      for (let c = 0; c < colX.length; c++) {
        const xPos = colX[c];

        const cushion = new THREE.Mesh(cushionGeo, cushionMat);
        cushion.position.set(xPos, 0.06, zPos);
        cushion.castShadow = true;
        cushion.receiveShadow = true;

        cushion.userData = {
          type: 'cushion',
          id: index,
          row: r + 1,
          col: c + 1,
          originalPos: cushion.position.clone()
        };

        this.scene.add(cushion);
        this.cushions.push(cushion);
        index++;
      }
    }

    // BỒ ĐOÀN ĐẠI CHỦ LỄ Ở GIỮA SÂN DÂNG HƯƠNG (Ceremonial Master Incense Cushion)
    // Để trống trang nghiêm sẵn sàng cho các Phật tử bước lên dâng hương
    const masterCushionGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.14, 28);
    const masterCushion = new THREE.Mesh(masterCushionGeo, cushionMat);
    masterCushion.position.set(0, 0.07, 2.8);
    masterCushion.castShadow = true;
    masterCushion.receiveShadow = true;
    masterCushion.userData = {
      type: 'cushion',
      id: 'ChuLe',
      isMaster: true,
      row: 0,
      col: 0,
      originalPos: masterCushion.position.clone(),
      devotee: null,
      occupiedBy: null,
      occupiedUserId: null
    };

    this.scene.add(masterCushion);
    this.cushions.push(masterCushion);
  }

  /**
   * Đồng bộ danh sách Phật tử trực tuyến từ Server / Admin
   * Chú ý: "Phật tử là những người tương tác chứ không phải những người xem".
   * Chỉ tạo nhân vật cho người xem đã có tương tác (cúng dường Xu, thả Tim, hoặc Bình luận).
   */
  syncPlayers(players) {
    if (!Array.isArray(players)) return;
    for (const p of players) {
      const hasInteracted = (Number(p.coins) || 0) > 0 || (Number(p.likes) || 0) > 0 || (Number(p.chatsCount) || 0) > 0;
      if (p.isOnline !== false && hasInteracted) {
        this.ensureUserCharacter(p.userId, p.nickname, p.avatarUrl);
      } else {
        this.removeUserCharacter(p.userId, p.nickname);
      }
    }
  }

  /**
   * Gán bồ đoàn cho Khán giả / Phật tử khi cúng dường hoặc bình luận
   */
  assignCushionToViewer(nickname) {
    return this.ensureUserCharacter(`user_${nickname}`, nickname);
  }

  buildLanterns() {
    // ĐÈN LỒNG ĐỎ TREO XÀ NHÀ ĐUNG ĐƯA (Mở rộng sang hai bên theo trụ đình)
    const lanternCoords = [
      [-5.6, 12.0, 0.5], [5.6, 12.0, 0.5],
      [-4.8, 12.5, 6.0], [4.8, 12.5, 6.0],
      [-5.6, 11.8, 11.0], [5.6, 11.8, 11.0],
      [-4.8, 12.2, 16.0], [4.8, 12.2, 16.0],
      [-5.6, 11.8, 21.0], [5.6, 11.8, 21.0],
      [-4.8, 12.2, 26.0], [4.8, 12.2, 26.0]
    ];

    const redSilkMat = new THREE.MeshStandardMaterial({
      color: 0xd92520,
      roughness: 0.35,
      emissive: 0x6e0e0a,
      emissiveIntensity: 0.65
    });
    const goldCapMat = new THREE.MeshStandardMaterial({ color: 0xebb426, metalness: 0.85, roughness: 0.25 });

    lanternCoords.forEach(([lx, ly, lz], idx) => {
      const lanternPivot = new THREE.Group();
      lanternPivot.position.set(lx, ly, lz);

      const bodyGeo = new THREE.SphereGeometry(0.45, 18, 16);
      bodyGeo.scale(1.0, 1.35, 1.0);
      const body = new THREE.Mesh(bodyGeo, redSilkMat);
      body.position.y = -1.0;
      body.castShadow = true;
      lanternPivot.add(body);

      const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.12, 16), goldCapMat);
      topCap.position.y = -0.38;
      lanternPivot.add(topCap);

      const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.12, 16), goldCapMat);
      botCap.position.y = -1.62;
      lanternPivot.add(botCap);

      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      cord.position.y = -0.18;
      lanternPivot.add(cord);

      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.45, 12), goldCapMat);
      tassel.position.y = -1.92;
      lanternPivot.add(tassel);

      const lanternLight = new THREE.PointLight(0xff4411, 1.2, 8, 1.8);
      lanternLight.position.y = -1.0;
      lanternPivot.add(lanternLight);

      this.scene.add(lanternPivot);
      this.lanterns.push({
        pivot: lanternPivot,
        speed: 0.75 + idx * 0.1,
        phase: idx * 0.8,
        light: lanternLight
      });
    });
  }

  buildParticleSystems() {
    // 1. KHÓI TRẦM HƯƠNG (Rising Smoke Wisps)
    const smokeCount = 90;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    const smokeLifes = new Float32Array(smokeCount);
    const smokeVels = [];

    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3 + 0] = (Math.random() - 0.5) * 0.15;
      smokePos[i * 3 + 1] = 2.1 + Math.random() * 3.5;
      smokePos[i * 3 + 2] = -0.8 + (Math.random() - 0.5) * 0.15;
      smokeLifes[i] = Math.random();
      smokeVels.push({
        x: (Math.random() - 0.5) * 0.08,
        y: 0.25 + Math.random() * 0.25,
        z: (Math.random() - 0.5) * 0.08
      });
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      map: this.textures.smoke,
      size: 1.0,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      color: 0xf5f5f5
    });

    this.smokeParticles = {
      points: new THREE.Points(smokeGeo, smokeMat),
      geo: smokeGeo,
      vels: smokeVels,
      lifes: smokeLifes,
      count: smokeCount
    };
    this.scene.add(this.smokeParticles.points);

    // 2. BỤI VÀNG PHƯỚC QUANG (Golden Blessings)
    const sparkleCount = 300;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(sparkleCount * 3);
    const sparkleVels = [];

    for (let i = 0; i < sparkleCount; i++) {
      sparklePos[i * 3 + 0] = (Math.random() - 0.5) * 20;
      sparklePos[i * 3 + 1] = 0.5 + Math.random() * 12;
      sparklePos[i * 3 + 2] = -5 + Math.random() * 25;
      sparkleVels.push({
        x: (Math.random() - 0.5) * 0.04,
        y: (Math.random() - 0.5) * 0.03,
        z: (Math.random() - 0.5) * 0.04
      });
    }

    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
    const sparkleMat = new THREE.PointsMaterial({
      map: this.textures.sparkle,
      size: 0.28,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffe688
    });

    this.sparkleParticles = {
      points: new THREE.Points(sparkleGeo, sparkleMat),
      geo: sparkleGeo,
      vels: sparkleVels,
      count: sparkleCount
    };
    this.scene.add(this.sparkleParticles.points);
  }

  spawnFloatingLotus(donorName = 'Phật tử ẩn danh', prayerText = 'Cầu gia đạo bình an') {
    const lotusGroup = new THREE.Group();
    const startX = (Math.random() - 0.5) * 2.8;
    lotusGroup.position.set(startX, 0.08, 1.2);

    const miniThrone = this.createLotusThrone(0.35, 0.25, true);
    lotusGroup.add(miniThrone);

    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    candle.position.y = 0.3;
    lotusGroup.add(candle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0xffcc33 }));
    flame.position.y = 0.42;
    lotusGroup.add(flame);

    const lotusLight = new THREE.PointLight(0xff9933, 1.2, 3.2, 2.0);
    lotusLight.position.y = 0.45;
    lotusGroup.add(lotusLight);

    this.scene.add(lotusGroup);
    this.floatingLotuses.push({
      mesh: lotusGroup,
      donor: donorName,
      prayer: prayerText,
      age: 0,
      driftX: (Math.random() - 0.5) * 0.006,
      driftZ: 0.018 + Math.random() * 0.01
    });

    templeAudio.playSingingBowl();
  }

  triggerDivineBlessing(intensity = 1.0) {
    if (this.buddhaPointLight) {
      const origIntensity = 4.2;
      this.buddhaPointLight.intensity = origIntensity * 2.2 * intensity;
      const startTime = performance.now();

      const fadeBack = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed < 3.0) {
          this.buddhaPointLight.intensity = THREE.MathUtils.lerp(
            origIntensity * 2.2 * intensity,
            origIntensity,
            elapsed / 3.0
          );
          requestAnimationFrame(fadeBack);
        } else {
          this.buddhaPointLight.intensity = origIntensity;
        }
      };
      requestAnimationFrame(fadeBack);
    }
    templeAudio.playBell({ intensity: Math.min(intensity, 1.8) });
  }

  onPointerDown(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cushions);

    if (intersects.length > 0) {
      const hitCushion = intersects[0].object;
      this.sitOnCushion(hitCushion);
    }
  }

  /**
   * Nghi Thức Dâng Hương (Khi bấm nút hoặc có quà tặng cúng dường live:gift)
   * Nhân vật ở bồ đoàn Chủ Lễ trang nghiêm nâng 3 nén nhang trầm đỏ rực khói tỏa.
   * Camera chính mượt mà ROOM LẠI GẦN NHÌN TỪ ĐẰNG SAU NHÂN VẬT hướng lên án hương và Tam Thế Phật.
   * Sau ~7.5 giây chiêm bái, camera tự động trở lại góc nhìn Chánh Điện trang nghiêm.
   */
  offerIncense(donorName = 'Đại Chủ Lễ', giftName = '') {
    // 1. Tìm hoặc gán nhân vật ở bồ đoàn Chủ Lễ (z = 2.8)
    const masterCushion = this.cushions.find(c => c.userData.isMaster) || this.cushions[0];
    if (masterCushion) {
      if (masterCushion.userData.devotee) {
        masterCushion.remove(masterCushion.userData.devotee);
      }
      // Tạo nhân vật dâng hương với 3 nén nhang trầm đỏ rực và bảng tên thí chủ
      const dev = this.createSittingDevotee(0x5b7088, donorName, true);
      dev.position.set(0, 0.07, 0);
      masterCushion.add(dev);
      masterCushion.userData.devotee = dev;
      masterCushion.userData.occupiedBy = donorName;
    }

    // 2. Góc nhìn chính room lại gần nhìn từ đằng sau nhân vật
    // Nhân vật ở (0, 0.14, 2.8). Camera đặt ngay phía sau ở (0, 1.70, 5.7), nhìn qua vai lên án hương & Phật
    const zoomInPos = new THREE.Vector3(0, 1.70, 5.7);
    const zoomInLook = new THREE.Vector3(0, 1.85, -1.8);
    this.smoothMoveCamera(zoomInPos, zoomInLook);

    // Âm thanh chuông ngân / bát đồng thanh tịnh & đọc lời chúc bình an
    templeAudio.playSingingBowl();
    templeAudio.speakBlessing(donorName, giftName);

    // Lư hương bừng sáng trầm ấm
    if (this.incenseLight) {
      this.incenseLight.intensity = 2.8;
      setTimeout(() => {
        if (this.incenseLight) this.incenseLight.intensity = 1.4;
      }, 4500);
    }

    // Khói trầm hương bay cuộn dày hơn
    if (this.smokeParticles && this.smokeParticles.points) {
      this.smokeParticles.points.material.opacity = 0.7;
      setTimeout(() => {
        if (this.smokeParticles && this.smokeParticles.points) {
          this.smokeParticles.points.material.opacity = 0.42;
        }
      }, 6000);
    }

    // 3. Sau đúng 3.0 giây dâng hương theo yêu cầu, camera tự động trở về góc Chánh Điện và giải phóng bồ đoàn Chủ Lễ
    clearTimeout(this.incenseReturnTimer);
    this.incenseReturnTimer = setTimeout(() => {
      this.smoothMoveCamera(this.defaultCameraPos, this.defaultCameraLook);

      // Bồ đoàn Đại Chủ Lễ luôn để trống để mọi người tiếp tục dâng hương
      if (masterCushion && masterCushion.userData.devotee) {
        masterCushion.remove(masterCushion.userData.devotee);
        masterCushion.userData.devotee = null;
        masterCushion.userData.occupiedBy = null;
      }
    }, 3000);
  }

  sitOnCushion(cushionMesh) {
    this.activeCushion = cushionMesh;
    templeAudio.playWoodblock();

    const devName = cushionMesh.userData.occupiedBy || 'Phật tử';

    // Nếu nhấp vào bồ đoàn Chủ Lễ ở giữa sân, thực hiện nghi thức dâng hương và zoom cận cảnh từ đằng sau
    if (cushionMesh.userData.isMaster) {
      this.offerIncense(devName);
    }

    const event = new CustomEvent('cushion-selected', {
      detail: {
        id: cushionMesh.userData.id,
        row: cushionMesh.userData.row || 1,
        col: cushionMesh.userData.col || 1,
        occupiedBy: devName,
        isMaster: !!cushionMesh.userData.isMaster
      }
    });
    window.dispatchEvent(event);
  }

  smoothMoveCamera(pos, lookTarget) {
    this.cameraTargetPos = pos.clone();
    this.cameraTargetLook = lookTarget.clone();
    this.isCameraAnimating = true;
  }

  setCameraPreset(presetName) {
    this.cinematicMode = false;
    switch (presetName) {
      case 'chanhdien':
        this.smoothMoveCamera(this.defaultCameraPos, this.defaultCameraLook);
        break;
      case 'luhuong':
      case 'layphat':
        this.offerIncense('Thí Chủ');
        break;
      default:
        this.smoothMoveCamera(this.defaultCameraPos, this.defaultCameraLook);
        break;
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const delta = (now - this.prevTime) / 1000;
    this.prevTime = now;
    this.elapsedTime += delta;
    const time = this.elapsedTime;

    // 1. Xoay & thở Hào quang Phật
    this.halos.forEach(h => {
      h.mesh.rotation.z += h.speed * delta;
      const breath = 1.0 + Math.sin(time * 1.5) * 0.035;
      h.mesh.scale.set(h.baseScale * breath, h.baseScale * breath, 1);
    });

    // 2. Đèn lồng đỏ đung đưa
    this.lanterns.forEach(l => {
      const swingX = Math.sin(time * l.speed + l.phase) * 0.045;
      const swingZ = Math.cos(time * (l.speed * 0.8) + l.phase) * 0.035;
      l.pivot.rotation.x = swingX;
      l.pivot.rotation.z = swingZ;
      l.light.intensity = 1.2 + Math.sin(time * 8 + l.phase) * 0.15;
    });

    // 3. Ngọn nến bập bùng
    this.candles.forEach(c => {
      const flicker = Math.sin(time * 15 + c.seed) * 0.05 + Math.sin(time * 23 + c.seed) * 0.04;
      c.mesh.scale.x = 1.0 + flicker;
      c.mesh.scale.z = 1.0 + flicker;
      c.mesh.rotation.y = time * 2;
      c.light.intensity = 1.5 + Math.sin(time * 18 + c.seed) * 0.35;
    });

    // 4. Khói Trầm Hương
    if (this.smokeParticles) {
      const pos = this.smokeParticles.geo.attributes.position.array;
      const count = this.smokeParticles.count;
      for (let i = 0; i < count; i++) {
        const vel = this.smokeParticles.vels[i];
        pos[i * 3 + 0] += vel.x * delta + Math.sin(time * 2 + i) * 0.003;
        pos[i * 3 + 1] += vel.y * delta;
        pos[i * 3 + 2] += vel.z * delta;

        if (pos[i * 3 + 1] > 6.5) {
          pos[i * 3 + 0] = (Math.random() - 0.5) * 0.15;
          pos[i * 3 + 1] = 2.1;
          pos[i * 3 + 2] = -0.8 + (Math.random() - 0.5) * 0.15;
        }
      }
      this.smokeParticles.geo.attributes.position.needsUpdate = true;
    }

    // 5. Bụi vàng phước quang
    if (this.sparkleParticles) {
      const pos = this.sparkleParticles.geo.attributes.position.array;
      const count = this.sparkleParticles.count;
      for (let i = 0; i < count; i++) {
        const vel = this.sparkleParticles.vels[i];
        pos[i * 3 + 0] += vel.x * delta + Math.sin(time + i) * 0.004;
        pos[i * 3 + 1] += vel.y * delta + Math.cos(time * 0.8 + i) * 0.004;
        pos[i * 3 + 2] += vel.z * delta;

        if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = 13.5;
        if (pos[i * 3 + 1] > 14.0) pos[i * 3 + 1] = 0.3;
      }
      this.sparkleParticles.geo.attributes.position.needsUpdate = true;
    }

    // 6. Hoa đăng trôi
    for (let i = this.floatingLotuses.length - 1; i >= 0; i--) {
      const lotus = this.floatingLotuses[i];
      lotus.mesh.position.x += lotus.driftX;
      lotus.mesh.position.z += lotus.driftZ;
      lotus.mesh.rotation.y += 0.008;
      lotus.age += delta;

      if (lotus.mesh.position.z > 24 || lotus.age > 90) {
        this.scene.remove(lotus.mesh);
        this.floatingLotuses.splice(i, 1);
      }
    }

    // 7. Di chuyển Camera mượt mà
    if (this.isCameraAnimating && this.cameraTargetPos && this.cameraTargetLook) {
      this.camera.position.lerp(this.cameraTargetPos, 0.045);
      this.controls.target.lerp(this.cameraTargetLook, 0.045);
      this.controls.update();

      if (this.camera.position.distanceTo(this.cameraTargetPos) < 0.08) {
        this.isCameraAnimating = false;
      }
    } else if (this.cinematicMode) {
      const cineAngle = time * 0.08;
      this.camera.position.x = Math.sin(cineAngle) * 4;
      this.camera.position.y = 4.2 + Math.sin(time * 0.15) * 0.6;
      this.camera.position.z = 19 + Math.cos(cineAngle) * 2;
      this.controls.target.set(0, 4.2, -4.5);
      this.controls.update();
    } else {
      this.controls.update();
    }

    // 8. Cập nhật hiệu ứng hiện dần khi vào phòng / mờ dần biến mất khi out phòng
    for (const [userId, userObj] of this.userCharacters.entries()) {
      const dev = userObj.devotee;
      if (!dev) continue;

      if (dev.userData.isFadingIn) {
        dev.userData.fadeOpacity = Math.min(1.0, (dev.userData.fadeOpacity || 0) + delta * 2.2);
        dev.setDevoteeOpacity(dev.userData.fadeOpacity);
        if (dev.userData.fadeOpacity >= 1.0) dev.userData.isFadingIn = false;
      } else if (dev.userData.isFadingOut) {
        dev.userData.fadeOpacity = Math.max(0.0, (dev.userData.fadeOpacity || 1.0) - delta * 1.8);
        dev.setDevoteeOpacity(dev.userData.fadeOpacity);
        if (dev.userData.fadeOpacity <= 0.02) {
          if (dev.parent) dev.parent.remove(dev);
          if (userObj.cushion) {
            userObj.cushion.userData.devotee = null;
            userObj.cushion.userData.occupiedUserId = null;
            userObj.cushion.userData.occupiedBy = null;
          }
          this.userCharacters.delete(userId);
        }
      }
    }

    // 9. Cập nhật nhân vật đi lên dâng hương và quay về
    if (this.activeOffering) {
      this.updateActiveOffering(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
