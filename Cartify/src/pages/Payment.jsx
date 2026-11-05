import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../context/StoreContext";
import { FALLBACK_IMAGE, handleImageError } from "../utils/format";

function Payment() {

    const navigate = useNavigate();
    const location = useLocation();

    // =========================================================
    // DELIVERY DATA FROM CHECKOUT
    // =========================================================

    const deliveryInfo = location.state?.deliveryInfo || {};

    // Items + totals are read from the server-side cart. The browser never
    // sends prices: the server recalculates everything when the order is placed.
    const { cartItems, cartSummary, refreshCart } = useStore();
    const paymentCartItems = cartItems.filter((item) => item.available);

    // Opened /payment directly (no address entered)? Go back to checkout.
    useEffect(() => {
        if (!location.state?.deliveryInfo) {
            navigate("/checkout", { replace: true });
        }
    }, [location.state, navigate]);

    // never navigate after the user already left this page
    const redirectTimer = useRef(null);
    useEffect(() => () => clearTimeout(redirectTimer.current), []);

    // =========================================================
    // PAYMENT STATE
    // =========================================================

    const [selectedMethod, setSelectedMethod] = useState("upi");

    const [processing, setProcessing] = useState(false);

    const [orderSuccess, setOrderSuccess] = useState(false);

    const [printingReceipt, setPrintingReceipt] = useState(null);

    const [error, setError] = useState("");

    const [paymentData, setPaymentData] = useState({
        upiApp: "",
        upiId: "",

        cardName: "",
        cardNumber: "",
        expiry: "",
        cvv: "",

        bankName: "",
        accountHolder: "",
        accountNumber: "",
        ifsc: "",

        confirmation: false,
    });

    // =========================================================
    // PRICE CALCULATION
    // =========================================================
    const subtotal = cartSummary.subtotal;
    const gst = cartSummary.gst;
    const otherCharges = cartSummary.otherCharges;
    const totalAmount = cartSummary.totalAmount;

    // =========================================================
    // INPUT HANDLER
    // =========================================================

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setError("");

        setPaymentData((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    };

    // =========================================================
    // CARD NUMBER
    // =========================================================

    const handleCardNumber = (e) => {
        const value = e.target.value
            .replace(/\D/g, "")
            .slice(0, 16);

        setPaymentData((prev) => ({
            ...prev,
            cardNumber: value,
        }));

        setError("");
    };

    // =========================================================
    // CVV
    // =========================================================

    const handleCVV = (e) => {
        const value = e.target.value
            .replace(/\D/g, "")
            .slice(0, 3);

        setPaymentData((prev) => ({
            ...prev,
            cvv: value,
        }));

        setError("");
    };

    // =========================================================
    // ACCOUNT NUMBER
    // =========================================================

    const handleAccountNumber = (e) => {
        const value = e.target.value
            .replace(/\D/g, "")
            .slice(0, 18);

        setPaymentData((prev) => ({
            ...prev,
            accountNumber: value,
        }));

        setError("");
    };

    // =========================================================
    // NAME INPUT
    // =========================================================

    const handleNameInput = (e, fieldName) => {
        const value = e.target.value;

        if (/^[a-zA-Z\s]*$/.test(value)) {
            setPaymentData((prev) => ({
                ...prev,
                [fieldName]: value,
            }));

            setError("");
        }
    };

    // =========================================================
    // EXPIRY DATE
    // =========================================================

    const handleExpiry = (e) => {
        let value = e.target.value
            .replace(/\D/g, "")
            .slice(0, 4);

        if (value.length >= 3) {
            value =
                value.slice(0, 2) +
                "/" +
                value.slice(2);
        }

        setPaymentData((prev) => ({
            ...prev,
            expiry: value,
        }));

        setError("");
    };

    // =========================================================
    // CHANGE PAYMENT METHOD
    // =========================================================

    const changeMethod = (method) => {
        if (processing || orderSuccess) return;

        setSelectedMethod(method);

        setError("");

        setPaymentData((prev) => ({
            ...prev,
            confirmation: false,
        }));
    };

    // =========================================================
    // VALIDATE PAYMENT
    // =========================================================

    const validatePayment = () => {
        // UPI
        if (selectedMethod === "upi") {
            if (!paymentData.upiApp) {
                return "Please select a UPI app.";
            }

            if (!paymentData.upiId.trim()) {
                return "Please enter your UPI ID.";
            }

            if (!paymentData.upiId.includes("@")) {
                return "Please enter a valid UPI ID.";
            }
        }

        // CARD
        if (selectedMethod === "card") {
            if (!paymentData.cardName.trim()) {
                return "Please enter card holder name.";
            }

            if (paymentData.cardNumber.length !== 16) {
                return "Card number must contain 16 digits.";
            }

            if (!/^\d{2}\/\d{2}$/.test(paymentData.expiry)) {
                return "Please enter expiry date in MM/YY format.";
            }

            if (paymentData.cvv.length !== 3) {
                return "CVV must contain 3 digits.";
            }
        }

        // NET BANKING
        if (selectedMethod === "netbanking") {
            if (!paymentData.bankName) {
                return "Please select your bank.";
            }

            if (!paymentData.accountHolder.trim()) {
                return "Please enter account holder name.";
            }

            if (paymentData.accountNumber.length < 6) {
                return "Please enter a valid account number.";
            }

            if (!paymentData.ifsc.trim()) {
                return "Please enter IFSC code.";
            }
        }

        // CONFIRMATION
        if (!paymentData.confirmation) {
            return "Please confirm the payment guidelines.";
        }

        return "";
    };

    // =========================================================
    // PLACE ORDER
    // =========================================================
    // =====================================================
    // PLACE ORDER
    // =====================================================

    const handlePlaceOrder = async () => {
        if (processing || orderSuccess) return;

        setError("");

        // =================================================
        // CLEAN DELIVERY INFORMATION
        // =================================================

        const customerName =
            deliveryInfo.name?.trim() || "";

        const customerEmail =
            deliveryInfo.email?.trim() || "";

        const customerMobile =
            deliveryInfo.mobile?.trim() || "";

        const customerAddress =
            deliveryInfo.address?.trim() || "";

        const customerCity =
            deliveryInfo.city?.trim() || "";

        const customerState =
            deliveryInfo.state?.trim() || "";

        const customerPincode =
            deliveryInfo.pincode?.trim() || "";


        // =================================================
        // CART ITEMS VALIDATION
        // =================================================

        if (paymentCartItems.length === 0) {
            setError(
                "Your cart is empty or product details are missing. Please go back to your cart and try again."
            );
            return;
        }

        // =================================================
        // CUSTOMER DETAILS VALIDATION
        // =================================================

        if (
            !customerName ||
            !customerEmail ||
            !customerMobile ||
            !customerAddress ||
            !customerCity ||
            !customerState ||
            !customerPincode
        ) {
            setError(
                "Customer details are required. Please go back to checkout and enter all delivery information."
            );

            return;
        }


        // =================================================
        // PAYMENT VALIDATION
        // =================================================

        const validationError = validatePayment();

        if (validationError) {
            setError(validationError);
            return;
        }


        // =================================================
        // START PROCESSING
        // =================================================

        setProcessing(true);


        try {

            // =================================================
            // PAYMENT METHOD
            // =================================================

            let paymentMethod = "UPI";

            if (selectedMethod === "card") {
                paymentMethod = "Card";
            }

            if (selectedMethod === "netbanking") {
                paymentMethod = "Net Banking";
            }

            if (selectedMethod === "cod") {
                paymentMethod = "COD";
            }


            // =================================================
            // CREATE ORDER
            // =================================================
            // Only WHO / WHERE / HOW TO PAY is sent. Products, quantities,
            // prices, GST and the total are taken from the server-side cart.

            const data = await api("/orders", {
                method: "POST",
                body: {
                    customer_name: customerName,
                    email: customerEmail,
                    mobile: customerMobile,
                    address: customerAddress,
                    city: customerCity,
                    state: customerState,
                    pincode: customerPincode,
                    payment_method: paymentMethod,
                },
            });

            if (!data.orderGroupId) {
                throw new Error("Order was created but order ID was not received.");
            }


            // =================================================
            // RECEIPT PREVIEW (only masked payment details are kept, in memory)
            // =================================================

            const maskAccountNumber = (value) => {
                const digits = String(value || "").replace(/\D/g, "");
                if (digits.length <= 6) return digits ? "••••" : "";
                return `${digits.slice(0, 4)}${"•".repeat(Math.max(0, digits.length - 6))}${digits.slice(-2)}`;
            };

            let paymentDetails = {
                method: paymentMethod,
                status: paymentMethod === "COD" ? "Pay on delivery" : "Demo Paid",
            };

            if (selectedMethod === "upi") {
                const upiParts = paymentData.upiId.trim().split("@");
                const upiUser = upiParts[0] || "";
                paymentDetails = {
                    ...paymentDetails,
                    app: paymentData.upiApp,
                    upiId: upiUser.length > 2
                        ? `${upiUser.slice(0, 2)}${"•".repeat(Math.min(5, upiUser.length - 2))}@${upiParts[1] || "upi"}`
                        : `••••@${upiParts[1] || "upi"}`,
                };
            } else if (selectedMethod === "card") {
                paymentDetails = {
                    ...paymentDetails,
                    cardHolder: paymentData.cardName.trim(),
                    cardNumber: `•••• •••• •••• ${paymentData.cardNumber.slice(-4)}`,
                    expiry: paymentData.expiry,
                };
            } else if (selectedMethod === "netbanking") {
                paymentDetails = {
                    ...paymentDetails,
                    bankName: paymentData.bankName,
                    accountHolder: paymentData.accountHolder.trim(),
                    accountNumber: maskAccountNumber(paymentData.accountNumber),
                    ifsc: paymentData.ifsc.trim().toUpperCase(),
                };
            }

            // the receipt itself (items, totals) is what the SERVER recorded
            setPrintingReceipt({ ...data.receipt, paymentDetails });

            // =================================================
            // SUCCESS
            // =================================================

            setProcessing(false);

            setOrderSuccess(true);

            // the server already emptied the cart in the same transaction
            refreshCart();


            // Receipt open after success message
            redirectTimer.current = setTimeout(() => {
                navigate(
                    `/order-success/${data.orderGroupId}`,
                    { replace: true }
                );
            }, 3000);


        } catch (error) {

            console.error(
                "ORDER CREATION ERROR:",
                error
            );


            setProcessing(false);

            // stock may have changed: show the cart as it really is now
            refreshCart();

            setError(
                error.message ||
                "Unable to place your order. Please try again."
            );
        }
    };
    // =========================================================
    // FORMAT CARD NUMBER
    // =========================================================

    const formattedCardNumber =
        paymentData.cardNumber
            ? paymentData.cardNumber
                .replace(
                    /(.{4})/g,
                    "$1 "
                )
                .trim()
            : "•••• •••• •••• ••••";

    // =========================================================
    // PRINTING ANIMATION SCREEN
    // =========================================================

    if (orderSuccess) {
        return (
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-gray-900 to-slate-800 px-4 py-10">
                <style>{`
                    @keyframes printerFloat {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-7px); }
                    }
                    @keyframes paperPrint {
                        0% { transform: translateY(-18px); opacity: 0; }
                        18% { opacity: 1; }
                        100% { transform: translateY(36px); opacity: 1; }
                    }
                    @keyframes printProgress {
                        from { width: 0%; }
                        to { width: 100%; }
                    }
                    @keyframes softGlow {
                        0%, 100% { opacity: .25; transform: scale(.95); }
                        50% { opacity: .55; transform: scale(1.08); }
                    }
                    .cartify-printer-float { animation: printerFloat 2s ease-in-out infinite; }
                    .cartify-paper-print { animation: paperPrint 2.2s ease-in-out infinite; }
                    .cartify-print-progress { animation: printProgress 3.2s linear forwards; }
                    .cartify-print-glow { animation: softGlow 2.5s ease-in-out infinite; }
                    @media (prefers-reduced-motion: reduce) {
                        .cartify-printer-float, .cartify-paper-print,
                        .cartify-print-progress, .cartify-print-glow {
                            animation: none !important;
                        }
                        .cartify-print-progress { width: 100%; }
                    }
                `}</style>

                <div className="cartify-print-glow pointer-events-none absolute h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />

                <div className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.07] p-7 text-center shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
                    <div className="mx-auto mb-6 flex h-14 w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-300">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </span>
                        {printingReceipt?.payment?.method === "COD" ? "Order confirmed · Pay on delivery" : "Payment confirmed · Demo mode"}
                    </div>

                    <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                        Your receipt is printing
                    </h1>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-300">
                        Order placed successfully! Please wait while Cartify prepares your receipt.
                    </p>

                    <div className="cartify-printer-float relative mx-auto mt-9 h-56 w-64">
                        <div className="cartify-paper-print absolute left-1/2 top-0 z-0 min-h-[250px] w-44 -translate-x-1/2 rounded-t-md bg-white px-3 pb-5 pt-4 text-left text-[9px] text-slate-800 shadow-xl">
                            <div className="text-center">
                                <p className="text-sm font-black tracking-wide">CARTIFY</p>
                                <p className="mt-0.5 text-[7px] font-semibold tracking-widest">ORDER RECEIPT</p>
                            </div>
                            <div className="my-2 border-t border-dashed border-slate-300" />
                            <div className="space-y-1">
                                <div className="flex justify-between gap-2">
                                    <span>Order</span>
                                    <span className="max-w-[95px] truncate font-bold">{printingReceipt?.orderGroupId || "Preparing..."}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span>Date</span>
                                    <span>{printingReceipt?.createdAt ? new Date(printingReceipt.createdAt).toLocaleDateString("en-IN") : "—"}</span>
                                </div>
                            </div>
                            <div className="my-2 border-t border-dashed border-slate-300" />
                            <p className="mb-1 font-bold">ITEMS</p>
                            <div className="space-y-1">
                                {(printingReceipt?.items || []).slice(0, 3).map((item, index) => (
                                    <div key={`${item.product_name}-${index}`} className="flex justify-between gap-2">
                                        <span className="max-w-[95px] truncate">{item.product_name} ×{item.quantity}</span>
                                        <span className="shrink-0">₹{Number(item.total || 0).toLocaleString("en-IN")}</span>
                                    </div>
                                ))}
                                {(printingReceipt?.items || []).length > 3 && (
                                    <p className="text-slate-500">+ {(printingReceipt.items.length - 3)} more item(s)</p>
                                )}
                            </div>
                            <div className="my-2 border-t border-dashed border-slate-300" />
                            <div className="flex justify-between font-bold">
                                <span>TOTAL</span>
                                <span>₹{Number(printingReceipt?.summary?.totalAmount || 0).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="my-2 border-t border-dashed border-slate-300" />
                            <p className="font-bold">PAYMENT: {printingReceipt?.paymentDetails?.method || "—"}</p>
                            {printingReceipt?.paymentDetails?.app && (
                                <p className="mt-1">App: {printingReceipt.paymentDetails.app}</p>
                            )}
                            {printingReceipt?.paymentDetails?.upiId && (
                                <p className="mt-1 break-all">UPI: {printingReceipt.paymentDetails.upiId}</p>
                            )}
                            {printingReceipt?.paymentDetails?.cardHolder && (
                                <>
                                    <p className="mt-1 truncate">Name: {printingReceipt.paymentDetails.cardHolder}</p>
                                    <p className="mt-1">Card: {printingReceipt.paymentDetails.cardNumber}</p>
                                </>
                            )}
                            {printingReceipt?.paymentDetails?.bankName && (
                                <>
                                    <p className="mt-1 truncate">Bank: {printingReceipt.paymentDetails.bankName}</p>
                                    <p className="mt-1 truncate">Holder: {printingReceipt.paymentDetails.accountHolder}</p>
                                    <p className="mt-1">A/C: {printingReceipt.paymentDetails.accountNumber}</p>
                                </>
                            )}
                            <div className="my-2 border-t border-dashed border-slate-300" />
                            <p className="text-center font-bold">THANK YOU!</p>
                            <p className="mt-1 text-center text-[7px] text-slate-500">DEMO PAYMENT · NO REAL CHARGE</p>
                        </div>

                        <div className="absolute bottom-5 left-1/2 z-10 h-28 w-56 -translate-x-1/2 rounded-2xl bg-gradient-to-b from-slate-200 to-slate-400 shadow-2xl">
                            <div className="absolute left-5 right-5 top-4 h-7 rounded-lg bg-slate-800 shadow-inner">
                                <div className="absolute left-3 top-3 h-1.5 w-14 rounded-full bg-slate-500" />
                                <div className="absolute right-3 top-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                            </div>
                            <div className="absolute -bottom-1 left-6 right-6 h-9 rounded-b-lg border-x-4 border-b-4 border-slate-500 bg-slate-100" />
                            <div className="absolute bottom-3 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-slate-300" />
                        </div>

                        <div className="absolute bottom-0 left-1/2 h-3 w-60 -translate-x-1/2 rounded-full bg-black/30 blur-md" />
                    </div>

                    <div className="mx-auto mt-2 max-w-xs">
                        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-300">
                            <span>Preparing your receipt</span>
                            <span className="text-orange-300">Please wait…</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="cartify-print-progress h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-emerald-400" />
                        </div>
                    </div>

                    <p className="mt-6 text-xs text-slate-400">
                        This is a free on-screen printing animation. No physical printer or real payment is used.
                    </p>
                </div>
            </div>
        );
    }

    // =========================================================
    // PAYMENT PAGE
    // =========================================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-8 sm:px-6 lg:px-10">

            <div className="mx-auto max-w-7xl">

                {/* ================================================= */}
                {/* BACK */}
                {/* ================================================= */}

                <button
                    disabled={processing}
                    onClick={() =>
                        navigate(-1)
                    }
                    className="group mb-7 flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span className="text-lg transition-transform group-hover:-translate-x-1">
                        ←
                    </span>

                    Back to Checkout
                </button>


                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <div className="mb-9">

                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
                        Cartify Payment
                    </p>

                    <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
                        Complete Payment
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                        Choose your preferred payment method
                        and complete your order.
                    </p>

                </div>


                {/* ================================================= */}
                {/* ERROR */}
                {/* ================================================= */}

                {error && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                        ⚠️ {error}
                    </div>
                )}


                {/* ================================================= */}
                {/* MAIN GRID */}
                {/* ================================================= */}

                <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">


                    {/* ================================================= */}
                    {/* PAYMENT AREA */}
                    {/* ================================================= */}

                    <div className="space-y-6">

                        {/* PAYMENT METHODS */}

                        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">

                            <div className="mb-6">

                                <h2 className="text-2xl font-black text-gray-900">
                                    Payment Method
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Select how you want to complete your order.
                                </p>

                            </div>


                            {/* METHOD BUTTONS */}

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                                {/* UPI */}

                                <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() =>
                                        changeMethod("upi")
                                    }
                                    className={`rounded-2xl border p-4 text-left transition ${selectedMethod === "upi"
                                        ? "border-black bg-black text-white shadow-lg"
                                        : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-400"
                                        }`}
                                >

                                    <div className="text-2xl">
                                        📱
                                    </div>

                                    <p className="mt-2 font-bold">
                                        UPI
                                    </p>

                                    <p
                                        className={`mt-1 text-xs ${selectedMethod === "upi"
                                            ? "text-gray-300"
                                            : "text-gray-500"
                                            }`}
                                    >
                                        Google Pay, PhonePe, Paytm
                                    </p>

                                </button>


                                {/* CARD */}

                                <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() =>
                                        changeMethod("card")
                                    }
                                    className={`rounded-2xl border p-4 text-left transition ${selectedMethod === "card"
                                        ? "border-black bg-black text-white shadow-lg"
                                        : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-400"
                                        }`}
                                >

                                    <div className="text-2xl">
                                        💳
                                    </div>

                                    <p className="mt-2 font-bold">
                                        Card
                                    </p>

                                    <p
                                        className={`mt-1 text-xs ${selectedMethod === "card"
                                            ? "text-gray-300"
                                            : "text-gray-500"
                                            }`}
                                    >
                                        Credit / Debit Card
                                    </p>

                                </button>


                                {/* NET BANKING */}

                                <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() =>
                                        changeMethod(
                                            "netbanking"
                                        )
                                    }
                                    className={`rounded-2xl border p-4 text-left transition ${selectedMethod === "netbanking"
                                        ? "border-black bg-black text-white shadow-lg"
                                        : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-400"
                                        }`}
                                >

                                    <div className="text-2xl">
                                        🏦
                                    </div>

                                    <p className="mt-2 font-bold">
                                        Net Banking
                                    </p>

                                    <p
                                        className={`mt-1 text-xs ${selectedMethod === "netbanking"
                                            ? "text-gray-300"
                                            : "text-gray-500"
                                            }`}
                                    >
                                        Pay through your bank
                                    </p>

                                </button>


                                {/* CASH ON DELIVERY */}

                                <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() =>
                                        changeMethod("cod")
                                    }
                                    className={`rounded-2xl border p-4 text-left transition ${selectedMethod === "cod"
                                        ? "border-black bg-black text-white shadow-lg"
                                        : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-400"
                                        }`}
                                >

                                    <div className="text-2xl">
                                        💵
                                    </div>

                                    <p className="mt-2 font-bold">
                                        Cash on Delivery
                                    </p>

                                    <p
                                        className={`mt-1 text-xs ${selectedMethod === "cod"
                                            ? "text-gray-300"
                                            : "text-gray-500"
                                            }`}
                                    >
                                        Pay when it arrives
                                    </p>

                                </button>

                            </div>


                            {/* ================================================= */}
                            {/* UPI */}
                            {/* ================================================= */}

                            {selectedMethod === "upi" && (

                                <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-5">

                                    <h3 className="text-lg font-bold text-gray-900">
                                        Pay using UPI
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Select your UPI app and enter your UPI ID.
                                    </p>


                                    {/* UPI APPS */}

                                    <div className="mt-5 grid grid-cols-3 gap-3">

                                        {[
                                            "Google Pay",
                                            "PhonePe",
                                            "Paytm",
                                        ].map(
                                            (app) => (
                                                <button
                                                    key={app}
                                                    type="button"
                                                    disabled={
                                                        processing
                                                    }
                                                    onClick={() =>
                                                        setPaymentData(
                                                            (
                                                                prev
                                                            ) => ({
                                                                ...prev,
                                                                upiApp:
                                                                    app,
                                                            })
                                                        )
                                                    }
                                                    className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${paymentData.upiApp ===
                                                        app
                                                        ? "border-black bg-black text-white"
                                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                                                        }`}
                                                >
                                                    {app}
                                                </button>
                                            )
                                        )}

                                    </div>


                                    {/* UPI ID */}

                                    <div className="mt-5">

                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            UPI ID *
                                        </label>

                                        <input
                                            type="text"
                                            name="upiId"
                                            value={
                                                paymentData.upiId
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                processing
                                            }
                                            placeholder="example@upi"
                                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-black focus:ring-4 focus:ring-gray-100 disabled:opacity-60"
                                        />

                                    </div>

                                </div>
                            )}


                            {/* ================================================= */}
                            {/* CARD */}
                            {/* ================================================= */}

                            {selectedMethod === "card" && (

                                <div className="mt-7 space-y-6">

                                    {/* CARD PREVIEW */}

                                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 text-white shadow-xl">

                                        <div className="flex justify-between">

                                            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                                                Cartify
                                            </span>

                                            <span className="text-xl">
                                                💳
                                            </span>

                                        </div>

                                        <p className="mt-10 text-xl font-bold tracking-[0.18em]">
                                            {formattedCardNumber}
                                        </p>

                                        <div className="mt-7 flex justify-between">

                                            <div>

                                                <p className="text-[9px] uppercase text-gray-400">
                                                    Card Holder
                                                </p>

                                                <p className="mt-1 text-sm font-bold uppercase">
                                                    {paymentData.cardName ||
                                                        "YOUR NAME"}
                                                </p>

                                            </div>

                                            <div>

                                                <p className="text-[9px] uppercase text-gray-400">
                                                    Expires
                                                </p>

                                                <p className="mt-1 text-sm font-bold">
                                                    {paymentData.expiry ||
                                                        "MM/YY"}
                                                </p>

                                            </div>

                                        </div>

                                    </div>


                                    {/* CARD FORM */}

                                    <div className="grid gap-5 sm:grid-cols-2">

                                        <div className="sm:col-span-2">

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Card Holder Name *
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    paymentData.cardName
                                                }
                                                onChange={(e) =>
                                                    handleNameInput(
                                                        e,
                                                        "cardName"
                                                    )
                                                }
                                                disabled={
                                                    processing
                                                }
                                                placeholder="Enter card holder name"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none focus:border-black focus:bg-white"
                                            />

                                        </div>


                                        <div className="sm:col-span-2">

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Card Number *
                                            </label>

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={
                                                    paymentData.cardNumber
                                                }
                                                onChange={
                                                    handleCardNumber
                                                }
                                                disabled={
                                                    processing
                                                }
                                                placeholder="16 digit card number"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm tracking-wider outline-none focus:border-black focus:bg-white"
                                            />

                                        </div>


                                        <div>

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Expiry *
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    paymentData.expiry
                                                }
                                                onChange={
                                                    handleExpiry
                                                }
                                                disabled={
                                                    processing
                                                }
                                                placeholder="MM/YY"
                                                maxLength={5}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none focus:border-black focus:bg-white"
                                            />

                                        </div>


                                        <div>

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                CVV *
                                            </label>

                                            <input
                                                type="password"
                                                inputMode="numeric"
                                                value={
                                                    paymentData.cvv
                                                }
                                                onChange={
                                                    handleCVV
                                                }
                                                disabled={
                                                    processing
                                                }
                                                placeholder="3 digit CVV"
                                                maxLength={3}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none focus:border-black focus:bg-white"
                                            />

                                        </div>

                                    </div>

                                </div>
                            )}


                            {/* ================================================= */}
                            {/* NET BANKING */}
                            {/* ================================================= */}

                            {selectedMethod === "netbanking" && (

                                <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-5">

                                    <h3 className="text-lg font-bold text-gray-900">
                                        Net Banking
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Enter your banking details.
                                    </p>


                                    <div className="mt-5 grid gap-5 sm:grid-cols-2">

                                        {/* BANK */}

                                        <div className="sm:col-span-2">

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Bank Name *
                                            </label>

                                            <select
                                                name="bankName"
                                                value={
                                                    paymentData.bankName
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    processing
                                                }
                                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-black"
                                            >

                                                <option value="">
                                                    Select Bank
                                                </option>

                                                <option value="State Bank of India">
                                                    State Bank of India
                                                </option>

                                                <option value="HDFC Bank">
                                                    HDFC Bank
                                                </option>

                                                <option value="ICICI Bank">
                                                    ICICI Bank
                                                </option>

                                                <option value="Axis Bank">
                                                    Axis Bank
                                                </option>

                                                <option value="Bank of Baroda">
                                                    Bank of Baroda
                                                </option>

                                                <option value="Punjab National Bank">
                                                    Punjab National Bank
                                                </option>

                                            </select>

                                        </div>


                                        {/* ACCOUNT HOLDER */}

                                        <div>

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Account Holder Name *
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    paymentData.accountHolder
                                                }
                                                onChange={(e) =>
                                                    handleNameInput(
                                                        e,
                                                        "accountHolder"
                                                    )
                                                }
                                                disabled={
                                                    processing
                                                }
                                                placeholder="Account holder name"
                                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-black"
                                            />

                                        </div>


                                        {/* ACCOUNT NUMBER */}

                                        <div>

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Account Number *
                                            </label>

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={
                                                    paymentData.accountNumber
                                                }
                                                onChange={
                                                    handleAccountNumber
                                                }
                                                disabled={
                                                    processing
                                                }
                                                placeholder="Account number"
                                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-black"
                                            />

                                        </div>


                                        {/* IFSC */}

                                        <div className="sm:col-span-2">

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                IFSC Code *
                                            </label>

                                            <input
                                                type="text"
                                                name="ifsc"
                                                value={
                                                    paymentData.ifsc
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    processing
                                                }
                                                placeholder="Enter IFSC code"
                                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm uppercase outline-none focus:border-black"
                                            />

                                        </div>

                                    </div>

                                </div>
                            )}


                            {selectedMethod === "cod" && (
                                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
                                    <p className="font-bold text-gray-900">Pay when your order arrives</p>
                                    <p className="mt-1">
                                        No payment details are needed now. Please keep the exact amount of{" "}
                                        <span className="font-bold text-gray-900">₹{totalAmount.toLocaleString("en-IN")}</span>{" "}
                                        ready for the delivery person.
                                    </p>
                                </div>
                            )}


                            {/* ================================================= */}
                            {/* CONFIRMATION */}
                            {/* ================================================= */}

                            <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-5">

                                <label className="flex cursor-pointer items-start gap-3">

                                    <input
                                        type="checkbox"
                                        name="confirmation"
                                        checked={
                                            paymentData.confirmation
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            processing
                                        }
                                        className="mt-1 h-4 w-4 accent-black"
                                    />

                                    <span className="text-sm leading-6 text-gray-600">

                                        <span className="font-semibold text-gray-900">
                                            I have read and agree to the payment guidelines.
                                        </span>

                                        <br />

                                        I understand that this Cartify payment is for testing purposes only and no real payment will be processed. I confirm that the details entered above are valid for this test order.

                                    </span>

                                </label>

                            </div>


                            {/* ================================================= */}
                            {/* PLACE ORDER */}
                            {/* ================================================= */}

                            <button
                                onClick={
                                    handlePlaceOrder
                                }
                                disabled={
                                    processing
                                }
                                className={`mt-6 flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 font-bold text-white shadow-lg transition ${processing
                                    ? "cursor-not-allowed bg-gray-700"
                                    : "bg-black hover:-translate-y-0.5 hover:bg-gray-800"
                                    }`}
                            >

                                {processing ? (
                                    <>
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                                        Processing Order...
                                    </>
                                ) : (
                                    <>
                                        Place Order

                                        <span>
                                            →
                                        </span>
                                    </>
                                )}

                            </button>

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* ORDER SUMMARY */}
                    {/* ================================================= */}

                    <div className="lg:sticky lg:top-6">

                        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">

                            <div className="border-b border-gray-100 p-6">

                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                    Cartify
                                </p>

                                <h2 className="mt-1 text-2xl font-black text-gray-900">
                                    Order Summary
                                </h2>

                            </div>


                            {/* PRODUCTS */}

                            <div className="max-h-80 space-y-4 overflow-y-auto p-6">

                                {paymentCartItems.map(
                                    (item) => (
                                        <div
                                            key={
                                                item.id ?? `${item.product_name}-${item.price}`
                                            }
                                            className="flex gap-4"
                                        >

                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">

                                                <img
                                                    src={
                                                        item.image || FALLBACK_IMAGE
                                                    }
                                                    onError={handleImageError}
                                                    alt={
                                                        item.product_name
                                                    }
                                                    className="h-full w-full object-contain p-1"
                                                />

                                            </div>

                                            <div className="min-w-0 flex-1">

                                                <p className="truncate text-sm font-bold text-gray-900">
                                                    {
                                                        item.product_name
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    Qty:{" "}
                                                    {
                                                        item.quantity ||
                                                        1
                                                    }
                                                </p>

                                            </div>

                                            <p className="shrink-0 text-sm font-bold text-gray-900">

                                                ₹
                                                {(
                                                    Number(
                                                        item.price
                                                    ) *
                                                    Number(
                                                        item.quantity ||
                                                        1
                                                    )
                                                ).toLocaleString(
                                                    "en-IN"
                                                )}

                                            </p>

                                        </div>
                                    )
                                )}

                            </div>


                            {/* SUMMARY */}

                            <div className="border-t border-gray-100 p-6">

                                <div className="space-y-3 text-sm">

                                    <div className="flex justify-between">

                                        <span className="text-gray-500">
                                            Subtotal
                                        </span>

                                        <span className="font-semibold">
                                            ₹
                                            {subtotal.toLocaleString(
                                                "en-IN"
                                            )}
                                        </span>

                                    </div>


                                    <div className="flex justify-between">

                                        <span className="text-gray-500">
                                            GST (6%)
                                        </span>

                                        <span className="font-semibold">
                                            ₹
                                            {gst.toLocaleString(
                                                "en-IN"
                                            )}
                                        </span>

                                    </div>


                                    <div className="flex justify-between">

                                        <span className="text-gray-500">
                                            Other Charges
                                        </span>

                                        <span className="font-semibold">
                                            ₹
                                            {otherCharges.toLocaleString(
                                                "en-IN"
                                            )}
                                        </span>

                                    </div>


                                    <div className="flex justify-between">

                                        <span className="text-gray-500">
                                            Delivery
                                        </span>

                                        <span className="font-bold text-green-600">
                                            FREE
                                        </span>

                                    </div>

                                </div>


                                <div className="my-5 border-t border-dashed border-gray-200" />


                                <div className="flex items-center justify-between">

                                    <span className="font-bold text-gray-900">
                                        Total
                                    </span>

                                    <span className="text-2xl font-black text-gray-900">
                                        ₹
                                        {totalAmount.toLocaleString(
                                            "en-IN"
                                        )}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Payment;
