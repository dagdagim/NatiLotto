class WinnerModel {
  final String id;
  final String drawId;
  final String drawNumber;
  final String drawTitle;
  final String prizeTitle;
  final String prizeImageUrl;
  final String winningTicketNumber;
  final String winnerDisplayName;
  final String drawDate;
  final String claimStatus;
  final String resultHash;
  final String snapshotHash;

  WinnerModel({
    required this.id,
    required this.drawId,
    required this.drawNumber,
    required this.drawTitle,
    required this.prizeTitle,
    required this.prizeImageUrl,
    required this.winningTicketNumber,
    required this.winnerDisplayName,
    required this.drawDate,
    required this.claimStatus,
    required this.resultHash,
    required this.snapshotHash,
  });

  factory WinnerModel.fromJson(Map<String, dynamic> json) {
    return WinnerModel(
      id: json['id'] as String,
      drawId: json['drawId'] as String,
      drawNumber: json['drawNumber'] as String,
      drawTitle: json['drawTitle'] as String,
      prizeTitle: json['prizeTitle'] as String,
      prizeImageUrl: json['prizeImageUrl'] as String? ?? '',
      winningTicketNumber: json['winningTicketNumber'] as String,
      winnerDisplayName: json['winnerDisplayName'] as String,
      drawDate: json['drawDate'] as String,
      claimStatus: json['claimStatus'] as String,
      resultHash: json['resultHash'] as String? ?? '',
      snapshotHash: json['snapshotHash'] as String? ?? '',
    );
  }
}
