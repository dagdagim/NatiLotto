class DrawModel {
  final String id;
  final String drawNumber;
  final String title;
  final String description;
  final int ticketPriceEtb;
  final int totalTickets;
  final int soldTickets;
  final int maxTicketsPerUser;
  final String status;
  final String salesEndDate;
  final String drawDate;
  final String permitNumber;
  final bool isFeatured;
  final String prizeTitle;
  final String prizeImageUrl;
  final List<String> galleryImages;
  final int prizeValueEtb;
  final Map<String, String> specifications;
  final List<String> rules;
  final String? snapshotHash;
  final String? resultHash;
  final String? winningTicketNumber;
  final String? videoUrl;

  DrawModel({
    required this.id,
    required this.drawNumber,
    required this.title,
    required this.description,
    required this.ticketPriceEtb,
    required this.totalTickets,
    required this.soldTickets,
    required this.maxTicketsPerUser,
    required this.status,
    required this.salesEndDate,
    required this.drawDate,
    required this.permitNumber,
    required this.isFeatured,
    required this.prizeTitle,
    required this.prizeImageUrl,
    this.galleryImages = const [],
    required this.prizeValueEtb,
    required this.specifications,
    required this.rules,
    this.snapshotHash,
    this.resultHash,
    this.winningTicketNumber,
    this.videoUrl,
  });

  int get remainingTickets {
    final rem = totalTickets - soldTickets;
    return rem < 0 ? 0 : rem;
  }
  double get progressPercentage => totalTickets > 0 ? (soldTickets / totalTickets).clamp(0.0, 1.0) : 0.0;
  bool get isCompleted => status == 'COMPLETED' || winningTicketNumber != null;

  factory DrawModel.fromJson(Map<String, dynamic> json) {
    final prize = json['prize'] as Map<String, dynamic>?;
    final images = prize?['images'] as List<dynamic>?;
    final primaryImageUrl = (images != null && images.isNotEmpty)
        ? images[0]['url'] as String? ?? ''
        : (prize?['imageUrl'] as String? ?? '');

    final allGalleryImages = <String>[];
    if (images != null) {
      for (final img in images) {
        final url = (img is Map ? img['url'] : img)?.toString() ?? '';
        if (url.isNotEmpty && !allGalleryImages.contains(url)) {
          allGalleryImages.add(url);
        }
      }
    }
    if (allGalleryImages.isEmpty && primaryImageUrl.isNotEmpty) {
      allGalleryImages.add(primaryImageUrl);
    }

    return DrawModel(
      id: json['id'] as String,
      drawNumber: json['drawNumber'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      ticketPriceEtb: (json['ticketPriceEtb'] as num?)?.toInt() ?? 0,
      totalTickets: (json['totalTickets'] as num?)?.toInt() ?? 0,
      soldTickets: (json['soldTickets'] as num?)?.toInt() ?? 0,
      maxTicketsPerUser: (json['maxTicketsPerUser'] as num?)?.toInt() ?? 25,
      status: json['status'] as String,
      salesEndDate: json['salesEndDate'] as String,
      drawDate: json['drawDate'] as String,
      permitNumber: json['permitNumber'] as String? ?? 'NL-ET-2026-0892',
      isFeatured: json['isFeatured'] as bool? ?? false,
      prizeTitle: prize?['title'] as String? ?? json['title'] as String,
      prizeImageUrl: primaryImageUrl,
      galleryImages: allGalleryImages,
      prizeValueEtb: (prize?['retailValueEtb'] as num?)?.toInt() ?? 100000,
      specifications: (prize?['specifications'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v.toString()),
          ) ??
          {},
      rules: (json['rules'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      snapshotHash: json['snapshotHash'] as String?,
      resultHash: json['resultHash'] as String?,
      winningTicketNumber: json['result']?['winningTicketNumber']?.toString() ?? json['winningTicketNumber']?.toString(),
      videoUrl: () {
        final direct = json['videoUrl']?.toString().trim();
        if (direct != null && direct.isNotEmpty) return direct;
        final prizeDirect = prize?['videoUrl']?.toString().trim();
        if (prizeDirect != null && prizeDirect.isNotEmpty) return prizeDirect;
        final specs = prize?['specifications'] as Map<String, dynamic>?;
        if (specs != null) {
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
            final v = specs[key]?.toString().trim();
            if (v != null && v.isNotEmpty) return v;
          }
          for (final entry in specs.entries) {
            if (entry.key.toLowerCase().contains('video') && entry.value?.toString().trim().isNotEmpty == true) {
              return entry.value.toString().trim();
            }
          }
        }
        return null;
      }(),
    );
  }

  factory DrawModel.mock({
    required String id,
    required String title,
    required String description,
    required int ticketPriceEtb,
    required int totalTickets,
    required int soldTickets,
    String status = 'OPEN',
    bool isFeatured = false,
    String prizeImageUrl = '',
    List<String>? galleryImages,
    int prizeValueEtb = 100000,
    String? drawDate,
    String? winningTicketNumber,
    String? videoUrl,
  }) {
    return DrawModel(
      id: id,
      drawNumber: id,
      title: title,
      description: description,
      ticketPriceEtb: ticketPriceEtb,
      totalTickets: totalTickets,
      soldTickets: soldTickets,
      maxTicketsPerUser: 25,
      status: status,
      salesEndDate: '2026-09-30T23:59:59Z',
      drawDate: drawDate ?? '2026-09-30T18:00:00Z',
      permitNumber: 'NL-ET-2026-0892',
      isFeatured: isFeatured,
      prizeTitle: title,
      prizeImageUrl: prizeImageUrl,
      galleryImages: galleryImages ?? (prizeImageUrl.isNotEmpty ? [prizeImageUrl] : []),
      prizeValueEtb: prizeValueEtb,
      specifications: {'Display': 'Dynamic AMOLED', 'Storage': '256GB'},
      rules: ['18+ only', 'Permit verified'],
      winningTicketNumber: winningTicketNumber,
      videoUrl: videoUrl,
    );
  }
}
