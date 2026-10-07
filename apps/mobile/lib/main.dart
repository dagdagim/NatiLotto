import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/lotto_repository.dart';
import 'presentation/state/lotto_state.dart';
import 'presentation/screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final repository = LottoRepository();
  final lottoState = LottoState(repository: repository);

  runApp(NatiLottoApp(lottoState: lottoState));
}

class NatiLottoApp extends StatelessWidget {
  final LottoState lottoState;

  const NatiLottoApp({super.key, required this.lottoState});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: lottoState,
      builder: (context, _) {
        return MaterialApp(
          title: 'Nati Lotto',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: ThemeMode.light,
          home: SplashScreen(state: lottoState),
        );
      },
    );
  }
}
