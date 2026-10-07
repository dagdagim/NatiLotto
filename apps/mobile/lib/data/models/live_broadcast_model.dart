import 'dart:convert';
import 'dart:typed_data';

class LiveBroadcastModel {
  final String drawId;
  final String drawTitle;
  final String drawNumber;
  final String prizeImageUrl;
  final String scheduledDate;
  final String scheduledTime;
  final String announcementTitle;
  final String announcementDetails;
  final String permitNumber;
  final String status;
  final bool isWebcamLive;
  final String? winningTicketNumber;
  final String? winnerName;
  final int? videoStartedAt;
  final String? currentWebcamFrame;
  final String? tiktokLiveUrl;

  const LiveBroadcastModel({
    required this.drawId,
    required this.drawTitle,
    required this.drawNumber,
    required this.prizeImageUrl,
    required this.scheduledDate,
    required this.scheduledTime,
    required this.announcementTitle,
    required this.announcementDetails,
    required this.permitNumber,
    required this.status,
    required this.isWebcamLive,
    this.winningTicketNumber,
    this.winnerName,
    this.videoStartedAt,
    this.currentWebcamFrame,
    this.tiktokLiveUrl,
  });

  factory LiveBroadcastModel.fromJson(Map<String, dynamic> json) {
    return LiveBroadcastModel(
      drawId: json['drawId']?.toString() ?? '',
      drawTitle: json['drawTitle']?.toString() ?? '',
      drawNumber: json['drawNumber']?.toString() ?? '',
      prizeImageUrl: json['prizeImageUrl']?.toString() ?? '',
      scheduledDate: json['scheduledDate']?.toString() ?? '',
      scheduledTime: json['scheduledTime']?.toString() ?? '',
      announcementTitle: json['announcementTitle']?.toString() ??
          'Grand Official Live Draw - Physical Manual Draw On Camera with NLA Oversight',
      announcementDetails: json['announcementDetails']?.toString() ??
          'Broadcasted live on TikTok (@natilotto) directly from NATI LOTTO Central Studio under FDRE NLA Permit.',
      permitNumber: json['permitNumber']?.toString() ?? 'NL-ET-2026-0941',
      status: json['status']?.toString() ?? 'SCHEDULED',
      isWebcamLive: json['isWebcamLive'] == true,
      winningTicketNumber: json['winningTicketNumber']?.toString(),
      winnerName: json['winnerName']?.toString(),
      videoStartedAt: json['videoStartedAt'] is int
          ? json['videoStartedAt'] as int
          : int.tryParse(json['videoStartedAt']?.toString() ?? ''),
      currentWebcamFrame: json['currentWebcamFrame']?.toString() ??
          json['latestFrame']?.toString() ??
          json['frame']?.toString(),
      tiktokLiveUrl: json['tiktokLiveUrl']?.toString() ?? 'https://www.tiktok.com/@natilotto/live',
    );
  }

  bool get isLive => status == 'LIVE' || isWebcamLive;
  bool get hasWinner => winningTicketNumber != null && winningTicketNumber!.trim().isNotEmpty;

  Uint8List? get frameBytes {
    if (currentWebcamFrame == null || currentWebcamFrame!.trim().isEmpty) return null;
    try {
      String b64 = currentWebcamFrame!.trim();
      if (b64.contains(',')) {
        b64 = b64.split(',').last;
      }
      return base64Decode(b64.trim());
    } catch (_) {
      return null;
    }
  }
}
