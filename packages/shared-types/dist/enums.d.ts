export declare enum DrawStatus {
    DRAFT = "DRAFT",
    PENDING_REVIEW = "PENDING_REVIEW",
    SCHEDULED = "SCHEDULED",
    OPEN = "OPEN",
    CLOSING = "CLOSING",
    CLOSED = "CLOSED",
    AUTHORIZED = "AUTHORIZED",
    DRAWING = "DRAWING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    SUSPENDED = "SUSPENDED"
}
export declare enum TicketStatus {
    RESERVED = "RESERVED",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
    WON = "WON",
    LOST = "LOST",
    REFUNDED = "REFUNDED"
}
export declare enum OrderStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum PaymentMethod {
    TELEBIRR = "TELEBIRR",
    CBE_BIRR = "CBE_BIRR",
    CHAPA = "CHAPA",
    BANK_TRANSFER = "BANK_TRANSFER",
    WALLET = "WALLET",
    MOCK = "MOCK"
}
export declare enum UserRole {
    USER = "USER",
    SUPER_ADMIN = "SUPER_ADMIN",
    OPERATIONS = "OPERATIONS",
    FINANCE = "FINANCE",
    CONTENT_MANAGER = "CONTENT_MANAGER",
    CUSTOMER_SUPPORT = "CUSTOMER_SUPPORT",
    COMPLIANCE = "COMPLIANCE",
    AUDITOR = "AUDITOR"
}
export declare enum PrizeCategory {
    ELECTRONICS = "ELECTRONICS",
    VEHICLES = "VEHICLES",
    REAL_ESTATE = "REAL_ESTATE",
    CASH = "CASH",
    TRAVEL = "TRAVEL",
    LIFESTYLE = "LIFESTYLE"
}
export declare enum ClaimStatus {
    PENDING_CLAIM = "PENDING_CLAIM",
    IDENTITY_VERIFICATION = "IDENTITY_VERIFICATION",
    APPROVED = "APPROVED",
    PREPARING = "PREPARING",
    SHIPPED = "SHIPPED",
    DELIVERED = "DELIVERED",
    FORFEITED = "FORFEITED",
    DISPUTED = "DISPUTED"
}
export declare enum VerificationStatus {
    UNVERIFIED = "UNVERIFIED",
    PENDING = "PENDING",
    VERIFIED = "VERIFIED",
    REJECTED = "REJECTED"
}
export declare enum WebSocketEventType {
    DRAW_TICKETS_UPDATED = "draw:tickets_updated",
    DRAW_STATUS_CHANGED = "draw:status_changed",
    DRAW_COUNTDOWN_TICK = "draw:countdown_tick",
    DRAW_STARTED = "draw:started",
    DRAW_ROLLING = "draw:rolling",
    DRAW_WINNER_ANNOUNCED = "draw:winner_announced",
    ORDER_STATUS_CHANGED = "order:status_changed"
}
//# sourceMappingURL=enums.d.ts.map