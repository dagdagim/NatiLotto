class FeaturedMediaModel {
  final String id;
  final String type; // 'WINNER' or 'PROMOTION'
  final String title;
  final String description;
  final String badge;
  final String videoUrl;
  final String thumbnailUrl;
  final String? directVideoUrl;
  final String? prizeImageUrl;
  final String? winnerName;
  final String? prizeTitle;
  final String? winningTicketNumber;
  final String? drawNumber;
  final String? handoverLocation;
  final String? publishedAt;

  FeaturedMediaModel({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.badge,
    required this.videoUrl,
    required this.thumbnailUrl,
    this.directVideoUrl,
    this.prizeImageUrl,
    this.winnerName,
    this.prizeTitle,
    this.winningTicketNumber,
    this.drawNumber,
    this.handoverLocation,
    this.publishedAt,
  });

  factory FeaturedMediaModel.fromWinnerJson(
    Map<String, dynamic> json, [
    String Function(String?)? urlResolver,
  ]) {
    final resolve = urlResolver ?? ((u) => u ?? '');
    final direct = json['directVideoUrl'] as String?;
    final vid = json['videoUrl'] as String? ?? '';
    final chosenVideo = (direct != null && direct.isNotEmpty) ? resolve(direct) : resolve(vid);

    return FeaturedMediaModel(
      id: json['id'] as String? ?? 'winner-video',
      type: 'WINNER',
      title: json['prizeTitle'] != null && json['winnerName'] != null
          ? '${json['prizeTitle']} Handover to ${json['winnerName']}'
          : (json['drawTitle'] as String? ?? 'Winner Handover Celebration'),
      description: json['testimonialQuote'] as String? ??
          'Official prize handover certified under National Lottery Administration oversight.',
      badge: 'Recent Winner',
      videoUrl: chosenVideo,
      directVideoUrl: direct != null ? resolve(direct) : null,
      thumbnailUrl: resolve(
        json['thumbnailUrl'] as String? ?? (json['prizeImageUrl'] as String? ?? ''),
      ),
      prizeImageUrl: resolve(json['prizeImageUrl'] as String?),
      winnerName: json['winnerName'] as String?,
      prizeTitle: json['prizeTitle'] as String?,
      winningTicketNumber: json['winningTicketNumber'] as String?,
      drawNumber: json['drawNumber'] as String?,
      handoverLocation: json['handoverLocation'] as String?,
      publishedAt: json['publishedAt'] as String?,
    );
  }

  factory FeaturedMediaModel.fromPromotionJson(
    Map<String, dynamic> json, [
    String Function(String?)? urlResolver,
  ]) {
    final resolve = urlResolver ?? ((u) => u ?? '');
    final direct = json['directVideoUrl'] as String?;
    final vid = json['videoUrl'] as String? ?? '';
    final chosenVideo = (direct != null && direct.isNotEmpty) ? resolve(direct) : resolve(vid);

    return FeaturedMediaModel(
      id: json['id'] as String? ?? 'promo-video',
      type: 'PROMOTION',
      title: json['title'] as String? ?? 'Official Promotion',
      description: json['description'] as String? ??
          'Play licensed national lottery draws starting from only 5 ETB! 100% tax settled & NLA verified.',
      badge: json['campaignBadge'] as String? ?? 'Official Promotion',
      videoUrl: chosenVideo,
      directVideoUrl: direct != null ? resolve(direct) : null,
      thumbnailUrl: resolve(json['thumbnailUrl'] as String? ?? ''),
      prizeImageUrl: resolve(json['thumbnailUrl'] as String?),
      publishedAt: json['publishedAt'] as String?,
    );
  }
}
