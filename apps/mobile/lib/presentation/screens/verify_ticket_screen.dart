import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../state/lotto_state.dart';

class VerifyTicketScreen extends StatefulWidget {
  final LottoState state;
  final String? initialDrawNumber;
  final String? initialTicketNumber;

  const VerifyTicketScreen({
    super.key,
    required this.state,
    this.initialDrawNumber,
    this.initialTicketNumber,
  });

  @override
  State<VerifyTicketScreen> createState() => _VerifyTicketScreenState();
}

class _VerifyTicketScreenState extends State<VerifyTicketScreen> {
  late TextEditingController drawController;
  late TextEditingController ticketController;
  bool isVerifying = false;
  Map<String, dynamic>? verificationResult;

  @override
  void initState() {
    super.initState();
    drawController = TextEditingController(text: widget.initialDrawNumber ?? 'NL-000120');
    ticketController = TextEditingController(text: widget.initialTicketNumber ?? '0142');

    if (widget.initialDrawNumber != null && widget.initialTicketNumber != null) {
      _executeVerification();
    }
  }

  @override
  void dispose() {
    drawController.dispose();
    ticketController.dispose();
    super.dispose();
  }

  Future<void> _executeVerification() async {
    final drawNum = drawController.text.trim();
    final ticketNum = ticketController.text.trim();

    if (drawNum.isEmpty || ticketNum.isEmpty) return;

    setState(() {
      isVerifying = true;
      verificationResult = null;
    });

    final res = await widget.state.repository.verifyTicket(drawNum, ticketNum);

    setState(() {
      isVerifying = false;
      verificationResult = res;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Public Ticket Verification'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Trust Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: const Row(
                children: [
                  Icon(CupertinoIcons.checkmark_shield_fill, color: AppColors.primary, size: 28),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Independent Cryptographic Proof',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Verify any ticket entry against immutable SHA-256 pre-draw snapshots.',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Form Inputs
            const Text(
              'Draw Identifier',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: drawController,
              textCapitalization: TextCapitalization.characters,
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
              decoration: InputDecoration(
                hintText: 'e.g. NL-000123',
                hintStyle: const TextStyle(color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.surfaceBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 16),

            const Text(
              'Ticket Number',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: ticketController,
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
              decoration: InputDecoration(
                hintText: 'e.g. 0382 or #0382',
                hintStyle: const TextStyle(color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.surfaceBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isVerifying ? null : _executeVerification,
                child: isVerifying
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                      )
                    : const Text('VERIFY TICKET'),
              ),
            ),
            const SizedBox(height: 28),

            // Result Display
            if (verificationResult != null) _buildResultCard(verificationResult!),
          ],
        ),
      ),
    );
  }

  Widget _buildResultCard(Map<String, dynamic> res) {
    final isWinning = res['isWinningTicket'] as bool? ?? false;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isWinning ? AppColors.primary : AppColors.success,
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isWinning ? AppColors.primary : AppColors.successContainer,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isWinning ? CupertinoIcons.rosette : CupertinoIcons.checkmark_alt,
                  color: isWinning ? Colors.black : AppColors.success,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  isWinning ? 'VALID WINNING TICKET!' : 'VALID REGISTERED ENTRY',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: isWinning ? AppColors.primary : AppColors.success,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow('Prize', res['prizeTitle'] ?? 'Grand Prize'),
          _buildInfoRow('Ticket Number', res['ticketNumber'] ?? ''),
          _buildInfoRow('Draw Number', res['drawNumber'] ?? ''),
          _buildInfoRow('Draw Status', res['drawStatus'] ?? 'OPEN'),
          if (res['winnerName'] != null)
            _buildInfoRow('Winner', res['winnerName']),

          const SizedBox(height: 12),
          const Divider(color: AppColors.surfaceBorder),
          const SizedBox(height: 8),

          const Text(
            'Cryptographic Verification Data',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          _buildHashRow('Snapshot Hash', res['snapshotHash'] ?? 'e3b0c44298fc...'),
          if (res['resultHash'] != null)
            _buildHashRow('Result Hash', res['resultHash']),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildHashRow(String label, String hash) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
          const SizedBox(height: 2),
          Text(
            hash,
            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'monospace'),
          ),
        ],
      ),
    );
  }
}
