import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/format";

function MyProfile({ currentUser }) {
  const navigate = useNavigate();

  const details = [
    ["Full name", currentUser?.name || "Not available"],
    ["Email address", currentUser?.email || "Not available"],
    ["Account type", currentUser?.role === "admin" ? "Administrator" : "Customer"],
    ["Member since", currentUser?.created_at ? formatDate(currentUser.created_at) : "Not available"],
  ];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
          Account
        </p>
        <h1 className="mt-2 text-4xl font-black text-gray-950">My Profile</h1>
        <p className="mt-2 text-gray-500">
          View your Cartify account information.
        </p>

        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-2xl font-black text-orange-600">
              {(currentUser?.name || "C").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-gray-900">
                {currentUser?.name || "Cartify Customer"}
              </h2>
              <p className="truncate text-sm text-gray-500">
                {currentUser?.email || "Your account"}
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 py-4">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/orders")}
              className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-orange-500"
            >
              View My Orders
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              Account Settings
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default MyProfile;