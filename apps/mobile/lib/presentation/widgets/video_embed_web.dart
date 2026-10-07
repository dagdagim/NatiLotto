// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';
import '../../data/repositories/lotto_repository.dart';

final Set<String> _registeredViewTypes = {};

Widget buildPlatformVideoEmbed({
  required String targetUrl,
  required String viewId,
  required double width,
  required double height,
  VoidCallback? onOpenExternal,
}) {
  final cleanUrl = targetUrl.trim();
  final isTikTok = cleanUrl.contains('tiktok.com') || RegExp(r'^\d{16,21}$').hasMatch(cleanUrl);
  final isYouTube = cleanUrl.contains('youtube.com') || cleanUrl.contains('youtu.be');

  String? tiktokId;
  if (isTikTok) {
    tiktokId = RegExp(r'/video/(\d+)').firstMatch(cleanUrl)?.group(1) ??
        RegExp(r'\b(\d{16,21})\b').firstMatch(cleanUrl)?.group(1);
  }

  String? youtubeId;
  if (isYouTube) {
    youtubeId = RegExp(r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})')
        .firstMatch(cleanUrl)
        ?.group(1);
  }

  final viewType = 'video-embed-${viewId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_')}';

  if (!_registeredViewTypes.contains(viewType)) {
    _registeredViewTypes.add(viewType);

    ui_web.platformViewRegistry.registerViewFactory(viewType, (int id) {
      final iframe = html.IFrameElement()
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.backgroundColor = '#000000'
        ..allow = 'autoplay *; fullscreen *; picture-in-picture *; encrypted-media *'
        ..allowFullscreen = true;

      if (isYouTube && youtubeId != null) {
        iframe.src = 'https://www.youtube-nocookie.com/embed/$youtubeId?autoplay=1&playsinline=1&rel=0';
      } else if (cleanUrl.contains('tiktok.com') || cleanUrl.contains('vt.tiktok.com')) {
        final vId = tiktokId;
        if (vId != null && vId.isNotEmpty) {
          final streamUrl = '${LottoRepository.defaultBaseUrl}/winners/video/$vId.mp4';
          iframe.srcdoc = '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: #000000;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <video
    id="web_live_player"
    src="$streamUrl"
    controls
    autoplay
    playsinline
    loop
  ></video>
  <script>
    const v = document.getElementById('web_live_player');
    v.play().catch(() => {
      v.muted = true;
      v.play();
    });
  </script>
</body>
</html>
''';
        } else {
          final handleMatch = RegExp(r'@([a-zA-Z0-9_.-]+)').firstMatch(cleanUrl);
          final handle = handleMatch != null ? '@${handleMatch.group(1)}' : '@natilotto';
          iframe.srcdoc = '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse at center, #111827 0%, #030712 100%);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #FFFFFF;
      text-align: center;
      padding: 1rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #EF4444;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #EF4444;
      box-shadow: 0 0 8px #EF4444;
    }
    .handle {
      font-size: 17px;
      font-weight: 900;
      color: #FFFFFF;
      margin-bottom: 6px;
    }
    .sub {
      font-size: 12px;
      color: #94A3B8;
      max-width: 320px;
      line-height: 1.4;
      margin-bottom: 16px;
    }
    .btn {
      background: linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%);
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 800;
      padding: 8px 18px;
      border-radius: 10px;
      text-decoration: none;
      display: inline-block;
      box-shadow: 0 4px 12px rgba(254, 44, 85, 0.4);
    }
  </style>
</head>
<body>
  <div class="badge"><span class="dot"></span> TIKTOK LIVE BROADCAST</div>
  <div class="handle">Waiting for $handle</div>
  <div class="sub">Official live drawing broadcast will appear once the host begins streaming on TikTok.</div>
  <a class="btn" href="$cleanUrl" target="_blank">Watch Live on TikTok ↗</a>
</body>
</html>
''';
        }
      } else {
        final vId = tiktokId;
        final streamUrl = cleanUrl.endsWith('.mp4') || cleanUrl.contains('.mp4?')
            ? cleanUrl
            : (vId != null && vId.isNotEmpty ? '${LottoRepository.defaultBaseUrl}/winners/video/$vId.mp4' : cleanUrl);

        iframe.srcdoc = '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: #000000;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      outline: none;
    }
    #unmute-overlay {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 99;
      display: none;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.85);
      color: #FFC107;
      border: 1px solid rgba(255, 193, 7, 0.6);
      padding: 7px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.6);
      user-select: none;
      transition: transform 0.15s ease;
    }
    #unmute-overlay:active {
      transform: scale(0.95);
    }
  </style>
</head>
<body>
  <div id="unmute-overlay" onclick="handleUnmute()">
    <span>🔊 Tap to Unmute</span>
  </div>
  <video
    id="player"
    src="$streamUrl"
    controls
    playsinline
    loop
  ></video>
  <script>
    const v = document.getElementById('player');
    const overlay = document.getElementById('unmute-overlay');

    v.volume = 1.0;
    v.muted = false;

    function handleUnmute() {
      v.muted = false;
      v.volume = 1.0;
      v.play();
      overlay.style.display = 'none';
    }

    // Attempt unmuted play first; if browser blocks unmuted autoplay, mute and show unmute pill
    const p = v.play();
    if (p !== undefined) {
      p.catch(() => {
        v.muted = true;
        v.play().then(() => {
          overlay.style.display = 'flex';
        }).catch(() => {});
      });
    }
  </script>
</body>
</html>
''';
      }

      return iframe;
    });
  }

  return Container(
    width: width,
    height: height,
    color: Colors.black,
    child: HtmlElementView(viewType: viewType),
  );
}
