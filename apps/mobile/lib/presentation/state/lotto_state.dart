import 'package:flutter/material.dart';
import '../../core/localization/app_localizations.dart';
import '../../data/models/draw_model.dart';
import '../../data/models/ticket_model.dart';
import '../../data/models/winner_model.dart';
import '../../data/models/user_model.dart';
import '../../data/models/live_broadcast_model.dart';
import '../../data/models/featured_media_model.dart';
import '../../data/repositories/lotto_repository.dart';

class LottoState extends ChangeNotifier {
  final LottoRepository repository;

  AppLanguage _language = AppLanguage.en;
  int _currentIndex = 0;
  bool _isLoading = false;
  bool _hasSeenOnboarding = false;
  bool _isLoggedIn = false;
  UserModel? _currentUser;

  List<DrawModel> _draws = [];
  List<TicketModel> _tickets = [];
  List<WinnerModel> _winners = [];
  LiveBroadcastModel? _liveBroadcastPost;
  FeaturedMediaModel? _latestMediaPost;

  LottoState({required this.repository}) {
    loadInitialData();
  }

  AppLanguage get language => _language;
  int get currentIndex => _currentIndex;
  bool get isLoading => _isLoading;
  bool get hasSeenOnboarding => _hasSeenOnboarding;
  bool get isLoggedIn => _isLoggedIn;
  UserModel? get currentUser => _currentUser;

  List<DrawModel> get draws => _draws;
  List<TicketModel> get tickets => _tickets;
  List<WinnerModel> get winners => _winners;
  LiveBroadcastModel? get liveBroadcastPost => _liveBroadcastPost;
  FeaturedMediaModel? get latestMediaPost => _latestMediaPost;

  DrawModel? get featuredDraw {
    try {
      return _draws.firstWhere((d) => d.isFeatured && !d.isCompleted && d.remainingTickets > 0);
    } catch (_) {
      try {
        return _draws.firstWhere((d) => !d.isCompleted && d.remainingTickets > 0);
      } catch (_) {
        try {
          return _draws.firstWhere((d) => d.isFeatured);
        } catch (_) {
          return _draws.isNotEmpty ? _draws.first : null;
        }
      }
    }
  }

  AppLocalizations get loc => AppLocalizations(_language);

  void setLanguage(AppLanguage lang) {
    _language = lang;
    notifyListeners();
  }

  void toggleLanguage() {
    _language = _language == AppLanguage.en ? AppLanguage.am : AppLanguage.en;
    notifyListeners();
  }

  void setNavIndex(int index) {
    _currentIndex = index;
    notifyListeners();
  }

  void completeOnboarding() {
    _hasSeenOnboarding = true;
    notifyListeners();
  }

