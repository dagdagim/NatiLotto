import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/cupertino.dart';
import '../../core/theme/app_theme.dart';

class LottoImage extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final Widget? placeholder;

  // Global static memory cache for base64 decoded bytes to eliminate re-decoding & blinking
  static final Map<String, Uint8List> _base64Cache = {};

  const LottoImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.placeholder,
  });

  Widget _buildPlaceholder() {
    return placeholder ??
        Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: borderRadius,
          ),
          child: const Center(
            child: Icon(
              CupertinoIcons.gift_fill,
              color: AppColors.primary,
              size: 28,
            ),
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    Widget imageWidget;
    final url = imageUrl?.trim();

    if (url == null || url.isEmpty) {
      imageWidget = _buildPlaceholder();
    } else if (url.startsWith('data:image') || url.contains(';base64,')) {
      try {
        Uint8List? bytes = _base64Cache[url];
        if (bytes == null) {
          final commaIdx = url.indexOf(',');
          final base64String = commaIdx != -1 ? url.substring(commaIdx + 1) : url;
          bytes = base64Decode(base64String.trim());
          _base64Cache[url] = bytes;
        }
        imageWidget = Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          gaplessPlayback: true,
          errorBuilder: (_, __, ___) => _buildPlaceholder(),
        );
      } catch (_) {
        imageWidget = _buildPlaceholder();
      }
    } else if (url.contains('tiktokcdn.com') || url.contains('byteoversea.com')) {
      // TikTok CDN blocks cross-origin requests with 403 Forbidden.
      // Use clean placeholder to avoid console network errors.
      imageWidget = _buildPlaceholder();
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      imageWidget = Image.network(
        url,
        width: width,
        height: height,
        fit: fit,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => _buildPlaceholder(),
      );
    } else if (url.startsWith('assets/')) {
      imageWidget = Image.asset(
        url,
        width: width,
        height: height,
        fit: fit,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => _buildPlaceholder(),
      );
    } else {
      imageWidget = _buildPlaceholder();
    }

    if (borderRadius != null) {
      return ClipRRect(
        borderRadius: borderRadius!,
        child: imageWidget,
      );
    }

    return imageWidget;
  }

  static ImageProvider getProvider(String? imageUrl) {
    final url = imageUrl?.trim();
    if (url != null && (url.startsWith('data:image') || url.contains(';base64,'))) {
      try {
        Uint8List? cached = _base64Cache[url];
        if (cached == null) {
          final commaIdx = url.indexOf(',');
          final base64String = commaIdx != -1 ? url.substring(commaIdx + 1) : url;
          cached = base64Decode(base64String.trim());
          _base64Cache[url] = cached;
        }
        return MemoryImage(cached);
      } catch (_) {}
    }
    if (url != null && (url.startsWith('http://') || url.startsWith('https://'))) {
      return NetworkImage(url);
    }
    return const NetworkImage(
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=400&q=80',
    );
  }
}
