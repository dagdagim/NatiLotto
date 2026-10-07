export 'video_embed_stub.dart'
    if (dart.library.html) 'video_embed_web.dart'
    if (dart.library.io) 'video_embed_native.dart';
