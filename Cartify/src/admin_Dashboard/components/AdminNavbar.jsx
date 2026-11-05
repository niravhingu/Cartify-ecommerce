import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TITLES = {
  "/admin": ["Overview", "Dashboard"],
  "/admin/products": ["Catalogue", "Products"],
  "/admin/orders": ["Sales", "Orders"],
  "/admin/users": ["Customers", "Users"],
  "/admin/categories": ["Catalogue", "Categories"],
  "/admin/analytics": ["Insights", "Analytics"],
  "/admin/payments": ["Finance", "Payments"],
};

function AdminNavbar({ onMenuClick, currentUser, onLogout }) {
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const profileRef = useRef(null);
  const [eyebrow, title] = TITLES[pathname.replace(/\/$/, "")] || ["Admin", "Dashboard"];
  const adminName = currentUser?.name || "Administrator";
  const adminEmail = currentUser?.email || "";

  useEffect(() => setShowProfile(false), [pathname]);

  useEffect(() => {
    const close = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfile(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">

      <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left Side */}
        <div className="flex items-center gap-4">

          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            aria-label="Open sidebar"
            className="
              flex h-10 w-10 items-center justify-center
              rounded-xl border border-white/10
              bg-white/5 text-lg text-slate-300
              transition-all duration-300
              hover:bg-white/10 hover:text-white
              active:scale-95
              lg:hidden
            "
          >
            ☰
          </button>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              {eyebrow} </p> <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl"> {title} </h2>
          </div>

        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* View the shop */}
          <button
            onClick={() => navigate("/")}
            className="hidden h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white sm:flex"
          >
            <span>↗</span>
            <span>View store</span>
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}> <button onClick={() => setShowProfile(!showProfile)}
              className="
                flex items-center gap-2 sm:gap-3
                rounded-xl border border-white/10
                bg-white/5 p-1.5 pr-2 sm:pr-3
                transition-all duration-300
                hover:bg-white/10
                active:scale-[0.98]
              "
            >

              {/* Avatar */}
              <div className="
                flex h-9 w-9 items-center justify-center
                rounded-lg
                bg-gradient-to-br from-blue-500 to-indigo-600
                text-sm font-bold text-white
              ">
                {adminName.charAt(0).toUpperCase()}
              </div>

              {/* User Information */}
              <div className="hidden text-left md:block">

                <p className="max-w-32 truncate text-sm font-semibold text-white"> {adminName} </p> <p className="text-[11px] text-slate-500"> Administrator </p>

              </div>

              {/* Arrow */}
              <span className="hidden text-xs text-slate-500 md:block">
                ▾
              </span>

            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div
                className="
                  absolute right-0 top-14
                  z-50 w-60
                  overflow-hidden
                  rounded-2xl
                  border border-white/10
                  bg-slate-900
                  p-2
                  shadow-2xl shadow-black/40
                "
              >

                {/* Profile Information */}
                <div className="border-b border-white/10 px-3 py-3">

                  <p className="truncate text-sm font-semibold text-white"> {adminName} </p> <p className="mt-1 truncate text-xs text-slate-500"> {adminEmail} </p>

                </div>

                {/* Settings */}
                <button
                  onClick={() => navigate("/settings")}
                  className="
                    mt-2 flex w-full items-center gap-3
                    rounded-xl px-3 py-3
                    text-sm text-slate-300
                    transition hover:bg-white/5 hover:text-white
                  "
                >
                  <span>⚙</span>
                  Account Settings
                </button>

                {/* Visit Cartify */}
                <button
                  onClick={() => navigate("/")}
                  className="
                    flex w-full items-center gap-3
                    rounded-xl px-3 py-3
                    text-sm text-slate-300
                    transition hover:bg-white/5 hover:text-white
                  "
                >
                  <span>↗</span>
                  Visit Cartify
                </button>

                {/* Logout */}
                <button
                  onClick={onLogout}
                  className="
                    flex w-full items-center gap-3
                    rounded-xl px-3 py-3
                    text-sm text-red-400
                    transition hover:bg-red-500/10
                  "
                >
                  <span>↪</span>
                  Logout
                </button>

              </div>
            )}

          </div>

        </div>

      </div>

    </header>
  );
}

export default AdminNavbar;