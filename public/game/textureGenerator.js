/**
 * textureGenerator.js - Trình tạo Texture Procedural & Tối ưu cho Chùa Ba Chiều (Three.js)
 * Tự động vẽ canvas độ phân giải cao cho Hoành phi "CHÙA THIÊNG LIÊNG",
 * Liễn đối "CẦU AN", Vạn Phật Cảnh, Cột rồng, Bồ đoàn và Hào quang Phật.
 */

import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Hoành phi chính: "CHÙA THIÊNG LIÊNG" với khung chạm Rồng Vàng uy nghiêm
   */
  static createBannerMain() {
    const width = 1024;
    const height = 280;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Nền gỗ gụ sơn son sẫm màu
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#42080a');
    bgGrad.addColorStop(0.5, '#6a1215');
    bgGrad.addColorStop(1, '#3b0608');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Khung viền Rồng Vàng thếp vàng chạm trổ cổ kính
    const borderGrad = ctx.createLinearGradient(0, 0, width, height);
    borderGrad.addColorStop(0, '#f9e27a');
    borderGrad.addColorStop(0.3, '#d49b29');
    borderGrad.addColorStop(0.6, '#ffd700');
    borderGrad.addColorStop(1, '#b07914');

    // Khung ngoài kép
    ctx.lineWidth = 14;
    ctx.strokeStyle = borderGrad;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff0a0';
    ctx.strokeRect(28, 28, width - 56, height - 56);

    // Hoa văn góc chạm rồng / vân mây
    const drawCornerOrnament = (cx, cy, flipX, flipY) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = '#f9e27a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(35, 35);
      ctx.bezierCurveTo(70, 35, 80, 55, 100, 35);
      ctx.bezierCurveTo(120, 50, 110, 80, 130, 80);
      ctx.stroke();

      // Mắt rồng/ngọc châu góc
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(60, 60, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawCornerOrnament(0, 0, 1, 1);
    drawCornerOrnament(width, 0, -1, 1);
    drawCornerOrnament(0, height, 1, -1);
    drawCornerOrnament(width, height, -1, -1);

    // Đôi rồng chầu mặt nguyệt ở viền trên
    ctx.save();
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    // Điểm tâm nguyệt
    ctx.beginPath();
    ctx.arc(width / 2, 26, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#fff9d6';
    ctx.fill();
    ctx.restore();

    // Dòng chữ chính "CHÙA THIÊNG LIÊNG"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 68px "Cinzel", "Noto Serif", "Times New Roman", serif';

    // Đổ bóng chữ sâu 3D
    ctx.fillStyle = '#1c0303';
    ctx.fillText('CHÙA THIÊNG LIÊNG', width / 2 + 3, height / 2 + 5);

    // Gradient vàng kim bóng bẩy
    const textGrad = ctx.createLinearGradient(0, height / 2 - 40, 0, height / 2 + 40);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(0.2, '#ffeaa7');
    textGrad.addColorStop(0.5, '#e5a928');
    textGrad.addColorStop(0.8, '#c28514');
    textGrad.addColorStop(1, '#7a4e05');

    ctx.fillStyle = textGrad;
    ctx.shadowColor = 'rgba(255, 220, 120, 0.7)';
    ctx.shadowBlur = 20;
    ctx.fillText('CHÙA THIÊNG LIÊNG', width / 2, height / 2);

    // Viền kim tuyến
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fff8dc';
    ctx.strokeText('CHÙA THIÊNG LIÊNG', width / 2, height / 2);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Biển phụ bên dưới: "THÀNH KÍNH DÂNG HƯƠNG"
   */
  static createBannerSub() {
    const width = 768;
    const height = 150;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Nền gỗ sơn mài đỏ thẫm
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#3a0709');
    bgGrad.addColorStop(0.5, '#560e11');
    bgGrad.addColorStop(1, '#320507');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Viền vàng kim
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#d4a034';
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffe894';
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // Chữ "THÀNH KÍNH DÂNG HƯƠNG"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px "Noto Serif", "Times New Roman", serif';

    ctx.fillStyle = '#150202';
    ctx.fillText('THÀNH KÍNH DÂNG HƯƠNG', width / 2 + 2, height / 2 + 3);

    const textGrad = ctx.createLinearGradient(0, height / 2 - 20, 0, height / 2 + 20);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(0.4, '#fed368');
    textGrad.addColorStop(0.8, '#d49b29');
    textGrad.addColorStop(1, '#8f5c0c');

    ctx.fillStyle = textGrad;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText('THÀNH KÍNH DÂNG HƯƠNG', width / 2, height / 2);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Liễn đối đỏ dọc bên trái: "CẦU AN" với họa tiết Rồng vàng thêu kim tuyến
   */
  static createBannerCauAn() {
    const width = 280;
    const height = 960;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Nền lụa đỏ thêu kim tuyến
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#851016');
    bgGrad.addColorStop(0.5, '#a3151c');
    bgGrad.addColorStop(1, '#660b10');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Khung hoa văn viền gấm
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#e6b334';
    ctx.strokeRect(12, 12, width - 24, height - 24);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff0a8';
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Họa tiết rồng vàng đầu liễn (Top dragon motif)
    ctx.save();
    ctx.translate(width / 2, 140);
    ctx.fillStyle = '#ffdf6b';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;

    // Vẽ hình tượng rồng vàng cách điệu uốn lượn
    ctx.beginPath();
    ctx.arc(0, -30, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffdf6b';
    ctx.beginPath();
    ctx.arc(0, 10, 45, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // Khối chữ "CẦU AN"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 86px "Noto Serif", "Times New Roman", serif';

    const renderChar = (char, y) => {
      ctx.fillStyle = '#220002';
      ctx.fillText(char, width / 2 + 3, y + 4);

      const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ffdf6b');
      grad.addColorStop(0.7, '#d69722');
      grad.addColorStop(1, '#825004');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(255, 230, 120, 0.8)';
      ctx.shadowBlur = 15;
      ctx.fillText(char, width / 2, y);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fff8dc';
      ctx.strokeText(char, width / 2, y);
    };

    renderChar('CẦU', 370);
    renderChar('AN', 520);

    // Rồng phụng chân liễn (Bottom ornament)
    ctx.translate(width / 2, 730);
    ctx.fillStyle = '#ffdf6b';
    ctx.beginPath();
    ctx.arc(0, 30, 24, 0, Math.PI * 2);
    ctx.fill();

    // Tua rua hạt ngọc chân liễn
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 18, 90);
      ctx.lineTo(i * 18, 160);
      ctx.stroke();
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Vách tường "VẠN PHẬT THÀNH" (Thousand Buddhas Glowing Wall)
   * Lưới hàng trăm hốc tượng Phật mạ vàng phát quang ấm áp
   */
  static createVanPhatWall() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Nền tường màu nâu gỗ đền chùa cổ
    ctx.fillStyle = '#220c0b';
    ctx.fillRect(0, 0, size, size);

    const cols = 16;
    const rows = 16;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW;
        const y = r * cellH;

        // Khung vòm hốc Phật
        const nicheW = cellW * 0.78;
        const nicheH = cellH * 0.82;
        const nx = x + (cellW - nicheW) / 2;
        const ny = y + (cellH - nicheH) / 2;

        // Ánh sáng vàng tỏa ra từ hốc
        const glow = ctx.createRadialGradient(
          nx + nicheW / 2, ny + nicheH / 2, 2,
          nx + nicheW / 2, ny + nicheH / 2, nicheW * 0.9
        );
        glow.addColorStop(0, '#ffe082');
        glow.addColorStop(0.4, '#c98a1a');
        glow.addColorStop(0.85, '#5c2a08');
        glow.addColorStop(1, '#1a0807');

        ctx.fillStyle = glow;
        ctx.beginPath();
        // Vòm cong trên đỉnh hốc
        ctx.arc(nx + nicheW / 2, ny + nicheW / 2, nicheW / 2, Math.PI, 0);
        ctx.lineTo(nx + nicheW, ny + nicheH);
        ctx.lineTo(nx, ny + nicheH);
        ctx.closePath();
        ctx.fill();

        // Viền vàng kim hốc
        ctx.strokeStyle = '#e0aa38';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Hình bóng Tượng Phật ngồi thiền thu nhỏ bằng vàng
        ctx.fillStyle = '#ffeaa7';
        const cx = nx + nicheW / 2;
        const cy = ny + nicheH * 0.65;

        // Đầu Phật
        ctx.beginPath();
        ctx.arc(cx, cy - nicheH * 0.22, nicheW * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Nhục kế
        ctx.beginPath();
        ctx.arc(cx, cy - nicheH * 0.28, nicheW * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Thân & Tọa thiền
        ctx.beginPath();
        ctx.moveTo(cx, cy - nicheH * 0.12);
        ctx.lineTo(cx + nicheW * 0.24, cy + nicheH * 0.15);
        ctx.lineTo(cx - nicheW * 0.24, cy + nicheH * 0.15);
        ctx.closePath();
        ctx.fill();

        // Tòa sen đế
        ctx.fillStyle = '#c7841c';
        ctx.fillRect(cx - nicheW * 0.26, cy + nicheH * 0.15, nicheW * 0.52, nicheH * 0.06);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Mặt sàn Chánh điện: Gạch ceramic/đá xanh thẫm phản chiếu bóng loáng
   */
  static createFloorTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Nền đá xanh đen thẫm sang trọng
    ctx.fillStyle = '#0c1520';
    ctx.fillRect(0, 0, size, size);

    // Kẻ chỉ mạch gạch men bóng
    const tileSize = size / 8;
    ctx.strokeStyle = 'rgba(70, 110, 150, 0.35)';
    ctx.lineWidth = 2.5;

    for (let i = 0; i <= size; i += tileSize) {
      // Đường ngang
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();

      // Đường dọc
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }

    // Hiệu ứng vân đá cẩm thạch chìm
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const grad = ctx.createRadialGradient(
          x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 5,
          x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize * 0.7
        );
        grad.addColorStop(0, 'rgba(35, 55, 75, 0.4)');
        grad.addColorStop(1, 'rgba(10, 18, 28, 0.1)');
        ctx.fillStyle = grad;
        ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 6);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Vân Cột Chùa: Gỗ sơn son thếp vàng cuộn Rồng và câu đối Phật giáo
   */
  static createPillarTexture() {
    const width = 512;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Nền sơn mài chu sa đỏ
    const bg = ctx.createLinearGradient(0, 0, width, 0);
    bg.addColorStop(0, '#5a0c0e');
    bg.addColorStop(0.3, '#941e21');
    bg.addColorStop(0.7, '#a82529');
    bg.addColorStop(1, '#4a080a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Họa tiết Rồng vàng cuộn cột uốn lượn hình sin
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    for (let y = 0; y <= height; y += 10) {
      const x = width / 2 + Math.sin(y * 0.02) * (width * 0.28);
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Vảy rồng & mây cuộn vàng
    ctx.fillStyle = 'rgba(255, 235, 120, 0.5)';
    for (let y = 40; y < height; y += 45) {
      const x = width / 2 + Math.sin(y * 0.02) * (width * 0.28);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Câu đối mạ vàng dọc thân cột
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffebb3';
    ctx.font = 'bold 28px serif';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    const chars = ['PHẬT', 'QUANG', 'PHỔ', 'CHIẾU', 'GIA', 'HỘ', 'BÌNH', 'AN'];
    chars.forEach((c, idx) => {
      ctx.fillText(c, width / 2, 220 + idx * 80);
    });
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Mặt Đệm Bồ Đoàn Ngồi Thiền: Viền đỏ đô tâm vàng sen
   */
  static createCushionTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Vành ngoài: Vải nhung đỏ đô ấm
    const outerGrad = ctx.createRadialGradient(
      size / 2, size / 2, size * 0.2,
      size / 2, size / 2, size * 0.48
    );
    outerGrad.addColorStop(0, '#9e1823');
    outerGrad.addColorStop(0.7, '#751119');
    outerGrad.addColorStop(1, '#4a070c');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // Đường may múi xếp tròn xung quanh
    ctx.strokeStyle = 'rgba(50, 5, 8, 0.4)';
    ctx.lineWidth = 3;
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(
        size / 2 + Math.cos(angle) * (size * 0.24),
        size / 2 + Math.sin(angle) * (size * 0.24)
      );
      ctx.lineTo(
        size / 2 + Math.cos(angle) * (size * 0.47),
        size / 2 + Math.sin(angle) * (size * 0.47)
      );
      ctx.stroke();
    }

    // Tâm bồ đoàn: Đệm tròn vàng kim hoa sen
    const innerGrad = ctx.createRadialGradient(
      size / 2, size / 2, 5,
      size / 2, size / 2, size * 0.24
    );
    innerGrad.addColorStop(0, '#fff1a8');
    innerGrad.addColorStop(0.6, '#f3b41d');
    innerGrad.addColorStop(1, '#c4890c');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.23, 0, Math.PI * 2);
    ctx.fill();

    // Họa tiết hoa sen 8 cánh tâm đệm
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.fillStyle = 'rgba(160, 95, 0, 0.35)';
    for (let i = 0; i < 8; i++) {
      ctx.rotate((Math.PI * 2) / 8);
      ctx.beginPath();
      ctx.ellipse(0, 32, 8, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Hào quang Phật (Aura / Mandorla): Đĩa hào quang tỏa tia sáng rực rỡ
   */
  static createHaloTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

    // Vầng sáng mềm tỏa ra
    const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, size * 0.48);
    glow.addColorStop(0, 'rgba(255, 255, 235, 1.0)');
    glow.addColorStop(0.35, 'rgba(255, 220, 110, 0.85)');
    glow.addColorStop(0.7, 'rgba(240, 170, 30, 0.45)');
    glow.addColorStop(0.92, 'rgba(200, 100, 10, 0.15)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Vành cánh hoa sen tỏa tròn
    ctx.save();
    ctx.translate(cx, cy);
    const numSpokes = 36;
    ctx.strokeStyle = 'rgba(255, 245, 180, 0.7)';
    ctx.lineWidth = 2.5;

    for (let i = 0; i < numSpokes; i++) {
      ctx.rotate((Math.PI * 2) / numSpokes);
      ctx.beginPath();
      ctx.moveTo(0, size * 0.18);
      ctx.lineTo(0, size * 0.46);
      ctx.stroke();

      // Cánh nhọn
      ctx.fillStyle = 'rgba(255, 215, 80, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, size * 0.46);
      ctx.lineTo(6, size * 0.41);
      ctx.lineTo(-6, size * 0.41);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Vòng tròn hào quang bên trong
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Hạt Khói Trầm Hương (Smoke Puff Particle)
   */
  static createSmokeParticle() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(
      size / 2, size / 2, 2,
      size / 2, size / 2, size * 0.48
    );
    grad.addColorStop(0, 'rgba(240, 240, 245, 0.75)');
    grad.addColorStop(0.3, 'rgba(215, 215, 225, 0.45)');
    grad.addColorStop(0.7, 'rgba(180, 180, 195, 0.15)');
    grad.addColorStop(1, 'rgba(150, 150, 160, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Hạt Phước Quang / Bụi Vàng Lấp Lánh (Golden Sparkle Particle)
   */
  static createSparkleParticle() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.45);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(255, 230, 130, 0.85)');
    grad.addColorStop(0.6, 'rgba(255, 185, 30, 0.4)');
    grad.addColorStop(1, 'rgba(255, 150, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Tia sáng 4 cánh lấp lánh
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, size - 10);
    ctx.moveTo(10, cy);
    ctx.lineTo(size - 10, cy);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}

