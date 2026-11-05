import { useState } from "react";
import AdminNavbar from "./components/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar";

function AdminLayout({ children, currentUser, onLogout }) {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        ></div>
      )}

      {/* Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} onLogout={onLogout} />

      {/* Main Area */}
      <div className="min-h-screen lg:ml-72">

        {/* Navbar */}
        <AdminNavbar onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} onLogout={onLogout} />

        {/* Page Content */}
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}

export default AdminLayout;