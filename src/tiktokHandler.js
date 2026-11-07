import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import { stateManager } from './stateManager.js';

class TikTokHandler {
  constructor() {
    this.connection = null;
    this.currentUsername = '';
    this.lastConnectedUsername = '';
    this.isManualDisconnect = false;
    this.isConnected = false;
    this.isConnecting = false;
    this.viewerCount = 0;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.onEventCallback = null;

    // Map of active gift streaks: key = `${userId}_${giftId}_${groupId}`
    // Value = { lastProcessedRepeatCount: number, timer: NodeJS.Timeout, diamondCount: number }
    this.activeStreaks = new Map();
  }

  setEventCallback(cb) {
    this.onEventCallback = cb;
  }

  emitEvent(eventName, payload) {
    if (typeof this.onEventCallback === 'function') {
      this.onEventCallback(eventName, payload);
    }
  }

  /**
   * Clear all active combo streak timers and memory
   */
  clearActiveStreaks() {
    for (const streak of this.activeStreaks.values()) {
      if (streak && streak.timer) {
        clearTimeout(streak.timer);
      }
    }
    this.activeStreaks.clear();
  }

  /**
   * Cleanly tear down the underlying TikTokLiveConnection instance
   * without marking as manual disconnect or wiping session state.
   */
  cleanupConnection() {
    if (this.connection) {
      try {
        this.connection.removeAllListeners();
        this.connection.disconnect();
      } catch (err) {
        console.warn('[TikTok] Warning on cleanupConnection:', err.message);
      }
      this.connection = null;
    }
  }

