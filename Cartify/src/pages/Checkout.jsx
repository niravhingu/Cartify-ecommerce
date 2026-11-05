import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { handleImageError } from "../utils/format";

// "TamilNadu" -> "Tamil Nadu" (the keys below have no spaces)
const prettyState = (name) => name.replace(/([a-z])([A-Z])/g, "$1 $2");

const stateCities = {
  Gujarat: [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Gandhinagar",
    "Bhavnagar",
    "Jamnagar",
    "Junagadh",
    "Anand",
    "Mehsana",
  ],

  Maharashtra: [
    "Mumbai",
    "Pune",
    "Nagpur",
    "Nashik",
    "Thane",
    "Aurangabad",
    "Kolhapur",
    "Solapur",
  ],

  Rajasthan: [
    "Jaipur",
    "Jodhpur",
    "Udaipur",
    "Kota",
    "Ajmer",
    "Bikaner",
    "Alwar",
  ],

  Delhi: [
    "New Delhi",
    "Delhi",
  ],

  Karnataka: [
    "Bengaluru",
    "Mysuru",
    "Mangaluru",
    "Hubballi",
    "Belagavi",
  ],

  TamilNadu: [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Salem",
    "Tiruchirappalli",
  ],

  Telangana: [
    "Hyderabad",
    "Warangal",
    "Nizamabad",
    "Karimnagar",
  ],

  WestBengal: [
    "Kolkata",
    "Howrah",
    "Durgapur",
    "Siliguri",
  ],

  UttarPradesh: [
    "Lucknow",
    "Kanpur",
    "Noida",
    "Ghaziabad",
    "Agra",
    "Varanasi",
    "Prayagraj",
  ],

  MadhyaPradesh: [
    "Bhopal",
    "Indore",
    "Gwalior",
    "Jabalpur",
    "Ujjain",
  ],

  Haryana: [
    "Gurugram",
    "Faridabad",
    "Panipat",
    "Ambala",
    "Hisar",
  ],

  Punjab: [
    "Amritsar",
    "Ludhiana",
    "Jalandhar",
    "Patiala",
    "Bathinda",
  ],

  Bihar: [
    "Patna",
    "Gaya",
    "Muzaffarpur",
    "Bhagalpur",
  ],

  Odisha: [
    "Bhubaneswar",
    "Cuttack",
    "Rourkela",
    "Puri",
  ],

  Kerala: [
    "Thiruvananthapuram",
    "Kochi",
    "Kozhikode",
    "Thrissur",
  ],

  AndhraPradesh: [
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "Tirupati",
  ],

  Jharkhand: [
    "Ranchi",
    "Jamshedpur",
    "Dhanbad",
    "Bokaro",
  ],

  Chhattisgarh: [
    "Raipur",
    "Bhilai",
    "Bilaspur",
    "Korba",
  ],

  Uttarakhand: [
    "Dehradun",
    "Haridwar",
    "Haldwani",
    "Nainital",
  ],

  HimachalPradesh: [
    "Shimla",
    "Dharamshala",
    "Manali",
    "Solan",
  ],

  Assam: [
    "Guwahati",
    "Dibrugarh",
    "Silchar",
    "Jorhat",
  ],

  Goa: [
    "Panaji",
    "Vasco da Gama",
    "Margao",
  ],

  Jammu: [
    "Jammu",
    "Srinagar",
  ],
};

