import { useNavigate } from "react-router-dom";

function AdminChoice({ currentUser }) {

  const navigate = useNavigate();

  const handleDashboard = () => {
    navigate("/admin");
  };

  const handleWebsite = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">

      <div className="max-w-4xl w-full">

        <div className="text-center mb-10">

          <p className="text-blue-600 font-semibold">
            Welcome back
          </p>

          <h1 className="text-4xl font-bold text-gray-900 mt-2">
            Hello, {currentUser?.name} 👋
          </h1>

          <p className="text-gray-500 mt-3">
            Where would you like to go?
          </p>

        </div>


        <div className="grid md:grid-cols-2 gap-6">

          {/* Admin Dashboard */}

          <button
            onClick={handleDashboard}
            className="group text-left bg-white border border-gray-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >

            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl mb-6">
              🛠️
            </div>

            <h2 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h2>

            <p className="text-gray-500 mt-3 leading-6">
              Manage products, orders, users, payments,
              categories and store analytics.
            </p>

            <div className="mt-6 text-blue-600 font-semibold group-hover:translate-x-1 transition">
              Open Dashboard →
            </div>

          </button>


          {/* Website */}

          <button
            onClick={handleWebsite}
            className="group text-left bg-gray-900 text-white rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >

            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl mb-6">
              🛍️
            </div>

            <h2 className="text-2xl font-bold">
              Continue Shopping
            </h2>

            <p className="text-gray-400 mt-3 leading-6">
              Go back to Cartify and browse products,
              manage your cart and continue shopping.
            </p>

            <div className="mt-6 text-white font-semibold group-hover:translate-x-1 transition">
              Go to Website →
            </div>

          </button>

        </div>

      </div>

    </div>
  );
}

export default AdminChoice;