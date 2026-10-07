import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../state/lotto_state.dart';
import 'home_screen.dart';
import 'draws_screen.dart';
import 'live_draw_screen.dart';
import 'my_tickets_screen.dart';
import 'winners_screen.dart';
import 'profile_screen.dart';

class MainNavigationScreen extends StatelessWidget {
  final LottoState state;

  const MainNavigationScreen({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    final loc = state.loc;

    final screens = [
      HomeScreen(state: state),
      DrawsScreen(state: state),
      LiveDrawScreen(state: state),
      MyTicketsScreen(state: state),
      WinnersScreen(state: state),
      ProfileScreen(state: state),
    ];

    return Scaffold(
      body: IndexedStack(
        index: state.currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.surfaceBorder, width: 0.8)),
        ),
        child: BottomNavigationBar(
          currentIndex: state.currentIndex,
          onTap: state.setNavIndex,
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppColors.surface,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textMuted,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: [
            BottomNavigationBarItem(
              icon: const Icon(CupertinoIcons.house_fill),
              label: loc.t('nav_home'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(CupertinoIcons.ticket),
              activeIcon: const Icon(CupertinoIcons.ticket_fill),
              label: loc.t('nav_draws'),
            ),
            BottomNavigationBarItem(
              icon: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(CupertinoIcons.play_circle_fill),
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.error,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
              label: 'Live 🔴',
            ),
            BottomNavigationBarItem(
              icon: const Icon(CupertinoIcons.square_stack_3d_up),
              activeIcon: const Icon(CupertinoIcons.square_stack_3d_up_fill),
              label: loc.t('nav_my_tickets'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(CupertinoIcons.rosette),
              label: loc.t('nav_winners'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(CupertinoIcons.person_crop_circle),
              activeIcon: const Icon(CupertinoIcons.person_crop_circle_fill),
              label: loc.t('nav_profile'),
            ),
          ],
        ),
      ),
    );
  }
}
