import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/draw_model.dart';
import '../state/lotto_state.dart';
import 'login_screen.dart';
import '../widgets/lotto_image.dart';
import '../widgets/lotto_video_player.dart';

class DrawDetailsScreen extends StatefulWidget {
  final DrawModel draw;
  final LottoState state;

  const DrawDetailsScreen({super.key, required this.draw, required this.state});

  @override
  State<DrawDetailsScreen> createState() => _DrawDetailsScreenState();
}

class _DrawDetailsScreenState extends State<DrawDetailsScreen> {
  int selectedThumbnailIndex = 0;
  String selectedTab = 'Details';
  final PageController _pageController = PageController();
  bool showProductVideo = false;

  late DrawModel _draw;
  late List<String> thumbnails;

  String? get productVideoUrl {
    final url = _draw.videoUrl?.trim();
    if (url != null && url.isNotEmpty) {
      return url;
    }
    for (final key in [
      'videoUrl',
      'Product Video',
      'productVideo',
      'productVideoUrl',
      'video_url',
      'video',
      'tikTokUrl',
      'tiktokUrl',
      'directVideoUrl'
    ]) {
      final specUrl = _draw.specifications[key]?.trim();
      if (specUrl != null && specUrl.isNotEmpty) {
        return specUrl;
      }
    }
    for (final entry in _draw.specifications.entries) {
      if (entry.key.toLowerCase().contains('video') && entry.value.trim().isNotEmpty) {
        return entry.value.trim();
      }
    }
    return null;
  }

  bool get hasProductVideo => productVideoUrl != null && productVideoUrl!.isNotEmpty;

  bool get isTikTokVideo =>
      hasProductVideo &&
      (productVideoUrl!.contains('tiktok.com') || RegExp(r'^\d{16,21}$').hasMatch(productVideoUrl!));

  void _handleWatchProductVideo(BuildContext context) {
    if (!hasProductVideo) return;
    setState(() => showProductVideo = true);
  }

  @override
  void initState() {
    super.initState();
    _draw = widget.draw;
    _updateThumbnails();
    _fetchFreshDrawDetails();
  }

  void _updateThumbnails() {
    final realImages = <String>[];
    if (_draw.galleryImages.isNotEmpty) {
      for (final img in _draw.galleryImages) {
        final trimmed = img.trim();
        if (trimmed.isNotEmpty && !realImages.contains(trimmed)) {
          realImages.add(trimmed);
        }
      }
    }
    if (realImages.isEmpty && _draw.prizeImageUrl.trim().isNotEmpty) {
      realImages.add(_draw.prizeImageUrl.trim());
    }
    thumbnails = realImages.isNotEmpty ? realImages : [_draw.prizeImageUrl];
  }

