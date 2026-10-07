class TicketModel {
  final String id;
  final String ticketNumber;
  final int sequenceNumber;
  final String drawId;
  final String drawNumber;
  final String drawTitle;
  final String prizeTitle;
  final String prizeImageUrl;
  final int ticketPriceEtb;
  final String status;
  final bool isWinningTicket;
  final String qrPayload;
  final String hashSignature;
  final String createdAt;
  final String? drawDate;
  final String? drawStatus;

  TicketModel({
    required this.id,
    required this.ticketNumber,
    required this.sequenceNumber,
    required this.drawId,
    required this.drawNumber,
    required this.drawTitle,
    required this.prizeTitle,
    required this.prizeImageUrl,
    required this.ticketPriceEtb,
    required this.status,
    required this.isWinningTicket,
    required this.qrPayload,
    required this.hashSignature,
    required this.createdAt,
    this.drawDate,
    this.drawStatus,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'] as String,
      ticketNumber: json['ticketNumber'] as String,
      sequenceNumber: (json['sequenceNumber'] as num).toInt(),
      drawId: json['drawId'] as String,
      drawNumber: json['drawNumber'] as String,
      drawTitle: json['drawTitle'] as String,
      prizeTitle: json['prizeTitle'] as String,
      prizeImageUrl: json['prizeImageUrl'] as String? ?? '',
      ticketPriceEtb: (json['ticketPriceEtb'] as num).toInt(),
      status: json['status'] as String,
      isWinningTicket: json['isWinningTicket'] as bool? ?? false,
      qrPayload: json['qrPayload'] as String? ?? '',
      hashSignature: json['hashSignature'] as String? ?? '',
      createdAt: json['createdAt'] as String,
      drawDate: json['drawDate'] as String?,
      drawStatus: json['drawStatus'] as String?,
    );
  }
}
