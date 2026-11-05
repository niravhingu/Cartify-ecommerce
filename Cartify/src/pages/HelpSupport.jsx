import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// Set VITE_SUPPORT_EMAIL (and optionally VITE_SUPPORT_PHONE) in Cartify/.env
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "";
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || "";

const FAQS = [
  ["How do I place an order?", "Add products to your cart, press Proceed to Checkout, enter your delivery address and choose a payment method. You need to be logged in to check out."],
  ["Which payment methods are available?", "UPI, Card, Net Banking and Cash on Delivery. Online payments currently run in demo mode: no real money is charged."],
  ["Is delivery free?", "Yes. Delivery is free on every order. A small flat handling charge and 6% GST are shown clearly in your cart and at checkout before you pay."],
  ["How can I track my order?", "Open My Orders from the account menu. Each order shows its status: Pending, Confirmed, Shipped or Delivered. Open the receipt for the full details."],
  ["Can I cancel an order?", "Yes, while it is still Pending or Confirmed. Open My Orders and choose Cancel order. The items go back to stock and any online payment is marked refunded. Once an order has shipped it can no longer be cancelled."],
  ["What is your return policy?", "Products can be returned within 7 days of delivery if they are unused and in their original packaging."],
  ["I forgot my password. What now?", "While logged in you can change it under Settings. If you cannot log in at all, contact support using the details below."],
  ["Why can't I add more of a product?", "The quantity you can order is limited by the stock we have. If you already have every available unit in your cart, the add button is disabled."],
];

function HelpSupport() {
  const { hash } = useLocation();
  const [open, setOpen] = useState(0);

  useEffect(() => {
    if (hash === "#faq") document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-widest text-orange-500">We're here to help</p>
        <h1 className="mt-2 text-4xl font-black text-gray-950">Help & Support</h1>
        <p className="mt-2 text-gray-500">Quick answers to common questions about orders, payments and delivery.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["📦", "Track an order", "See the status of your purchases", "/orders"],
            ["♡", "My wishlist", "Products you saved for later", "/wishlist"],
            ["🛍️", "Keep shopping", "Browse the full catalogue", "/products"],
          ].map(([icon, title, text, to]) => (
            <Link key={title} to={to} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="text-2xl">{icon}</div>
              <p className="mt-3 font-bold text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-500">{text}</p>
            </Link>
          ))}
        </div>

        <section id="faq" className="mt-12 scroll-mt-32">
          <h2 className="text-2xl font-black text-gray-950">Frequently asked questions</h2>

          <div className="mt-5 divide-y divide-gray-100 rounded-3xl border border-gray-100 bg-white shadow-sm">
            {FAQS.map(([question, answer], index) => {
              const isOpen = open === index;
              return (
                <div key={question}>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-gray-900 transition hover:text-orange-600"
                  >
                    {question}
                    <span className={`shrink-0 text-xl transition ${isOpen ? "rotate-45" : ""}`}>+</span>
                  </button>
                  {isOpen && <p className="px-6 pb-5 leading-7 text-gray-600">{answer}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 rounded-3xl bg-gray-950 p-8 text-white">
          <h2 className="text-2xl font-black">Still need help?</h2>
          {SUPPORT_EMAIL || SUPPORT_PHONE ? (
            <div className="mt-4 space-y-2 text-gray-300">
              {SUPPORT_EMAIL && (
                <p>
                  Email us at{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-orange-400 hover:underline">{SUPPORT_EMAIL}</a>
                </p>
              )}
              {SUPPORT_PHONE && (
                <p>
                  Call{" "}
                  <a href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`} className="font-semibold text-orange-400 hover:underline">{SUPPORT_PHONE}</a>
                </p>
              )}
              <p className="text-sm text-gray-500">Please include your order ID so we can help faster.</p>
            </div>
          ) : (
            <p className="mt-4 text-gray-400">
              Support contact details haven't been set up yet. The store owner can add them by setting VITE_SUPPORT_EMAIL in the frontend .env file.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default HelpSupport;
