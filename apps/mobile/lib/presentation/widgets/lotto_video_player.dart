import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/lotto_repository.dart';
import 'video_embed.dart';

class LottoVideoPlayer extends StatefulWidget {
  final String videoUrl;
  final String? posterUrl;
  final double? width;
  final double? height;
  final bool autoPlay;
  final bool loop;
  final BoxFit fit;

  const LottoVideoPlayer({
    super.key,
    required this.videoUrl,
    this.posterUrl,
    this.width,
    this.height,
    this.autoPlay = true,
    this.loop = true,
    this.fit = BoxFit.cover,
  });

  @override
  State<LottoVideoPlayer> createState() => _LottoVideoPlayerState();
}

class _LottoVideoPlayerState extends State<LottoVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isDirectInitialized = false;
  bool _directError = false;
  bool _showControls = true;
  bool _isMuted = false;
  double _volume = 1.0;
  bool _showVolumeOverlay = false;
  Timer? _volumeOverlayTimer;
  String? _resolvedTikTokId;

  bool get _isTikTok {
    final trimmed = widget.videoUrl.trim();
    return trimmed.contains('tiktok.com') || RegExp(r'^\d{16,21}$').hasMatch(trimmed);
  }

  bool get _isYouTube {
    final trimmed = widget.videoUrl.trim();
    return trimmed.contains('youtube.com') || trimmed.contains('youtu.be');
  }

  String? get _tikTokVideoId {
    final trimmed = widget.videoUrl.trim();
    final match = RegExp(r'/video/(\d+)').firstMatch(trimmed) ??
        RegExp(r'\b(\d{16,21})\b').firstMatch(trimmed);
    return match?.group(1) ?? _resolvedTikTokId;
  }

  String? get _youTubeVideoId {
    final trimmed = widget.videoUrl.trim();
    final match = RegExp(r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})')
        .firstMatch(trimmed);
    return match?.group(1);
  }

  String get _playableStreamUrl {
    final trimmed = widget.videoUrl.trim();
    if (trimmed.isEmpty) return '';

    if (_isYouTube) return '';

    // Relative backend video paths
    if (trimmed.startsWith('/api/') || trimmed.startsWith('api/')) {
      final base = LottoRepository.defaultBaseUrl.replaceFirst(RegExp(r'/api/v1/?$'), '');
      return '$base/${trimmed.replaceFirst(RegExp(r'^/?'), '')}';
    }

    if (trimmed.endsWith('.mp4') ||
        trimmed.contains('.mp4?') ||
        trimmed.endsWith('.webm') ||
        trimmed.endsWith('.mov')) {
      return trimmed;
    }

    if (_isTikTok) {
      final id = _tikTokVideoId;
      if (id != null && id.isNotEmpty) {
        return '${LottoRepository.defaultBaseUrl}/winners/video/$id.mp4';
      }
    }

    return trimmed;
  }

  bool get _canAttemptDirectVideo => !_isYouTube && _playableStreamUrl.isNotEmpty;

  String get _embedUrl {
    if (_playableStreamUrl.isNotEmpty) {
      return _playableStreamUrl;
    }
    final clean = widget.videoUrl.trim();
    if (_isYouTube) {
      final id = _youTubeVideoId;
      if (id != null && id.isNotEmpty) {
        return 'https://www.youtube-nocookie.com/embed/$id?autoplay=1&playsinline=1&rel=0';
      }
      return clean;
    }
    return clean;
  }

  @override
  void initState() {
    super.initState();
    _setupPlayer();
  }

  void _onControllerUpdate() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void didUpdateWidget(LottoVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.videoUrl != widget.videoUrl) {
      _volumeOverlayTimer?.cancel();
      _controller?.removeListener(_onControllerUpdate);
      _controller?.dispose();
      _controller = null;
      _resolvedTikTokId = null;
      _isDirectInitialized = false;
      _directError = false;
      _setupPlayer();
    }
  }

  Future<void> _setupPlayer() async {
    final trimmed = widget.videoUrl.trim();
    if (_isTikTok && _tikTokVideoId == null && (trimmed.contains('vt.tiktok.com') || trimmed.contains('vm.tiktok.com') || trimmed.contains('tiktok.com'))) {
      try {
        final resolveUri = Uri.parse('${LottoRepository.defaultBaseUrl}/winners/tiktok-resolve?url=${Uri.encodeComponent(trimmed)}');
        final resp = await http.get(resolveUri).timeout(const Duration(seconds: 4));
        if (resp.statusCode == 200) {
          final data = json.decode(resp.body);
          if (data is Map && data['videoId'] != null) {
            _resolvedTikTokId = data['videoId'].toString();
          }
        }
      } catch (e) {
        debugPrint('Failed to resolve TikTok URL on mobile: $e');
      }
    }

    final cleanUrl = _playableStreamUrl;
    if (cleanUrl.isEmpty) {
      setState(() => _directError = true);
      return;
    }

    if (_canAttemptDirectVideo) {
      try {
        final uri = Uri.parse(cleanUrl);
        final controller = VideoPlayerController.networkUrl(uri);
        _controller = controller;
        await controller.initialize();
        if (mounted) {
          controller.setLooping(widget.loop);
          controller.setVolume(_isMuted ? 0.0 : _volume);
          controller.addListener(_onControllerUpdate);
          if (widget.autoPlay) {
            await controller.play();
          }
          setState(() {
            _isDirectInitialized = true;
            _directError = false;
          });
        }
      } catch (_) {
        if (mounted) {
          setState(() {
            _directError = true;
            _isDirectInitialized = false;
          });
        }
      }
    }
  }

  @override
  void dispose() {
    _volumeOverlayTimer?.cancel();
    _controller?.removeListener(_onControllerUpdate);
    _controller?.dispose();
    super.dispose();
  }

  void _toggleMute() {
    setState(() {
      if (_isMuted) {
        _isMuted = false;
        if (_volume <= 0.05) _volume = 1.0;
        _controller?.setVolume(_volume);
      } else {
        _isMuted = true;
        _controller?.setVolume(0.0);
      }
    });
    _triggerVolumeOverlay();
  }

  void _setVolume(double newVol) {
    setState(() {
      _volume = newVol.clamp(0.0, 1.0);
      _isMuted = _volume <= 0.01;
      _controller?.setVolume(_isMuted ? 0.0 : _volume);
    });
    _triggerVolumeOverlay();
  }

  void _triggerVolumeOverlay() {
    _volumeOverlayTimer?.cancel();
    setState(() => _showVolumeOverlay = true);
    _volumeOverlayTimer = Timer(const Duration(milliseconds: 1400), () {
      if (mounted) {
        setState(() => _showVolumeOverlay = false);
      }
    });
  }

  void _openExternalVideo() {
    if (_controller != null) {
      if (_controller!.value.isPlaying) {
        _controller!.pause();
      } else {
        _controller!.play();
      }
      setState(() {});
    }
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  IconData get _volumeIcon {
    if (_isMuted || _volume <= 0.01) {
      return CupertinoIcons.volume_off;
    }
    if (_volume < 0.5) {
      return CupertinoIcons.volume_down;
    }
    return CupertinoIcons.volume_up;
  }

  @override
  Widget build(BuildContext context) {
    final defaultHeight = _isTikTok ? 360.0 : 230.0;
    final w = widget.width ?? double.infinity;
    final h = widget.height ?? defaultHeight;

    // 1. Direct Video Stream with VideoPlayer (MP4 / WebM / QuickTime with Audio)
    if (_canAttemptDirectVideo && !_directError && _isDirectInitialized && _controller != null) {
      final isPlaying = _controller!.value.isPlaying;
      final position = _controller!.value.position;
      final duration = _controller!.value.duration;

      return Container(
        width: w,
        height: h,
        color: Colors.black,
        child: ClipRRect(
          child: Stack(
            fit: StackFit.expand,
            children: [
              Center(
                child: AspectRatio(
                  aspectRatio: _controller!.value.aspectRatio > 0 ? _controller!.value.aspectRatio : 16 / 9,
                  child: VideoPlayer(_controller!),
                ),
              ),
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  setState(() => _showControls = !_showControls);
                },
                child: AnimatedOpacity(
                  opacity: _showControls ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    color: Colors.black.withValues(alpha: 0.35),
                    child: Stack(
                      children: [
                        // Center Play / Pause
                        Center(
                          child: GestureDetector(
                            onTap: () {
                              if (isPlaying) {
                                _controller?.pause();
                              } else {
                                _controller?.play();
                              }
                              setState(() {});
                            },
                            child: Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.65),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                              ),
                              child: Icon(
                                isPlaying ? CupertinoIcons.pause_fill : CupertinoIcons.play_fill,
                                color: Colors.white,
                                size: 28,
                              ),
                            ),
                          ),
                        ),

                        // Center Volume Toast HUD when volume changes
                        if (_showVolumeOverlay)
                          Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.85),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: const Color(0xFFFFC107).withValues(alpha: 0.6),
                                  width: 1.2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.6),
                                    blurRadius: 16,
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    _volumeIcon,
                                    color: _isMuted ? Colors.redAccent : const Color(0xFFFFC107),
                                    size: 26,
                                  ),
                                  const SizedBox(width: 12),
                                  Column(
                                    mainAxisSize: MainAxisSize.min,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _isMuted ? 'Muted' : 'Volume: ${(_volume * 100).round()}%',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      SizedBox(
                                        width: 110,
                                        height: 5,
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(3),
                                          child: LinearProgressIndicator(
                                            value: _isMuted ? 0.0 : _volume,
                                            backgroundColor: Colors.white24,
                                            valueColor: AlwaysStoppedAnimation(
                                              _isMuted ? Colors.redAccent : const Color(0xFFFFC107),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Top-right Quick Audio Control Pill (Mute / Unmute & Step Volume)
                        Positioned(
                          top: 10,
                          right: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.72),
                              borderRadius: BorderRadius.circular(22),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                GestureDetector(
                                  onTap: _toggleMute,
                                  child: Container(
                                    padding: const EdgeInsets.all(5),
                                    decoration: BoxDecoration(
                                      color: _isMuted
                                          ? Colors.red.withValues(alpha: 0.8)
                                          : const Color(0xFFFFC107).withValues(alpha: 0.2),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      _volumeIcon,
                                      color: _isMuted ? Colors.white : const Color(0xFFFFC107),
                                      size: 15,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                GestureDetector(
                                  onTap: () => _setVolume(_volume - 0.15),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(horizontal: 3, vertical: 2),
                                    child: Icon(CupertinoIcons.minus, color: Colors.white70, size: 13),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 2),
                                  child: Text(
                                    '${_isMuted ? 0 : (_volume * 100).round()}%',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () => _setVolume(_volume + 0.15),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(horizontal: 3, vertical: 2),
                                    child: Icon(CupertinoIcons.plus, color: Colors.white70, size: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Bottom Controls Bar with Time, Scrubber & Volume Slider
                        Positioned(
                          left: 12,
                          right: 12,
                          bottom: 8,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        _formatDuration(position),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const Text(' / ', style: TextStyle(color: Colors.white38, fontSize: 11)),
                                      Text(
                                        _formatDuration(duration),
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                  // Interactive Volume Scrubber in Bottom Row
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      GestureDetector(
                                        onTap: _toggleMute,
                                        child: Icon(
                                          _volumeIcon,
                                          color: Colors.white,
                                          size: 15,
                                        ),
                                      ),
                                      SizedBox(
                                        width: 68,
                                        height: 24,
                                        child: SliderTheme(
                                          data: SliderThemeData(
                                            trackHeight: 2.5,
                                            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 4.5),
                                            overlayShape: const RoundSliderOverlayShape(overlayRadius: 8),
                                            activeTrackColor: const Color(0xFFFFC107),
                                            inactiveTrackColor: Colors.white24,
                                            thumbColor: const Color(0xFFFFC107),
                                          ),
                                          child: Slider(
                                            value: _isMuted ? 0.0 : _volume,
                                            min: 0.0,
                                            max: 1.0,
                                            onChanged: _setVolume,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              VideoProgressIndicator(
                                _controller!,
                                allowScrubbing: true,
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                colors: VideoProgressColors(
                                  playedColor: const Color(0xFFFFC107),
                                  bufferedColor: Colors.white.withValues(alpha: 0.3),
                                  backgroundColor: Colors.white.withValues(alpha: 0.15),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 2. Embedded Video Player (TikTok / YouTube / Social Embed via Cross-Platform PlatformView)
    final uniqueViewId = (_tikTokVideoId ?? _youTubeVideoId ?? widget.videoUrl.hashCode.abs().toString());

    return Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // The Cross-Platform Embed (HtmlElementView iframe on Web, Native WebView on Mobile)
          buildPlatformVideoEmbed(
            targetUrl: _embedUrl,
            viewId: uniqueViewId,
            width: w,
            height: h,
            onOpenExternal: _openExternalVideo,
          ),
        ],
      ),
    );
  }
}
