import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/draw_model.dart';
import '../../data/models/featured_media_model.dart';
import '../state/lotto_state.dart';
import '../widgets/nati_logo.dart';
import 'draw_details_screen.dart';
import 'login_screen.dart';
import '../widgets/lotto_image.dart';
import '../widgets/lotto_video_player.dart';

class HomeScreen extends StatefulWidget {
  final LottoState state;

  const HomeScreen({super.key, required this.state});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isPlayingSpotlightVideo = false;


  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final featured = state.featuredDraw ?? (state.draws.isNotEmpty ? state.draws.first : null);
    final user = state.currentUser;
    final isLoggedIn = state.isLoggedIn && user != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const NatiLogoWidget(size: 24, fontSize: 18),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.search, color: AppColors.textPrimary, size: 20),
            onPressed: () => state.setNavIndex(1),
          ),
          GestureDetector(
            onTap: () {
              if (isLoggedIn) {
                state.setNavIndex(5); // Profile tab
              } else {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => LoginScreen(state: state)),
                );
              }
            },
            child: Container(
              margin: const EdgeInsets.only(right: 16, left: 4),
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.surfaceBorder, width: 1.5),
                color: isLoggedIn ? const Color(0xFFFFC107).withValues(alpha: 0.15) : AppColors.surfaceElevated,
              ),
              child: Center(
                child: Text(
                  isLoggedIn ? (user.displayName.isNotEmpty ? user.displayName[0].toUpperCase() : 'U') : '?',
                  style: TextStyle(
                    color: isLoggedIn ? const Color(0xFFFFC107) : AppColors.textSecondary,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: state.loadInitialData,
        color: AppColors.primary,
        backgroundColor: AppColors.surfaceElevated,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Featured Draw Hero Card with Real-time Ticking Timer
              _buildHeroFeaturedCard(context, featured),
              const SizedBox(height: 24),

              // 2. 4 Circular Quick Action Icons
              _buildQuickActionsRow(context),
              const SizedBox(height: 28),

              // 3. Featured Draws Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Featured Draws',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => state.setNavIndex(1),
                    child: const Text(
                      'View All',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.purple,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // 4. Horizontal Slider of Featured Draws
              _buildFeaturedDrawsCarousel(context),
              const SizedBox(height: 28),

              // 5. Recent Media Post (Winner Handover or Promotion Campaign - latest only)
              _buildRecentMediaPost(context, state.latestMediaPost),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  // Hero Card matching Screen 2
  Widget _buildHeroFeaturedCard(BuildContext context, DrawModel? draw) {
    final title = draw?.title ?? 'Samsung Galaxy S23 Ultra';
    final ticketPrice = draw?.ticketPriceEtb ?? 100;
    final total = (draw?.totalTickets != null && draw!.totalTickets > 0) ? draw.totalTickets : 1000;
    final sold = (draw?.soldTickets ?? 0).clamp(0, total);
    final remaining = (total - sold).clamp(0, total);
    final pct = total > 0 ? (sold / total).clamp(0.0, 1.0) : 0.0;

    final isSoldOut = total > 0 && (remaining <= 0 || sold >= total);
    final isWinnerPicked = draw?.isCompleted == true;
    final isClosed = isSoldOut || isWinnerPicked;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF141A29),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08), width: 1),
        gradient: const RadialGradient(
          center: Alignment(0.6, -0.2),
          radius: 1.2,
          colors: [
            Color(0xFF231E3D),
            Color(0xFF141A29),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E1B4B).withValues(alpha: 0.18),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top: Title, Price, Image & Featured Pill
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left text info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Featured Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6C5DD3).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF6C5DD3).withValues(alpha: 0.4), width: 0.8),
                      ),
                      child: const Text(
                        'Featured Draw',
                        style: TextStyle(
                          color: Color(0xFFB4A9FA),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.3,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$ticketPrice ETB / ticket',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),

              // Right Product Image
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: LottoImage(
                  imageUrl: draw?.prizeImageUrl,
                  width: 100,
                  height: 110,
                  fit: BoxFit.cover,
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 6,
              backgroundColor: Colors.white.withValues(alpha: 0.1),
              valueColor: const AlwaysStoppedAnimation(Color(0xFFFFC107)),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$sold / $total tickets sold',
                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
              ),
              Text(
                '$remaining left',
                style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Winner announcement banner or Real-time Digital Countdown Boxes
          if (isWinnerPicked)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('🏆', style: TextStyle(fontSize: 22)),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'OFFICIAL WINNER CERTIFIED',
                        style: TextStyle(
                          color: Color(0xFF34D399),
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                          letterSpacing: 0.5,
                        ),
                      ),
                      if (draw?.winningTicketNumber != null)
                        Text(
                          'Winning Ticket #${draw!.winningTicketNumber}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            )
          else if (isSoldOut)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(CupertinoIcons.lock_fill, color: Color(0xFFF87171), size: 16),
                  SizedBox(width: 8),
                  Text(
                    'ALL TICKETS SOLD OUT • AWAITING LIVE DRAW',
                    style: TextStyle(
                      color: Color(0xFFFCA5A5),
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                      letterSpacing: 0.4,
                    ),
                  ),
                ],
              ),
            )
          else
            // Real-time Digital Countdown Boxes: Ends in HH : MM : SS
            _HeroCountdownWidget(salesEndDate: draw?.salesEndDate),

          const SizedBox(height: 16),

          // Gold Full-Width "Enter Draw" Button (Locked when closed, or View Winner)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (draw != null) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => DrawDetailsScreen(draw: draw, state: widget.state),
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: isWinnerPicked
                    ? const Color(0xFF065F46)
                    : (isClosed ? const Color(0xFF1E293B) : const Color(0xFFFFC107)),
                foregroundColor: isWinnerPicked
                    ? const Color(0xFF34D399)
                    : (isClosed ? const Color(0xFF94A3B8) : const Color(0xFF0B0F19)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: Row(
                 mainAxisAlignment: MainAxisAlignment.center,
                 children: [
                   if (isWinnerPicked) ...[
                     const Text('🏆', style: TextStyle(fontSize: 16)),
                     const SizedBox(width: 8),
                   ] else if (isClosed) ...[
                     const Icon(CupertinoIcons.info_circle, size: 16),
                     const SizedBox(width: 6),
                   ],
                   Text(
                     isWinnerPicked
                         ? 'View Certified Winner'
                         : (isSoldOut
                             ? 'Sold Out • View Details'
                             : 'Enter Draw (Choose Tickets)'),
                     style: TextStyle(
                       fontSize: 15,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.2,
                      color: isWinnerPicked
                          ? Colors.white
                          : (isClosed ? const Color(0xFF94A3B8) : const Color(0xFF0B0F19)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 4 Circular Action Icons matching Screen 2
  Widget _buildQuickActionsRow(BuildContext context) {
    final actions = [
      {'label': 'Live Draw', 'icon': CupertinoIcons.play_circle_fill, 'color': const Color(0xFFEF4444), 'onTap': () => widget.state.setNavIndex(2)},
      {'label': 'Winners', 'icon': CupertinoIcons.rosette, 'color': const Color(0xFFFFC107), 'onTap': () => widget.state.setNavIndex(4)},
      {'label': 'Verify', 'icon': CupertinoIcons.checkmark_seal_fill, 'color': const Color(0xFF10B981), 'onTap': () => widget.state.setNavIndex(1)},
      {'label': 'My Tickets', 'icon': CupertinoIcons.ticket_fill, 'color': const Color(0xFF6C5DD3), 'onTap': () => widget.state.setNavIndex(3)},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: actions.map((item) {
        return GestureDetector(
          onTap: item['onTap'] as VoidCallback,
          child: Column(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.surfaceBorder),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: Icon(
                    item['icon'] as IconData,
                    color: item['color'] as Color,
                    size: 24,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                item['label'] as String,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  // Horizontal Carousel of Featured Draws matching Screen 2
  Widget _buildFeaturedDrawsCarousel(BuildContext context) {
    final list = widget.state.draws.isNotEmpty ? widget.state.draws : [widget.state.featuredDraw];

    return SizedBox(
      height: 240,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (ctx, index) {
          final draw = list[index];
          if (draw == null) return const SizedBox.shrink();

          final isDrawSoldOut = draw.remainingTickets <= 0 || (draw.totalTickets > 0 && draw.soldTickets >= draw.totalTickets);
          final isCompleted = draw.isCompleted || draw.winningTicketNumber != null;
          final isClosing = draw.status == 'CLOSING';
          final badgeText = isCompleted
              ? 'COMPLETED'
              : (isDrawSoldOut
                  ? 'SOLD OUT'
                  : (isClosing ? 'CLOSING' : 'OPEN'));
          final badgeColor = isCompleted
              ? const Color(0xFF6C5DD3)
              : (isDrawSoldOut
                  ? const Color(0xFFEF4444)
                  : (isClosing ? const Color(0xFFF59E0B) : const Color(0xFF10B981)));

          return GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => DrawDetailsScreen(draw: draw, state: widget.state),
                ),
              );
            },
            child: Container(
              width: 175,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.surfaceBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image with Status Badge
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: LottoImage(
                          imageUrl: draw.prizeImageUrl,
                          width: double.infinity,
                          height: 108,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: 6,
                        left: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: badgeColor,
                            borderRadius: BorderRadius.circular(6),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          child: Text(
                            badgeText,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    draw.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${draw.ticketPriceEtb} ETB',
                    style: const TextStyle(
                      color: AppColors.textAccent,
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                    ),
                  ),
                  const Spacer(),
                  // Progress indicator
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (draw.soldTickets / (draw.totalTickets > 0 ? draw.totalTickets : 1)).clamp(0.0, 1.0),
                      minHeight: 5,
                      backgroundColor: AppColors.surfaceElevated,
                      valueColor: AlwaysStoppedAnimation(
                        isDrawSoldOut ? const Color(0xFFEF4444) : const Color(0xFF6C5DD3),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${draw.remainingTickets} left',
                        style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        '${draw.soldTickets}/${draw.totalTickets}',
                        style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }


  Widget _buildRecentMediaPost(BuildContext context, FeaturedMediaModel? post) {
    if (post == null) return const SizedBox.shrink();

    final isWinner = post.type == 'WINNER';
    final accentColor = isWinner ? const Color(0xFFF59E0B) : const Color(0xFF6C5DD3);
    final badgeText = isWinner ? 'Recent Winner Handover' : (post.badge.isNotEmpty ? post.badge : 'Official Campaign');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(
                  isWinner ? CupertinoIcons.rosette : CupertinoIcons.flame_fill,
                  size: 20,
                  color: accentColor,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Latest Spotlight',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: accentColor.withValues(alpha: 0.3)),
              ),
              child: Text(
                badgeText,
                style: TextStyle(
                  color: accentColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.surfaceBorder),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Media Header Preview with Video Play Overlay
              if (_isPlayingSpotlightVideo)
                Container(
                  height: 320,
                  width: double.infinity,
                  color: Colors.black,
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: LottoVideoPlayer(
                          videoUrl: post.videoUrl,
                          posterUrl: post.thumbnailUrl.isNotEmpty ? post.thumbnailUrl : post.prizeImageUrl,
                          width: double.infinity,
                          height: 320,
                          autoPlay: true,
                        ),
                      ),
                      Positioned(
                        top: 10,
                        right: 10,
                        child: GestureDetector(
                          onTap: () => setState(() => _isPlayingSpotlightVideo = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.8),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.white24),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(CupertinoIcons.clear, color: Colors.white, size: 12),
                                SizedBox(width: 4),
                                Text(
                                  'Close Video',
                                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => setState(() => _isPlayingSpotlightVideo = true),
                  child: SizedBox(
                    width: double.infinity,
                    height: 170,
                    child: Stack(
                      children: [
                        LottoImage(
                          imageUrl: post.thumbnailUrl.isNotEmpty
                              ? post.thumbnailUrl
                              : (post.prizeImageUrl ?? 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80'),
                          width: double.infinity,
                          height: 170,
                          fit: BoxFit.cover,
                        ),
                      Container(
                        width: double.infinity,
                        height: 170,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.7),
                            ],
                          ),
                        ),
                      ),
                      Positioned.fill(
                        child: Center(
                          child: Container(
                            width: 52,
                            height: 52,
                            decoration: BoxDecoration(
                              color: accentColor,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: accentColor.withValues(alpha: 0.5),
                                  blurRadius: 16,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                            child: const Icon(
                              CupertinoIcons.play_fill,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                        ),
                      ),
                      if (post.winningTicketNumber != null && post.winningTicketNumber!.isNotEmpty)
                        Positioned(
                          top: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Winning Ticket: ${post.winningTicketNumber}',
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
              ),

              // Content Details
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.3,
                        height: 1.25,
                        fontFamilyFallback: ['Noto Sans Ethiopic', 'Noto Sans', 'sans-serif'],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      post.description,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        height: 1.4,
                        fontFamilyFallback: ['Noto Sans Ethiopic', 'Noto Sans', 'sans-serif'],
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 14),

                    // Action bar with Watch Video
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (isWinner && post.winnerName != null)
                          Row(
                            children: [
                              const Icon(CupertinoIcons.person_crop_circle_badge_checkmark,
                                  size: 16, color: Color(0xFFF59E0B)),
                              const SizedBox(width: 6),
                              Text(
                                post.winnerName!,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          )
                        else
                          const Row(
                            children: [
                              Icon(CupertinoIcons.checkmark_shield_fill,
                                  size: 16, color: Color(0xFF10B981)),
                              SizedBox(width: 6),
                              Text(
                                'NLA Verified',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                  color: Color(0xFF10B981),
                                ),
                              ),
                            ],
                          ),
                        ElevatedButton.icon(
                          onPressed: () {
                            setState(() {
                              _isPlayingSpotlightVideo = !_isPlayingSpotlightVideo;
                            });
                          },
                          icon: Icon(
                            _isPlayingSpotlightVideo ? CupertinoIcons.stop_fill : CupertinoIcons.play_circle_fill,
                            size: 16,
                          ),
                          label: Text(
                            _isPlayingSpotlightVideo
                                ? 'Close Player'
                                : (isWinner ? 'Watch Handover' : 'Watch Campaign'),
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isPlayingSpotlightVideo ? const Color(0xFFEF4444) : accentColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            minimumSize: const Size(0, 36),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ],
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

}

class _HeroCountdownWidget extends StatefulWidget {
  final String? salesEndDate;

  const _HeroCountdownWidget({required this.salesEndDate});

  @override
  State<_HeroCountdownWidget> createState() => _HeroCountdownWidgetState();
}

class _HeroCountdownWidgetState extends State<_HeroCountdownWidget> {
  Timer? _timer;
  Duration _timeLeft = const Duration(hours: 2, minutes: 14, seconds: 38);

  @override
  void initState() {
    super.initState();
    _calculateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        _calculateTime();
      }
    });
  }

  void _calculateTime() {
    if (widget.salesEndDate != null) {
      try {
        final endDate = DateTime.parse(widget.salesEndDate!);
        final diff = endDate.difference(DateTime.now());
        setState(() {
          _timeLeft = diff.isNegative ? Duration.zero : diff;
        });
        return;
      } catch (_) {}
    }
    if (_timeLeft.inSeconds > 0) {
      setState(() {
        _timeLeft = _timeLeft - const Duration(seconds: 1);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_timeLeft <= Duration.zero) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(CupertinoIcons.flame_fill, color: Color(0xFFF59E0B), size: 16),
            SizedBox(width: 8),
            Text(
              'FINAL TICKETS AVAILABLE • DRAWING SOON',
              style: TextStyle(
                color: Color(0xFFFBBF24),
                fontWeight: FontWeight.w900,
                fontSize: 11,
                letterSpacing: 0.4,
              ),
            ),
          ],
        ),
      );
    }

    final hours = _timeLeft.inHours.toString().padLeft(2, '0');
    final minutes = (_timeLeft.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (_timeLeft.inSeconds % 60).toString().padLeft(2, '0');

    return Center(
      child: Column(
        children: [
          const Text(
            'Ends in',
            style: TextStyle(fontSize: 11, color: AppColors.textMuted),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildDigitBox(hours, 'Hours'),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                child: Text(':', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
              ),
              _buildDigitBox(minutes, 'Minutes'),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                child: Text(':', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
              ),
              _buildDigitBox(seconds, 'Seconds'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDigitBox(String value, String label) {
    return Column(
      children: [
        Container(
          width: 38,
          height: 32,
          decoration: BoxDecoration(
            color: const Color(0xFF1E2638),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          alignment: Alignment.center,
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 14,
            ),
          ),
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: const TextStyle(fontSize: 9, color: AppColors.textMuted),
        ),
      ],
    );
  }
}
