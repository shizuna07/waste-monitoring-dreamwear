"use client";

import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type UserRole =
  | "ADMIN"
  | "PIC";

type UserProfile = {
  user_id: string;
  name: string;
  role: UserRole;
  active: boolean;
};

type AuthContextValue = {
  userId: string;
  profile: UserProfile;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth harus digunakan di dalam AuthGate.",
    );
  }

  return context;
}

type Props = {
  children: ReactNode;
};

const PIC_ALLOWED_PATHS = [
  "/pic",
  "/input-limbah",
  "/kebersihan",
];

export default function AuthGate({
  children,
}: Props) {
  const pathname =
    usePathname();

  // ============================================
  // NORMALISASI ROUTE GITHUB PAGES
  // ============================================

  const routePath = (() => {
    let value =
      pathname || "/";

    const basePath =
      process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    // Contoh:
    // /waste-monitoring-dreamwear/pic/
    // menjadi:
    // /pic/
    if (
      basePath &&
      (
        value === basePath ||
        value.startsWith(
          `${basePath}/`,
        )
      )
    ) {
      value =
        value.slice(
          basePath.length,
        ) || "/";
    }

    // Fallback khusus GitHub Pages repository ini
    const githubBase =
      "/waste-monitoring-dreamwear";

    if (
      value === githubBase ||
      value.startsWith(
        `${githubBase}/`,
      )
    ) {
      value =
        value.slice(
          githubBase.length,
        ) || "/";
    }

    // /pic/ menjadi /pic
    if (
      value.length > 1
    ) {
      value =
        value.replace(
          /\/+$/,
          "",
        );
    }

    return value || "/";
  })();


  const router =
    useRouter();

  const [userId, setUserId] =
    useState("");

  const [profile, setProfile] =
    useState<UserProfile | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [redirecting, setRedirecting] =
    useState(false);

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadProfile =
    useCallback(
      async (
        id: string,
      ) => {
        const {
          data,
          error,
        } = await supabase
          .from(
            "user_profiles",
          )
          .select(
            `
            user_id,
            name,
            role,
            active
            `,
          )
          .eq(
            "user_id",
            id,
          )
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Profile user belum tersedia.",
          );
        }

        setUserId(id);

        setProfile(
          data as UserProfile,
        );
      },
      [],
    );

  const refreshProfile =
    useCallback(
      async () => {
        if (!userId) {
          return;
        }

        await loadProfile(
          userId,
        );
      },
      [
        userId,
        loadProfile,
      ],
    );

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const {
          data: {
            session,
          },
          error,
        } =
          await supabase.auth
            .getSession();

        if (error) {
          throw error;
        }

        if (
          session &&
          mounted
        ) {
          await loadProfile(
            session.user.id,
          );
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal membaca sesi login.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          async (
            event,
            session,
          ) => {
            if (!mounted) {
              return;
            }

            if (
              event ===
              "SIGNED_OUT"
            ) {
              setUserId("");
              setProfile(null);
              setLoading(false);
              return;
            }

            if (session) {
              try {
                await loadProfile(
                  session.user.id,
                );
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Gagal membaca profile.",
                );
              }
            }
          },
        );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (!profile.active) {
      return;
    }

    if (
      profile.role ===
      "PIC"
    ) {
const allowed =
        PIC_ALLOWED_PATHS.some(
          (path) => {
            if (
              path === "/pic"
            ) {
              return (
                routePath ===
                "/pic"
              );
            }

            return routePath.startsWith(
              path,
            );
          },
        );

      if (!allowed) {
        setRedirecting(true);

        router.replace(
          "/pic",
        );

        return;
      }
    }

    if (
      profile.role ===
        "ADMIN" &&
      routePath === "/pic"
    ) {
      setRedirecting(true);

      router.replace("/");

      return;
    }

    setRedirecting(false);
  }, [
    profile,
    routePath,
    router,
  ]);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setErrorMessage("");

    try {
      const {
        data,
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              `${username.trim().toLowerCase()}@dreamwear.biz`,
            password,
          });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "User tidak ditemukan.",
        );
      }

      await loadProfile(
        data.user.id,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Login gagal.",
      );
    }

    setSubmitting(false);
  }

  async function logout() {
    await supabase.auth
      .signOut();

    setUserId("");
    setProfile(null);

    router.replace("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Membuka Waste Monitoring...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    const logoSrc =
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-dreamwear.png`;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
          <div className="bg-blue-700 px-7 py-8 text-white">
            <div className="flex h-20 w-40 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="PT.DREAMWEAR"
                className="h-full w-full object-contain"
              />
            </div>

            <p className="mt-6 text-sm font-bold text-blue-100">
              PT.DREAMWEAR
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Waste Monitoring
            </h1>

            <p className="mt-2 text-sm text-blue-100">
              Monitoring limbah dan kebersihan area
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="p-7"
          >
            <h2 className="text-xl font-black text-slate-900">
              Masuk
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Masukkan username dan password.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Email
              </label>

              <input
                type="text"
                value={username}
                onChange={(
                  event,
                ) =>
                  setUsername(
                    event.target
                      .value,
                  )
                }
                required
                autoComplete="username"
                placeholder="Contoh: admin1"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event.target
                      .value,
                  )
                }
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting
              }
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting
                ? "Masuk..."
                : "Masuk ke Sistem"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!profile.active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">
            ⛔
          </div>

          <h1 className="mt-4 text-xl font-black text-slate-900">
            Akun Dinonaktifkan
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Hubungi Administrator Waste Monitoring.
          </p>

          <button
            type="button"
            onClick={() =>
              void logout()
            }
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
          >
            Keluar
          </button>
        </div>
      </main>
    );
  }

  if (redirecting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-semibold text-slate-500">
          Mengalihkan halaman...
        </p>
      </main>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        userId,
        profile,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