  /**
   * Connect to a TikTok channel by username.
   * Automatically reconnects after 3s if disconnected, unless manually stopped via disconnect().
   * Automatically resets old session data only when connecting to a DIFFERENT/NEW user.
   */
  async connect(username, options = {}) {
    if (!username || typeof username !== 'string') {
      throw new Error('Vui lòng cung cấp TikTok username hợp lệ');
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    if (!cleanUsername) {
      throw new Error('Username TikTok không được để trống');
    }

    const isAutoReconnect = Boolean(options.isAutoReconnect);

    // Reset manual disconnect flag on explicit connect
    if (!isAutoReconnect) {
      this.isManualDisconnect = false;
      this.reconnectAttempts = 0;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check if connecting to a DIFFERENT user than previous session
    const previousUsername = this.lastConnectedUsername || this.currentUsername;
    const isNewUser = Boolean(
      previousUsername &&
      previousUsername.toLowerCase() !== cleanUsername.toLowerCase()
    );
    const shouldReset = isAutoReconnect ? false : (options.resetSession ?? isNewUser);

    // Clean up previous live connection if active
    this.cleanupConnection();

    // Only wipe old session data if connecting to a DIFFERENT user
    if (shouldReset) {
      console.log(`[TikTok] Kết nối user mới @${cleanUsername} (user cũ: ${previousUsername}). Đang làm mới dữ liệu live cũ...`);
      this.clearActiveStreaks();
      stateManager.resetSession();
      this.viewerCount = 0;
      this.emitEvent('session_reset', {
        username: cleanUsername,
        previousUsername,
        reason: 'new_user_switch',
        timestamp: Date.now()
      });
    }

    this.currentUsername = cleanUsername;
    this.isConnecting = true;
    this.emitEvent('tiktok_status', {
      status: isAutoReconnect ? 'reconnecting' : 'connecting',
      isConnected: false,
      isConnecting: true,
      autoReconnecting: isAutoReconnect,
      username: this.currentUsername,
      attempt: this.reconnectAttempts,
      viewerCount: this.viewerCount,
      message: isAutoReconnect
        ? `Đang tự động kết nối lại tới @${this.currentUsername} (Lần ${this.reconnectAttempts})...`
        : `Đang kết nối tới @${this.currentUsername}...`
    });

    try {
      this.connection = new TikTokLiveConnection(this.currentUsername, {
        processInitialData: false,
        enableExtendedGiftInfo: false,
        signApiKey: process.env.SIGN_API_KEY || undefined
      });

      this.setupListeners();

      const state = await this.connection.connect();
      if (this.isManualDisconnect) {
        this.cleanupConnection();
        return { success: false, manualDisconnect: true };
      }

      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.lastConnectedUsername = cleanUsername; // Save as last connected user

      const initialViewers =
        state?.roomInfo?.user_count ??
        state?.roomInfo?.data?.stats?.userCount ??
        state?.roomInfo?.liveRoom?.liveRoomStats?.userCount;
      if (initialViewers != null) {
        this.viewerCount = Math.max(0, Number(initialViewers) || 0);
        this.emitEvent('viewer_count', {
          viewerCount: this.viewerCount,
          timestamp: Date.now()
        });
      }

      console.log(`[TikTok] Kết nối thành công tới phòng live của @${this.currentUsername} (RoomId: ${state.roomId})`);
      this.emitEvent('tiktok_status', {
        status: 'connected',
        isConnected: true,
        isConnecting: false,
        autoReconnecting: false,
        username: this.currentUsername,
        roomId: state.roomId,
        viewerCount: this.viewerCount,
        message: `Đã kết nối với @${this.currentUsername} (RoomId: ${state.roomId})`
      });

      return { success: true, roomId: state.roomId, username: this.currentUsername };
    } catch (err) {
      this.isConnected = false;
      this.isConnecting = false;
      this.cleanupConnection();
      console.error(`[TikTok] Lỗi kết nối tới @${this.currentUsername}:`, err.message);

      let friendlyMsg = err.message || 'Lỗi kết nối không xác định';
      if (friendlyMsg.includes('rate_limit') || friendlyMsg.includes('Rate Limited') || friendlyMsg.includes('eulerstream')) {
        friendlyMsg = 'Đã đạt giới hạn kết nối (Rate Limit EulerStream)';
      } else if (friendlyMsg.includes('Failed to retrieve Room ID') || friendlyMsg.includes("isn't online")) {
        friendlyMsg = `Không tìm thấy phòng live của @${this.currentUsername} (Kênh chưa phát hoặc tạm gián đoạn)`;
      }

      this.emitEvent('tiktok_status', {
        status: 'error',
        isConnected: false,
        isConnecting: !this.isManualDisconnect,
        autoReconnecting: !this.isManualDisconnect,
        username: this.currentUsername,
        viewerCount: this.viewerCount,
        message: friendlyMsg,
        rawError: err.message
      });

      // Tự động kết nối lại sau 3s trừ khi người dùng đã ấn Ngắt kết nối
      if (!this.isManualDisconnect) {
        this.scheduleReconnect(3000);
      }

      throw err;
    }
  }

  /**
   * Disconnect completely from live stream when user clicks "Ngắt kết nối".
   * Completely stops connection and cancels any 3s auto-reconnect timer,
   * while keeping 100% of player and gift data intact in stateManager.
   */
  disconnect() {
    this.isManualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.clearActiveStreaks();
    this.cleanupConnection();

    this.isConnected = false;
    this.isConnecting = false;
    this.viewerCount = 0;

    this.emitEvent('viewer_count', {
      viewerCount: 0,
      timestamp: Date.now()
    });

    this.emitEvent('tiktok_status', {
      status: 'disconnected',
      isConnected: false,
      isConnecting: false,
      autoReconnecting: false,
      username: this.currentUsername,
      viewerCount: 0,
      message: 'Đã ngắt kết nối (Đã tắt tự động kết nối lại)'
    });

    console.log('[TikTok] Đã chủ động ngắt kết nối phiên live. Dừng tự động kết nối lại.');
  }

  scheduleReconnect(delay = 3000) {
    if (this.isManualDisconnect || !this.currentUsername) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts++;
    const waitSec = Math.round(delay / 1000);
    console.log(`[TikTok] Mất kết nối với @${this.currentUsername}. Tự động kết nối lại sau ${waitSec}s (Lần ${this.reconnectAttempts})...`);

    this.emitEvent('tiktok_status', {
      status: 'reconnecting',
      isConnected: false,
      isConnecting: true,
      autoReconnecting: true,
      username: this.currentUsername,
      attempt: this.reconnectAttempts,
      viewerCount: this.viewerCount,
      message: `Mất kết nối @${this.currentUsername}. Tự kết nối lại sau ${waitSec}s (Lần ${this.reconnectAttempts})...`
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isManualDisconnect) return;
      try {
        await this.connect(this.currentUsername, { isAutoReconnect: true, resetSession: false });
      } catch {
        // Nếu vẫn lỗi, khối catch của connect() sẽ tiếp tục hẹn 3s kết nối lại trừ khi ấn Ngắt
      }
    }, delay);
  }

  setupListeners() {
    if (!this.connection) return;

    // Chat event
    this.connection.on(WebcastEvent.CHAT, (data) => {
      this.handleChat(data);
    });

    // Gift event
    this.connection.on(WebcastEvent.GIFT, (data) => {
      this.handleGift(data);
    });

    // Like event
    this.connection.on(WebcastEvent.LIKE, (data) => {
      this.handleLike(data);
    });

    // Member join event
    this.connection.on(WebcastEvent.MEMBER, (data) => {
      this.handleMember(data);
    });

    // Room user / viewer count update
    this.connection.on(WebcastEvent.ROOM_USER, (data) => {
      this.handleRoomUser(data);
    });

    // Stream end -> Tự động thử kết nối lại sau 3s nếu chưa ấn Ngắt
    this.connection.on(WebcastEvent.STREAM_END, () => {
      if (this.isManualDisconnect) return;
      console.log(`[TikTok] Phiên live của @${this.currentUsername} báo kết thúc/gián đoạn. Sẽ thử kết nối lại sau 3s...`);
      this.isConnected = false;
      this.isConnecting = false;
      this.cleanupConnection();
      this.scheduleReconnect(3000);
    });

    // Disconnected unexpected -> Tự động kết nối lại sau 3s trừ khi ấn Ngắt
    this.connection.on('disconnected', () => {
      if (this.isManualDisconnect) return;
      console.warn(`[TikTok] Bị mất kết nối với @${this.currentUsername}. Sẽ tự động kết nối lại sau 3s...`);
      this.isConnected = false;
      this.isConnecting = false;
      this.cleanupConnection();
      this.scheduleReconnect(3000);
    });

    // Error
    this.connection.on('error', (err) => {
      console.error('[TikTok Connection Error]:', err?.message || err);
    });
  }

  /**
   * Process Room User / Live Viewer Count & Sync Active Interactive Viewers
   */
  handleRoomUser(data) {
    if (!data) return;
    const rawCount = data.viewerCount ?? data.total ?? data.popularity;
    if (rawCount != null) {
      const count = Number(rawCount);
      if (!Number.isNaN(count) && count >= 0) {
        this.viewerCount = count;

        // Extract active user IDs in room from TikTok ROOM_USER ranks/seats if available
        const activeUserIds = [];
        const rankLists = [data.ranks, data.topViewers, data.seats];
        for (const list of rankLists) {
          if (Array.isArray(list)) {
            for (const item of list) {
              const uid = item?.user?.id || item?.user?.displayId || item?.userId;
              if (uid) activeUserIds.push(String(uid));
            }
          }
        }

        // Sync interactive online viewers with current room viewer count & active list
        if (data.syncInteractive !== false) {
          const leftPlayers = stateManager.syncWithRoomViewers(this.viewerCount, activeUserIds);
          for (const p of leftPlayers) {
            this.emitEvent('member_leave', {
              userId: p.userId,
              nickname: p.nickname,
              avatarUrl: p.avatarUrl,
              coins: p.coins,
              likes: p.likes,
              chatsCount: p.chatsCount,
              wasOnline: true,
              onlineCount: stateManager.getOnlineCount(),
              timestamp: Date.now()
            });
          }
        }

        this.emitEvent('viewer_count', {
          viewerCount: this.viewerCount,
          onlinePlayerCount: stateManager.getOnlineCount(),
          totalUser: Number(data.totalUser) || 0,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Process Gift Event with Strict Combo Anti-Duplication
   * Rule: Delta coins = (currentRepeatCount - lastProcessedRepeatCount) * diamondCount
   */
  handleGift(data) {
    if (!data) return;

    const userId = String(data.user?.id || data.user?.displayId || data.userId || data.uniqueId || `guest_${Date.now()}`);
    const nickname = data.user?.nickname || data.user?.displayId || data.nickname || data.uniqueId || 'Khán Giả';
    const avatarUrl = data.user?.avatarThumb?.urlList?.[0] || data.profilePictureUrl || data.avatarUrl || '';
    const giftId = String(data.giftId || data.gift?.id || 'gift');
    const groupId = String(data.groupId || 'single');
    const giftName = data.gift?.name || data.giftName || 'Món Quà';
    const giftPictureUrl = data.gift?.image?.urlList?.[0] || data.gift?.icon?.urlList?.[0] || data.giftPictureUrl || '';
    const diamondCount = Math.max(1, Number(data.gift?.diamondCount || data.diamondCount) || 1);
    const currentRepeat = Math.max(1, Number(data.repeatCount) || 1);
    const repeatEnd = Boolean(data.repeatEnd);

    const streakKey = `${userId}_${giftId}_${groupId}`;
    let streak = this.activeStreaks.get(streakKey);

    if (!streak) {
      streak = {
        lastProcessedRepeatCount: 0,
        diamondCount,
        timer: null
      };
      this.activeStreaks.set(streakKey, streak);
    }

    if (streak.timer) {
      clearTimeout(streak.timer);
    }

    let deltaCoins = 0;
    if (currentRepeat > streak.lastProcessedRepeatCount) {
      const deltaUnits = currentRepeat - streak.lastProcessedRepeatCount;
      deltaCoins = deltaUnits * diamondCount;
      streak.lastProcessedRepeatCount = currentRepeat;
    }

    if (repeatEnd) {
      streak.timer = setTimeout(() => {
        this.activeStreaks.delete(streakKey);
      }, 10000);
    } else {
      streak.timer = setTimeout(() => {
        this.activeStreaks.delete(streakKey);
      }, 30000);
    }

    if (deltaCoins > 0) {
      const result = stateManager.addCoins(userId, nickname, avatarUrl, deltaCoins);

      if (result) {
        const payload = {
          userId,
          nickname,
          avatarUrl: result.player.avatarUrl,
          giftId,
          giftName,
          giftPictureUrl,
          diamondCount,
          repeatCount: currentRepeat,
          repeatEnd,
          deltaCoins,
          totalCoins: result.player.coins,
          isTop1: result.isTop1,
          topPlayers: stateManager.getTopPlayers(5)
        };

        this.emitEvent('gift_received', payload);
        this.emitEvent('leaderboard_updated', stateManager.getTopPlayers(5));
      }
    }
  }

  handleChat(data) {
    if (!data) return;

    const userId = String(data.user?.id || data.user?.displayId || data.userId || data.uniqueId || `guest_${Date.now()}`);
    const nickname = data.user?.nickname || data.user?.displayId || data.nickname || data.uniqueId || 'Khán Giả';
    const avatarUrl = data.user?.avatarThumb?.urlList?.[0] || data.profilePictureUrl || data.avatarUrl || '';
    const message = data.content || data.comment || data.message || '';

    const { player, message: cleanMessage } = stateManager.recordChat(userId, nickname, avatarUrl, message);

    const payload = {
      userId: player.userId,
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
      message: cleanMessage,
      coins: player.coins,
      likes: player.likes,
      chatsCount: player.chatsCount,
      time: new Date().toLocaleTimeString('vi-VN')
    };

    this.emitEvent('chat_received', payload);
  }

  handleLike(data) {
    if (!data) return;

    const userId = String(data.user?.id || data.user?.displayId || data.userId || data.uniqueId || `guest_${Date.now()}`);
    const nickname = data.user?.nickname || data.user?.displayId || data.nickname || data.uniqueId || 'Khán Giả';
    const avatarUrl = data.user?.avatarThumb?.urlList?.[0] || data.profilePictureUrl || data.avatarUrl || '';
    const likeCount = Math.max(1, Number(data.count || data.likeCount) || 1);

    const result = stateManager.addLikes(userId, nickname, avatarUrl, likeCount);

    const payload = {
      userId: result.player.userId,
      nickname: result.player.nickname,
      avatarUrl: result.player.avatarUrl,
      likeCount,
      totalLikes: result.player.likes,
      coins: result.player.coins
    };

    this.emitEvent('like_received', payload);
  }

  handleMember(data) {
    if (!data) return;
    const userId = String(data.user?.id || data.user?.displayId || data.userId || data.uniqueId || '');
    const nickname = data.user?.nickname || data.user?.displayId || data.nickname || data.uniqueId || 'Khách viếng thăm';
    const avatarUrl = data.user?.avatarThumb?.urlList?.[0] || data.profilePictureUrl || data.avatarUrl || '';

    let rejoined = false;
    if (userId && stateManager.players.has(userId)) {
      const existing = stateManager.players.get(userId);
      if (existing && !existing.isOnline) {
        rejoined = true;
      }
      stateManager.setPlayerOnline(userId, nickname, avatarUrl);
    }

    this.emitEvent('member_join', {
      userId,
      nickname,
      avatarUrl,
      rejoined,
      onlineCount: stateManager.getOnlineCount(),
      timestamp: Date.now()
    });
  }

  /**
   * Handle when an interactive viewer leaves the live room ("Out phòng live").
   * Decrements active interactive viewer count (isOnline = false),
   * while preserving 100% of their donated coins, likes, and chat history.
   */
  handleMemberLeave(data) {
    if (!data) return null;
    const userId = typeof data === 'string' ? data : String(data.userId || data.user?.id || '');
    const nickname = typeof data === 'object' ? String(data.nickname || data.user?.nickname || '') : '';
    if (!userId && !nickname) return null;

    const lookupKey = userId || nickname;
    const res = stateManager.setPlayerOffline(lookupKey);
    const resolvedPlayer = res ? res.player : { userId: lookupKey, nickname: nickname || lookupKey };

    const payload = {
      userId: resolvedPlayer.userId || lookupKey,
      nickname: resolvedPlayer.nickname || nickname || lookupKey,
      avatarUrl: resolvedPlayer.avatarUrl || '',
      coins: resolvedPlayer.coins || 0,
      likes: resolvedPlayer.likes || 0,
      chatsCount: resolvedPlayer.chatsCount || 0,
      wasOnline: res ? res.wasOnline : true,
      onlineCount: stateManager.getOnlineCount(),
      timestamp: Date.now()
    };

    // Luôn phát sự kiện member_leave để client Game 3D làm mờ và xóa nhân vật ngay lập tức
    this.emitEvent('member_leave', payload);
    return resolvedPlayer;
  }

  getStatus() {
    const isReconnecting = Boolean(this.reconnectTimer);
    return {
      status: this.isConnected
        ? 'connected'
        : (isReconnecting ? 'reconnecting' : (this.isConnecting ? 'connecting' : 'disconnected')),
      isConnected: this.isConnected,
      isConnecting: this.isConnecting || isReconnecting,
      autoReconnecting: isReconnecting,
      username: this.currentUsername,
      reconnectAttempts: this.reconnectAttempts,
      viewerCount: this.viewerCount,
      message: isReconnecting
        ? `Mất kết nối @${this.currentUsername}. Tự kết nối lại sau 3s (Lần ${this.reconnectAttempts})...`
        : undefined
    };
  }
}

export const tiktokHandler = new TikTokHandler();
export default tiktokHandler;
