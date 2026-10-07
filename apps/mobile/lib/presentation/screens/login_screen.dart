import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../state/lotto_state.dart';
import '../widgets/nati_logo.dart';
import 'main_navigation_screen.dart';

class LoginScreen extends StatefulWidget {
  final LottoState state;

  const LoginScreen({super.key, required this.state});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController(text: '+251 911 223 344');
  final TextEditingController _passwordController = TextEditingController(text: 'Password123!');
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin(String phone, [String? password]) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await widget.state.login(phone, password: password ?? _passwordController.text);

    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      if (success) {
        Navigator.pushReplacement(
          context,
          PageRouteBuilder(
            pageBuilder: (_, __, ___) => MainNavigationScreen(state: widget.state),
            transitionsBuilder: (_, animation, __, child) => FadeTransition(opacity: animation, child: child),
            transitionDuration: const Duration(milliseconds: 350),
          ),
        );
      } else {
        setState(() {
          _errorMessage = 'Could not sign in. Please verify your phone and password.';
        });
      }
    }
  }

  void _showForgotPasswordDialog() {
    final emailController = TextEditingController(text: 'dawit.m@natilotto.et');
    final codeController = TextEditingController();
    final newPasswordController = TextEditingController();
    int step = 1;
    bool isDialogLoading = false;
    String? dialogError;
    String? dialogSuccess;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  const Icon(CupertinoIcons.lock_shield_fill, color: AppColors.purple, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    step == 1 ? 'Forgot Password' : 'Reset Password',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (dialogError != null)
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(dialogError!, style: const TextStyle(fontSize: 12, color: AppColors.error)),
                      ),
                    if (dialogSuccess != null)
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(dialogSuccess!, style: const TextStyle(fontSize: 12, color: AppColors.success)),
                      ),
                    if (step == 1) ...[
                      const Text(
                        'Enter your registered email address or phone number to receive a 6-digit verification code.',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: emailController,
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                        decoration: InputDecoration(
                          labelText: 'Email Address / Phone',
                          labelStyle: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          filled: true,
                          fillColor: AppColors.surfaceElevated,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.surfaceBorder),
                          ),
                        ),
                      ),
                    ] else ...[
                      Text(
                        'Enter the 6-digit code sent to ${emailController.text} and your new password.',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: codeController,
                        style: const TextStyle(fontSize: 14, fontFamily: 'monospace', fontWeight: FontWeight.w800),
                        decoration: InputDecoration(
                          labelText: '6-Digit Verification Code',
                          labelStyle: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          filled: true,
                          fillColor: AppColors.surfaceElevated,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.surfaceBorder),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: newPasswordController,
                        obscureText: true,
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                        decoration: InputDecoration(
                          labelText: 'New Password',
                          labelStyle: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          filled: true,
                          fillColor: AppColors.surfaceElevated,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.surfaceBorder),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: isDialogLoading
                      ? null
                      : () async {
                          if (step == 1) {
                            if (emailController.text.trim().isEmpty) return;
                            setDialogState(() {
                              isDialogLoading = true;
                              dialogError = null;
                            });

                            final res = await widget.state.forgotPassword(emailController.text.trim());
                            setDialogState(() {
                              isDialogLoading = false;
                              if (res['success'] == true) {
                                step = 2;
                                dialogSuccess = 'Verification code sent to ${emailController.text}';
                              } else {
                                dialogError = res['message'] ?? 'Could not send verification code';
                              }
                            });
                          } else {
                            if (codeController.text.trim().isEmpty || newPasswordController.text.trim().isEmpty) {
                              setDialogState(() => dialogError = 'Please fill code and new password');
                              return;
                            }

                            setDialogState(() {
                              isDialogLoading = true;
                              dialogError = null;
                            });

                            final res = await widget.state.resetPassword(
                              email: emailController.text.trim(),
                              code: codeController.text.trim(),
                              newPassword: newPasswordController.text.trim(),
                            );

                            setDialogState(() {
                              isDialogLoading = false;
                              if (res['success'] == true) {
                                Navigator.of(ctx).pop();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Password reset successfully! You can now log in.'),
                                    backgroundColor: AppColors.success,
                                  ),
                                );
                              } else {
                                dialogError = res['message'] ?? 'Password reset failed';
                              }
                            });
                          }
                        },
                  child: isDialogLoading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : Text(step == 1 ? 'Send Code' : 'Reset Password', style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _continueAsGuest() {
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => MainNavigationScreen(state: widget.state),
        transitionsBuilder: (_, animation, __, child) => FadeTransition(opacity: animation, child: child),
        transitionDuration: const Duration(milliseconds: 350),
      ),
    );
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),

              // Logo & App Name (Light Theme)
              Center(
                child: Column(
                  children: [
                    CustomPaint(
                      size: const Size(60, 60),
                      painter: NatiFlowerPainter(color: AppColors.primary),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Nati Lotto',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Your Chance. Your Moment.',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Login Form Card (Clean White Surface)
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.surfaceBorder),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0A0F172A),
                      blurRadius: 20,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Sign In to Your Account',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Enter your phone number and password to access your wallet & tickets.',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (_errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(10),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(CupertinoIcons.exclamationmark_circle_fill, color: AppColors.error, size: 16),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Phone input
                    const Text(
                      'Mobile Phone Number (+251)',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _phoneController,
                      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700),
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: AppColors.surfaceElevated,
                        prefixIcon: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 12),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('🇪🇹', style: TextStyle(fontSize: 18)),
                              SizedBox(width: 6),
                              Icon(CupertinoIcons.phone_fill, color: AppColors.primary, size: 18),
                            ],
                          ),
                        ),
                        hintText: '+251 911 000 000',
                        hintStyle: const TextStyle(color: AppColors.textMuted),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.surfaceBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.surfaceBorder),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Password input
                    const Text(
                      'Password',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: AppColors.surfaceElevated,
                        prefixIcon: const Icon(CupertinoIcons.lock_fill, color: AppColors.purple, size: 18),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? CupertinoIcons.eye_slash_fill : CupertinoIcons.eye_fill,
                            color: AppColors.textMuted,
                            size: 18,
                          ),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                        hintText: 'Enter your password',
                        hintStyle: const TextStyle(color: AppColors.textMuted),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.surfaceBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.surfaceBorder),
                        ),
                      ),
                    ),

                    // Forgot Password link
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: _showForgotPasswordDialog,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Forgot Password?',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.purple,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : () => _handleLogin(_phoneController.text),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                              )
                            : const Text(
                                'Sign In / Register',
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Quick 1-Tap Demo Players
              const Text(
                '⚡ Quick Demo Sign-In (1-Tap)',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),

              // Player Dawit
              _buildDemoUserTile(
                name: 'Dawit Mekonnen',
                phone: '+251 911 223 344',
                role: 'Player • Bole, Addis Ababa',
                icon: CupertinoIcons.person_fill,
                badgeColor: AppColors.purple,
                onTap: () {
                  _phoneController.text = '+251 911 223 344';
                  _handleLogin('+251 911 223 344');
                },
              ),

              const SizedBox(height: 8),

              // SuperAdmin Natnael
              _buildDemoUserTile(
                name: 'Natnael T. (SuperAdmin)',
                phone: '+251 911 000 001',
                role: 'SuperAdmin • NLA Authorized',
                icon: CupertinoIcons.shield_fill,
                badgeColor: AppColors.error,
                onTap: () {
                  _phoneController.text = '+251 911 000 001';
                  _handleLogin('+251 911 000 001');
                },
              ),

              const SizedBox(height: 20),

              // Guest button
              Center(
                child: TextButton(
                  onPressed: _continueAsGuest,
                  child: const Text(
                    'Browse Draws as Guest →',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDemoUserTile({
    required String name,
    required String phone,
    required String role,
    required IconData icon,
    required Color badgeColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: badgeColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: badgeColor, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    '$phone • $role',
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(CupertinoIcons.chevron_right, color: AppColors.textMuted, size: 16),
          ],
        ),
      ),
    );
  }
}
