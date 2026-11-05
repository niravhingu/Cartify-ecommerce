import { useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";

const SETTINGS_KEY = "cartify_user_settings";

function Settings({ currentUser, setCurrentUser }) {
  const toast = useToast();
  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    offers: false,
  });
  const [saved, setSaved] = useState(false);

  // ---- account details ----
  const [name, setName] = useState(currentUser?.name || "");
  const [savingName, setSavingName] = useState(false);

  // ---- password ----
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Name must be at least 2 characters");

    setSavingName(true);
    try {
      const data = await api("/users/profile", { method: "PATCH", body: { name: name.trim() } });
      setCurrentUser(data.user);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!pw.current || !pw.next) return toast.error("Please fill all password fields");
    if (pw.next !== pw.confirm) return toast.error("New passwords do not match");

    setSavingPw(true);
    try {
      await api("/users/password", { method: "PATCH", body: { currentPassword: pw.current, newPassword: pw.next } });
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed successfully");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPw(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:bg-white";

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      if (stored) setPreferences((prev) => ({ ...prev, ...stored }));
    } catch {
      // Invalid saved settings ko ignore karo.
    }
  }, []);

  const toggle = (key) => {
    setSaved(false);
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences));
    setSaved(true);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
          Preferences
        </p>
        <h1 className="mt-2 text-4xl font-black text-gray-950">Settings</h1>
        <p className="mt-2 text-gray-500">
          Choose how Cartify keeps you informed.
        </p>

        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-gray-900">Account details</h2>
          <form onSubmit={saveName} className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="set-name">Full name</label>
              <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="set-email">Email address</label>
              <input id="set-email" value={currentUser?.email || ""} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
              <p className="mt-1 text-xs text-gray-400">Your email is your login and cannot be changed here.</p>
            </div>
            <button disabled={savingName || name.trim() === currentUser?.name} className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40">
              {savingName ? "Saving..." : "Save name"}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-gray-900">Change password</h2>
          <form onSubmit={savePassword} className="mt-4 space-y-4">
            <input type="password" autoComplete="current-password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={inputClass} />
            <input type="password" autoComplete="new-password" placeholder="New password (8+ characters, letters and numbers)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={inputClass} />
            <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className={inputClass} />
            <button disabled={savingPw} className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50">
              {savingPw ? "Updating..." : "Update password"}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>

          <SettingToggle
            title="Order updates"
            description="Receive updates about your order status."
            checked={preferences.orderUpdates}
            onChange={() => toggle("orderUpdates")}
          />

          <SettingToggle
            title="Offers and recommendations"
            description="Receive product offers and shopping recommendations."
            checked={preferences.offers}
            onChange={() => toggle("offers")}
          />

          <button
            onClick={saveSettings}
            className="mt-6 rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-orange-500"
          >
            Save Preferences
          </button>

          {saved && (
            <p className="mt-3 text-sm font-semibold text-emerald-600">
              Preferences saved successfully.
            </p>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-gray-400">
          These preferences are currently stored in this browser. They are not
          synced across devices.
        </p>
      </div>
    </main>
  );
}

function SettingToggle({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-5">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        aria-pressed={checked}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-orange-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default Settings;