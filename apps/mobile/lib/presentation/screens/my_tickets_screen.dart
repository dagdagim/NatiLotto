import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/ticket_model.dart';
import '../state/lotto_state.dart';
import '../widgets/lotto_image.dart';

class ProductTicketGroup {
  final String key;
  final String drawId;
  final String drawNumber;
  final String drawTitle;
  final String prizeTitle;
  final String prizeImageUrl;
  final String drawStatus;
  final String? drawDate;
  final int ticketPriceEtb;
  final List<TicketModel> tickets;

  ProductTicketGroup({
    required this.key,
    required this.drawId,
    required this.drawNumber,
    required this.drawTitle,
    required this.prizeTitle,
    required this.prizeImageUrl,
    required this.drawStatus,
    this.drawDate,
    required this.ticketPriceEtb,
    required this.tickets,
  });

  bool get isWinningGroup => tickets.any((t) => t.isWinningTicket || t.status == 'WON');
  int get winningCount => tickets.where((t) => t.isWinningTicket || t.status == 'WON').length;
  int get totalSpentEtb => tickets.length * ticketPriceEtb;
  bool get isCompleted => drawStatus == 'COMPLETED' || tickets.every((t) => t.drawStatus == 'COMPLETED' || t.status == 'WON' || t.status == 'LOST');
}

class MyTicketsScreen extends StatefulWidget {
  final LottoState state;

  const MyTicketsScreen({super.key, required this.state});

  @override
  State<MyTicketsScreen> createState() => _MyTicketsScreenState();
}

class _MyTicketsScreenState extends State<MyTicketsScreen> {
  String selectedFilter = 'Active';

  final List<String> filters = ['Active', 'Winning', 'Completed', 'All'];

  List<ProductTicketGroup> _getGroupedProducts() {
    final tickets = widget.state.tickets;
    final Map<String, ProductTicketGroup> groups = {};

    for (final t in tickets) {
      final key = t.drawId.isNotEmpty
          ? t.drawId
          : (t.drawNumber.isNotEmpty ? t.drawNumber : t.drawTitle);

      if (!groups.containsKey(key)) {
        groups[key] = ProductTicketGroup(
          key: key,
          drawId: t.drawId,
          drawNumber: t.drawNumber,
          drawTitle: t.drawTitle,
          prizeTitle: t.prizeTitle,
          prizeImageUrl: t.prizeImageUrl,
          drawStatus: t.drawStatus ?? 'OPEN',
          drawDate: t.drawDate,
          ticketPriceEtb: t.ticketPriceEtb,
          tickets: [],
        );
      }
      groups[key]!.tickets.add(t);
    }

    final allGroups = groups.values.toList();

    // Filter groups according to selected tab
    if (selectedFilter == 'All') return allGroups;

    if (selectedFilter == 'Active') {
      return allGroups.where((g) => !g.isCompleted).toList();
    }

    if (selectedFilter == 'Winning') {
      return allGroups.where((g) => g.isWinningGroup).toList();
    }

    if (selectedFilter == 'Completed') {
      return allGroups.where((g) => g.isCompleted).toList();
    }

    return allGroups;
  }

  @override
  Widget build(BuildContext context) {
    final allTickets = widget.state.tickets;
    final activeCount = allTickets.where((t) => t.drawStatus != 'COMPLETED' && t.status != 'WON' && t.status != 'LOST').length;
    final winningCount = allTickets.where((t) => t.isWinningTicket || t.status == 'WON').length;
    final groupedProducts = _getGroupedProducts();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'My Tickets',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: AppColors.textPrimary,
            letterSpacing: -0.4,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.arrow_clockwise, color: AppColors.textPrimary, size: 20),
            onPressed: () => widget.state.loadInitialData(),
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Stats Summary Header (Overflow-safe)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(CupertinoIcons.ticket_fill, color: AppColors.textAccent, size: 16),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '$activeCount',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const Text(
                                'Active Entries',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: winningCount > 0
                          ? const Color(0xFFFEF3C7)
                          : AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: winningCount > 0
                            ? const Color(0xFFFDE68A)
                            : AppColors.surfaceBorder,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: winningCount > 0
                                ? const Color(0xFFF59E0B)
                                : AppColors.surfaceElevated,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            CupertinoIcons.rosette,
                            color: winningCount > 0 ? Colors.white : AppColors.textMuted,
                            size: 16,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '$winningCount',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  color: winningCount > 0 ? const Color(0xFFB45309) : AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                winningCount > 0 ? 'Won Prizes 🎉' : 'Wins',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: winningCount > 0 ? const Color(0xFFB45309) : AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 2. Segmented Filter Pills
          Container(
            height: 42,
            margin: const EdgeInsets.only(top: 8, bottom: 8),
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
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF0F172A) : AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF0F172A) : AppColors.surfaceBorder,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isSelected
                              ? Colors.black.withValues(alpha: 0.08)
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

