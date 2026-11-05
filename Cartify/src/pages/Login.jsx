import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
const REMEMBER_KEY = "cartify_remember_email";

const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v.trim());

function Field({ id, label, error, right, ...props }) {
  return (
    <div>
      <div className="group relative">
        <input
          id={id}
          placeholder=" "
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`peer w-full border-0 border-b-2 bg-transparent pb-2 pt-6 text-lg outline-none transition-colors ${right ? "pr-16" : ""
            } ${error
              ? "border-red-500"
              : "border-neutral-300 focus:border-neutral-950"
            }`}
          {...props}
        />

        <label
          htmlFor={id}
          className="pointer-events-none absolute left-0 top-6 origin-left text-lg text-neutral-400 transition-all duration-200 peer-focus:top-0 peer-focus:scale-75 peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:scale-75"
        >
          {label}
        </label>

        {/* animated focus line */}
        <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-blue-600 transition-all duration-300 peer-focus:w-full" />

        {right && (
          <div className="absolute bottom-2 right-0">
            {right}
          </div>
        )}
      </div>

      {error && (
        <p
          id={`${id}-err`}
          className="mt-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Only allow in-app paths as a redirect target (never another website).
const safeRedirect = (value) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/^\/(login|register)/.test(value)
    ? value
    : "/";

function Login({ setIsLoggedIn, setCurrentUser, isLoggedIn }) {
  const navigate = useNavigate();
  const location = useLocation();
  const panel = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("idle");

  // restore remembered email
  // NOTE:
  // Sirf email remember hoga.
  // Password / JWT / user localStorage me save nahi hoga.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);

      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  // cursor-follow glow on the visual panel
  const onMove = (e) => {
    const el = panel.current;

    if (!el) return;

    const r = el.getBoundingClientRect();

    el.style.setProperty(
      "--mx",
      `${e.clientX - r.left}px`
    );

    el.style.setProperty(
      "--my",
      `${e.clientY - r.top}px`
    );
  };

  const validate = () => {
    const next = {};

    if (!email.trim()) {
      next.email = "Enter your email address.";
    } else if (!emailOk(email)) {
      next.email =
        "Enter a valid email, like name@example.com.";
    }

    if (!password) {
      next.password = "Enter your password.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError("");

    if (!validate()) {
      return;
    }

    try {
      setStatus("loading");

      // The JWT arrives in an HttpOnly cookie, so nothing secret is stored in JS.
      const data = await api("/users/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      // Remember Me:
      // Sirf email save hoga.
      // Password/token save nahi hoga.
      try {
        if (remember) {
          localStorage.setItem(
            REMEMBER_KEY,
            email.trim()
          );
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        /* ignore */
      }

      // Backend se user object
      setCurrentUser(data.user);

      // Login state
      setIsLoggedIn(true);

      setStatus("success");

      // Admins choose where to go; shoppers return to the page they came from.
      const destination =
        data.user.role === "admin" ? "/admin-choice" : safeRedirect(location.state?.from);

      setTimeout(() => navigate(destination, { replace: true }), 900);
    } catch (error) {
      // wrong password (401), rate limit (429), server down (status 0)...
      setFormError(error.message || "Invalid email or password.");
      setStatus("idle");
    }
  };

  const busy = status !== "idle";

  // already signed in (e.g. pressed Back to /login)? nothing to do here
  if (isLoggedIn && status === "idle") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="grid min-h-screen bg-[#fafaf7] text-neutral-900 lg:grid-cols-[1.05fr_1fr]">

      {/* ================= VISUAL SIDE ================= */}

      <aside
        ref={panel}
        onMouseMove={onMove}
        className="relative hidden overflow-hidden bg-neutral-950 text-white lg:block"
        style={{
          "--mx": "50%",
          "--my": "40%",
        }}
      >

        {/* grid */}

        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)",
          }}
        />

        {/* cursor glow */}

        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx) var(--my), rgba(59,130,246,.35), transparent 70%)",
          }}
        />

        {/* orbit rings */}

        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">

          <div className="h-[420px] w-[420px] animate-[spin_40s_linear_infinite] rounded-full border border-white/10">

            <span className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_20px_4px_rgba(96,165,250,.8)]" />

          </div>

          <div className="absolute inset-12 animate-[spin_28s_linear_infinite_reverse] rounded-full border border-dashed border-white/15">

            <span className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 rounded-full bg-indigo-300 shadow-[0_0_16px_3px_rgba(165,180,252,.7)]" />

          </div>

          <div className="absolute inset-28 grid place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 shadow-[0_0_80px_rgba(59,130,246,.55)]">

            <span className="text-5xl font-black">
              C
            </span>

          </div>

        </div>

        {/* floating glass chips */}

        <div className="absolute left-10 top-24 animate-[float_7s_ease-in-out_infinite] rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur-md ring-1 ring-white/20">

          <p className="text-white/60">
            Free shipping
          </p>

          <p className="font-semibold">
            On orders above ₹999
          </p>

        </div>

        <div className="absolute right-10 top-[55%] animate-[float_9s_ease-in-out_infinite_1s] rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur-md ring-1 ring-white/20">

          <p className="text-white/60">
            Easy returns
          </p>

          <p className="font-semibold">
            7 days, no questions
          </p>

        </div>

        {/* copy */}

        <div className="absolute inset-x-0 bottom-0 p-12">

          <p className="max-w-md text-4xl font-black leading-tight tracking-tight xl:text-5xl">
            Great finds are waiting for you.
          </p>

          <p className="mt-4 max-w-sm text-white/60">
            Sign in to see your orders, saved items and today's deals.
          </p>

        </div>

      </aside>

      {/* ================= FORM SIDE ================= */}

      <main className="flex items-center justify-center px-6 py-12 sm:px-12">

        <div className="w-full max-w-md">

          <NavLink
            to="/"
            className="text-2xl font-black tracking-tight"
          >
            Cartify
            <span className="text-blue-600">
              .
            </span>
          </NavLink>

          {status === "success" ? (

            <div
              className="py-24 text-center"
              role="status"
            >

              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-white animate-[pop_.5s_ease-out]">

                <svg
                  width="38"
                  height="38"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>

              </div>

              <h1 className="mt-6 text-3xl font-black">
                Welcome back
              </h1>

              <p className="mt-2 text-neutral-500">
                Taking you to the store…
              </p>

            </div>

          ) : (

            <>

              <h1 className="mt-14 text-5xl font-black tracking-tight sm:text-6xl">
                Sign in
              </h1>

              <p className="mt-3 text-neutral-500">

                New here?{" "}

                <NavLink
                  to="/register"
                  className="font-semibold text-neutral-950 underline underline-offset-4 hover:text-blue-600"
                >
                  Create an account
                </NavLink>

              </p>

              {location.state?.registered && !formError && (
                <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  Account created successfully. Please sign in.
                </div>
              )}

              {formError && (

                <div
                  role="alert"
                  className="mt-8 flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
                >

                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">
                    !
                  </span>

                  {formError}

                </div>

              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-10 space-y-8"
              >

                <Field
                  id="email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);

                    setErrors((x) => ({
                      ...x,
                      email: "",
                    }));
                  }}
                  autoComplete="email"
                  error={errors.email}
                  disabled={busy}
                />

                <div>

                  <Field
                    id="password"
                    label="Password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);

                      setErrors((x) => ({
                        ...x,
                        password: "",
                      }));
                    }}
                    onKeyUp={(e) =>
                      setCapsOn(
                        e.getModifierState?.(
                          "CapsLock"
                        ) || false
                      )
                    }
                    onBlur={() =>
                      setCapsOn(false)
                    }
                    autoComplete="current-password"
                    error={errors.password}
                    disabled={busy}
                    right={
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (s) => !s
                          )
                        }
                        aria-pressed={showPassword}
                        className="text-sm font-semibold text-neutral-500 hover:text-neutral-950"
                      >
                        {showPassword
                          ? "Hide"
                          : "Show"}
                      </button>
                    }
                  />

                  {capsOn && (
                    <p className="mt-2 text-sm text-amber-600">
                      Caps Lock is on.
                    </p>
                  )}

                </div>

                <div className="flex items-center justify-between text-sm">

                  <label className="flex cursor-pointer items-center gap-2.5 text-neutral-600">

                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) =>
                        setRemember(
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 rounded accent-blue-600"
                    />

                    Remember my email

                  </label>

                  <button
                    type="button"
                    className="font-semibold text-neutral-500 hover:text-neutral-950"
                  >
                    Forgot password?
                  </button>

                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-neutral-950 py-4 text-base font-semibold text-white transition hover:shadow-[0_10px_40px_-8px_rgba(37,99,235,.7)] disabled:cursor-not-allowed disabled:opacity-70"
                >

                  <span className="absolute inset-0 -translate-x-full bg-blue-600 transition-transform duration-500 group-hover:translate-x-0 group-disabled:hidden" />

                  <span className="relative flex items-center gap-3">

                    {status === "loading" ? (

                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                        Signing in
                      </>

                    ) : (

                      "Sign in"

                    )}

                  </span>

                </button>

              </form>

              <p className="mt-10 text-sm text-neutral-400">
                Need help signing in? Our support team is here every day.
              </p>

            </>

          )}

        </div>

      </main>

      <style>{`
        @keyframes float {
          0%,100% {
            transform: translateY(0)
          }

          50% {
            transform: translateY(-14px)
          }
        }

        @keyframes pop {
          0% {
            transform: scale(.4);
            opacity: 0
          }

          70% {
            transform: scale(1.1)
          }

          100% {
            transform: scale(1);
            opacity: 1
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [class*="animate-["],
          .animate-spin {
            animation: none !important;
          }
        }
      `}</style>

    </div>
  );
}

export default Login;