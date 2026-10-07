import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import '../../data/repositories/lotto_repository.dart';

Widget buildPlatformVideoEmbed({
  required String targetUrl,
  required String viewId,
  required double width,
  required double height,
  VoidCallback? onOpenExternal,
}) {
  return _NativeWebViewVideoPlayer(
    targetUrl: targetUrl,
    width: width,
    height: height,
    onOpenExternal: onOpenExternal,
  );
}

class _NativeWebViewVideoPlayer extends StatefulWidget {
  final String targetUrl;
  final double width;
  final double height;
  final VoidCallback? onOpenExternal;

  const _NativeWebViewVideoPlayer({
    required this.targetUrl,
    required this.width,
    required this.height,
    this.onOpenExternal,
  });

  @override
  State<_NativeWebViewVideoPlayer> createState() => _NativeWebViewVideoPlayerState();
}

class _NativeWebViewVideoPlayerState extends State<_NativeWebViewVideoPlayer> {
  late final WebViewController _controller;
  bool _isLoading = true;

  String _resolveEmbedUrl(String raw) {
    String clean = raw.trim();

    // Map localhost/127.0.0.1 to host Wi-Fi IP so the physical phone can reach videos served by backend
    const hostIp = '10.101.246.219:4000';
    clean = clean
        .replaceAll('http://localhost:4000', 'http://$hostIp')
        .replaceAll('http://127.0.0.1:4000', 'http://$hostIp')
        .replaceAll('https://localhost:4000', 'http://$hostIp')
        .replaceAll('https://127.0.0.1:4000', 'http://$hostIp');

    final isTikTok = clean.contains('tiktok.com') || RegExp(r'^\d{16,21}$').hasMatch(clean);
    if (isTikTok) {
      final match = RegExp(r'/video/(\d+)').firstMatch(clean) ??
          RegExp(r'\b(\d{16,21})\b').firstMatch(clean);
      final id = match?.group(1);
      if (id != null && id.isNotEmpty) {
        return '${LottoRepository.defaultBaseUrl}/winners/video/$id.mp4';
      }
      return clean;
    }
    final isYouTube = clean.contains('youtube.com') || clean.contains('youtu.be');
    if (isYouTube) {
      final match = RegExp(r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})')
          .firstMatch(clean);
      final id = match?.group(1);
      if (id != null) {
        return 'https://www.youtube-nocookie.com/embed/$id?autoplay=1&playsinline=1&rel=0';
      }
    }
    return clean;
  }

  Future<void> _loadMedia(String url) async {
    String resolvedUrl = _resolveEmbedUrl(url);
    if (resolvedUrl.contains('tiktok.com/@') && resolvedUrl.contains('?')) {
      resolvedUrl = resolvedUrl.split('?')[0];
    }

    final isTikTokLive = (resolvedUrl.contains('tiktok.com') || resolvedUrl.contains('vt.tiktok.com')) &&
        (resolvedUrl.contains('/live') || !resolvedUrl.contains('/video/'));

    if (isTikTokLive) {
      final usernameMatch = RegExp(r'@([a-zA-Z0-9_\.]+)').firstMatch(resolvedUrl);
      final username = usernameMatch?.group(1) ?? 'natilotto';

      // Check TikTok live stream status from Backend Proxy
      try {
        final statusUrl = '${LottoRepository.defaultBaseUrl}/draws/live-broadcast/tiktok-status?username=${Uri.encodeComponent(username)}';
        final resp = await http.get(Uri.parse(statusUrl)).timeout(const Duration(milliseconds: 1800));
        if (resp.statusCode == 200) {
          final data = jsonDecode(resp.body) as Map<String, dynamic>;
          final streamUrl = data['streamUrl']?.toString();
          if (data['isLive'] == true && streamUrl != null && streamUrl.isNotEmpty) {
            _loadHlsPlayer(streamUrl, username);
            return;
          }
        }
      } catch (_) {}

      // If not broadcasting yet or in standby, render the branded TikTok Live Room Stage
      _loadTikTokLiveStandby(username);
      return;
    }

    final isYouTube = resolvedUrl.contains('youtube.com') || resolvedUrl.contains('youtu.be');
    if (isYouTube) {
      _controller.loadRequest(Uri.parse(resolvedUrl));
      return;
    }

    // Direct MP4/HLS/WebM Video Player
    _loadHtmlVideoPlayer(resolvedUrl);
  }

  void _loadHlsPlayer(String streamUrl, String username) {
    _controller.loadHtmlString('''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js"></script>
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
      object-fit: cover;
      outline: none;
    }
  </style>
</head>
<body>
  <video id="hls_player" playsinline autoplay loop></video>
  <script>
    const v = document.getElementById('hls_player');
    const src = '$streamUrl';
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        v.play().catch(() => {
          v.muted = true;
          v.play();
        });
      });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src;
      v.play().catch(() => {
        v.muted = true;
        v.play();
      });
    }
  </script>
</body>
</html>
''');
  }

  void _loadTikTokLiveStandby(String username) {
    _controller.loadHtmlString('''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, #1E1B4B 0%, #0F172A 55%, #020617 100%);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #FFFFFF;
      text-align: center;
      padding: 24px;
    }
    .orb {
      width: 82px;
      height: 82px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FE2C55, #25F4EE);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 35px rgba(254, 44, 85, 0.45);
      margin-bottom: 20px;
      animation: pulse 1.8s infinite alternate ease-in-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.94); box-shadow: 0 0 20px rgba(254, 44, 85, 0.35); }
      100% { transform: scale(1.06); box-shadow: 0 0 45px rgba(37, 244, 238, 0.65); }
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.6);
      color: #EF4444;
      font-size: 11px;
      font-weight: 900;
      padding: 5px 14px;
      border-radius: 999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #EF4444;
      box-shadow: 0 0 8px #EF4444;
    }
    .title {
      font-size: 20px;
      font-weight: 900;
      margin-bottom: 6px;
      letter-spacing: -0.3px;
    }
    .handle {
      color: #38BDF8;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 14px;
    }
    .desc {
      color: #94A3B8;
      font-size: 12px;
      max-width: 270px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="orb">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  </div>
  <div class="badge"><span class="dot"></span> TIKTOK LIVE STAGE</div>
  <div class="title">Official Nati Lotto Live</div>
  <div class="handle">@$username • Central Studio Stream</div>
  <div class="desc">Studio live broadcast connection active. Host is on camera under NLA supervision.</div>
</body>
</html>
''');
  }

  void _loadHtmlVideoPlayer(String resolvedUrl) {
    _controller.loadHtmlString('''
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
      object-fit: cover;
      outline: none;
    }
  </style>
</head>
<body>
  <video
    id="native_player"
    src="$resolvedUrl"
    playsinline
    autoplay
    loop
  ></video>
  <script>
    const v = document.getElementById('native_player');
    v.volume = 1.0;
    v.muted = false;
    v.play().catch(() => {
      v.muted = true;
      v.play();
    });
  </script>
</body>
</html>
''');
  }

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF000000))
      ..setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
            try {
              _controller.runJavaScript('''
                (function() {
                  function cleanTikTokOverlays() {
                    try {
                      // 1. Click any close buttons or SVG crosses
                      const closeCandidates = document.querySelectorAll(
                        'button, [role="button"], div[class*="close" i], svg[class*="close" i], [aria-label*="close" i], [aria-label*="dismiss" i]'
                      );
                      closeCandidates.forEach(b => {
                        const txt = (b.innerText || '').trim().toUpperCase();
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        if (txt === '✕' || txt === 'X' || txt === 'CLOSE' || aria.includes('close') || aria.includes('dismiss')) {
                          try { b.click(); } catch(e) {}
                        }
                      });

                      // 2. Scan dialogs / modals containing 'Open TikTok' or 'Open the app'
                      const elements = document.querySelectorAll('div, section, aside, [role="dialog"], [class*="modal" i], [class*="banner" i], [class*="mask" i]');
                      elements.forEach(el => {
                        const text = (el.innerText || '').toLowerCase();
                        if (text.includes('open tiktok') || text.includes('open the app') || text.includes('watch in app') || text.includes('open app')) {
                          // Try clicking a close icon inside first
                          const subClose = el.querySelector('svg, button, [role="button"]');
                          if (subClose) {
                            try { subClose.click(); } catch(e) {}
                          }
                          // Then hide and remove the blocking dialog
                          if (el.children.length < 20) {
                            el.style.setProperty('display', 'none', 'important');
                            el.style.setProperty('visibility', 'hidden', 'important');
                            el.style.setProperty('opacity', '0', 'important');
                            try { el.remove(); } catch(e) {}
                          }
                        }
                      });

                      // 3. Ensure body scrolling is not locked by dialog
                      if (document.body) {
                        document.body.style.overflow = 'auto';
                      }
                      if (document.documentElement) {
                        document.documentElement.style.overflow = 'auto';
                      }
                    } catch(err) {}
                  }

                  cleanTikTokOverlays();
                  const interval = setInterval(cleanTikTokOverlays, 300);
                  setTimeout(() => clearInterval(interval), 15000);

                  // MutationObserver for instantaneous removal
                  if (window.MutationObserver && (document.body || document.documentElement)) {
                    const observer = new MutationObserver(() => cleanTikTokOverlays());
                    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
                  }
                })();
              ''');
            } catch (_) {}
          },
          onNavigationRequest: (NavigationRequest request) {
            final url = request.url.toLowerCase();
            if (url.contains('10.101.246.219') ||
                url.contains('localhost') ||
                url.contains('googleapis.com') ||
                url.contains('youtube.com') ||
                url.contains('googlevideo.com') ||
                url.contains('tiktok.com') ||
                url.contains('byteoversea.com') ||
                url.contains('tiktokcdn.com') ||
                url.contains('ttlivecdn.com') ||
                url.contains('byteimg.com') ||
                url.contains('ibytedtos.com') ||
                url.startsWith('data:') ||
                url.startsWith('about:') ||
                url.startsWith('blob:') ||
                url.startsWith('https://') ||
                url.startsWith('http://')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      );

    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
    }

    _loadMedia(widget.targetUrl);
  }

  @override
  void didUpdateWidget(_NativeWebViewVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.targetUrl != widget.targetUrl) {
      _loadMedia(widget.targetUrl);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.width,
      height: widget.height,
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: SizedBox(
                width: 32,
                height: 32,
                child: CircularProgressIndicator(
                  color: Color(0xFFFFC107),
                  strokeWidth: 2.8,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
