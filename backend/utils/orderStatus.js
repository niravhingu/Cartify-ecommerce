const ORDER_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

// status -> statuses it may move to
const TRANSITIONS = {
    Pending: ["Confirmed", "Cancelled"],
    Confirmed: ["Shipped", "Cancelled"],
    Shipped: ["Delivered"],
    Delivered: [],
    Cancelled: [],
};

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

// Customers may cancel only before the parcel ships.
const customerCanCancel = (status) => ["Pending", "Confirmed"].includes(status);

module.exports = { ORDER_STATUSES, TRANSITIONS, canTransition, customerCanCancel };
