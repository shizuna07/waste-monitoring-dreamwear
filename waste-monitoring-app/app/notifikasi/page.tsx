"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthGate";
import {
  useAdminNotifications,
} from "@/components/useAdminNotifications";

export default function NotificationPage() {
  const {
    profile,
  } =
    useAuth();

  const {
    items,
    totalCount,
    loading,
    errorMessage,
    refresh,
  } =
    useAdminNotifications();

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">

      <div className="mx-auto max-w-5xl">

        <div className="flex items-end justify-between gap-4">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Admin Monitoring
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Notifikasi
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Masalah dan perhatian yang perlu dicek.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
          >
            ↻ Refresh
          </button>
        </div>


        <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">

          <p className="text-xs font-black uppercase tracking-wider text-slate-300">
            Notifikasi Aktif
          </p>

          <p className="mt-2 text-4xl font-black">
            {totalCount}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Hal yang saat ini memerlukan perhatian.
          </p>
        </div>


        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            ⚠ {errorMessage}
          </div>
        )}


        {loading ? (
          <div className="mt-5 rounded-2xl bg-white p-10 text-center text-slate-500">
            Memeriksa notifikasi...
          </div>
        ) : items.length ===
          0 ? (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center">

            <div className="text-4xl">
              ✓
            </div>

            <h2 className="mt-3 text-xl font-black text-slate-900">
              Tidak Ada Masalah
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Semua monitoring saat ini dalam kondisi aman.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">

            {items.map(
              (
                item,
              ) => {
                const danger =
                  item.severity ===
                  "danger";

                return (
                  <div
                    key={
                      item.id
                    }
                    className={[
                      "rounded-2xl border p-5 shadow-sm",
                      danger
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50",
                    ].join(
                      " ",
                    )}
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex items-start gap-4">

                        <div
                          className={[
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black",
                            danger
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700",
                          ].join(
                            " ",
                          )}
                        >
                          {danger
                            ? "!"
                            : "⚠"}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">

                            <h2
                              className={[
                                "font-black",
                                danger
                                  ? "text-red-700"
                                  : "text-amber-700",
                              ].join(
                                " ",
                              )}
                            >
                              {
                                item.title
                              }
                            </h2>

                            {item.count >
                              1 && (
                              <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                                {
                                  item.count
                                }
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-slate-600">
                            {
                              item.description
                            }
                          </p>
                        </div>
                      </div>

                      <Link
                        href={
                          item.href
                        }
                        className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-center text-sm font-black text-blue-700 shadow-sm"
                      >
                        Buka →
                      </Link>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </main>
  );
}
