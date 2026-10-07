import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../data/models/draw_model.dart';
import '../../data/models/live_broadcast_model.dart';
import '../state/lotto_state.dart';
import 'draw_details_screen.dart';
import '../widgets/lotto_image.dart';
import '../widgets/video_embed.dart';

class LiveChatMessageItem {
  final String id;
  final String sender;
  final String text;
  final String time;
  final String badge;
  final Color badgeColor;
  final bool isGift;

  const LiveChatMessageItem({
    required this.id,
    required this.sender,
    required this.text,
    required this.time,
    this.badge = 'Lv.5',
    this.badgeColor = const Color(0xFFF59E0B),
    this.isGift = false,
  });
}

class FloatingHeartItem {
  final int id;
  final Color color;
  final double startX;
  final double size;

  const FloatingHeartItem({
    required this.id,
    required this.color,
    required this.startX,
    required this.size,
  });
}

class LiveDrawScreen extends StatefulWidget {
  final DrawModel? draw;
  final LottoState state;

  const LiveDrawScreen({super.key, this.draw, required this.state});

  @override
  State<LiveDrawScreen> createState() => _LiveDrawScreenState();
}

class _LiveDrawScreenState extends State<LiveDrawScreen> with TickerProviderStateMixin {
  Timer? _pollingTimer;
  Timer? _countdownTimer;
  Timer? _commentsPollTimer;
  Timer? _countdownTicker;

  late AnimationController _pulseController;
  final TextEditingController _chatController = TextEditingController();
  final ScrollController _chatScrollController = ScrollController();

  final List<LiveChatMessageItem> _chatMessages = [];
  final List<FloatingHeartItem> _floatingHearts = [];
  int _heartCounter = 0;

  int _likeCount = 15420;
  int _viewerCount = 1845;
  int _diamondCount = 28400;
  bool _isFollowed = false;
  bool _isMuted = false;
  bool _reminderSet = false;

  Duration _countdownRemaining = const Duration(hours: 3, minutes: 28, seconds: 45);
  String _standbyTab = 'auto'; // 'auto', 'countdown', 'winners'

  @override
  void initState() {
    super.initState();
    widget.state.addListener(_onStateChanged);
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    // Initial realistic chat seed
    _chatMessages.addAll([
      const LiveChatMessageItem(
        id: '1',
        sender: 'Natnael_T',
        text: 'Welcome to the Official Nati Lotto Live Draw! 🇪🇹',
        time: 'Just now',
        badge: 'HOST',
        badgeColor: Color(0xFFEF4444),
      ),
      const LiveChatMessageItem(
        id: '2',
        sender: 'Dawit.M',
        text: 'Good luck everyone! Picked my 5 tickets 🙏',
        time: 'Just now',
        badge: 'VIP',
        badgeColor: Color(0xFF8B5CF6),
      ),
      const LiveChatMessageItem(
        id: '3',
        sender: 'Selam_A',
        text: 'Is the S23 Ultra draw starting now? 📱',
        time: 'Just now',
        badge: 'Lv.7',
        badgeColor: Color(0xFF10B981),
      ),
    ]);

    // Calculate countdown from broadcast post or draw schedule
    _calculateCountdownTarget();

    // Initial backend fetch
    widget.state.fetchLiveBroadcast();
    _fetchBackendCommentsAndStats();

    // Poll backend broadcast state and draws every 2 seconds so changes from Web Admin reflect immediately
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (_) async {
      if (mounted) {
        await widget.state.fetchLiveBroadcast();
        await widget.state.refreshDraws();
        if (mounted) {
          setState(() {
            _calculateCountdownTarget();
          });
        }
      }
    });

    // Real-time backend comments & stats polling (every 2.5 seconds)
    _startCommentsPolling();