function Checkout({ currentUser }) {
  const navigate = useNavigate();

  // Cart + totals come from the server (the browser cannot change them).
  const { cartItems, cartSummary, cartLoading } = useStore();

  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [error, setError] = useState("");

  // =====================================================
  // CALCULATIONS
  // =====================================================

  const totalItems = cartSummary.totalQuantity;
  const subtotal = cartSummary.subtotal;
  const gst = cartSummary.gst;
  const otherCharges = cartSummary.otherCharges;
  const totalAmount = cartSummary.totalAmount;


  // =====================================================
  // INPUT HANDLER
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setError("");

    // State change hone par city reset
    if (name === "state") {
      setFormData((prev) => ({
        ...prev,
        state: value,
        city: "",
      }));

      return;
    }

    // Mobile / Pincode sirf numbers
    if (name === "mobile" || name === "pincode") {
      const numbersOnly = value.replace(/\D/g, "");

      const maxLength = name === "mobile" ? 10 : 6;

      setFormData((prev) => ({
        ...prev,
        [name]: numbersOnly.slice(0, maxLength),
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  // =====================================================
  // VALIDATION
  // =====================================================

  const validateForm = () => {

    if (!formData.name.trim()) {
      return "Please enter your full name.";
    }

    if (!formData.email.trim()) {
      return "Please enter your email address.";
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (formData.mobile.length !== 10) {
      return "Mobile number must contain 10 digits.";
    }

    if (!formData.address.trim()) {
      return "Please enter your full delivery address.";
    }

    if (!formData.state) {
      return "Please select your state.";
    }

    if (!formData.city) {
      return "Please select your city.";
    }

    if (formData.pincode.length !== 6) {
      return "Pincode must contain 6 digits.";
    }

    return "";
  };


  // =====================================================
  // GO TO PAYMENT
  // =====================================================
  // =====================================================
  // GO TO PAYMENT
  // =====================================================

  const handleContinue = () => {
    const validationError = validateForm();

    if (validationError) {
        setError(validationError);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

        return;
    }

    if (cartItems.length === 0) {
        setError("Your cart is empty. Please add products before checkout.");
        return;
    }

    if (cartSummary.hasUnavailable) {
        setError("Some items in your cart are out of stock. Please remove them first.");
        return;
    }

    const deliveryInfo = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: prettyState(formData.state.trim()),
        pincode: formData.pincode.trim(),
    };

    // Only the address travels to the next step. Items and prices are read
    // again from the server when the order is placed.
    navigate("/payment", { state: { deliveryInfo } });
};

  // =====================================================
  // EMPTY CART
  // =====================================================

  if (cartLoading && cartItems.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">

          <div className="text-6xl">
            🛒
          </div>

          <h1 className="mt-5 text-3xl font-black text-gray-900">
            Your cart is empty
          </h1>

          <button
            onClick={() => navigate("/products")}
            className="mt-6 rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
          >
            Continue Shopping
          </button>

        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-8 sm:px-6 lg:px-10">

      <div className="mx-auto max-w-7xl">

        {/* ================================================= */}
        {/* BACK */}
        {/* ================================================= */}

        <button
          onClick={() => navigate(-1)}
          className="group mb-7 flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-black"
        >
          <span className="text-lg transition-transform group-hover:-translate-x-1">
            ←
          </span>

          Back
        </button>


        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-9">

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
            Cartify Checkout
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            Complete Your Order
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
            Enter your delivery information and continue to secure payment.
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
        {/* MAIN */}
        {/* ================================================= */}

        <div className="grid items-start gap-8 lg:grid-cols-[1.35fr_0.75fr]">


          {/* ================================================= */}
          {/* LEFT */}
          {/* ================================================= */}

          <div className="space-y-6">

            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">

              {/* HEADER */}

              <div className="border-b border-gray-100 p-6 sm:p-8">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black font-bold text-white">
                    01
                  </div>

                  <div>

                    <h2 className="text-xl font-bold text-gray-900">
                      Delivery Information
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Enter the address where you want your order delivered.
                    </p>

                  </div>

                </div>

              </div>


              {/* FORM */}

              <div className="p-6 sm:p-8">

                <div className="grid gap-5 sm:grid-cols-2">


                  {/* NAME */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Full Name *
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100"
                    />

                  </div>


                  {/* EMAIL */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Email Address *
                    </label>

                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100"
                    />

                  </div>


                  {/* MOBILE */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Mobile Number *
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100"
                    />

                  </div>


                  {/* PINCODE */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Pincode *
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="6-digit pincode"
                      maxLength={6}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100"
                    />

                  </div>


                  {/* ADDRESS */}

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Full Address *
                    </label>

                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={4}
                      placeholder="House / Flat / Street / Area"
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100"
                    />

                  </div>


                  {/* STATE */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      State *
                    </label>

                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100"
                    >

                      <option value="">
                        Select State
                      </option>

                      {Object.keys(stateCities).map((state) => (
                        <option
                          key={state}
                          value={state}
                        >
                          {state}
                        </option>
                      ))}

                    </select>

                  </div>


                  {/* CITY */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      City *
                    </label>

                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={!formData.state}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-gray-100 disabled:cursor-not-allowed disabled:opacity-60 focus:border-black"
                    >

                      <option value="">
                        {formData.state
                          ? "Select City"
                          : "Select State First"}
                      </option>

                      {formData.state &&
                        stateCities[formData.state]?.map(
                          (city) => (
                            <option
                              key={city}
                              value={city}
                            >
                              {city}
                            </option>
                          )
                        )}

                    </select>

                  </div>

                </div>

              </div>

            </div>


            {/* FEATURES */}

            <div className="grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-2xl">🚚</div>
                <h3 className="mt-3 text-sm font-bold">
                  Fast Delivery
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Quick delivery to your doorstep.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-2xl">🔒</div>
                <h3 className="mt-3 text-sm font-bold">
                  Secure Checkout
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Your information stays protected.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-2xl">↩️</div>
                <h3 className="mt-3 text-sm font-bold">
                  Easy Returns
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Hassle-free eligible returns.
                </p>
              </div>

            </div>

          </div>


          {/* ================================================= */}
          {/* RIGHT SUMMARY */}
          {/* ================================================= */}

          <div className="lg:sticky lg:top-6">

            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">

              <div className="border-b border-gray-100 p-6">

                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Cartify
                </p>

                <h2 className="mt-1 text-2xl font-black text-gray-900">
                  Order Summary
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </p>

              </div>


              {/* PRODUCTS */}

              <div className="max-h-80 space-y-4 overflow-y-auto p-6">

                {cartItems.map((item) => (

                  <div
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-3"
                  >

                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">

                      <img
                        src={item.image}
                        onError={handleImageError}
                        alt={item.product_name}
                        className="h-full w-full object-contain p-1"
                      />

                    </div>

                    <div className="min-w-0 flex-1">

                      <h3 className="truncate text-sm font-bold text-gray-900">
                        {item.product_name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Qty × {item.quantity || 1}
                      </p>

                      <p className="mt-2 text-sm font-bold">
                        ₹
                        {(
                          Number(item.price) *
                          Number(item.quantity || 1)
                        ).toLocaleString("en-IN")}
                      </p>

                    </div>

                  </div>

                ))}

              </div>


              {/* PRICE */}

              <div className="border-t border-gray-100 p-6">

                <div className="space-y-3 text-sm">

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Subtotal
                    </span>
                    <span className="font-semibold">
                      ₹{subtotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      GST (6%)
                    </span>
                    <span className="font-semibold">
                      ₹{gst.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Other Charges
                    </span>
                    <span className="font-semibold">
                      ₹{otherCharges.toLocaleString("en-IN")}
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


                <div className="flex items-end justify-between">

                  <div>

                    <p className="text-sm text-gray-500">
                      Total Amount
                    </p>

                    <p className="mt-1 text-3xl font-black text-gray-900">
                      ₹{totalAmount.toLocaleString("en-IN")}
                    </p>

                  </div>

                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
                    Secure
                  </span>

                </div>


                {/* CONTINUE */}

                <button
                  onClick={handleContinue}
                  className="group mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-black px-5 py-4 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-800"
                >

                  Choose Payment Method

                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>

                </button>


                <p className="mt-4 text-center text-xs text-gray-400">
                  🔒 Secure checkout
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Checkout;