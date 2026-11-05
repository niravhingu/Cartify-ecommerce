import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, isAbort } from "../api";
import { useToast } from "../context/ToastContext";

const inr = (value) => Number(value || 0).toLocaleString("en-IN");

function OrderReceipt() {
  const navigate = useNavigate();
  const toast = useToast();
  const { orderGroupId } = useParams();
  const [cancelling, setCancelling] = useState(false);

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Replay ke liye: key badalne se animation dobara chalti hai
  const [animKey, setAnimKey] = useState(0);

  // =========================================================
  // FETCH ORDER (always from the server: it is the source of truth)
  // =========================================================
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    api(`/orders/${encodeURIComponent(orderGroupId)}`, { signal: controller.signal })
      .then((data) => setReceipt(data))
      .catch((err) => {
        if (isAbort(err)) return;
        console.error("RECEIPT ERROR:", err);
        setError(err.status === 404 ? "Order receipt not found." : err.message || "Unable to load receipt.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [orderGroupId]);

  // =========================================================
  // CANCEL
  // =========================================================
  const handleCancel = async () => {
    if (!window.confirm("Cancel this order? Items go back to stock and any payment will be refunded.")) return;

    setCancelling(true);
    try {
      const data = await api(`/orders/${encodeURIComponent(orderGroupId)}/cancel`, { method: "PATCH" });
      setReceipt(data);
      toast.success("Order cancelled");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  // =========================================================
  // PRINT
  // =========================================================
  const handlePrint = () => {
    window.print();
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
          <p className="mt-4 text-sm font-semibold text-gray-600">
            Preparing your receipt...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================
  if (error || !receipt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="text-5xl">🧾</div>

          <h1 className="mt-5 text-2xl font-black text-gray-900">
            Receipt Not Found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {error || "We could not find your order receipt."}
          </p>

          <button
            onClick={() => navigate("/")}
            className="mt-6 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // RECEIPT
  // =========================================================
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 sm:py-10">
      {/* ================= TOP BUTTONS ================= */}
      <div className="mx-auto mb-6 flex max-w-[430px] items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-black"
        >
          <span className="text-lg transition-transform group-hover:-translate-x-1">
            ←
          </span>
          Back to Home
        </button>

        <div className="flex flex-wrap justify-end gap-2">
          {receipt.canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50 sm:text-sm"
            >
              {cancelling ? "Cancelling..." : "Cancel order"}
            </button>
          )}

          <button
            onClick={() => setAnimKey((k) => k + 1)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 sm:text-sm"
          >
            ↻ Replay
          </button>

          <button
            onClick={handlePrint}
            className="rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-gray-800 sm:text-sm"
          >
            🖨 Print Receipt
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[430px]">
        {/* ================= PRINTER ================= */}
        <div className="printer-unit relative z-10 print:hidden">
          <div className="printer-top">
            <span className="printer-label">CARTIFY PRINTER</span>
            <span className="printer-led" />
          </div>

          <div className="printer-slot-bar">
            <div className="printer-slot-hole" />
          </div>
        </div>

        {/* ================= PAPER OUTPUT AREA ================= */}
        <div className="paper-window mx-4 sm:mx-6">
          <div
            key={animKey}
            className="receipt-paper receipt-animate bg-white px-6 py-8 text-gray-900 sm:px-8"
          >
            {/* ---------- HEADER ---------- */}
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-[0.22em]">CARTIFY</h1>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
                Shopping Receipt
              </p>

              <div className="my-5 border-t-2 border-dashed border-gray-400" />
            </div>

            {/* ---------- ORDER INFORMATION ---------- */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Order ID</span>
                <span className="break-all text-right font-black">
                  {receipt.orderGroupId}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Date</span>
                <span className="text-right">
                  {new Date(receipt.createdAt).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Status</span>
                <span className="font-bold">{receipt.status}</span>
              </div>
            </div>

            <div className="my-5 border-t border-dashed border-gray-400" />

            {/* ---------- CUSTOMER ---------- */}
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em]">
                Customer
              </p>

              <div className="space-y-1.5 text-xs">
                <p>
                  <span className="font-bold">Name:</span>{" "}
                  {receipt.customer.name}
                </p>

                <p className="break-all">
                  <span className="font-bold">Email:</span>{" "}
                  {receipt.customer.email}
                </p>

                <p>
                  <span className="font-bold">Mobile:</span>{" "}
                  {receipt.customer.mobile}
                </p>
              </div>
            </div>

            <div className="my-5 border-t border-dashed border-gray-400" />

            {/* ---------- DELIVERY ---------- */}
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em]">
                Delivery Address
              </p>

              <p className="text-xs leading-5">
                {receipt.customer.address}
                <br />
                {receipt.customer.city}, {receipt.customer.state}
                <br />
                PIN - {receipt.customer.pincode}
              </p>
            </div>

            <div className="my-5 border-t border-dashed border-gray-400" />

            {/* ---------- ITEMS ---------- */}
            <div>
              <div className="mb-4 flex justify-between text-[10px] font-black uppercase tracking-[0.15em]">
                <span>Item</span>
                <span>Amount</span>
              </div>

              <div className="space-y-4">
                {receipt.items.map((item, index) => (
                  <div key={item.id || index} className="text-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold">{item.product_name}</p>

                        <p className="mt-1 text-gray-500">
                          ₹{inr(item.price)} × {item.quantity}
                        </p>
                      </div>

                      <p className="shrink-0 font-black">₹{inr(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="my-5 border-t-2 border-dashed border-gray-400" />

            {/* ---------- BILL SUMMARY ---------- */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{inr(receipt.summary.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span>GST (6%)</span>
                <span>₹{inr(receipt.summary.gst)}</span>
              </div>

              <div className="flex justify-between">
                <span>Other Charges</span>
                <span>₹{inr(receipt.summary.otherCharges)}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-bold">FREE</span>
              </div>

              <div className="my-3 border-t border-gray-400" />

              <div className="flex justify-between text-base font-black">
                <span>TOTAL</span>
                <span>₹{inr(receipt.summary.totalAmount)}</span>
              </div>
            </div>

            <div className="my-5 border-t border-dashed border-gray-400" />

            {/* ---------- PAYMENT ---------- */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <span>Payment Method</span>
                <span className="font-bold">{receipt.payment.method}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Payment Status</span>
                <span className={`font-bold ${receipt.status === "Cancelled" ? "text-red-600" : "text-green-600"}`}>
                  {receipt.payment.status}
                </span>
              </div>
            </div>

            {/* ---------- THANK YOU ---------- */}
            <div className="mt-8 text-center">
              <div className="text-xs tracking-[0.35em]">* * * * * * * * *</div>

              <p className="mt-5 text-sm font-black">
                Thank you for shopping with Cartify!
              </p>

              <p className="mt-2 text-[10px] leading-4 text-gray-500">
                We appreciate your order.
              </p>

              <p className="mt-1 text-[10px] text-gray-500">
                This is a computer-generated receipt.
              </p>

              <div className="mt-5 text-xs tracking-[0.35em]">
                * * * * * * * * *
              </div>
            </div>

            {/* zigzag torn edge */}
            <div className="receipt-zigzag" />
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        /* ---------- Printer ---------- */
        .printer-unit { filter: drop-shadow(0 10px 14px rgba(0,0,0,.25)); }

        .printer-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 22px;
          border-radius: 22px 22px 6px 6px;
          background: linear-gradient(135deg, #e5ebf3, #b9c6d8);
        }

        .printer-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .25em;
          color: #334155;
        }

        .printer-led {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10d6a0;
          box-shadow: 0 0 12px #10d6a0;
          animation: ledBlink .5s ease-in-out infinite;
        }

        .printer-slot-bar {
          height: 34px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          border-radius: 0 0 18px 18px;
          background: linear-gradient(135deg, #cbd5e1, #8fa1ba);
        }

        .printer-slot-hole {
          width: 100%;
          height: 10px;
          border-radius: 99px;
          background: #0f172a;
          box-shadow: inset 0 3px 5px rgba(0,0,0,.6);
        }

        /* ---------- Paper ---------- */
        /* overflow hidden => paper slot ke upar kat jata hai, jaise andar se aa raha ho */
        .paper-window {
          overflow: hidden;
          margin-top: -6px;
          padding-bottom: 30px;
        }

        .receipt-animate {
          position: relative;
          box-shadow: 0 10px 25px rgba(0,0,0,.18);
          animation: receiptPrint 4.5s steps(60, end) both;
        }

        .receipt-zigzag {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -15px;
          height: 16px;
          background:
            linear-gradient(135deg, #fff 50%, transparent 50%),
            linear-gradient(225deg, #fff 50%, transparent 50%);
          background-size: 16px 16px;
          background-repeat: repeat-x;
        }

        @keyframes receiptPrint {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }

        @keyframes ledBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: .3; }
        }

        /* ---------- Real printing ---------- */
        @media print {
          body { background: white !important; margin: 0 !important; }

          .paper-window { overflow: visible; margin: 0; padding: 0; }

          .receipt-animate { animation: none !important; transform: none !important; }

          .receipt-paper {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 8mm !important;
            box-shadow: none !important;
          }

          .receipt-zigzag { display: none; }

          @page { size: 80mm auto; margin: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .receipt-animate { animation-duration: .01ms !important; }
          .printer-led { animation: none; }
        }
      `}</style>
    </div>
  );
}

export default OrderReceipt;
