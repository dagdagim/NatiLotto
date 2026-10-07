import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class NatiFlowerPainter extends CustomPainter {
  final Color color;

  NatiFlowerPainter({this.color = const Color(0xFFFFC107)});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;

    final center = Offset(size.width / 2, size.height / 2);
    final petalRadius = size.width * 0.16;
    final distance = size.width * 0.28;

    for (int i = 0; i < 8; i++) {
      final angle = (i * math.pi) / 4;
      final x = center.dx + math.cos(angle) * distance;
      final y = center.dy + math.sin(angle) * distance;

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(angle);
      final petalRect = Rect.fromCenter(
        center: Offset.zero,
        width: petalRadius * 2.2,
        height: petalRadius * 1.5,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(petalRect, Radius.circular(petalRadius)),
        paint,
      );
      canvas.restore();
    }

    // Center circular core
    canvas.drawCircle(center, petalRadius * 0.9, paint);
  }

  @override
  bool shouldRepaint(covariant NatiFlowerPainter oldDelegate) => oldDelegate.color != color;
}

class NatiLogoWidget extends StatelessWidget {
  final double size;
  final bool showText;
  final Color textColor;
  final double fontSize;

  const NatiLogoWidget({
    super.key,
    this.size = 32,
    this.showText = true,
    this.textColor = AppColors.textPrimary,
    this.fontSize = 20,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        CustomPaint(
          size: Size(size, size),
          painter: NatiFlowerPainter(color: const Color(0xFFFFC107)),
        ),
        if (showText) ...[
          const SizedBox(width: 8),
          Text(
            'Nati Lotto',
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w900,
              fontSize: fontSize,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ],
    );
  }
}
