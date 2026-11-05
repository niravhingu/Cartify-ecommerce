// Mirrors backend/utils/orderStatus.js (the server enforces these rules too)
export const ORDER_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export const NEXT_STATUSES = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export const STATUS_TONE = {
  Pending: "amber",
  Confirmed: "blue",
  Shipped: "indigo",
  Delivered: "green",
  Cancelled: "red",
  paid: "green",
  pending: "amber",
  failed: "red",
  refunded: "slate",
};