          // 3. Product Grouped Tickets List
          Expanded(
            child: groupedProducts.isEmpty
                ? _buildEmptyState()
                : RefreshIndicator(
                    onRefresh: widget.state.loadInitialData,
                    color: AppColors.primary,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      itemCount: groupedProducts.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 14),
                      itemBuilder: (ctx, index) {
                        final group = groupedProducts[index];
                        return _buildProductGroupCard(group);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductGroupCard(ProductTicketGroup group) {
    final isWinner = group.isWinningGroup;
    final ticketCount = group.tickets.length;

    return GestureDetector(
      onTap: () => _showGroupTicketsModal(group),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isWinner ? const Color(0xFFF59E0B) : AppColors.surfaceBorder,
            width: isWinner ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isWinner
                  ? const Color(0xFFF59E0B).withValues(alpha: 0.12)
                  : Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // If Winner: Celebratory Banner
            if (isWinner)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: const BoxDecoration(
                  color: Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
                ),
                child: Row(
                  children: [
                    const Text('🎉', style: TextStyle(fontSize: 14)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'WINNER! You won in this draw! (${group.winningCount} winning ticket${group.winningCount > 1 ? 's' : ''})',
                        style: const TextStyle(
                          color: Color(0xFF92400E),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

            // Upper Section: Prize info & Status
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: LottoImage(
                      imageUrl: group.prizeImageUrl,
                      width: 58,
                      height: 58,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                group.drawNumber.isNotEmpty ? 'Draw ${group.drawNumber}' : 'National Draw',
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            _buildGroupStatusPill(group),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          group.drawTitle.isNotEmpty ? group.drawTitle : group.prizeTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '$ticketCount Ticket${ticketCount > 1 ? 's' : ''}',
                                style: const TextStyle(
                                  color: AppColors.textAccent,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                'Total: ${group.totalSpentEtb} ETB',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
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

            // Perforated Ticket Divider with side notches
            _buildPerforatedDivider(),

            // Lower Section: Tap CTA to reveal all ticket numbers
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'YOUR TICKETS',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          group.tickets.take(2).map((t) => t.ticketNumber).join(', ') +
                              (ticketCount > 2 ? ' +${ticketCount - 2} more' : ''),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontFamily: 'monospace',
                            color: isWinner ? const Color(0xFFD97706) : AppColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => _showGroupTicketsModal(group),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isWinner ? const Color(0xFFF59E0B) : const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'View All ($ticketCount)',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(width: 4),
                        const Icon(CupertinoIcons.chevron_right, size: 12),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGroupStatusPill(ProductTicketGroup group) {
    if (group.isWinningGroup) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text(
          'WON 🎉',
          style: TextStyle(color: Color(0xFFB45309), fontSize: 10, fontWeight: FontWeight.w800),
        ),
      );
    }

    if (group.isCompleted) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text(
          'Drawn',
          style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w700),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFD1FAE5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Text(
        'ACTIVE',
        style: TextStyle(color: Color(0xFF059669), fontSize: 10, fontWeight: FontWeight.w800),
      ),
    );
  }

  Widget _buildPerforatedDivider() {
    return Row(
      children: [
        // Left notch
        Container(
          width: 10,
          height: 16,
          decoration: const BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.horizontal(right: Radius.circular(10)),
          ),
        ),
        // Dashed divider line
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final boxWidth = constraints.constrainWidth();
                const dashWidth = 5.0;
                const dashHeight = 1.0;
                final dashCount = (boxWidth / (2 * dashWidth)).floor();
                return Flex(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  direction: Axis.horizontal,
                  children: List.generate(dashCount > 0 ? dashCount : 1, (_) {
                    return const SizedBox(
                      width: dashWidth,
                      height: dashHeight,
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: Color(0xFFCBD5E1)),
                      ),
                    );
                  }),
                );
              },
            ),
          ),
        ),
        // Right notch
        Container(
          width: 10,
          height: 16,
          decoration: const BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.horizontal(left: Radius.circular(10)),
          ),
        ),
      ],
    );
  }

  void _showGroupTicketsModal(ProductTicketGroup group) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Modal Header with Prize Image and Title
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: LottoImage(
                      imageUrl: group.prizeImageUrl,
                      width: 50,
                      height: 50,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          group.drawTitle.isNotEmpty ? group.drawTitle : group.prizeTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Draw ${group.drawNumber} • ${group.tickets.length} Registered Tickets',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1, color: AppColors.surfaceBorder),
              const SizedBox(height: 12),

              const Text(
                'YOUR TICKET NUMBERS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMuted,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),

              // Scrollable List of All Tickets
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: group.tickets.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, idx) {
                    final ticket = group.tickets[idx];
                    final isWon = ticket.isWinningTicket || ticket.status == 'WON';

                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isWon ? const Color(0xFFFEF3C7) : AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isWon ? const Color(0xFFFDE68A) : AppColors.surfaceBorder,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: isWon ? const Color(0xFFF59E0B) : Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${idx + 1}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: isWon ? Colors.white : AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ticket.ticketNumber,
                                  style: TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.0,
                                    color: isWon ? const Color(0xFF92400E) : AppColors.textPrimary,
                                  ),
                                ),
                                Text(
                                  'Serial #${ticket.sequenceNumber} • ${ticket.ticketPriceEtb} ETB',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textMuted,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isWon)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'WINNER 🎉',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            )
                          else
                            const Icon(CupertinoIcons.checkmark_seal_fill, size: 16, color: Color(0xFF059669)),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        );
      },
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
              child: const Icon(CupertinoIcons.ticket, size: 28, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            Text(
              'No $selectedFilter Tickets',
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Pick a lucky number in our active draws to win cars, phones, and cash prizes.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                widget.state.loadInitialData();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: const Color(0xFF0F172A),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text(
                'Explore Live Draws',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