  Future<void> _fetchFreshDrawDetails() async {
    try {
      final fresh = await widget.state.repository.getDrawById(_draw.id);
      if (fresh != null && mounted) {
        setState(() {
          _draw = fresh;
          _updateThumbnails();
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final draw = _draw;
    final total = draw.totalTickets > 0 ? draw.totalTickets : 1000;
    final sold = draw.soldTickets.clamp(0, total);
    final remaining = (total - sold).clamp(0, total);
    final pct = total > 0 ? (sold / total).clamp(0.0, 1.0) : 0.0;
    final isSoldOut = total > 0 && (remaining <= 0 || sold >= total);
    final isClosed = isSoldOut || draw.isCompleted;
    final isTikTokVideo = hasProductVideo &&
        (productVideoUrl!.contains('tiktok.com') || RegExp(r'^\d{16,21}$').hasMatch(productVideoUrl!));
    final heroHeight = (showProductVideo && hasProductVideo) ? (isTikTokVideo ? 380.0 : 290.0) : 290.0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(CupertinoIcons.back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.square_arrow_up, color: AppColors.textPrimary, size: 20),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Large Hero Product Image / Video Player with Switcher
            Container(
              height: heroHeight,
              width: double.infinity,
              color: AppColors.surfaceElevated,
              child: Stack(
                children: [
                  if (showProductVideo && hasProductVideo)
                    Positioned.fill(
                      child: LottoVideoPlayer(
                        videoUrl: productVideoUrl!,
                        posterUrl: _draw.prizeImageUrl,
                        width: double.infinity,
                        height: heroHeight,
                        autoPlay: true,
                        fit: BoxFit.contain,
                      ),
                    )
                  else
                    Positioned.fill(
                      child: PageView.builder(
                        controller: _pageController,
                        itemCount: thumbnails.length,
                        onPageChanged: (idx) {
                          setState(() {
                            selectedThumbnailIndex = idx;
                          });
                        },
                        itemBuilder: (context, idx) {
                          return Stack(
                            fit: StackFit.expand,
                            children: [
                              LottoImage(
                                imageUrl: thumbnails[idx],
                                width: double.infinity,
                                height: 290,
                                fit: BoxFit.cover,
                              ),
                              // If product has video, subtle center play badge over image
                              if (hasProductVideo)
                                Center(
                                  child: GestureDetector(
                                    onTap: () => _handleWatchProductVideo(context),
                                    child: Container(
                                      width: 58,
                                      height: 58,
                                      decoration: BoxDecoration(
                                        color: Colors.black.withValues(alpha: 0.65),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: isTikTokVideo
                                              ? const Color(0xFFFE2C55)
                                              : Colors.white.withValues(alpha: 0.8),
                                          width: 2,
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: (isTikTokVideo ? const Color(0xFFFE2C55) : Colors.black)
                                                .withValues(alpha: 0.5),
                                            blurRadius: 16,
                                          ),
                                        ],
                                      ),
                                      child: Icon(
                                        isTikTokVideo ? CupertinoIcons.play_circle_fill : CupertinoIcons.play_fill,
                                        color: Colors.white,
                                        size: 28,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          );
                        },
                      ),
                    ),

                  // Status badge top-left
                  Positioned(
                    top: 14,
                    left: 14,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Text(
                        draw.status,
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),

                  // If showing video: "Back to Photos" button top-right
                  if (showProductVideo && hasProductVideo)
                    Positioned(
                      top: 14,
                      right: 14,
                      child: GestureDetector(
                        onTap: () => setState(() => showProductVideo = false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.82),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white30),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.4),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(CupertinoIcons.photo, color: Colors.white, size: 14),
                              SizedBox(width: 5),
                              Text(
                                'Back to Photos',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // If NOT showing video and video exists: "Watch Video" pill bottom-right
                  if (!showProductVideo && hasProductVideo)
                    Positioned(
                      bottom: 12,
                      right: 14,
                      child: GestureDetector(
                        onTap: () => _handleWatchProductVideo(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: isTikTokVideo
                                  ? const [Color(0xFFFE2C55), Color(0xFFE11D48)]
                                  : const [Color(0xFFEF4444), Color(0xFFDC2626)],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: (isTikTokVideo ? const Color(0xFFFE2C55) : const Color(0xFFEF4444))
                                    .withValues(alpha: 0.5),
                                blurRadius: 12,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                CupertinoIcons.play_fill,
                                color: Colors.white,
                                size: 13,
                              ),
                              const SizedBox(width: 5),
                              const Text(
                                'Watch Product Video',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Image counter pill (if multiple images and in photo mode)
                  if (!showProductVideo && thumbnails.length > 1)
                    Positioned(
                      bottom: 12,
                      left: hasProductVideo ? 14 : null,
                      right: hasProductVideo ? null : 14,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Text(
                          '${selectedThumbnailIndex + 1} / ${thumbnails.length}',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // 2. Thumbnails Strip (Photos + Video button)
            if (thumbnails.length > 1 || hasProductVideo)
              Container(
                height: 74,
                padding: const EdgeInsets.symmetric(vertical: 8),
                color: AppColors.background,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  itemCount: thumbnails.length + (hasProductVideo ? 1 : 0),
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, idx) {
                    // First slot is the video thumbnail if video exists
                    if (hasProductVideo && idx == 0) {
                      return GestureDetector(
                        onTap: () => _handleWatchProductVideo(context),
                        child: Container(
                          width: 58,
                          height: 58,
                          decoration: BoxDecoration(
                            color: isTikTokVideo ? const Color(0xFF0F172A) : const Color(0xFF1E1B4B),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: showProductVideo
                                  ? (isTikTokVideo ? const Color(0xFFFE2C55) : const Color(0xFFEF4444))
                                  : (isTikTokVideo ? const Color(0xFFFE2C55).withValues(alpha: 0.5) : AppColors.surfaceBorder),
                              width: (showProductVideo || isTikTokVideo) ? 2.0 : 1.0,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: (isTikTokVideo ? const Color(0xFFFE2C55) : const Color(0xFFEF4444))
                                    .withValues(alpha: 0.35),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  color: isTikTokVideo ? const Color(0xFFFE2C55) : const Color(0xFFEF4444),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isTikTokVideo ? CupertinoIcons.arrow_up_right_square_fill : CupertinoIcons.play_fill,
                                  color: Colors.white,
                                  size: 11,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                isTikTokVideo ? 'TIKTOK' : 'VIDEO',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }

                    final photoIdx = hasProductVideo ? idx - 1 : idx;
                    final isSelected = !showProductVideo && selectedThumbnailIndex == photoIdx;
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          showProductVideo = false;
                          selectedThumbnailIndex = photoIdx;
                        });
                        _pageController.animateToPage(
                          photoIdx,
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      },
                      child: Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF6C5DD3) : AppColors.surfaceBorder,
                            width: isSelected ? 2.5 : 1,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LottoImage(
                            imageUrl: thumbnails[photoIdx],
                            width: 58,
                            height: 58,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

            // 3. Info & Price Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    draw.title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textPrimary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${draw.ticketPriceEtb} ETB / ticket',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Progress Bar + Sold Counter
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: pct,
                      minHeight: 6,
                      backgroundColor: AppColors.surfaceElevated,
                      valueColor: const AlwaysStoppedAnimation(Color(0xFF6C5DD3)),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          '$sold / $total tickets sold',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$remaining left',
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Real-time Digital Countdown Boxes (Only if NO winner is picked and not closed)
                  if (draw.isCompleted)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFFFFC107).withValues(alpha: 0.15),
                            const Color(0xFF6C5DD3).withValues(alpha: 0.15),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFC107),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text('🏆', style: TextStyle(fontSize: 22)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '🏆 Official Winner Announced',
                                  style: TextStyle(
                                    color: Color(0xFFFFC107),
                                    fontWeight: FontWeight.w900,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Draw certified by National Lottery Administration',
                                  style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    )
                  else if (!isClosed)
                    Center(
                      child: _DrawDetailCountdownWidget(salesEndDate: draw.salesEndDate),
                    ),
                  const SizedBox(height: 20),

                  // Closed / Sold Out Warning Banner
                  if (isClosed) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.35)),
                      ),
                      child: Row(
                        children: [
                          const Icon(CupertinoIcons.lock_fill, color: Colors.red, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              isSoldOut
                                  ? 'All tickets sold out! Entries are closed.'
                                  : 'Draw has concluded and winner announced.',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Action Button (Disabled when closed)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isClosed ? null : () => _checkAccountBeforePurchase(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isClosed ? const Color(0xFF1E293B) : const Color(0xFFFFC107),
                        foregroundColor: isClosed ? const Color(0xFF94A3B8) : const Color(0xFF0B0F19),
                        disabledBackgroundColor: const Color(0xFF1E293B),
                        disabledForegroundColor: const Color(0xFF64748B),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (isClosed) ...[
                            const Icon(CupertinoIcons.lock, size: 16),
                            const SizedBox(width: 6),
                          ],
                          Flexible(
                            child: Text(
                              isClosed
                                  ? (isSoldOut ? 'Sold Out (Post Locked)' : 'Draw Concluded')
                                  : 'Enter Draw (Choose Tickets)',
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.2,
                                color: isClosed ? const Color(0xFF94A3B8) : const Color(0xFF0B0F19),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Tabs: Details, How It Works, Rules
                  Container(
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: AppColors.surfaceBorder, width: 1)),
                    ),
                    child: Row(
                      children: ['Details', 'How It Works', 'Rules'].map((tab) {
                        final isSelected = selectedTab == tab;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              selectedTab = tab;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(
                                  color: isSelected ? const Color(0xFF6C5DD3) : Colors.transparent,
                                  width: 2.5,
                                ),
                              ),
                            ),
                            child: Text(
                              tab,
                              style: TextStyle(
                                color: isSelected ? const Color(0xFF6C5DD3) : AppColors.textSecondary,
                                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 18),

                  if (selectedTab == 'Details') ...[
                    // Prize Description
                    const Text(
                      'Prize Description',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      draw.description.isNotEmpty ? draw.description : '${draw.title} with official Ethiopian manufacturer warranty and accessories.',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.5),
                    ),
                    const SizedBox(height: 20),

                    // 1. Official Product Video Showcase (Shown prominently above table)
                    if (hasProductVideo) ...[
                      Row(
                        children: [
                          Icon(
                            isTikTokVideo ? CupertinoIcons.arrow_up_right_square_fill : CupertinoIcons.play_rectangle_fill,
                            color: isTikTokVideo ? const Color(0xFFFE2C55) : const Color(0xFFEF4444),
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            isTikTokVideo ? 'Official TikTok Demonstration Video' : 'Official Product Demonstration Video',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: LottoVideoPlayer(
                          videoUrl: productVideoUrl!,
                          posterUrl: widget.draw.prizeImageUrl,
                          width: double.infinity,
                          height: isTikTokVideo ? 360 : 230,
                          autoPlay: false,
                        ),
                      ),
                      const SizedBox(height: 22),
                    ],

                    // 2. Dynamic Specifications Table (Filtered of raw video URL keys)
                    const Text(
                      'Product Specifications Table',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 10),
                    if (draw.specifications.isNotEmpty) ...[
                      ...draw.specifications.entries
                          .where((e) {
                            final k = e.key.toLowerCase().trim();
                            return k != 'videourl' &&
                                k != 'product video' &&
                                k != 'productvideourl' &&
                                k != 'videoplatform';
                          })
                          .map((e) => _buildSpecRow(e.key, e.value)),
                    ] else ...[
                      _buildSpecRow('Category', 'Official National Prize Draw'),
                      _buildSpecRow('Condition', 'Brand New Sealed In-Box'),
                      _buildSpecRow('Warranty', '1 Year Full Coverage'),
                      _buildSpecRow('Delivery', 'Insured Delivery in Addis Ababa & Regional Cities'),
                    ],
                  ] else if (selectedTab == 'How It Works') ...[
                    _buildStepItem('1', 'Pick Your Lucky Numbers', 'Select specific ticket numbers or use instant quick-pick.'),
                    _buildStepItem('2', 'Pay via Telebirr or CBE Birr', 'Instant secure mobile money transaction.'),
                    _buildStepItem('3', 'Watch CSPRNG Live Reveal', 'Every winning number selected by verified cryptographic algorithm.'),
                    _buildStepItem('4', 'Claim Your Prize', 'Direct cash payout or courier delivery with official handover.'),
                  ] else ...[
                    _buildSpecRow('Eligibility', 'Ethiopian residents strictly 18 years or older.'),
                    _buildSpecRow('Lottery Permit', draw.permitNumber.isNotEmpty ? draw.permitNumber : 'NL-ET-2026-0892'),
                    _buildSpecRow('Draw Operator', 'Nati Lotto Platform (Regulated Entity)'),
                    _buildSpecRow('Claim Validity', '30 Calendar Days from official draw date'),
                  ],

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepItem(String num, String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(color: Color(0xFF6C5DD3), shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Text(num, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 13)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            flex: 3,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _checkAccountBeforePurchase(BuildContext context) {
    final draw = _draw;
    final total = draw.totalTickets > 0 ? draw.totalTickets : 1000;
    final sold = draw.soldTickets.clamp(0, total);
    final remaining = (total - sold).clamp(0, total);
    final isSoldOut = total > 0 && (remaining <= 0 || sold >= total);
    final isClosed = isSoldOut || draw.isCompleted;
    if (isClosed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This draw is sold out or completed. Entries can no longer be submitted.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    if (!widget.state.isLoggedIn) {
      _showAccountRequiredDialog(context);
    } else {
      _openPurchaseModal(context);
    }
  }

  void _showAccountRequiredDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFFFFC107).withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.4)),
              ),
              child: const Icon(CupertinoIcons.person_crop_circle_badge_checkmark, color: Color(0xFFFFC107), size: 30),
            ),
            const SizedBox(height: 16),
            const Text(
              'Account Required to Buy Tickets',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            const Text(
              'In compliance with National Lottery Administration (NLA) regulations, you must have an active player account to purchase tickets and claim prizes.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  widget.state.login('+251 911 223 344');
                  _openPurchaseModal(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFC107),
                  foregroundColor: const Color(0xFF0B0F19),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('⚡ Quick Sign In as Dawit M. (Player)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => LoginScreen(state: widget.state)),
                  );
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF6C5DD3),
                  side: const BorderSide(color: Color(0xFF6C5DD3)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Sign In with Phone Number (+251)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  // Opens Screen 5: Purchase Tickets Modal with Ticket Number Picker
  void _openPurchaseModal(BuildContext context) {
    final totalTickets = _draw.totalTickets > 0 ? _draw.totalTickets : 1000;
    int qty = math.min(5, totalTickets);
    if (qty < 1) qty = 1;
    bool isCustomMode = false;
    List<int> selectedNumbers = [];
    Set<int> bookedSequenceNumbers = {};
    void Function(void Function())? updateModalState;

    // Load available tickets for this draw
    widget.state.fetchTicketAvailability(_draw.id).then((data) {
      if (mounted) {
        final bookedList = data['bookedSequenceNumbers'] as List<dynamic>? ?? [];
        bookedSequenceNumbers = bookedList.map((e) => (e as num).toInt()).toSet();
        updateModalState?.call(() {});
      }
    });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            updateModalState = setModalState;
            final ticketPrice = _draw.ticketPriceEtb;
            final effectiveQty = isCustomMode ? selectedNumbers.length : qty;
            final total = effectiveQty * ticketPrice;
            final totalTickets = _draw.totalTickets > 0 ? _draw.totalTickets : 1000;
            final padLength = totalTickets > 9999 ? 6 : 4;

            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () => Navigator.pop(ctx),
                            child: const Icon(CupertinoIcons.back, color: AppColors.textPrimary, size: 20),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'Purchase Tickets',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFC107).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '$ticketPrice ETB/ea',
                          style: const TextStyle(color: Color(0xFFFFC107), fontWeight: FontWeight.w800, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Mode Selector: "Quick Pick" vs "Choose Lucky Numbers"
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.surfaceBorder),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setModalState(() {
                                isCustomMode = false;
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: !isCustomMode ? const Color(0xFF6C5DD3) : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '⚡ Auto Quick-Pick',
                                style: TextStyle(
                                  color: !isCustomMode ? Colors.white : AppColors.textSecondary,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setModalState(() {
                                isCustomMode = true;
                                if (selectedNumbers.isEmpty) {
                                  final maxInitial = math.min(3, totalTickets);
                                  for (int i = 1; i <= totalTickets && selectedNumbers.length < maxInitial; i++) {
                                    if (!bookedSequenceNumbers.contains(i)) {
                                      selectedNumbers.add(i);
                                    }
                                  }
                                }
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: isCustomMode ? const Color(0xFFFFC107) : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '🎯 Choose Lucky Numbers',
                                style: TextStyle(
                                  color: isCustomMode ? const Color(0xFF070A12) : AppColors.textSecondary,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (!isCustomMode) ...[
                    // AUTO QUICK-PICK: 1, 5, 10, 25
                    const Text(
                      'Select Ticket Quantity',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [1, 5, 10, 25].where((count) => count <= totalTickets || count == 1).map((count) {
                        final isSelected = qty == count;
                        return GestureDetector(
                          onTap: () {
                            setModalState(() {
                              qty = count;
                            });
                          },
                          child: Container(
                            width: 64,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF6C5DD3) : AppColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF6C5DD3) : AppColors.surfaceBorder,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '$count',
                              style: TextStyle(
                                color: isSelected ? Colors.white : AppColors.textSecondary,
                                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ] else ...[
                    // CHOOSE LUCKY NUMBERS INTERACTIVE GRID
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Available Tickets Grid (Tap to Pick)',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        GestureDetector(
                          onTap: () {
                            setModalState(() {
                              selectedNumbers.clear();
                              // Pick random unbooked numbers (up to 5)
                              final available = <int>[];
                              for (int i = 1; i <= totalTickets; i++) {
                                if (!bookedSequenceNumbers.contains(i)) available.add(i);
                              }
                              available.shuffle();
                              final pickCount = math.min(5, available.length);
                              selectedNumbers = available.take(pickCount).toList()..sort();
                            });
                          },
                          child: const Row(
                            children: [
                              Icon(CupertinoIcons.shuffle, size: 14, color: Color(0xFFFFC107)),
                              SizedBox(width: 4),
                              Text('Lucky 5', style: TextStyle(color: Color(0xFFFFC107), fontSize: 12, fontWeight: FontWeight.w800)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Grid of available ticket numbers
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.surfaceBorder),
                        ),
                        child: GridView.builder(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 5,
                            childAspectRatio: 1.4,
                            crossAxisSpacing: 6,
                            mainAxisSpacing: 6,
                          ),
                          itemCount: totalTickets,
                          itemBuilder: (ctx, index) {
                            final seq = index + 1;
                            final isBooked = bookedSequenceNumbers.contains(seq);
                            final isSelected = selectedNumbers.contains(seq);
                            final numStr = '#${seq.toString().padLeft(padLength, '0')}';

                            return GestureDetector(
                              onTap: isBooked
                                  ? null
                                  : () {
                                      setModalState(() {
                                        if (isSelected) {
                                          selectedNumbers.remove(seq);
                                        } else {
                                          if (selectedNumbers.length < 25) {
                                            selectedNumbers.add(seq);
                                            selectedNumbers.sort();
                                          }
                                        }
                                      });
                                    },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: isBooked
                                      ? Colors.white.withValues(alpha: 0.03)
                                      : isSelected
                                          ? const Color(0xFFFFC107)
                                          : AppColors.surface,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: isBooked
                                        ? Colors.white.withValues(alpha: 0.05)
                                        : isSelected
                                            ? const Color(0xFFFFC107)
                                            : AppColors.surfaceBorder,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  isBooked ? 'SOLD' : numStr,
                                  style: TextStyle(
                                    fontSize: isBooked ? 9 : 10,
                                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                                    color: isBooked
                                        ? AppColors.textMuted
                                        : isSelected
                                            ? const Color(0xFF070A12)
                                            : AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                    // Selected Numbers Display Pills
                    const SizedBox(height: 8),
                    if (selectedNumbers.isNotEmpty) ...[
                      Text(
                        'Selected (${selectedNumbers.length}): ${selectedNumbers.map((s) => "#${s.toString().padLeft(padLength, '0')}").join(', ')}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFFFFC107)),
                      ),
                    ],
                  ],

                  const SizedBox(height: 14),

                  // Price Breakdown
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.surfaceBorder),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Tickets selected', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                            Text('$effectiveQty tickets', style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 13)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total to pay', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
                            Text(
                              '$total ETB',
                              style: const TextStyle(color: Color(0xFFFFC107), fontWeight: FontWeight.w900, fontSize: 18),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Gold Button: Continue to Payment
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: effectiveQty <= 0
                          ? null
                          : () {
                              Navigator.pop(ctx);
                              _openPaymentModal(context, effectiveQty, total, isCustomMode ? selectedNumbers : null);
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFFC107),
                        foregroundColor: const Color(0xFF0B0F19),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text(
                        'Continue to Payment ($total ETB)',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Opens Screen 6: Payment Modal
  void _openPaymentModal(BuildContext context, int quantity, int total, List<int>? customNumbers) {
    String selectedMethod = 'Telebirr';

    final methods = [
      {'name': 'Telebirr', 'subtitle': 'Ethio telecom mobile money', 'icon': CupertinoIcons.money_dollar_circle_fill, 'color': const Color(0xFF0072CE)},
      {'name': 'CBE Birr', 'subtitle': 'Commercial Bank of Ethiopia', 'icon': CupertinoIcons.creditcard_fill, 'color': const Color(0xFF7B1FA2)},
      {'name': 'Wallet Balance', 'subtitle': 'Instant debit from player wallet', 'icon': CupertinoIcons.money_dollar, 'color': const Color(0xFFFFC107)},
      {'name': 'Bank Card', 'subtitle': 'Visa / Mastercard', 'icon': CupertinoIcons.creditcard, 'color': const Color(0xFFF59E0B)},
      {'name': 'Chapa', 'subtitle': 'Instant Ethiopian checkout', 'icon': CupertinoIcons.bolt_fill, 'color': const Color(0xFF10B981)},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setPayState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Nav
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => Navigator.pop(ctx),
                        child: const Icon(CupertinoIcons.back, color: AppColors.textPrimary, size: 20),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Payment Confirmation',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Mini Summary Header
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.surfaceBorder),
                    ),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LottoImage(
                            imageUrl: widget.draw.prizeImageUrl,
                            width: 48,
                            height: 48,
                            fit: BoxFit.cover,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.draw.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$quantity tickets • $total ETB ${customNumbers != null ? "(Custom Numbers)" : ""}',
                                style: const TextStyle(fontSize: 12, color: Color(0xFFFFC107), fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  const Text(
                    'Select Payment Method',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 10),

                  // Payment Methods List
                  Expanded(
                    child: ListView.separated(
                      itemCount: methods.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (ctx, index) {
                        final m = methods[index];
                        final isSelected = selectedMethod == m['name'];

                        return GestureDetector(
                          onTap: () {
                            setPayState(() {
                              selectedMethod = m['name'] as String;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF6C5DD3) : AppColors.surfaceBorder,
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: (m['color'] as Color).withValues(alpha: 0.15),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(m['icon'] as IconData, color: m['color'] as Color, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        m['name'] as String,
                                        style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14),
                                      ),
                                      Text(
                                        m['subtitle'] as String,
                                        style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: isSelected ? const Color(0xFF6C5DD3) : Colors.transparent,
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF6C5DD3) : AppColors.surfaceBorder,
                                      width: 2,
                                    ),
                                  ),
                                  child: isSelected
                                      ? const Icon(CupertinoIcons.checkmark, size: 12, color: Colors.white)
                                      : null,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // Gold Button: Confirm & Pay
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await _processPurchase(context, quantity, total, selectedMethod, customNumbers);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFFC107),
                        foregroundColor: const Color(0xFF0B0F19),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text(
                        'Pay $total ETB & Confirm Tickets',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _processPurchase(
    BuildContext context,
    int quantity,
    int total,
    String method,
    List<int>? customNumbers,
  ) async {
    final isChapa = method == 'Chapa';
    final paymentMethodParam = isChapa
        ? 'CHAPA'
        : (method == 'CBE Birr'
            ? 'CBE_BIRR'
            : (method == 'Wallet Balance' ? 'WALLET' : 'TELEBIRR'));

    final result = await widget.state.buyTickets(
      draw: _draw,
      quantity: quantity,
      paymentMethod: paymentMethodParam,
      selectedSequenceNumbers: customNumbers,
      returnUrl: 'https://checkout.chapa.co',
    );

    if (context.mounted) {
      if (result != null) {
        if (isChapa) {
          final checkoutUrl = result['checkoutUrl'] as String? ??
              'https://checkout.chapa.co/checkout/web/payment/${result['txRef'] ?? 'NL-CHAPA'}';
          final txRef = result['txRef'] as String? ?? 'NL-CHAPA-PENDING';
          _showChapaPending(
            context: context,
            quantity: quantity,
            total: total,
            checkoutUrl: checkoutUrl,
            txRef: txRef,
          );
        } else {
          final rawNumbers = result['ticketNumbers'] as List<dynamic>?;
          final ticketNumbers = rawNumbers?.map((e) => e.toString()).toList();
          _showPaymentSuccess(
            context: context,
            quantity: quantity,
            total: total,
            method: method,
            customNumbers: customNumbers,
            ticketNumbers: ticketNumbers,
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Purchase could not be completed. Please check your balance or try again.'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Future<void> _launchChapaUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri);
      }
    } catch (e) {
      debugPrint('[CHAPA] Error opening checkout URL: $e');
    }
  }

  void _showChapaPending({
    required BuildContext context,
    required int quantity,
    required int total,
    required String checkoutUrl,
    required String txRef,
  }) {
    Timer? pollTimer;
    bool isVerifying = false;
    bool isSimulating = false;

    // Automatically trigger opening the hosted Chapa payment gateway
    _launchChapaUrl(checkoutUrl);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            // Start automatic polling every 4 seconds
            pollTimer ??= Timer.periodic(const Duration(seconds: 4), (timer) async {
              try {
                final verifyRes = await widget.state.verifyPayment(txRef);
                final isSuccess = verifyRes['success'] == true || verifyRes['status'] == 'SUCCESS';
                if (isSuccess && dialogCtx.mounted) {
                  timer.cancel();
                  Navigator.pop(dialogCtx);
                  final rawNumbers = verifyRes['ticketNumbers'] as List<dynamic>?;
                  final ticketNumbers = rawNumbers?.map((e) => e.toString()).toList();
                  if (context.mounted) {
                    _showPaymentSuccess(
                      context: context,
                      quantity: quantity,
                      total: total,
                      method: 'Chapa',
                      ticketNumbers: ticketNumbers,
                    );
                  }
                }
              } catch (_) {}
            });

            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              contentPadding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              title: Column(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(CupertinoIcons.creditcard_fill, color: Color(0xFF10B981), size: 32),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Chapa Payment Gateway',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Order reserved for $quantity tickets ($total ETB). Complete your payment via Telebirr, CBE Birr, or Card on Chapa.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
                    ),
                    const SizedBox(height: 14),

                    // Primary Action: Open/Re-open Chapa Hosted Checkout
                    ElevatedButton.icon(
                      onPressed: () => _launchChapaUrl(checkoutUrl),
                      icon: const Icon(CupertinoIcons.arrow_up_right_square_fill, size: 17),
                      label: const Text(
                        'Proceed to Chapa Gateway (Pay Now)',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        minimumSize: const Size(double.infinity, 46),
                        elevation: 0,
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Secondary Action: Copy Payment Link
                    OutlinedButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: checkoutUrl));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Chapa payment link copied to clipboard!'),
                            backgroundColor: Color(0xFF10B981),
                            duration: Duration(seconds: 3),
                          ),
                        );
                      },
                      icon: const Icon(CupertinoIcons.link, size: 15, color: Color(0xFF10B981)),
                      label: const Text(
                        'Copy Chapa Payment Link',
                        style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF10B981), fontSize: 12),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF10B981)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        minimumSize: const Size(double.infinity, 38),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Transaction Reference Box with Copy
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.surfaceBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(CupertinoIcons.number, size: 15, color: AppColors.textMuted),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              txRef,
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 11,
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w700,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(CupertinoIcons.doc_on_clipboard, size: 16, color: Color(0xFF6C5DD3)),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: txRef));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Transaction reference copied!'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Strict Regulatory Notice
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.1),
                        border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(CupertinoIcons.exclamationmark_shield, color: Colors.amber, size: 18),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Strict NLA Regulatory Notice: Ticket numbers are withheld and will ONLY be released once Chapa confirms payment success.',
                              style: TextStyle(
                                color: Colors.amber,
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                                height: 1.35,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Active Manual Verification Button with Loading Indicator
                    ElevatedButton(
                      onPressed: (isVerifying || isSimulating)
                          ? null
                          : () async {
                              setDialogState(() => isVerifying = true);
                              final verifyRes = await widget.state.verifyPayment(txRef);
                              setDialogState(() => isVerifying = false);

                              final isSuccess = verifyRes['success'] == true || verifyRes['status'] == 'SUCCESS';
                              if (isSuccess && dialogCtx.mounted) {
                                pollTimer?.cancel();
                                Navigator.pop(dialogCtx);
                                final rawNumbers = verifyRes['ticketNumbers'] as List<dynamic>?;
                                final ticketNumbers = rawNumbers?.map((e) => e.toString()).toList();
                                if (context.mounted) {
                                  _showPaymentSuccess(
                                    context: context,
                                    quantity: quantity,
                                    total: total,
                                    method: 'Chapa',
                                    ticketNumbers: ticketNumbers,
                                  );
                                }
                              } else {
                                if (dialogCtx.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Payment verification still pending on Chapa. Please complete checkout and try again.'),
                                      backgroundColor: Colors.orangeAccent,
                                      duration: Duration(seconds: 3),
                                    ),
                                  );
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6C5DD3),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        minimumSize: const Size(double.infinity, 46),
                      ),
                      child: isVerifying
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.2),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(CupertinoIcons.checkmark_seal_fill, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'I Have Paid — Verify & Reveal',
                                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                ),
                              ],
                            ),
                    ),

                    const SizedBox(height: 10),

                    // Dev Test Instant Simulation Button
                    OutlinedButton.icon(
                      onPressed: (isVerifying || isSimulating)
                          ? null
                          : () async {
                              setDialogState(() => isSimulating = true);
                              final simRes = await widget.state.simulatePayment(txRef);
                              setDialogState(() => isSimulating = false);

                              final isSuccess = simRes['success'] == true || simRes['status'] == 'SUCCESS';
                              if (isSuccess && dialogCtx.mounted) {
                                pollTimer?.cancel();
                                Navigator.pop(dialogCtx);
                                final rawNumbers = simRes['ticketNumbers'] as List<dynamic>?;
                                final ticketNumbers = rawNumbers?.map((e) => e.toString()).toList();
                                if (context.mounted) {
                                  _showPaymentSuccess(
                                    context: context,
                                    quantity: quantity,
                                    total: total,
                                    method: 'Chapa (Dev Verified)',
                                    ticketNumbers: ticketNumbers,
                                  );
                                }
                              } else {
                                if (dialogCtx.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Simulation failed. Check that backend API is running.'),
                                      backgroundColor: Colors.redAccent,
                                    ),
                                  );
                                }
                              }
                            },
                      icon: isSimulating
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF59E0B)),
                            )
                          : const Icon(CupertinoIcons.bolt_fill, size: 16, color: Color(0xFFF59E0B)),
                      label: const Text(
                        '⚡ Simulate Chapa Payment (Dev Test)',
                        style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFF59E0B), fontSize: 12),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFF59E0B)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        minimumSize: const Size(double.infinity, 38),
                      ),
                    ),
                  ],
                ),
              ),
              actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              actions: [
                TextButton(
                  onPressed: () {
                    pollTimer?.cancel();
                    Navigator.pop(dialogCtx);
                    Navigator.pop(context);
                    widget.state.setNavIndex(3); // Go to My Tickets
                  },
                  style: TextButton.styleFrom(
                    minimumSize: const Size(double.infinity, 38),
                  ),
                  child: const Text(
                    'Check Status in My Tickets',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    ).then((_) {
      pollTimer?.cancel();
    });
  }

  void _showPaymentSuccess({
    required BuildContext context,
    required int quantity,
    required int total,
    required String method,
    List<int>? customNumbers,
    List<String>? ticketNumbers,
  }) {
    final displayNumbers = ticketNumbers ??
        (customNumbers != null && customNumbers.isNotEmpty
            ? customNumbers.map((n) => "#${n.toString().padLeft(4, '0')}").toList()
            : null);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        contentPadding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
        title: Column(
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(CupertinoIcons.checkmark_alt, color: Color(0xFF10B981), size: 34),
            ),
            const SizedBox(height: 12),
            const Text(
              'Tickets Confirmed!',
              style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w900, fontSize: 18),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Your purchase of $quantity tickets ($total ETB) via $method is confirmed and recorded under permit ${widget.draw.permitNumber}.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
              ),
              if (displayNumbers != null && displayNumbers.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Your Allocated Lucky Numbers:',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  alignment: WrapAlignment.center,
                  children: displayNumbers.map((numStr) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFC107).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFFC107).withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      numStr,
                      style: const TextStyle(
                        color: Color(0xFFFFC107),
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                      ),
                    ),
                  )).toList(),
                ),
              ],
            ],
          ),
        ),
        actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context); // Back to previous screen
              widget.state.setNavIndex(2); // Go to My Tickets
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFFC107),
              foregroundColor: const Color(0xFF0B0F19),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              minimumSize: const Size(double.infinity, 44),
            ),
            child: const Text('View My Tickets Wallet', style: TextStyle(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );
  }
}

class _DrawDetailCountdownWidget extends StatefulWidget {
  final String salesEndDate;
  const _DrawDetailCountdownWidget({required this.salesEndDate});
  @override
  State<_DrawDetailCountdownWidget> createState() => _DrawDetailCountdownWidgetState();
}

class _DrawDetailCountdownWidgetState extends State<_DrawDetailCountdownWidget> {
  Timer? _timer;
  Duration _timeLeft = const Duration(hours: 2, minutes: 14, seconds: 38);

  @override
  void initState() {
    super.initState();
    _calc();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) _calc();
    });
  }

  void _calc() {
    try {
      final endDate = DateTime.parse(widget.salesEndDate);
      final diff = endDate.difference(DateTime.now());
      setState(() {
        _timeLeft = diff.isNegative ? Duration.zero : diff;
      });
      return;
    } catch (_) {}
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
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(CupertinoIcons.flame_fill, color: Color(0xFFF59E0B), size: 16),
            SizedBox(width: 8),
            Text(
              'Final Tickets Available • Live Draw Soon',
              style: TextStyle(
                color: Color(0xFFFBBF24),
                fontWeight: FontWeight.w800,
                fontSize: 12,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      );
    }

    final days = _timeLeft.inDays;
    final hours = (_timeLeft.inHours % 24).toString().padLeft(2, '0');
    final minutes = (_timeLeft.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (_timeLeft.inSeconds % 60).toString().padLeft(2, '0');

    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (days > 0) ...[
            _buildBox(days.toString().padLeft(2, '0'), 'Days'),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 5, vertical: 6),
              child: Text(':', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
            ),
          ],
          _buildBox(hours, 'Hours'),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 5, vertical: 6),
            child: Text(':', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
          ),
          _buildBox(minutes, 'Minutes'),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 5, vertical: 6),
            child: Text(':', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
          ),
          _buildBox(seconds, 'Seconds'),
        ],
      ),
    );
  }

  Widget _buildBox(String val, String label) {
    return Column(
      children: [
        Container(
          width: 44,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.surfaceBorder),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Text(
            val,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w900,
              fontSize: 17,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
      ],
    );
  }
}

