// Single source of truth for money. The browser NEVER decides prices:
// cart + checkout + orders all call this on the server.
// All maths runs in integer paise to avoid floating-point drift.

const GST_RATE = 0.06;          // 6%
const OTHER_CHARGES = 99;       // flat handling fee when the cart is not empty
const DELIVERY_CHARGE = 0;      // delivery is free

const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const fromPaise = (paise) => Math.round(paise) / 100;

/**
 * @param {{price:number|string, quantity:number}[]} lines
 */
function calculatePricing(lines = []) {
    const subtotalPaise = lines.reduce(
        (sum, line) => sum + toPaise(line.price) * Number(line.quantity || 0),
        0
    );

    const hasItems = lines.length > 0;
    const gstPaise = Math.round(subtotalPaise * GST_RATE);
    const otherPaise = hasItems ? toPaise(OTHER_CHARGES) : 0;
    const deliveryPaise = hasItems ? toPaise(DELIVERY_CHARGE) : 0;

    return {
        subtotal: fromPaise(subtotalPaise),
        gst: fromPaise(gstPaise),
        otherCharges: fromPaise(otherPaise),
        deliveryCharge: fromPaise(deliveryPaise),
        totalAmount: fromPaise(subtotalPaise + gstPaise + otherPaise + deliveryPaise),
    };
}

module.exports = {
    GST_RATE,
    OTHER_CHARGES,
    DELIVERY_CHARGE,
    toPaise,
    fromPaise,
    calculatePricing,
};
