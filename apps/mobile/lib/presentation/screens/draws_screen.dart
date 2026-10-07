import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/draw_model.dart';
import '../state/lotto_state.dart';
import 'draw_details_screen.dart';
import '../widgets/lotto_image.dart';

class DrawsScreen extends StatefulWidget {
  final LottoState state;

  const DrawsScreen({super.key, required this.state});

  @override
  State<DrawsScreen> createState() => _DrawsScreenState();
}

class _DrawsScreenState extends State<DrawsScreen> {
  String selectedFilter = 'All Draws';
  String searchQuery = '';
  final TextEditingController searchController = TextEditingController();

  final List<String> filters = ['All Draws', 'Ending Soon', 'High Value', 'Sold Out / Past'];

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;

    // Base draws from state or fallback
    final baseDraws = state.draws.isNotEmpty ? state.draws : <DrawModel>[];

    final filteredDraws = baseDraws.where((d) {
      final total = d.totalTickets > 0 ? d.totalTickets : 1000;
      final sold = d.soldTickets.clamp(0, total);
      final remaining = (total - sold).clamp(0, total);
      final isSoldOut = total > 0 && (remaining <= 0 || sold >= total);
      final isClosed = isSoldOut || d.isCompleted;

      if (selectedFilter == 'All Draws') {
        return true;
      } else if (selectedFilter == 'Ending Soon') {
        return !isClosed && d.remainingTickets < 400;
      } else if (selectedFilter == 'High Value') {
        return !isClosed && d.prizeValueEtb >= 100000;
      } else if (selectedFilter == 'Sold Out / Past') {
        return isClosed;
      }
      return true;
    }).where((d) {
      if (searchQuery.trim().isEmpty) return true;
      final q = searchQuery.toLowerCase();
      return d.title.toLowerCase().contains(q) ||
          d.drawNumber.toLowerCase().contains(q) ||
          d.description.toLowerCase().contains(q);
    }).toList()
      ..sort((a, b) {
        // Prioritize available open draws at the top
        final aAvailable = a.remainingTickets > 0 && !a.isCompleted;
        final bAvailable = b.remainingTickets > 0 && !b.isCompleted;
        if (aAvailable && !bAvailable) return -1;
        if (!aAvailable && bAvailable) return 1;
        return 0;
      });

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Row(
          children: [
            const Text(
              'Explore Draws',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${filteredDraws.length}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textAccent,
                ),
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // 1. Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Container(
              height: 46,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.surfaceBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: TextField(
                controller: searchController,
                onChanged: (val) {
                  setState(() {
                    searchQuery = val;
                  });
                },
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
                decoration: InputDecoration(
                  hintText: 'Search prizes, draw numbers...',
                  hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                  prefixIcon: const Icon(CupertinoIcons.search, color: AppColors.textMuted, size: 18),
                  suffixIcon: searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(CupertinoIcons.clear_circled_solid, size: 16, color: AppColors.textMuted),
                          onPressed: () {
                            searchController.clear();
                            setState(() {
                              searchQuery = '';
                            });
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ),

          // 2. Filter Pills
          Container(
            height: 42,
            margin: const EdgeInsets.only(top: 4, bottom: 8),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, index) {
                final filter = filters[index];
                final isSelected = filter == selectedFilter;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      selectedFilter = filter;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF0F172A) : AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF0F172A) : AppColors.surfaceBorder,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isSelected
                              ? Colors.black.withValues(alpha: 0.1)
                              : Colors.black.withValues(alpha: 0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      filter,
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textSecondary,
                        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // 3. Draw Cards List
          Expanded(
            child: filteredDraws.isEmpty
                ? _buildEmptyState()
                : RefreshIndicator(
                    onRefresh: widget.state.loadInitialData,
                    color: AppColors.primary,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      itemCount: filteredDraws.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 16),
                      itemBuilder: (ctx, index) {
                        final draw = filteredDraws[index];
                        return _buildDrawCard(context, draw);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawCard(BuildContext context, DrawModel draw) {
    final total = draw.totalTickets > 0 ? draw.totalTickets : 1000;
    final sold = draw.soldTickets.clamp(0, total);
    final remaining = (total - sold).clamp(0, total);
    final pct = total > 0 ? (sold / total).clamp(0.0, 1.0) : 0.0;
    final isSoldOut = total > 0 && (remaining <= 0 || sold >= total);

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
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
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
            // Top Image with Overlays
            SizedBox(
              height: 160,
              width: double.infinity,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: LottoImage(
                      imageUrl: draw.prizeImageUrl,
                      width: double.infinity,
                      height: 160,
                      fit: BoxFit.cover,
                    ),
                  ),

                  // Top-Left Status Badge
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isSoldOut
                            ? const Color(0xFFEF4444)
                            : (draw.status == 'CLOSING'
                                ? const Color(0xFFF59E0B)
                                : Colors.black.withValues(alpha: 0.7)),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                      child: Text(
                        isSoldOut
                            ? 'SOLD OUT'
                            : (draw.isCompleted
                                ? 'COMPLETED'
                                : (draw.status == 'CLOSING' ? 'CLOSING SOON' : 'OPEN DRAW')),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ),
                  ),

                  // Top-Right Live Countdown Badge
                  if (!isSoldOut)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: _DrawCountdownBadge(salesEndDate: draw.salesEndDate),
                    ),
                ],
              ),
            ),

            // Card Body
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    draw.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 4),

                  // Draw Reference
                  Text(
                    'Draw ${draw.drawNumber} • Permit ${draw.permitNumber}',
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Pricing & Value Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'TICKET PRICE',
                            style: TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                '${draw.ticketPriceEtb}',
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 20,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Text(
                                'ETB',
                                style: TextStyle(
                                  color: AppColors.textAccent,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.surfaceBorder),
                        ),
                        child: Text(
                          'Prize Value: ${draw.prizeValueEtb.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')} ETB',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Progress Bar & Ticket Counts
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: pct,
                      minHeight: 7,
                      backgroundColor: AppColors.surfaceBorder,
                      color: isSoldOut ? const Color(0xFFEF4444) : AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 6),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$sold / $total sold',
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        isSoldOut ? '0 left' : '$remaining left',
                        style: TextStyle(
                          color: isSoldOut ? const Color(0xFFEF4444) : AppColors.textPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
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
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: const Icon(CupertinoIcons.search, size: 28, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Draws Found',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Try adjusting your search terms or filter selection.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            if (searchQuery.isNotEmpty) ...[
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  searchController.clear();
                  setState(() {
                    searchQuery = '';
                    selectedFilter = 'All Draws';
                  });
                },
                child: const Text('Reset Search & Filters'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Standalone isolated countdown chip to avoid rebuilding the parent DrawsScreen list.
class _DrawCountdownBadge extends StatefulWidget {
  final String salesEndDate;

  const _DrawCountdownBadge({required this.salesEndDate});

  @override
  State<_DrawCountdownBadge> createState() => _DrawCountdownBadgeState();
}

class _DrawCountdownBadgeState extends State<_DrawCountdownBadge> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String text = 'Ending Soon';
    Color color = Colors.black.withValues(alpha: 0.7);

    try {
      final end = DateTime.parse(widget.salesEndDate);
      final diff = end.difference(DateTime.now());
      if (diff.isNegative) {
        text = 'Final Call';
        color = const Color(0xFFF59E0B);
      } else if (diff.inDays > 1) {
        text = '${diff.inDays}d left';
        color = Colors.black.withValues(alpha: 0.7);
      } else if (diff.inDays == 1) {
        text = '1d left';
        color = const Color(0xFFF59E0B);
      } else {
        final h = diff.inHours.toString().padLeft(2, '0');
        final m = (diff.inMinutes % 60).toString().padLeft(2, '0');
        final s = (diff.inSeconds % 60).toString().padLeft(2, '0');
        text = '$h:$m:$s';
        color = diff.inHours < 2 ? const Color(0xFFDC2626) : const Color(0xFF0F172A);
      }
    } catch (_) {
      text = 'Active';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 6,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(CupertinoIcons.stopwatch, size: 11, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}
