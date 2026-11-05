import { NavLink, useNavigate } from "react-router-dom";

function AdminSidebar({ isOpen, setIsOpen, currentUser, onLogout }) {
  const navigate = useNavigate();
  const adminName = currentUser?.name || "Administrator";

  const menuItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: "⌂",
    },
    {
      name: "Products",
      path: "/admin/products",
      icon: "▣",
    },
    {
      name: "Orders",
      path: "/admin/orders",
      icon: "🛒",
    },
    {
      name: "Users",
      path: "/admin/users",
      icon: "♙",
    },
    {
      name: "Categories",
      path: "/admin/categories",
      icon: "▤",
    },
    {
      name: "Analytics",
      path: "/admin/analytics",
      icon: "◩",
    },
    {
      name: "Payments",
      path: "/admin/payments",
      icon: "◈",
    },
  ];

  return (
    <aside
      className={`
        fixed left-0 top-0 z-50
        h-screen w-72
        border-r border-white/10
        bg-slate-950
        transition-transform duration-300 ease-in-out

        ${isOpen ? "translate-x-0" : "-translate-x-full"}

        lg:translate-x-0
      `}
    >
      {/* Glow */}
      <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative flex h-full flex-col px-5 py-6">

        {/* Logo + Mobile Close */}
        <div className="mb-10 flex items-center gap-3 px-2">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold shadow-lg shadow-blue-500/20">
            C
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Cartify
            </h1>

            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
              Admin Panel
            </p>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="
              ml-auto flex h-9 w-9 items-center justify-center
              rounded-xl border border-white/10
              text-slate-400
              transition
              hover:bg-white/10
              hover:text-white
              lg:hidden
            "
          >
            ✕
          </button>

        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto">

          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Management
          </p>

          <nav className="space-y-2">

            {menuItems.map((item) => (

              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === "/admin"}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-white text-slate-950 shadow-lg shadow-white/5"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >

                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </span>

                <span>{item.name}</span>

              </NavLink>

            ))}

          </nav>

        </div>

        {/* Bottom Section */}
        <div className="space-y-2">

          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Account
          </p>

          {/* View store */}
          <button
            onClick={() => navigate("/")}
            className="
              group flex w-full items-center gap-4
              rounded-2xl px-4 py-3.5
              text-sm font-medium text-slate-400
              transition-all duration-300
              hover:bg-white/5 hover:text-white
            "
          >

            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg transition-transform duration-300 group-hover:rotate-12">
              ↗
            </span>

            <span>View store</span>

          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="
              group flex w-full items-center gap-4
              rounded-2xl px-4 py-3.5
              text-sm font-medium text-slate-400
              transition-all duration-300
              hover:bg-red-500/10 hover:text-red-400
            "
          >

            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg transition-transform duration-300 group-hover:-translate-x-1">
              ↪
            </span>

            <span>Logout</span>

          </button>

        </div>

        {/* Admin Profile */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-3">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 font-bold">
              {adminName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">

              <p className="truncate text-sm font-semibold text-white">
                {adminName} </p> <p className="truncate text-xs text-slate-500"> {currentUser?.email || ""} </p>

            </div>

            <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/40" />

          </div>

        </div>

      </div>

    </aside>
  );
}

export default AdminSidebar;