import { useCallback, useEffect, useState } from "react";
import "./index.css";
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { api } from "./api";
import { StoreProvider } from "./context/StoreContext";
import { useToast } from "./context/ToastContext";

import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import OrderReceipt from "./pages/OrderReceipt";

import AdminChoice from "./admin_Dashboard/pages/AdminChoice";
import AdminDashboard from "./admin_Dashboard/pages/AdminDashboard";
import AdminLayout from "./admin_Dashboard/AdminLayout";
import AdminProducts from "./admin_Dashboard/pages/AdminProducts";
import AdminOrders from "./admin_Dashboard/pages/AdminOrders";
import AdminUsers from "./admin_Dashboard/pages/AdminUsers";
import AdminCategories from "./admin_Dashboard/pages/AdminCategories";
import AdminAnalytics from "./admin_Dashboard/pages/AdminAnalytics";
import AdminPayments from "./admin_Dashboard/pages/AdminPayments";

import MyOrders from "./pages/MyOrders";
import MyProfile from "./pages/MyProfile";
import Settings from "./pages/Settings";
import Wishlist from "./pages/Wishlist";
import HelpSupport from "./pages/HelpSupport";

// Scroll to the top on every page change (but not for #anchors).
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

// Sends visitors to /login and remembers where they wanted to go.
function RequireAuth({ isLoggedIn, children }) {
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

function RequireAdmin({ isLoggedIn, currentUser, children }) {
  if (!isLoggedIn || currentUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes({ isLoggedIn, currentUser, setIsLoggedIn, setCurrentUser, onLogout }) {
  const location = useLocation();

  // The admin area has its own sidebar + top bar.
  const inAdmin = location.pathname.startsWith("/admin") && location.pathname !== "/admin-choice";

  const auth = (element) => <RequireAuth isLoggedIn={isLoggedIn}>{element}</RequireAuth>;

  return (
    <>
      <ScrollToTop />

      {!inAdmin && (
        <Navbar currentUser={currentUser} setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} />
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />

        <Route path="/cart" element={auth(<Cart />)} />
        <Route path="/checkout" element={auth(<Checkout currentUser={currentUser} />)} />
        <Route path="/payment" element={auth(<Payment />)} />
        <Route path="/order-success/:orderGroupId" element={auth(<OrderReceipt />)} />
        <Route path="/orders" element={auth(<MyOrders />)} />
        <Route path="/profile" element={auth(<MyProfile currentUser={currentUser} />)} />
        <Route path="/settings" element={auth(<Settings currentUser={currentUser} setCurrentUser={setCurrentUser} />)} />
        <Route path="/wishlist" element={auth(<Wishlist />)} />

        <Route path="/help" element={<HelpSupport />} />

        <Route
          path="/admin-choice"
          element={
            <RequireAdmin isLoggedIn={isLoggedIn} currentUser={currentUser}>
              <AdminChoice currentUser={currentUser} />
            </RequireAdmin>
          }
        />

        {/* Admin area: one layout, many pages */}
        <Route
          path="/admin"
          element={
            <RequireAdmin isLoggedIn={isLoggedIn} currentUser={currentUser}>
              <AdminLayout currentUser={currentUser} onLogout={onLogout}>
                <Outlet />
              </AdminLayout>
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers currentUser={currentUser} />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />

        <Route
          path="/login"
          element={<Login setIsLoggedIn={setIsLoggedIn} setCurrentUser={setCurrentUser} isLoggedIn={isLoggedIn} />}
        />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Who is logged in? Ask the backend (the session lives in an httpOnly cookie).
  useEffect(() => {
    let cancelled = false;

    api("/users/profile")
      .then((data) => {
        if (cancelled) return;
        setCurrentUser(data.user);
        setIsLoggedIn(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCurrentUser(null);
        setIsLoggedIn(false);
      })
      .finally(() => !cancelled && setAuthLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  // Any API call that comes back 401 while we think we're logged in = session expired.
  useEffect(() => {
    const onUnauthorized = () => {
      if (!isLoggedIn) return;
      setIsLoggedIn(false);
      setCurrentUser(null);
      toast.info("Your session expired. Please log in again.");
      navigate("/login", { replace: true, state: { from: location.pathname + location.search } });
    };

    window.addEventListener("cartify:unauthorized", onUnauthorized);
    return () => window.removeEventListener("cartify:unauthorized", onUnauthorized);
  }, [isLoggedIn, location.pathname, location.search, navigate, toast]);

  const onLogout = useCallback(async () => {
    try {
      await api("/users/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setIsLoggedIn(false);
      setCurrentUser(null);
      navigate("/");
    }
  }, [navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          <p className="mt-4 text-sm text-gray-500">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider isLoggedIn={isLoggedIn}>
      <AppRoutes
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        setIsLoggedIn={setIsLoggedIn}
        setCurrentUser={setCurrentUser}
        onLogout={onLogout}
      />
    </StoreProvider>
  );
}

export default App;