  Future<bool> login(String phone, {String? password}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = await repository.login(phone: phone, password: password);
      _currentUser = user;
      _isLoggedIn = true;

      // Load user-specific tickets from backend
      final userTickets = await repository.getUserTickets(user.id);
      if (userTickets.isNotEmpty) {
        _tickets = userTickets;
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void logout() {
    _isLoggedIn = false;
    _currentUser = null;
    notifyListeners();
  }

  void topUpWallet(int amount) {
    if (_currentUser != null) {
      final currentBalance = _currentUser!.walletBalanceEtb;
      _currentUser = _currentUser!.copyWith(walletBalanceEtb: currentBalance + amount);
      notifyListeners();
    }
  }

  Future<void> loadInitialData() async {
    _isLoading = true;
    notifyListeners();

    final results = await Future.wait([
      repository.getDraws(),
      repository.getUserTickets(_currentUser?.id),
      repository.getWinners(),
      repository.getLiveBroadcastPost(),
      repository.getLatestMediaPost(),
    ]);

    _draws = results[0] as List<DrawModel>;
    _tickets = results[1] as List<TicketModel>;
    _winners = results[2] as List<WinnerModel>;
    _liveBroadcastPost = results[3] as LiveBroadcastModel;
    _latestMediaPost = results[4] as FeaturedMediaModel?;

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchLiveBroadcast() async {
    try {
      final post = await repository.getLiveBroadcastPost();
      _liveBroadcastPost = post;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> refreshDraws() async {
    try {
      final draws = await repository.getDraws();
      if (draws.isNotEmpty) {
        _draws = draws;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    return repository.forgotPassword(email);
  }

  Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    return repository.resetPassword(email: email, code: code, newPassword: newPassword);
  }

  Future<Map<String, dynamic>> fetchTicketAvailability(String drawId) async {
    return repository.getTicketAvailability(drawId);
  }

  Future<Map<String, dynamic>?> buyTickets({
    required DrawModel draw,
    required int quantity,
    required String paymentMethod,
    List<int>? selectedSequenceNumbers,
    String? returnUrl,
  }) async {
    _isLoading = true;
    notifyListeners();

    final effectiveUserId = _currentUser?.id ?? '2aded889-5b39-4a78-8dcf-15348e4c8004';

    final result = await repository.purchaseTickets(
      drawId: draw.id,
      quantity: quantity,
      paymentMethod: paymentMethod,
      userId: effectiveUserId,
      selectedSequenceNumbers: selectedSequenceNumbers,
      returnUrl: returnUrl,
    );

    final success = result != null && (result['success'] == true || result['orderId'] != null);

    if (success) {
      final isChapa = paymentMethod == 'CHAPA';

      // Strict rule: If payment method is Chapa, tickets are RESERVED and numbers are NOT granted
      // until payment success is received from Chapa.
      if (!isChapa) {
        // Deduct wallet balance if user is logged in
        if (_currentUser != null && paymentMethod == 'WALLET') {
          final cost = quantity * draw.ticketPriceEtb;
          final newBal = (_currentUser!.walletBalanceEtb - cost).clamp(0, 9999999);
          _currentUser = _currentUser!.copyWith(walletBalanceEtb: newBal);
        }

        // Add local tickets immediately if numbers are provided
        final rawNumbers = result['ticketNumbers'] as List<dynamic>?;
        final padLength = draw.totalTickets > 9999 ? 6 : 4;
        final seqs = selectedSequenceNumbers != null && selectedSequenceNumbers.isNotEmpty
            ? selectedSequenceNumbers
            : List.generate(quantity, (i) => draw.soldTickets + 1 + i);

        for (int i = 0; i < seqs.length; i++) {
          final seq = seqs[i];
          final numStr = (rawNumbers != null && i < rawNumbers.length)
              ? rawNumbers[i].toString()
              : '#${seq.toString().padLeft(padLength, '0')}';
          _tickets.insert(
            0,
            TicketModel(
              id: 't-new-$seq-${DateTime.now().millisecondsSinceEpoch}',
              ticketNumber: numStr,
              sequenceNumber: seq,
              drawId: draw.id,
              drawNumber: draw.drawNumber,
              drawTitle: draw.title,
              prizeTitle: draw.prizeTitle,
              prizeImageUrl: draw.prizeImageUrl,
              ticketPriceEtb: draw.ticketPriceEtb,
              status: 'CONFIRMED',
              isWinningTicket: false,
              qrPayload: 'NATILOTTO:VERIFY:${draw.drawNumber}:$numStr:verified',
              hashSignature: 'hash-signature-verified-nla-et-$seq',
              createdAt: DateTime.now().toIso8601String(),
              drawDate: draw.drawDate,
              drawStatus: draw.status,
            ),
          );
        }

        // Refresh from backend to ensure complete database synchronization
        try {
          final freshTickets = await repository.getUserTickets(effectiveUserId);
          if (freshTickets.isNotEmpty) {
            _tickets = freshTickets;
          }
          final freshDraws = await repository.getDraws();
          if (freshDraws.isNotEmpty) {
            _draws = freshDraws;
          }
        } catch (_) {}
      }
    }

    _isLoading = false;
    notifyListeners();
    return success ? result : null;
  }

  /// Verifies a payment reference (e.g. from Chapa), updates wallet/draws/tickets on success
  Future<Map<String, dynamic>> verifyPayment(String reference) async {
    final result = await repository.verifyPayment(reference);
    final isSuccess = result['success'] == true || result['status'] == 'SUCCESS';

    if (isSuccess) {
      final effectiveUserId = _currentUser?.id ?? '2aded889-5b39-4a78-8dcf-15348e4c8004';
      try {
        final freshTickets = await repository.getUserTickets(effectiveUserId);
        if (freshTickets.isNotEmpty) {
          _tickets = freshTickets;
        }
        final freshDraws = await repository.getDraws();
        if (freshDraws.isNotEmpty) {
          _draws = freshDraws;
        }
      } catch (_) {}
      notifyListeners();
    }

    return result;
  }

  /// Simulates payment completion for dev/sandbox testing
  Future<Map<String, dynamic>> simulatePayment(String reference) async {
    final res = await repository.simulatePayment(reference);
    final isSuccess = res['success'] == true || res['status'] == 'SUCCESS';
    if (isSuccess) {
      final effectiveUserId = _currentUser?.id ?? '2aded889-5b39-4a78-8dcf-15348e4c8004';
      try {
        final freshTickets = await repository.getUserTickets(effectiveUserId);
        if (freshTickets.isNotEmpty) {
          _tickets = freshTickets;
        }
        final freshDraws = await repository.getDraws();
        if (freshDraws.isNotEmpty) {
          _draws = freshDraws;
        }
      } catch (_) {}
      notifyListeners();
    }
    return res;
  }
}
