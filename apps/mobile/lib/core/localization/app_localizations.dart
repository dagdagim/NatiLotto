
enum AppLanguage { en, am }

class AppLocalizations {
  final AppLanguage language;

  AppLocalizations(this.language);

  static final Map<String, Map<AppLanguage, String>> _localizedValues = {
    'app_name': {
      AppLanguage.en: 'Nati Lotto',
      AppLanguage.am: 'ናቲ ሎቶ',
    },
    'tagline': {
      AppLanguage.en: 'Your Chance. Your Moment.',
      AppLanguage.am: 'የእርስዎ ዕድል! የእርስዎ ቅጽበት!',
    },
    'enter_draw': {
      AppLanguage.en: 'ENTER DRAW',
      AppLanguage.am: 'ዕድሉን ይግቡ',
    },
    'tickets_sold': {
      AppLanguage.en: 'Tickets Sold',
      AppLanguage.am: 'የተሸጡ ቲኬቶች',
    },
    'remaining': {
      AppLanguage.en: 'Remaining',
      AppLanguage.am: 'የቀሩት',
    },
    'ticket_price': {
      AppLanguage.en: 'Ticket Price',
      AppLanguage.am: 'የቲኬት ዋጋ',
    },
    'ends_in': {
      AppLanguage.en: 'Ends In',
      AppLanguage.am: 'የሚጠናቀቀው በ',
    },
    'nav_home': {
      AppLanguage.en: 'Home',
      AppLanguage.am: 'መነሻ',
    },
    'nav_draws': {
      AppLanguage.en: 'Draws',
      AppLanguage.am: 'ዕጣዎች',
    },
    'nav_my_tickets': {
      AppLanguage.en: 'My Tickets',
      AppLanguage.am: 'ቲኬቶቼ',
    },
    'nav_winners': {
      AppLanguage.en: 'Winners',
      AppLanguage.am: 'አሸናፊዎች',
    },
    'nav_profile': {
      AppLanguage.en: 'Profile',
      AppLanguage.am: 'መገለጫ',
    },
    'featured_draw': {
      AppLanguage.en: 'FEATURED DRAW',
      AppLanguage.am: 'ተመራጭ ዕጣ',
    },
    'ending_soon': {
      AppLanguage.en: 'Ending Soon',
      AppLanguage.am: 'በቅርብ የሚጠናቀቁ',
    },
    'how_it_works': {
      AppLanguage.en: 'How Nati Lotto Works',
      AppLanguage.am: 'ናቲ ሎቶ እንዴት ይሰራል?',
    },
    'verify_ticket': {
      AppLanguage.en: 'Verify Ticket',
      AppLanguage.am: 'ቲኬት ያረጋግጡ',
    },
    'live_draw': {
      AppLanguage.en: 'LIVE DRAW',
      AppLanguage.am: 'ቀጥታ ዕጣ',
    },
    'watch_live': {
      AppLanguage.en: 'WATCH LIVE DRAW',
      AppLanguage.am: 'ቀጥታ ዕጣ ይመልከቱ',
    },
    'select_quantity': {
      AppLanguage.en: 'Select Quantity',
      AppLanguage.am: 'ብዛት ይምረጡ',
    },
    'order_summary': {
      AppLanguage.en: 'Order Summary',
      AppLanguage.am: 'የትዕዛዝ ማጠቃለያ',
    },
    'pay_with_telebirr': {
      AppLanguage.en: 'Pay with Telebirr',
      AppLanguage.am: 'በቴሌብር ይክፈሉ',
    },
    'winning_ticket': {
      AppLanguage.en: 'WINNING TICKET',
      AppLanguage.am: 'አሸናፊ ቲኬት',
    },
    'responsible_play': {
      AppLanguage.en: 'Responsible Play (18+)',
      AppLanguage.am: 'ኃላፊነት የተሞላበት ተሳትፎ (18+)',
    },
  };

  String t(String key) {
    if (_localizedValues.containsKey(key)) {
      return _localizedValues[key]![language] ?? key;
    }
    return key;
  }
}
