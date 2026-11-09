/**
 * game.js - Logic Điều Khiển & Cầu Nối Tương Tác Chùa 3D (Three.js & TikTok Live)
 * Kết nối thời gian thực với TikTok Live Socket.IO hoặc Bộ giả lập Admin:
 * Tiếp nhận quà tặng dâng cúng, bình luận cầu an, thả tim phước đức,
 * điều khiển âm thanh chuông mõ và các góc máy Chánh Điện.
 */

import { TempleScene } from './templeScene.js';
import { templeAudio } from './audioSystem.js';

class TempleGameController {
  constructor() {
    this.scene = null;
    this.socket = null;
    this.viewerCount = 0;
    this.meritPoints = 0;
    this.isMuted = false;
    this.streamMode = true; // Mặc định chế độ 9:16 dọc cho TikTok Live / Mobile / OBS

    this.init();
  }

  init() {
    const viewport = document.getElementById('canvas-viewport');
    this.scene = new TempleScene(viewport);

    this.setupUI();
    this.setupSocket();
    this.setupAudioAutoplayUnlock();
  }

  setupAudioAutoplayUnlock() {
    const syncMusicBtn = (playing) => {
      const btnMusic = document.getElementById('btn-music');
      if (btnMusic) {
        btnMusic.classList.toggle('active', playing);
        const label = btnMusic.querySelector('.label');
        if (label) label.textContent = playing ? 'Tắt Nhạc Thiền' : 'Nhạc Thiền 432Hz';
      }
    };

    window.addEventListener('ambient-state-changed', (e) => {
      if (e.detail && typeof e.detail.playing === 'boolean') {
        syncMusicBtn(e.detail.playing);
      }
    });

    window.addEventListener('blessing-spoken', (e) => {
      if (e.detail && e.detail.blessingText) {
        this.showPrayerTag(e.detail.blessingText, '🙏 Lời Chúc Bình An');
      }
      if (e.detail && e.detail.category) {
        const items = document.querySelectorAll('#live-blessing-panel .blessing-item');
        items.forEach(item => {
          if (item.dataset.category === e.detail.category) {
            item.classList.add('active-blessing');
            clearTimeout(item._glowTimer);
            item._glowTimer = setTimeout(() => {
              item.classList.remove('active-blessing');
            }, 4000);
          } else {
            item.classList.remove('active-blessing');
          }
        });
      }
    });

    // Thử tự động khởi chạy nhạc nền thiền ngay khi tải trang (hoạt động ngay trên OBS hoặc tab đã tương tác)
    try {
      templeAudio.ensureContext();
    } catch (e) {
      // Sẽ mở khóa khi có tương tác đầu tiên
    }

    // Mở khóa Web Audio Context ngay khi người dùng chạm hoặc click đầu tiên
    const unlock = () => {
      templeAudio.ensureContext();
      if (templeAudio.ctx && templeAudio.ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  setupUI() {
    // 1. Thỉnh Chuông Đại Hồng Chung
    const btnBell = document.getElementById('btn-bell');
    if (btnBell) {
      btnBell.addEventListener('click', () => {
        templeAudio.playBell({ intensity: 1.4 });
        this.scene.triggerDivineBlessing(1.0);
        this.addMerit(10);
      });
    }

    // 2. Gõ Mõ Tụng Kinh (Click: gõ 1 tiếng; Click đúp: bật/tắt Tự Động Gõ Mõ)
    const btnWoodblock = document.getElementById('btn-woodblock');
    if (btnWoodblock) {
      btnWoodblock.addEventListener('click', () => {
        templeAudio.playWoodblock();
        this.addMerit(1);
      });

      // Nhấn đúp chuột để Bật / Tắt Tự Động Gõ Mõ
      btnWoodblock.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const isAuto = templeAudio.toggleAutoMoktak();
        btnWoodblock.classList.toggle('active', isAuto);
        const label = btnWoodblock.querySelector('.label');
        if (label) label.textContent = isAuto ? 'Mõ: Tự Động' : 'Gõ Mõ';
      });
    }

    // 12. Phím tắt Bàn Phím (Keyboard Shortcuts cho Streamer)
    window.addEventListener('keydown', (e) => {
      // Bỏ qua khi đang gõ vào form nhập liệu
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      const key = e.key.toUpperCase();
      if (e.code === 'Space' || key === '1') {
        e.preventDefault();
        templeAudio.playBell({ intensity: 1.4 });
        this.scene.triggerDivineBlessing(1.0);
        this.addMerit(10);
      } else if (key === 'M' || key === '2') {
        templeAudio.playWoodblock();
        this.addMerit(1);
      } else if (key === 'A') {
        // Phím A: Bật/Tắt Tự Động Gõ Mõ
        const isAuto = templeAudio.toggleAutoMoktak();
        if (btnWoodblock) {
          btnWoodblock.classList.toggle('active', isAuto);
          const label = btnWoodblock.querySelector('.label');
          if (label) label.textContent = isAuto ? 'Mõ: Tự Động' : 'Gõ Mõ';
        }
      } else if (key === 'H' || key === '3') {
        this.scene.offerIncense('Thí Chủ');
        this.addMerit(10);
        this.showPrayerTag('Thành Kính Dâng Nén Tâm Hương Lên Chư Phật Mười Phương', 'Thí Chủ');
      } else if (key === 'N' || key === '4') {
        templeAudio.playSingingBowl();
        this.addMerit(5);
        this.showPrayerTag('Thắp Sáng Đèn Trí Tuệ - Cầu Gia Đạo Bình An', 'Thí Chủ');
      } else if (key === 'L' || key === 'P') {
        this.scene.offerIncense('Phật tử Lạy Phật');
        templeAudio.playWoodblock();
        this.addMerit(5);
      } else if (key === 'S') {
        if (modalPrayer) modalPrayer.classList.toggle('open');
      } else if (key === 'O') {
        toggleOBS();
      }
    });

    // 3. Dâng Hương & Hoa + Bảng Thỉnh Lời Chúc bên phải màn hình live
    const btnIncense = document.getElementById('btn-incense');
    if (btnIncense) {
      btnIncense.addEventListener('click', () => {
        this.scene.offerIncense('Thí Chủ', 'Hoa hồng');
        this.addMerit(10);
        this.showPrayerTag('Thành Kính Dâng Nén Tâm Hương Lên Chư Phật Mười Phương', 'Thí Chủ');
      });
    }

    const blessingItems = document.querySelectorAll('#live-blessing-panel .blessing-item');
    blessingItems.forEach(item => {
      item.addEventListener('click', () => {
        const giftName = item.dataset.gift || 'Hoa hồng';
        this.scene.offerIncense('Thí Chủ', giftName);
        this.addMerit(10);
      });
    });

    // 4. Thắp Nến Cầu Nguyện
    const btnCandle = document.getElementById('btn-candle');
    if (btnCandle) {
      btnCandle.addEventListener('click', () => {
        templeAudio.playSingingBowl();
        this.addMerit(5);
        this.showPrayerTag('Thắp Sáng Đèn Trí Tuệ - Cầu Gia Đạo Bình An', 'Thí Chủ');
      });
    }

    // 5. Quỳ Lạy / Tọa Thiền
    const btnPray = document.getElementById('btn-pray');
    if (btnPray) {
      btnPray.addEventListener('click', () => {
        this.scene.offerIncense('Phật tử Lạy Phật');
        templeAudio.playWoodblock();
        this.addMerit(5);
      });
    }

    // 6. Nhạc Thiền 432Hz
    const btnMusic = document.getElementById('btn-music');
    if (btnMusic) {
      btnMusic.addEventListener('click', () => {
        const isPlaying = templeAudio.toggleAmbient();
        btnMusic.classList.toggle('active', isPlaying);
        btnMusic.querySelector('.label').textContent = isPlaying ? 'Tắt Nhạc Thiền' : 'Nhạc Thiền 432Hz';
      });
    }

    // 7. Modal Dâng Sớ Cầu An
    const btnOpenPrayer = document.getElementById('btn-open-prayer');
    const modalPrayer = document.getElementById('prayer-modal');
    const btnClosePrayer = document.getElementById('btn-close-prayer');
    const prayerForm = document.getElementById('prayer-form');

    if (btnOpenPrayer && modalPrayer) {
      btnOpenPrayer.addEventListener('click', () => {
        modalPrayer.classList.add('open');
      });
    }

    if (btnClosePrayer && modalPrayer) {
      btnClosePrayer.addEventListener('click', () => {
        modalPrayer.classList.remove('open');
      });
    }

    if (prayerForm) {
      prayerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('prayer-name').value.trim() || 'Phật tử ẩn danh';
        const type = document.getElementById('prayer-type').value;
        const wish = document.getElementById('prayer-wish').value.trim() || 'Cầu gia đình vạn sự an lành';

        modalPrayer.classList.remove('open');

        // Thả đóa hoa đăng trôi trên sàn Chánh Điện
        this.scene.spawnFloatingLotus(name, wish);

        // Hiển thị tin nhắn cầu an góc màn hình
        this.showPrayerTag(`[${type}] ${wish}`, name);

        // Hiệu ứng phước quang
        this.scene.triggerDivineBlessing(1.2);
        this.addMerit(20);

        // Reset form
        document.getElementById('prayer-wish').value = '';
      });
    }

