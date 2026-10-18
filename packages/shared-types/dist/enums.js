"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketEventType = exports.VerificationStatus = exports.ClaimStatus = exports.PrizeCategory = exports.UserRole = exports.PaymentMethod = exports.PaymentStatus = exports.OrderStatus = exports.TicketStatus = exports.DrawStatus = void 0;
var DrawStatus;
(function (DrawStatus) {
    DrawStatus["DRAFT"] = "DRAFT";
    DrawStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    DrawStatus["SCHEDULED"] = "SCHEDULED";
    DrawStatus["OPEN"] = "OPEN";
    DrawStatus["CLOSING"] = "CLOSING";
    DrawStatus["CLOSED"] = "CLOSED";
    DrawStatus["AUTHORIZED"] = "AUTHORIZED";
    DrawStatus["DRAWING"] = "DRAWING";
    DrawStatus["COMPLETED"] = "COMPLETED";
    DrawStatus["CANCELLED"] = "CANCELLED";
    DrawStatus["SUSPENDED"] = "SUSPENDED";
})(DrawStatus || (exports.DrawStatus = DrawStatus = {}));
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["RESERVED"] = "RESERVED";
    TicketStatus["CONFIRMED"] = "CONFIRMED";
    TicketStatus["CANCELLED"] = "CANCELLED";
    TicketStatus["WON"] = "WON";
    TicketStatus["LOST"] = "LOST";
    TicketStatus["REFUNDED"] = "REFUNDED";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["PROCESSING"] = "PROCESSING";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["FAILED"] = "FAILED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["REFUNDED"] = "REFUNDED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PROCESSING"] = "PROCESSING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["CANCELLED"] = "CANCELLED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["TELEBIRR"] = "TELEBIRR";
    PaymentMethod["CBE_BIRR"] = "CBE_BIRR";
    PaymentMethod["CHAPA"] = "CHAPA";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["WALLET"] = "WALLET";
    PaymentMethod["MOCK"] = "MOCK";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["OPERATIONS"] = "OPERATIONS";
    UserRole["FINANCE"] = "FINANCE";
    UserRole["CONTENT_MANAGER"] = "CONTENT_MANAGER";
    UserRole["CUSTOMER_SUPPORT"] = "CUSTOMER_SUPPORT";
    UserRole["COMPLIANCE"] = "COMPLIANCE";
    UserRole["AUDITOR"] = "AUDITOR";
})(UserRole || (exports.UserRole = UserRole = {}));
var PrizeCategory;
(function (PrizeCategory) {
    PrizeCategory["ELECTRONICS"] = "ELECTRONICS";
    PrizeCategory["VEHICLES"] = "VEHICLES";
    PrizeCategory["REAL_ESTATE"] = "REAL_ESTATE";
    PrizeCategory["CASH"] = "CASH";
    PrizeCategory["TRAVEL"] = "TRAVEL";
    PrizeCategory["LIFESTYLE"] = "LIFESTYLE";
})(PrizeCategory || (exports.PrizeCategory = PrizeCategory = {}));
var ClaimStatus;
(function (ClaimStatus) {
    ClaimStatus["PENDING_CLAIM"] = "PENDING_CLAIM";
    ClaimStatus["IDENTITY_VERIFICATION"] = "IDENTITY_VERIFICATION";
    ClaimStatus["APPROVED"] = "APPROVED";
    ClaimStatus["PREPARING"] = "PREPARING";
    ClaimStatus["SHIPPED"] = "SHIPPED";
    ClaimStatus["DELIVERED"] = "DELIVERED";
    ClaimStatus["FORFEITED"] = "FORFEITED";
    ClaimStatus["DISPUTED"] = "DISPUTED";
})(ClaimStatus || (exports.ClaimStatus = ClaimStatus = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "UNVERIFIED";
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["VERIFIED"] = "VERIFIED";
    VerificationStatus["REJECTED"] = "REJECTED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var WebSocketEventType;
(function (WebSocketEventType) {
    WebSocketEventType["DRAW_TICKETS_UPDATED"] = "draw:tickets_updated";
    WebSocketEventType["DRAW_STATUS_CHANGED"] = "draw:status_changed";
    WebSocketEventType["DRAW_COUNTDOWN_TICK"] = "draw:countdown_tick";
    WebSocketEventType["DRAW_STARTED"] = "draw:started";
    WebSocketEventType["DRAW_ROLLING"] = "draw:rolling";
    WebSocketEventType["DRAW_WINNER_ANNOUNCED"] = "draw:winner_announced";
    WebSocketEventType["ORDER_STATUS_CHANGED"] = "order:status_changed";
})(WebSocketEventType || (exports.WebSocketEventType = WebSocketEventType = {}));
//# sourceMappingURL=enums.js.map