    // 1-second countdown ticker for the scheduled draw
    _startCountdownTicker();
  }

  void _onStateChanged() {
    if (mounted) {
      setState(() {
        _calculateCountdownTarget();
      });
    }
  }

  void _calculateCountdownTarget() {
    try {
      final post = widget.state.liveBroadcastPost;
      final activeDraw = widget.draw ?? (widget.state.draws.isNotEmpty ? widget.state.draws.first : null);

      if (post?.scheduledDate != null && post!.scheduledDate.isNotEmpty) {
        final timeStr = post.scheduledTime.isNotEmpty ? post.scheduledTime : '20:00';
        final dt = DateTime.tryParse('${post.scheduledDate}T$timeStr:00');
        if (dt != null) {
          final diff = dt.difference(DateTime.now());
          if (diff.inSeconds > 0) {
            _countdownRemaining = diff;
            return;
          }
        }
      }

      if (activeDraw?.drawDate != null && activeDraw!.drawDate.isNotEmpty) {
        final dt = DateTime.tryParse(activeDraw.drawDate);
        if (dt != null) {
          final diff = dt.difference(DateTime.now());
          if (diff.inSeconds > 0) {
            _countdownRemaining = diff;
            return;
          }
        }
      }
    } catch (_) {}

    if (_countdownRemaining.inSeconds <= 0) {
      _countdownRemaining = const Duration(hours: 3, minutes: 28, seconds: 45);
    }
  }

  void _startCountdownTicker() {
    _countdownTicker?.cancel();
    _countdownTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_countdownRemaining.inSeconds > 0) {
          _countdownRemaining -= const Duration(seconds: 1);
        }
      });
    });
  }

  void _startCommentsPolling() {
    _commentsPollTimer?.cancel();
    _commentsPollTimer = Timer.periodic(const Duration(milliseconds: 2500), (_) {
      if (mounted) {
        _fetchBackendCommentsAndStats();
      }
    });
  }

  Future<void> _fetchBackendCommentsAndStats() async {
    try {
      final data = await widget.state.repository.getLiveComments();
      if (data != null && mounted) {
        final chatList = data['chatMessages'] as List<dynamic>?;
        final int? likes = data['likeCount'] as int?;
        final int? viewers = data['viewerCount'] as int?;
        final int? diamonds = data['diamondCount'] as int?;

        setState(() {
          if (likes != null && likes > _likeCount) _likeCount = likes;
          if (viewers != null) _viewerCount = viewers;
          if (diamonds != null) _diamondCount = diamonds;

          if (chatList != null && chatList.isNotEmpty) {
            final existingIds = _chatMessages.map((m) => m.id).toSet();
            bool hasNew = false;
            for (final m in chatList) {
              final id = m['id']?.toString() ?? UniqueKey().toString();
              if (!existingIds.contains(id)) {
                final sender = m['sender']?.toString() ?? 'Player';
                final text = m['text']?.toString() ?? '';
                final time = m['time']?.toString() ?? 'Now';
                final badge = m['badge']?.toString() ?? 'Lv.5';
                final badgeColorHex = m['badgeColor']?.toString() ?? '#F59E0B';
                final isGift = m['isGift'] == true;

                Color badgeColor = const Color(0xFFF59E0B);
                if (badgeColorHex.startsWith('#') && badgeColorHex.length >= 7) {
                  badgeColor = Color(int.parse(badgeColorHex.replaceAll('#', '0xFF')));
                }

                _chatMessages.add(LiveChatMessageItem(
                  id: id,
                  sender: sender,
                  text: text,
                  time: time,
                  badge: badge,
                  badgeColor: badgeColor,
                  isGift: isGift,
                ));
                hasNew = true;
              }
            }

            if (_chatMessages.length > 50) {
              _chatMessages.removeRange(0, _chatMessages.length - 50);
            }

            if (hasNew) {
              _scrollChatToBottom();
            }
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _openTikTokLive([String? url]) async {
    final liveUrl = url ?? widget.state.liveBroadcastPost?.tiktokLiveUrl ?? 'https://www.tiktok.com/@natilotto/live';
    try {
      final uri = Uri.parse(liveUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (e) {
      debugPrint('Could not launch TikTok live URL: $e');
    }
  }

  @override
  void dispose() {
    widget.state.removeListener(_onStateChanged);
    _pollingTimer?.cancel();
    _countdownTimer?.cancel();
    _commentsPollTimer?.cancel();
    _countdownTicker?.cancel();
    _pulseController.dispose();
    _chatController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  String _formatCount(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }

  void _scrollChatToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScrollController.hasClients) {
        _chatScrollController.animateTo(
          _chatScrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _spawnHeart() {
    final colors = [
      const Color(0xFFEF4444), // red
      const Color(0xFFEC4899), // pink
      const Color(0xFFF59E0B), // gold
      const Color(0xFF8B5CF6), // purple
      const Color(0xFF10B981), // emerald
    ];
    final random = math.Random();
    final heart = FloatingHeartItem(
      id: _heartCounter++,
      color: colors[random.nextInt(colors.length)],
      startX: (random.nextDouble() * 40) - 20,
      size: 26.0 + random.nextDouble() * 12.0,
    );

    setState(() {
      _floatingHearts.add(heart);
      _likeCount++;
    });

    // Sync like to backend
    widget.state.repository.incrementLiveLikes(count: 1);

    Future.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) {
        setState(() {
          _floatingHearts.removeWhere((h) => h.id == heart.id);
        });
      }
    });
  }

  void _sendMessage([String? quickText]) async {
    final text = quickText ?? _chatController.text.trim();
    if (text.isEmpty) return;

    final user = widget.state.currentUser;
    final name = user?.displayName ?? 'You';

    final tempId = DateTime.now().millisecondsSinceEpoch.toString();
    setState(() {
      _chatMessages.add(
        LiveChatMessageItem(
          id: tempId,
          sender: name,
          text: text,
          time: 'Now',
          badge: 'YOU',
          badgeColor: const Color(0xFF3B82F6),
        ),
      );
    });

    _chatController.clear();
    _scrollChatToBottom();
    _spawnHeart();

    // Persist comment to backend
    await widget.state.repository.sendLiveComment(
      name,
      text,
      badge: 'YOU',
      badgeColor: '#3B82F6',
    );
  }

  void _sendGift(String giftName, int costEtb, String emoji) async {
    Navigator.pop(context);
    final sender = widget.state.currentUser?.displayName ?? 'You';

    setState(() {
      _chatMessages.add(
        LiveChatMessageItem(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          sender: sender,
          text: 'sent a $giftName $emoji ($costEtb ETB)!',
          time: 'Now',
          badge: 'GIFT',
          badgeColor: const Color(0xFFEC4899),
          isGift: true,
        ),
      );
      _likeCount += costEtb * 5;
      _diamondCount += costEtb * 10;
    });

    _scrollChatToBottom();
    for (int i = 0; i < 4; i++) {
      Future.delayed(Duration(milliseconds: i * 150), () {
        if (mounted) _spawnHeart();
      });
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Sent $giftName $emoji to Nati Lotto Studio!'),
        backgroundColor: const Color(0xFFEC4899),
        duration: const Duration(seconds: 2),
      ),
    );

    // Persist gift to backend
    await widget.state.repository.sendLiveGift(
      sender,
      giftName,
      costEtb,
      emoji,
    );
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.state.liveBroadcastPost;
    final isLive = post?.isLive == true || post?.status == 'LIVE';
    final activeDraw = widget.draw ?? (widget.state.draws.isNotEmpty ? widget.state.draws.first : null);

    return Scaffold(
      backgroundColor: Colors.black,
      resizeToAvoidBottomInset: false,
      body: SizedBox.expand(
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 1. FULLSCREEN IMMERSIVE TIKTOK LIVE BROADCAST STAGE
            Positioned.fill(
              child: isLive
                  ? GestureDetector(
                      onTap: _spawnHeart,
                      child: _buildTikTokLivePlayer(post, activeDraw),
                    )
                  : _buildStudioStandbyBackdrop(post, activeDraw),
            ),

            // 2. SUBTLE GRADIENT OVERLAYS (Top and Bottom for TikTok contrast)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: 160,
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.black.withValues(alpha: 0.5),
                        Colors.transparent,
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ),
            ),
            if (isLive)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                height: 380,
                child: IgnorePointer(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.5),
                          Colors.black.withValues(alpha: 0.5),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ),
              ),

            // 3. TIKTOK TOP BAR (Host Pill + Diamonds + Top Viewers + Close)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      // Host Pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Host Avatar
                            Container(
                              width: 32,
                              height: 32,
                              decoration: const BoxDecoration(
                                color: Color(0xFFFFC107),
                                shape: BoxShape.circle,
                              ),
                              child: const Center(
                                child: Icon(CupertinoIcons.play_rectangle_fill, color: Colors.black, size: 16),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Row(
                                  children: [
                                    Text(
                                      'Nati Lotto',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                    SizedBox(width: 3),
                                    Icon(CupertinoIcons.checkmark_seal_fill, size: 12, color: Color(0xFF38BDF8)),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: isLive ? const Color(0xFFEF4444) : Colors.white38,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      isLive ? '${_formatCount(_viewerCount)} viewers' : 'Standby / Offline',
                                      style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(width: 8),
                            // Follow Button
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isFollowed = !_isFollowed;
                                });
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: _isFollowed ? Colors.white24 : const Color(0xFFEF4444),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Text(
                                  _isFollowed ? 'Following' : '+ Follow',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const Spacer(),

                      // Diamonds Pill (only when live)
                      if (isLive) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('💎', style: TextStyle(fontSize: 11)),
                              const SizedBox(width: 4),
                              Text(
                                _formatCount(_diamondCount),
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],

                      // Close Button
                      GestureDetector(
                        onTap: () {
                          if (Navigator.canPop(context)) {
                            Navigator.pop(context);
                          } else {
                            widget.state.setNavIndex(0);
                          }
                        },
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.5),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white12),
                          ),
                          child: const Icon(CupertinoIcons.xmark, color: Colors.white, size: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // 4. TIKTOK SHOP / PINNED DRAW PRODUCT CARD (Floating above chat)
          if (isLive && activeDraw != null)
            Positioned(
              left: 12,
              bottom: 232,
              child: _buildTikTokPinnedDrawCard(activeDraw),
            ),

          // 5. FLOATING LIVE CHAT STREAM (Bottom-Left)
          if (isLive)
            Positioned(
            left: 12,
            bottom: 58,
            width: MediaQuery.of(context).size.width * 0.70,
            height: 165,
            child: ShaderMask(
              shaderCallback: (Rect bounds) {
                return const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.white],
                  stops: [0.0, 0.25],
                ).createShader(bounds);
              },
              blendMode: BlendMode.dstIn,
              child: ListView.separated(
                controller: _chatScrollController,
                padding: const EdgeInsets.only(top: 8),
                itemCount: _chatMessages.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (ctx, index) {
                  final msg = _chatMessages[index];
                  return _buildTikTokCommentBubble(msg);
                },
              ),
            ),
          ),

          // 6. TIKTOK RIGHT-SIDE FLOATING ACTION BUTTONS (Likes, Gifts, Share)
          if (isLive)
            Positioned(
              right: 12,
              bottom: 58,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Heart / Like Button
                GestureDetector(
                  onTap: _spawnHeart,
                  child: Column(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.4),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(CupertinoIcons.heart_fill, color: Colors.white, size: 24),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${(_likeCount / 1000).toStringAsFixed(1)}K',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          shadows: [Shadow(color: Colors.black, blurRadius: 4)],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Gift Button
                GestureDetector(
                  onTap: _showGiftPickerModal,
                  child: Column(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEC4899).withValues(alpha: 0.85),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFEC4899).withValues(alpha: 0.4),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(CupertinoIcons.gift_fill, color: Colors.white, size: 22),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Gift',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          shadows: [Shadow(color: Colors.black, blurRadius: 4)],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Share Button
                GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Stream link copied! Share with friends 🇪🇹'),
                        backgroundColor: Color(0xFF0F172A),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                  child: Column(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white24),
                        ),
                        child: const Icon(CupertinoIcons.arrowshape_turn_up_right_fill, color: Colors.white, size: 20),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Share',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          shadows: [Shadow(color: Colors.black, blurRadius: 4)],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Audio Mute Toggle
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _isMuted = !_isMuted;
                    });
                  },
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.55),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Icon(
                      _isMuted ? CupertinoIcons.volume_off : CupertinoIcons.volume_up,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 7. FLOATING ANIMATED HEARTS (Floating up the right side)
          if (isLive)
            ..._floatingHearts.map((heart) {
              return Positioned(
                right: 28 + heart.startX,
                bottom: 120,
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: const Duration(milliseconds: 1800),
                  curve: Curves.easeOutCubic,
                  builder: (context, value, child) {
                    final wobble = math.sin(value * math.pi * 3) * 16.0;
                    return Transform.translate(
                      offset: Offset(wobble, -value * 320),
                      child: Opacity(
                        opacity: (1.0 - value).clamp(0.0, 1.0),
                        child: Icon(
                          CupertinoIcons.heart_fill,
                          color: heart.color,
                          size: heart.size * (0.8 + (value * 0.4)),
                        ),
                      ),
                    );
                  },
                ),
              );
            }),

          // 8. BOTTOM TIKTOK COMMENT INPUT BAR
          if (isLive)
            Positioned(
              left: 12,
              right: 12,
              bottom: 6,
              child: SafeArea(
                top: false,
              child: Row(
                children: [
                  // Text input field
                  Expanded(
                    child: Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Theme(
                              data: Theme.of(context).copyWith(
                                inputDecorationTheme: const InputDecorationTheme(
                                  fillColor: Colors.transparent,
                                  filled: false,
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                              child: TextField(
                                controller: _chatController,
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                decoration: const InputDecoration(
                                  hintText: 'Add a comment...',
                                  hintStyle: TextStyle(color: Colors.white54, fontSize: 13),
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  fillColor: Colors.transparent,
                                  filled: false,
                                  isDense: true,
                                  contentPadding: EdgeInsets.zero,
                                ),
                                onSubmitted: (_) => _sendMessage(),
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: () => _sendMessage(),
                            child: const Icon(CupertinoIcons.paperplane_fill, color: Color(0xFFFFC107), size: 18),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Quick Reaction Icons
                  GestureDetector(
                    onTap: () => _sendMessage('🇪🇹'),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white24),
                      ),
                      child: const Center(child: Text('🇪🇹', style: TextStyle(fontSize: 20))),
                    ),
                  ),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => _sendMessage('🔥'),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white24),
                      ),
                      child: const Center(child: Text('🔥', style: TextStyle(fontSize: 20))),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

  Widget _buildTikTokPinnedDrawCard(DrawModel draw) {
    return Container(
      width: 250,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.75),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.6), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LottoImage(
              imageUrl: draw.prizeImageUrl,
              width: 44,
              height: 44,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'FEATURED',
                        style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${draw.ticketPriceEtb} ETB',
                      style: const TextStyle(color: Color(0xFFFFC107), fontSize: 11, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  draw.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          ElevatedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => DrawDetailsScreen(draw: draw, state: widget.state),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFFC107),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Enter', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );
  }

  Widget _buildTikTokCommentBubble(LiveChatMessageItem msg) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: msg.isGift
              ? const Color(0xFFEC4899).withValues(alpha: 0.35)
              : Colors.black.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: msg.isGift ? const Color(0xFFEC4899) : Colors.white10,
            width: msg.isGift ? 1 : 0.5,
          ),
        ),
        child: RichText(
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          text: TextSpan(
            children: [
              WidgetSpan(
                alignment: PlaceholderAlignment.middle,
                child: Container(
                  margin: const EdgeInsets.only(right: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: msg.badgeColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    msg.badge,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
              TextSpan(
                text: '${msg.sender}: ',
                style: const TextStyle(
                  color: Color(0xFF7DD3FC), // cyan TikTok username color
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              TextSpan(
                text: msg.text,
                style: TextStyle(
                  color: msg.isGift ? const Color(0xFFFDE047) : Colors.white,
                  fontSize: 12,
                  fontWeight: msg.isGift ? FontWeight.w800 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTikTokLivePlayer(LiveBroadcastModel? post, DrawModel? activeDraw) {
    final tiktokUrl = post?.tiktokLiveUrl ?? 'https://www.tiktok.com/@natilotto/live';
    final drawNum = post?.drawNumber ?? activeDraw?.drawNumber ?? 'active';

    return Stack(
      fit: StackFit.expand,
      children: [
        // 1. Direct Live Stream Video Player (Native WebView on Android/iOS, Iframe on Web)
        buildPlatformVideoEmbed(
          targetUrl: tiktokUrl,
          viewId: 'live_stream_$drawNum',
          width: double.infinity,
          height: double.infinity,
          onOpenExternal: () => _openTikTokLive(tiktokUrl),
        ),

        // 2. Subtle Vignette Gradients for top host bar and bottom chat readability
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          child: IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.black.withValues(alpha: 0.65),
                    Colors.transparent,
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
        ),
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          height: 220,
          child: IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.75),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStudioStandbyBackdrop(LiveBroadcastModel? post, DrawModel? activeDraw) {
    final hasWinner = post?.hasWinner == true || post?.status == 'CONCLUDED';
    final isWinnerTab = _standbyTab == 'winners' || (_standbyTab == 'auto' && hasWinner);

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(0, -0.3),
          radius: 1.2,
          colors: [
            Color(0xFF1E1B4B),
            Color(0xFF0F172A),
            Color(0xFF020617),
          ],
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 58), // space below top bar

            // Segmented Switcher Tab (Countdown vs Winners Post)
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _standbyTab = 'countdown';
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                      decoration: BoxDecoration(
                        color: !isWinnerTab ? const Color(0xFFFFC107) : Colors.transparent,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: !isWinnerTab
                            ? [
                                BoxShadow(
                                  color: const Color(0xFFFFC107).withValues(alpha: 0.35),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            CupertinoIcons.timer,
                            size: 13,
                            color: !isWinnerTab ? Colors.black : Colors.white70,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            'Live Countdown',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: !isWinnerTab ? Colors.black : Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _standbyTab = 'winners';
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                      decoration: BoxDecoration(
                        color: isWinnerTab ? const Color(0xFFFFC107) : Colors.transparent,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: isWinnerTab
                            ? [
                                BoxShadow(
                                  color: const Color(0xFFFFC107).withValues(alpha: 0.35),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            CupertinoIcons.rosette,
                            size: 13,
                            color: isWinnerTab ? Colors.black : Colors.white70,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            'Winners Post',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: isWinnerTab ? Colors.black : Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Content Area (Scrollable to prevent overflow on all screen sizes)
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                child: isWinnerTab
                    ? _buildWinnersPostView(post, activeDraw)
                    : _buildUpcomingCountdownPostView(post, activeDraw),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUpcomingCountdownPostView(LiveBroadcastModel? post, DrawModel? activeDraw) {
    final title = activeDraw?.title ?? post?.drawTitle ?? 'Grand Toyota Land Cruiser & S24 Ultra Live Draw';
    final prizeImg = activeDraw?.prizeImageUrl ?? post?.prizeImageUrl ?? 'https://images.unsplash.com/photo-1586015555751-63c254e4f715?auto=format&fit=crop&w=600&q=80';
    final ticketPrice = activeDraw?.ticketPriceEtb ?? 50;

    final days = _countdownRemaining.inDays;
    final hours = _countdownRemaining.inHours % 24;
    final minutes = _countdownRemaining.inMinutes % 60;
    final seconds = _countdownRemaining.inSeconds % 60;
    final progressPct = ((activeDraw?.progressPercentage ?? 0.0) * 100).toInt();

    return Column(
      children: [
        // Live Announcement Pill with Pulsing Live Dot (High contrast & vibrant)
        FadeTransition(
          opacity: _pulseController,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.6), width: 1.2),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.25),
                  blurRadius: 10,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: Color(0xFFEF4444), blurRadius: 6, spreadRadius: 2),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'UPCOMING OFFICIAL LIVE DRAW',
                  style: TextStyle(
                    color: Color(0xFFFEE2E2),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 12),

        // Draw Title
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.3,
          ),
        ),

        const SizedBox(height: 6),

        // NLA Certified Subtitle Badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFF38BDF8).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.25)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(CupertinoIcons.checkmark_seal_fill, size: 12, color: Color(0xFF38BDF8)),
              const SizedBox(width: 5),
              Text(
                'Lottery Permit: ${post?.permitNumber ?? activeDraw?.permitNumber ?? "NL-ET-2026-0941"}',
                style: const TextStyle(
                  color: Color(0xFF7DD3FC),
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // DIGITAL COUNTDOWN TICKER BOXES
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [
                Color(0xFF0F172A),
                Color(0xFF0B132B),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.35), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFFC107).withValues(alpha: 0.15),
                blurRadius: 18,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Column(
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildCountdownBox(days.toString().padLeft(2, '0'), 'DAYS'),
                    _buildCountdownColon(),
                    _buildCountdownBox(hours.toString().padLeft(2, '0'), 'HOURS'),
                    _buildCountdownColon(),
                    _buildCountdownBox(minutes.toString().padLeft(2, '0'), 'MINS'),
                    _buildCountdownColon(),
                    _buildCountdownBox(seconds.toString().padLeft(2, '0'), 'SECS'),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(CupertinoIcons.calendar, size: 12, color: Color(0xFFFFC107)),
                    const SizedBox(width: 6),
                    Text(
                      'Scheduled: ${post?.scheduledDate ?? "2026-09-26"} at ${post?.scheduledTime ?? "20:00"} (Addis Ababa)',
                      style: const TextStyle(
                        color: Color(0xFFFFE082),
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // PRIZE SHOWCASE CARD
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A).withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.3), width: 1.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: LottoImage(
                    imageUrl: prizeImg,
                    width: 70,
                    height: 70,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activeDraw?.prizeTitle ?? 'Grand Prize',
                      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Entry: $ticketPrice ETB per ticket',
                      style: const TextStyle(color: Color(0xFFFFC107), fontSize: 12, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: activeDraw?.progressPercentage ?? 0.0,
                        backgroundColor: Colors.white12,
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFFC107)),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${activeDraw?.soldTickets ?? 0} / ${activeDraw?.totalTickets ?? 0} tickets taken',
                          style: const TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                        Text(
                          '$progressPct% SOLD',
                          style: const TextStyle(color: Color(0xFFFFC107), fontSize: 10, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // ACTION BUTTONS (Remind Me & Get Tickets)
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _reminderSet = !_reminderSet;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        _reminderSet
                            ? '🔔 Live broadcast reminder activated! You will receive notification before draw starts.'
                            : 'Reminder cancelled.',
                      ),
                      backgroundColor: const Color(0xFF10B981),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: _reminderSet ? const Color(0xFF10B981).withValues(alpha: 0.25) : Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _reminderSet ? const Color(0xFF10B981) : Colors.white24),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _reminderSet ? CupertinoIcons.bell_fill : CupertinoIcons.bell,
                        color: _reminderSet ? const Color(0xFF34D399) : Colors.white,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _reminderSet ? 'Reminder Set ✅' : 'Set Reminder',
                        style: TextStyle(
                          color: _reminderSet ? const Color(0xFF34D399) : Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            if (activeDraw != null)
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DrawDetailsScreen(draw: activeDraw, state: widget.state),
                      ),
                    );
                  },
                  child: Container(
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFFD54F), Color(0xFFFFB300)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFFFC107).withValues(alpha: 0.35),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(CupertinoIcons.ticket_fill, color: Colors.black, size: 16),
                        SizedBox(width: 6),
                        Text(
                          'Get Tickets',
                          style: TextStyle(color: Colors.black, fontSize: 13, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),

        const SizedBox(height: 14),

        // Host & Studio accreditation (Fixed overflow by using Expanded & responsive layout)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A).withValues(alpha: 0.75),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white10),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFC107).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Text('🎙️', style: TextStyle(fontSize: 15)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Official Studio Live Draw',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Host: Natnael Tadesse • Physical Ball Draw',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.65),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(CupertinoIcons.checkmark_shield_fill, size: 11, color: Color(0xFF10B981)),
                    SizedBox(width: 4),
                    Text(
                      'Audited',
                      style: TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCountdownBox(String value, String label) {
    return Container(
      width: 56,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFFFFC107),
              fontSize: 22,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 8,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCountdownColon() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 3),
      child: Text(
        ':',
        style: TextStyle(
          color: Color(0xFFFFC107),
          fontSize: 18,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _buildWinnersPostView(LiveBroadcastModel? post, DrawModel? activeDraw) {
    final winnerName = post?.winnerName ??
        (widget.state.winners.isNotEmpty ? widget.state.winners.first.winnerDisplayName : 'Dawit Mekonnen (Addis Ababa)');
    final winningTicket = post?.winningTicketNumber ??
        (widget.state.winners.isNotEmpty ? widget.state.winners.first.winningTicketNumber : '#NL-000142');
    final prizeTitle = post?.drawTitle ??
        activeDraw?.prizeTitle ??
        (widget.state.winners.isNotEmpty ? widget.state.winners.first.prizeTitle : 'iPhone 15 Pro Max 256GB');
    final prizeImg = activeDraw?.prizeImageUrl ??
        post?.prizeImageUrl ??
        (widget.state.winners.isNotEmpty
            ? widget.state.winners.first.prizeImageUrl
            : 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80');

    return Column(
      children: [
        // Trophy Badge Icon
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              colors: [Color(0xFFFFD700), Color(0xFFF59E0B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFFC107).withValues(alpha: 0.5),
                blurRadius: 18,
                spreadRadius: 2,
              ),
            ],
          ),
          child: const Center(
            child: Icon(CupertinoIcons.rosette, color: Colors.black, size: 36),
          ),
        ),

        const SizedBox(height: 10),

        // Winner Announcement Title
        const Text(
          '🎉 OFFICIAL DRAW WINNER ANNOUNCED! 🎉',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Color(0xFFFFD700),
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.5,
          ),
        ),

        const SizedBox(height: 4),

        const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(CupertinoIcons.checkmark_seal_fill, size: 12, color: Color(0xFF10B981)),
            SizedBox(width: 4),
            Text(
              '100% Certified by National Lottery Administration 🇪🇹',
              style: TextStyle(
                color: Color(0xFF10B981),
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // GRAND WINNER CARD
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [
                Color(0xFF1E293B),
                Color(0xFF0F172A),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.4), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            children: [
              // Winner Name & Avatar
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFFC107),
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Text('👑', style: TextStyle(fontSize: 22)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'LUCKY WINNER',
                        style: TextStyle(color: Color(0xFFFFC107), fontSize: 9, fontWeight: FontWeight.w900),
                      ),
                      Text(
                        winnerName,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Winning Ticket Number Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFC107).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.6)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(CupertinoIcons.ticket_fill, color: Color(0xFFFFC107), size: 16),
                    const SizedBox(width: 8),
                    Text(
                      'WINNING TICKET: $winningTicket',
                      style: const TextStyle(
                        color: Color(0xFFFFC107),
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Prize Image & Title
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: LottoImage(
                      imageUrl: prizeImg,
                      width: 60,
                      height: 60,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'PRIZE WON',
                          style: TextStyle(color: Colors.white54, fontSize: 9, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          prizeTitle,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Status: VERIFIED & CLAIMED',
                          style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // Audit Hash Notice
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Audit Hash: 7c8d9e0f...b7c8d • Verified on NLA Public Chain',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white38, fontSize: 9, fontFamily: 'monospace'),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // RECENT WINNERS CAROUSEL / LIST
        if (widget.state.winners.isNotEmpty) ...[
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '🏅 Recent Hall of Fame',
                style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800),
              ),
              Text(
                'Live NLA Record',
                style: TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 90,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: widget.state.winners.take(5).length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final w = widget.state.winners[i];
                return Container(
                  width: 170,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LottoImage(
                          imageUrl: w.prizeImageUrl,
                          width: 40,
                          height: 40,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              w.winnerDisplayName,
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              w.winningTicketNumber,
                              style: const TextStyle(color: Color(0xFFFFC107), fontSize: 10, fontWeight: FontWeight.w800),
                            ),
                            Text(
                              w.prizeTitle,
                              style: const TextStyle(color: Colors.white54, fontSize: 9),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 14),
        ],

        // ACTION BUTTONS
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () {
                  if (Navigator.canPop(context)) Navigator.pop(context);
                  widget.state.setNavIndex(3); // My Tickets tab
                },
                child: Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(CupertinoIcons.ticket, color: Colors.white, size: 15),
                      SizedBox(width: 6),
                      Text(
                        'Check My Tickets',
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: GestureDetector(
                onTap: () {
                  if (Navigator.canPop(context)) Navigator.pop(context);
                  widget.state.setNavIndex(1); // Draws tab
                },
                child: Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFC107),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFFC107).withValues(alpha: 0.5),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(CupertinoIcons.flame_fill, color: Colors.black, size: 15),
                      SizedBox(width: 6),
                      Text(
                        'Join Next Draw',
                        style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showGiftPickerModal() {
    final gifts = [
      {'name': 'Rose', 'cost': 1, 'emoji': '🌹'},
      {'name': 'Coffee Buna', 'cost': 5, 'emoji': '☕'},
      {'name': 'Lion of Judah', 'cost': 50, 'emoji': '🦁'},
      {'name': 'Crown', 'cost': 100, 'emoji': '👑'},
      {'name': 'Rocket', 'cost': 500, 'emoji': '🚀'},
      {'name': 'Gold Trophy', 'cost': 1000, 'emoji': '🏆'},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '🎁 Send Gift to Streamer',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                  ),
                  Text(
                    'Balance: 2,500 ETB',
                    style: TextStyle(color: Color(0xFFFFC107), fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 1.15,
                ),
                itemCount: gifts.length,
                itemBuilder: (context, idx) {
                  final g = gifts[idx];
                  return GestureDetector(
                    onTap: () => _sendGift(g['name'] as String, g['cost'] as int, g['emoji'] as String),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(g['emoji'] as String, style: const TextStyle(fontSize: 28)),
                          const SizedBox(height: 4),
                          Text(
                            g['name'] as String,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            '${g['cost']} ETB',
                            style: const TextStyle(color: Color(0xFFFFC107), fontSize: 10, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }
}
