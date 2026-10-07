import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../state/lotto_state.dart';
import '../widgets/nati_logo.dart';
import 'login_screen.dart';
import 'main_navigation_screen.dart';

class OnboardingScreen extends StatefulWidget {
  final LottoState state;

  const OnboardingScreen({super.key, required this.state});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, dynamic>> _slides = [
    {
      'tag': '🌟 DREAM PRIZES',
      'tagColor': const Color(0xFFD97706),
      'tagBg': const Color(0xFFFEF3C7),
      'title': 'Win Life-Changing Prizes',
      'subtitle':
          'Enter official national draws for brand new luxury SUVs, modern electronics, and massive cash jackpots across Ethiopia.',
      'cardGradient': [const Color(0xFFFFFBEB), const Color(0xFFFEF3C7)],
      'cardBorder': const Color(0xFFFDE68A),
      'mainIcon': CupertinoIcons.gift_fill,
      'iconColor': const Color(0xFFD97706),
      'badge1': '🚗 Luxury SUVs',
      'badge2': '📱 Latest iPhones',
      'badge3': '💰 Cash Jackpots',
    },
    {
      'tag': '🛡️ VERIFIED & LICENSED',
      'tagColor': const Color(0xFF6366F1),
      'tagBg': const Color(0xFFEEF2FF),
      'title': 'Fair & Transparent Draws',
      'subtitle':
          'Supervised under the National Lottery Administration of Ethiopia. Every draw is publicly verifiable with authentic results.',
      'cardGradient': [const Color(0xFFF5F3FF), const Color(0xFFEDE9FE)],
      'cardBorder': const Color(0xFFDDD6FE),
      'mainIcon': CupertinoIcons.shield_fill,
      'iconColor': const Color(0xFF6366F1),
      'badge1': '🏛️ NLA Regulated',
      'badge2': '🔒 Verified Draws',
      'badge3': '🎟️ Verifiable Numbers',
    },
    {
      'tag': '⚡ FAST & CONVENIENT',
      'tagColor': const Color(0xFF059669),
      'tagBg': const Color(0xFFD1FAE5),
      'title': 'Instant Mobile Payouts',
      'subtitle':
          'Deposit easily using Telebirr or CBE Birr. Cash prizes and winnings are credited directly into your mobile wallet without delay.',
      'cardGradient': [const Color(0xFFECFDF5), const Color(0xFFD1FAE5)],
      'cardBorder': const Color(0xFFA7F3D0),
      'mainIcon': CupertinoIcons.bolt_fill,
      'iconColor': const Color(0xFF059669),
      'badge1': '⚡ Instant Telebirr',
      'badge2': '🏦 CBE Birr Supported',
      'badge3': '📲 Auto Alerts',
    },
  ];

  void _finishOnboarding() {
    widget.state.completeOnboarding();
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => LoginScreen(state: widget.state),
        transitionsBuilder: (_, animation, __, child) =>
            FadeTransition(opacity: animation, child: child),
        transitionDuration: const Duration(milliseconds: 350),
      ),
    );
  }

  void _skipToApp() {
    widget.state.completeOnboarding();
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => MainNavigationScreen(state: widget.state),
        transitionsBuilder: (_, animation, __, child) =>
            FadeTransition(opacity: animation, child: child),
        transitionDuration: const Duration(milliseconds: 350),
      ),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // 1. Top Header (Logo + Skip)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      CustomPaint(
                        size: const Size(26, 26),
                        painter: NatiFlowerPainter(color: AppColors.primary),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Nati Lotto',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.4,
                        ),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: _skipToApp,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.textMuted,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    ),
                    child: const Text(
                      'Skip',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 2. Responsive PageView Body
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (idx) {
                  setState(() {
                    _currentPage = idx;
                  });
                },
                itemBuilder: (ctx, index) {
                  final slide = _slides[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Illustration Visual Card
                        Container(
                          width: double.infinity,
                          constraints: const BoxConstraints(maxHeight: 250),
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: slide['cardGradient'] as List<Color>,
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: slide['cardBorder'] as Color,
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: (slide['iconColor'] as Color).withValues(alpha: 0.1),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // Central Embellished Badge
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: (slide['iconColor'] as Color).withValues(alpha: 0.25),
                                      blurRadius: 16,
                                      offset: const Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: Icon(
                                  slide['mainIcon'] as IconData,
                                  size: 36,
                                  color: slide['iconColor'] as Color,
                                ),
                              ),
                              const SizedBox(height: 20),

                              // Feature Pills Row
                              Wrap(
                                alignment: WrapAlignment.center,
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  _buildMicroBadge(slide['badge1'] as String),
                                  _buildMicroBadge(slide['badge2'] as String),
                                  _buildMicroBadge(slide['badge3'] as String),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 28),

                        // Tag Pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            color: slide['tagBg'] as Color,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            slide['tag'] as String,
                            style: TextStyle(
                              color: slide['tagColor'] as Color,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Title
                        Text(
                          slide['title'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Subtitle
                        Text(
                          slide['subtitle'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // 3. Bottom Controls (Dots + Action Button)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Animated Page Indicators
                  Row(
                    children: List.generate(
                      _slides.length,
                      (idx) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.only(right: 6),
                        width: _currentPage == idx ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _currentPage == idx
                              ? AppColors.primary
                              : AppColors.surfaceBorder,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),

                  // Action Button
                  ElevatedButton(
                    onPressed: () {
                      if (_currentPage < _slides.length - 1) {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 350),
                          curve: Curves.easeInOut,
                        );
                      } else {
                        _finishOnboarding();
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: const Color(0xFF0F172A),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _currentPage == _slides.length - 1 ? 'Get Started' : 'Continue',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          _currentPage == _slides.length - 1
                              ? CupertinoIcons.sparkles
                              : CupertinoIcons.arrow_right,
                          size: 16,
                        ),
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

  Widget _buildMicroBadge(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceBorder.withValues(alpha: 0.8)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
