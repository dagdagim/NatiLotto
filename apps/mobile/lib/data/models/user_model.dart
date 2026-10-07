class UserModel {
  final String id;
  final String phone;
  final String displayName;
  final String? email;
  final String? location;
  final String role;
  final int walletBalanceEtb;
  final bool isAgeVerified;
  final bool isEmailVerified;
  final String verificationStatus;

  UserModel({
    required this.id,
    required this.phone,
    required this.displayName,
    this.email,
    this.location,
    required this.role,
    required this.walletBalanceEtb,
    this.isAgeVerified = true,
    this.isEmailVerified = true,
    this.verificationStatus = 'VERIFIED',
  });

  bool get isAdmin => role != 'USER';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final firstName = json['firstName'] as String?;
    final lastName = json['lastName'] as String?;
    String name = json['displayName'] as String? ?? '';
    if (name.isEmpty && firstName != null) {
      name = '$firstName ${lastName ?? ''}'.trim();
    }
    if (name.isEmpty) {
      name = 'Player';
    }

    return UserModel(
      id: json['id'] as String? ?? '2aded889-5b39-4a78-8dcf-15348e4c8004',
      phone: json['phone'] as String? ?? '+251 911 223 344',
      displayName: name,
      email: json['email'] as String?,
      location: json['location'] as String? ?? 'Addis Ababa',
      role: json['role'] as String? ?? 'USER',
      walletBalanceEtb: (json['walletBalanceEtb'] as num?)?.toInt() ?? 2500,
      isAgeVerified: json['isAgeVerified'] as bool? ?? true,
      isEmailVerified: json['isEmailVerified'] as bool? ?? true,
      verificationStatus: json['verificationStatus'] as String? ?? 'VERIFIED',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'displayName': displayName,
      'email': email,
      'location': location,
      'role': role,
      'walletBalanceEtb': walletBalanceEtb,
      'isAgeVerified': isAgeVerified,
      'isEmailVerified': isEmailVerified,
      'verificationStatus': verificationStatus,
    };
  }

  UserModel copyWith({
    String? id,
    String? phone,
    String? displayName,
    String? email,
    String? location,
    String? role,
    int? walletBalanceEtb,
    bool? isAgeVerified,
    bool? isEmailVerified,
    String? verificationStatus,
  }) {
    return UserModel(
      id: id ?? this.id,
      phone: phone ?? this.phone,
      displayName: displayName ?? this.displayName,
      email: email ?? this.email,
      location: location ?? this.location,
      role: role ?? this.role,
      walletBalanceEtb: walletBalanceEtb ?? this.walletBalanceEtb,
      isAgeVerified: isAgeVerified ?? this.isAgeVerified,
      isEmailVerified: isEmailVerified ?? this.isEmailVerified,
      verificationStatus: verificationStatus ?? this.verificationStatus,
    );
  }
}