    // 8. Tùy chọn Tỉ lệ Khung hình (9:16 Stream Live vs Toàn màn hình)
    const btnToggleStream = document.getElementById('btn-toggle-stream');
    const viewport = document.getElementById('canvas-viewport');
    if (btnToggleStream && viewport) {
      btnToggleStream.addEventListener('click', () => {
        this.streamMode = !this.streamMode;
        viewport.classList.toggle('stream-mode-9-16', this.streamMode);
        btnToggleStream.textContent = this.streamMode ? '📐 Tỉ Lệ: 9:16 Live' : '📐 Tỉ Lệ: Toàn Màn Hình';
        setTimeout(() => this.scene.onResize(), 100);
      });
    }

    // 9. Chế độ OBS Sạch (Ẩn nút cho Streamer quay OBS)
    const btnToggleOBS = document.getElementById('btn-toggle-obs');
    const obsTogglePill = document.getElementById('obs-toggle-pill');

    const toggleOBS = () => {
      document.body.classList.toggle('obs-clean');
    };

    if (btnToggleOBS) btnToggleOBS.addEventListener('click', toggleOBS);
    if (obsTogglePill) obsTogglePill.addEventListener('click', toggleOBS);

    // 10. Nhận sự kiện chọn Bồ Đoàn từ 3D Scene
    window.addEventListener('cushion-selected', (e) => {
      const { id, row, col, occupiedBy, isMaster } = e.detail;
      const popup = document.getElementById('cushion-info-popup');
      if (popup) {
        if (isMaster) {
          popup.innerHTML = `🙏 <b>Bồ Đoàn Chủ Lễ Dâng Hương</b><br><span style="font-size:11px; color:#ffeaa7;">Đại diện chư phật tử dâng tâm hương lên Tam Bảo</span>`;
        } else {
          popup.innerHTML = `🙏 <b>Bồ đoàn #${id}</b> (Hàng ${row}, Cột ${col})<br><span style="font-size:11px; color:#ffeaa7;">${occupiedBy || 'Phật tử'} đang tọa thiền chiêm bái Đức Thế Tôn</span>`;
        }
        popup.style.display = 'block';
        clearTimeout(this.popupTimer);
        this.popupTimer = setTimeout(() => {
          popup.style.display = 'none';
        }, 3500);
      }
    });
  }

  setupSocket() {
    const statusPill = document.getElementById('live-status-pill');
    const statusText = document.getElementById('live-status-text');
    const viewerCountElem = document.getElementById('viewer-count-text');

    // Kiểm tra Socket.IO Client được phục vụ bởi server.js
    if (typeof io !== 'undefined') {
      try {
        this.socket = io();

        this.socket.on('connect', () => {
          if (statusPill) statusPill.classList.remove('offline');
          if (statusText) statusText.textContent = 'Trực Tuyến (TikTok/Admin)';
        });

        this.socket.on('disconnect', () => {
          if (statusPill) statusPill.classList.add('offline');
          if (statusText) statusText.textContent = 'Mất Kết Nối';
        });

        // 1. Nhận trạng thái ban đầu của phòng Live
        this.socket.on('init_state', (state) => {
          if (!state) return;
          if (typeof state.viewerCount === 'number') {
            this.viewerCount = state.viewerCount;
            if (viewerCountElem) viewerCountElem.textContent = `${this.viewerCount} Phật tử`;
          }
          const totalCoins = state.sessionTotals?.totalCoins || 0;
          this.totalCoins = totalCoins;
          this.meritPoints = totalCoins * 10;
          this.updateMeritChestUI(totalCoins);

          // Cập nhật bảng xếp hạng công đức bên trái
          if (state.topPlayers || state.allPlayers) {
            this.updateLeaderboardUI(state.topPlayers || state.allPlayers);
          }

          // Đồng bộ các nhân vật đang có trong phòng live (chỉ những Phật tử thực sự đã tương tác: có xu, tim, hoặc chat)
          if (Array.isArray(state.allPlayers)) {
            const interactivePlayers = state.allPlayers.filter(
              p => p.isOnline !== false && (
                (Number(p.coins) || 0) > 0 ||
                (Number(p.likes) || 0) > 0 ||
                (Number(p.chatsCount) || 0) > 0
              )
            );
            this.scene.syncPlayers(interactivePlayers);
            this.updateHeaderPills();
          }
        });

        // 2. Khán giả mới vào phòng (live:member_join)
        // Chú ý: "Phật tử là những người tương tác chứ không phải những người xem"
        // Người xem thông thường chỉ xem stream KHÔNG sinh ra nhân vật trên bồ đoàn.
        this.socket.on('live:member_join', (data) => {
          if (data && typeof data.onlineCount === 'number') {
            this.viewerCount = data.onlineCount;
            this.updateHeaderPills();
          }
          if (data && data.nickname) {
            this.showPrayerTag(`đã vào xem phòng live`, data.nickname);
          }
        });

        // 3. Khán giả out phòng live (live:member_leave)
        this.socket.on('live:member_leave', (data) => {
          if (data && typeof data.onlineCount === 'number') {
            this.viewerCount = data.onlineCount;
          }
          // Nhân vật Phật tử mờ dần rồi biến mất hoàn toàn
          if (data) {
            this.scene.removeUserCharacter(data.userId, data.nickname);
            this.showPrayerTag(`đã hồi hướng rời Chánh Điện`, data.nickname || 'Khán giả');
            setTimeout(() => this.updateHeaderPills(), 1000);
          }
        });

        // 4. SỰ KIỆN TẶNG QUÀ / CÚNG DƯỜNG (live:gift)
        this.socket.on('live:gift', (data) => {
          this.handleGiftEvent(data);
        });

        // 5. Khán giả gửi bình luận (live:chat)
        this.socket.on('live:chat', (data) => {
          this.handleChatEvent(data);
        });

        // 6. Khán giả thả tim (live:like)
        this.socket.on('live:like', (data) => {
          this.handleLikeEvent(data);
        });

        // 7. Cập nhật số lượng người xem (live:viewer_count hoặc live:room_user)
        this.socket.on('live:viewer_count', (data) => {
          if (data && typeof data.viewerCount === 'number') {
            this.viewerCount = data.viewerCount;
            this.updateHeaderPills();
          }
        });
        this.socket.on('live:room_user', (data) => {
          if (data && typeof data.viewerCount === 'number') {
            this.viewerCount = data.viewerCount;
            this.updateHeaderPills();
          }
        });

        // 8. Cập nhật danh sách người chơi & Bảng xếp hạng từ Admin
        this.socket.on('admin:players_updated', (players) => {
          this.updateLeaderboardUI(players);
          // Không gọi syncPlayers tại đây để tránh hồi sinh nhân vật đang mờ dần khi out phòng
        });

        // 9. Cập nhật thống kê hòm công đức
        this.socket.on('admin:gift_breakdown_updated', (data) => {
          if (data && data.stats && typeof data.stats.totalRevenueCoins === 'number') {
            this.updateMeritChestUI(data.stats.totalRevenueCoins);
          }
        });

        // 10. Đặt lại phiên live (live:session_reset)
        this.socket.on('live:session_reset', () => {
          this.totalCoins = 0;
          this.meritPoints = 0;
          this.updateMeritChestUI(0);
          this.updateLeaderboardUI([]);
          this.scene.userCharacters.forEach(u => {
            if (u.cushion) {
              u.cushion.remove(u.devotee);
              u.cushion.userData.devotee = null;
              u.cushion.userData.occupiedUserId = null;
              u.cushion.userData.occupiedBy = null;
            }
          });
          this.scene.userCharacters.clear();
        });

      } catch (err) {
        console.warn('Socket.IO connection failed, running standalone mode.', err);
      }
    } else {
      if (statusText) statusText.textContent = 'Chế độ Độc Lập';
    }
  }

  /**
   * Xử lý khi có Quà tặng / Cúng dường (live:gift)
   * Nhân vật của người đó đi dần lên dâng hương, camera zoom lại gần rồi quay về chỗ cũ.
   * Khi ấn giữ combo tặng liên tiếp, gộp mượt mà số lượng xu và không spam lặp lại dâng hương hay thông báo.
   */
  handleGiftEvent(data) {
    const userId = data.userId || `gift_${data.nickname}`;
    const nickname = data.nickname || 'Phật tử thập phương';
    const giftName = data.giftName || 'Hoa Sen';
    const deltaCoins = Number(data.deltaCoins) || Number(data.diamondCount) || 1;
    const avatarUrl = data.avatarUrl || '';

    // Cộng điểm công đức & Cập nhật hòm công đức
    this.totalCoins = (this.totalCoins || 0) + deltaCoins;
    this.addMerit(deltaCoins * 10);
    this.updateMeritChestUI(this.totalCoins);
    this.updateHeaderPills();

    // Kích hoạt: Nhân vật đi dần lên dâng hương (tự động gộp nếu người này đang dâng hương hoặc đang trong hàng đợi)
    this.scene.triggerGiftOffering(userId, nickname, deltaCoins, giftName);

    // Chống spam thả hoa đăng khi ấn giữ combo (mỗi người tối đa 1 hoa đăng mỗi 3.5 giây)
    if (!this.lastLotusTimeByUser) this.lastLotusTimeByUser = new Map();
    const now = Date.now();
    const lastLotus = this.lastLotusTimeByUser.get(userId) || 0;
    if (now - lastLotus > 3500) {
      this.lastLotusTimeByUser.set(userId, now);
      this.scene.spawnFloatingLotus(nickname, `Cúng dường ${giftName}`);
    }

    // Hiển thị hoặc cộng dồn Toast thông báo vinh danh mạ vàng khi ấn giữ combo
    this.showGiftToast(nickname, giftName, deltaCoins, avatarUrl, userId);

    // Nếu server có gửi kèm topPlayers
    if (data.topPlayers) {
      this.updateLeaderboardUI(data.topPlayers);
    }
  }

  /**
   * Cập nhật số lượng Phật tử (người tương tác có bồ đoàn) và người xem trong phòng
   */
  updateHeaderPills() {
    const viewerCountElem = document.getElementById('viewer-count-text');
    if (!viewerCountElem) return;
    const devoteeCount = this.scene ? Math.max(0, this.scene.userCharacters.size - (this.scene.userCharacters.has('chu_le') ? 1 : 0)) : 0;
    viewerCountElem.textContent = `${devoteeCount} Phật tử • ${this.viewerCount} Người xem`;
  }

  /**
   * Xử lý bình luận (live:chat)
   * Phật tử tương tác: Xuất hiện trên bồ đoàn và camera zoom nhẹ vào nội dung bình luận
   */
  handleChatEvent(data) {
    const userId = data.userId || `chat_${data.nickname}`;
    const user = data.nickname || 'Khán giả';
    const msg = data.message || data.comment || '';
    const avatarUrl = data.avatarUrl || '';

    // Đảm bảo nhân vật tồn tại trên bồ đoàn vì người này đã có tương tác
    this.scene.ensureUserCharacter(userId, user, avatarUrl);
    this.updateHeaderPills();

    // Hiện bong bóng thoại và kích hoạt camera zoom nhẹ vào Phật tử đang bình luận
    this.scene.showDevoteeSpeech(userId, msg);

    // Đưa vào luồng tin nhắn cầu an góc dưới màn hình
    this.showPrayerTag(msg, user);
    this.addMerit(1);

    // Nếu tin nhắn có chữ mang tâm niệm Phật giáo, tự động gõ mõ
    const lower = msg.toLowerCase();
    if (lower.includes('a di đà phật') || lower.includes('nam mô') || lower.includes('cầu an') || lower.includes('phật')) {
      templeAudio.playWoodblock();
      if (Math.random() < 0.25) {
        this.scene.spawnFloatingLotus(user, msg);
      }
    }
  }

  /**
   * Xử lý thả tim (live:like)
   */
  handleLikeEvent(data) {
    const userId = data.userId || `like_${data.nickname}`;
    const user = data.nickname || 'Khán giả';
    const count = data.likeCount || 1;

    // Đảm bảo nhân vật có mặt trong điện Phật vì người này đã tương tác thả tim
    this.scene.ensureUserCharacter(userId, user, data.avatarUrl || '');
    this.updateHeaderPills();
    this.addMerit(count);
  }

  /**
   * Cập nhật thông số Hòm Công Đức (Bảng bên trái)
   */
  updateMeritChestUI(coins = 0) {
    this.totalCoins = coins;
    const coinsEl = document.getElementById('merit-chest-coins');
    const ptsEl = document.getElementById('merit-chest-points');
    const headerMerit = document.getElementById('merit-counter-text');

    if (coinsEl) coinsEl.textContent = coins.toLocaleString('vi-VN');
    if (ptsEl) ptsEl.textContent = (coins * 10).toLocaleString('vi-VN') + ' Điểm Phước';
    if (headerMerit) headerMerit.textContent = (coins * 10).toLocaleString('vi-VN');
  }

  /**
   * Cập nhật Bảng Vàng Công Đức (Top Xếp Hạng Xu bên trái)
   */
  updateLeaderboardUI(players = []) {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    if (!Array.isArray(players) || players.length === 0) {
      container.innerHTML = '<div class="empty-donor-notice">Chưa có thí chủ dâng cúng.<br>Gieo duyên lành đầu tiên!</div>';
      return;
    }

    // Lọc ra các thí chủ có đóng góp xu (> 0), sắp xếp giảm dần theo số xu
    const donors = players
      .filter(p => (Number(p.coins) || 0) > 0)
      .sort((a, b) => (Number(b.coins) || 0) - (Number(a.coins) || 0))
      .slice(0, 5);

    if (donors.length === 0) {
      container.innerHTML = '<div class="empty-donor-notice">Chưa có thí chủ dâng cúng.<br>Gieo duyên lành đầu tiên!</div>';
      return;
    }

    let html = '';
    donors.forEach((d, idx) => {
      const rank = idx + 1;
      let rankBadge = `#${rank}`;
      let rankClass = 'lb-rank-other';
      if (rank === 1) { rankBadge = '👑 1'; rankClass = 'lb-rank-1'; }
      else if (rank === 2) { rankBadge = '🥈 2'; rankClass = 'lb-rank-2'; }
      else if (rank === 3) { rankBadge = '🥉 3'; rankClass = 'lb-rank-3'; }

      const nick = d.nickname || 'Phật tử';
      const coins = (Number(d.coins) || 0).toLocaleString('vi-VN');

      html += `
        <div class="lb-row">
          <div class="lb-left">
            <span class="lb-rank ${rankClass}">${rankBadge}</span>
            <span class="lb-name" title="${nick}">${nick}</span>
          </div>
          <span class="lb-coins">${coins} Xu</span>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * Hiển thị Toast quà tặng sang trọng (Tự động gộp cộng dồn số Xu khi cùng 1 người ấn giữ donate liên tục)
   */
  showGiftToast(nickname, giftName, coins, avatarUrl, userId = '') {
    const container = document.getElementById('gift-banner-container');
    if (!container) return;

    if (!this.activeGiftToasts) {
      this.activeGiftToasts = new Map();
    }

    const toastKey = `${userId || nickname}_${giftName}`;
    const existing = this.activeGiftToasts.get(toastKey);

    if (existing && existing.toast && existing.toast.parentNode) {
      existing.totalCoins += coins;
      existing.comboCount += 1;
      const descEl = existing.toast.querySelector('.gift-desc');
      if (descEl) {
        const comboBadge = existing.comboCount > 1 ? ` <b>x${existing.comboCount}</b>` : '';
        descEl.innerHTML = `Thành kính cúng dường <b>${giftName}</b>${comboBadge} (<span class="gift-coins">+${existing.totalCoins} Xu</span>)`;
      }
      clearTimeout(existing.timer);
      existing.timer = setTimeout(() => {
        if (existing.toast.parentNode) existing.toast.parentNode.removeChild(existing.toast);
        this.activeGiftToasts.delete(toastKey);
      }, 4500);
      return;
    }

    const toast = document.createElement('div');
    toast.className = 'gift-toast';

    const avatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" class="gift-avatar" alt="Avatar">`
      : `<div class="gift-avatar" style="background:#5a1015;display:flex;align-items:center;justify-content:center;color:#ffd700;font-weight:bold;">🙏</div>`;

    toast.innerHTML = `
      ${avatarHtml}
      <div class="gift-info">
        <div class="gift-donor-name">${nickname}</div>
        <div class="gift-desc">Thành kính cúng dường <b>${giftName}</b> (<span class="gift-coins">+${coins} Xu</span>)</div>
      </div>
    `;

    container.prepend(toast);

    // Giới hạn tối đa 3 thông báo trên màn hình để luôn gọn đẹp
    while (container.children.length > 3) {
      container.removeChild(container.lastElementChild);
    }

    const timer = setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      this.activeGiftToasts.delete(toastKey);
    }, 4500);

    this.activeGiftToasts.set(toastKey, {
      toast,
      totalCoins: coins,
      comboCount: 1,
      timer
    });
  }

  /**
   * Hiển thị sớ cầu an / bình luận trôi ở góc trái
   */
  showPrayerTag(msg, user) {
    const stream = document.getElementById('prayer-stream');
    if (!stream) return;

    const tag = document.createElement('div');
    tag.className = 'prayer-tag';
    tag.innerHTML = `<span class="prayer-user">${user}:</span> ${msg}`;

    stream.prepend(tag);

    // Giữ tối đa 6 dòng sớ trôi
    while (stream.children.length > 6) {
      stream.removeChild(stream.lastChild);
    }
  }

  addMerit(points) {
    this.meritPoints += points;
    this.updateMeritUI();
  }

  updateMeritUI() {
    const meritElem = document.getElementById('merit-counter-text');
    if (meritElem) {
      meritElem.textContent = this.meritPoints.toLocaleString('vi-VN');
    }
  }
}

// Khởi chạy khi tài liệu sẵn sàng
window.addEventListener('DOMContentLoaded', () => {
  window.templeGame = new TempleGameController();
});

