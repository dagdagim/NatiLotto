import 'package:flutter/material.dart';

Widget buildPlatformVideoEmbed({
  required String targetUrl,
  required String viewId,
  required double width,
  required double height,
  VoidCallback? onOpenExternal,
}) {
  return Container(
    width: width,
    height: height,
    color: Colors.black,
    child: const Center(
      child: Text(
        'Video Player Not Supported on this Platform',
        style: TextStyle(color: Colors.white, fontSize: 12),
      ),
    ),
  );
}
