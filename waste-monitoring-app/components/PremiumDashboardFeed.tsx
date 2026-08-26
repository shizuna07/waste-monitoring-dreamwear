"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { useAdminNotifications } from "@/components/useAdminNotifications";
import { supabase } from "@/lib/supabase";

type WasteRow = {
  id: string;
  record_date: string;
  pic_name: string | null;
  total_kg: number | null;
  created_at: string;
  cleanliness_photo_at: string | null;
  photo_path: string | null;
};

type ActivityItem = {
  id: string;
  actor: string;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  type: "INPUT" | "PHOTO";
};

function formatClock(value: string) {
  try {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).format(
      new Date(value),
    );
  } catch {
    return "-";
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
      },
    ).format(
      new Date(
        `${value}T00:00:00+07:00`,
      ),
    );
  } catch {
    return value;
  }
}

export default function PremiumDashboardFeed() {
  const { profile } = useAuth();

  const {
    items: notificationItems,
    loading: notificationLoading,
  } =
    useAdminNotifications();

  const [
    wasteRows,
    setWasteRows,
  ] =
    useState<WasteRow[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const loadActivities =
    useCallback(async () => {
      if (
        profile.role !==
        "ADMIN"
      ) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "waste_daily",
          )
          .select(`
            id,
            record_date,
            pic_name,
            total_kg,
            created_at,
            cleanliness_photo_at,
            photo_path
          `)
          .order(
            "updated_at",
            {
              ascending: false,
            },
          )
          .limit(10);

      if (error) {
        setErrorMessage(
          error.message,
        );

        setLoading(false);
        return;
      }

      setWasteRows(
        (data ?? []) as WasteRow[],
      );

      setLoading(false);
    }, [profile.role]);

  useEffect(() => {
    void loadActivities();

    const timer =
      window.setInterval(
        () => {
          void loadActivities();
        },
        30000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [loadActivities]);

  const activities =
    useMemo(() => {
      const result:
        ActivityItem[] = [];

      for (
        const row
        of wasteRows
      ) {
        if (row.created_at) {
          result.push({
            id:
              `${row.id}-input`,
            actor:
              row.pic_name ||
              "PIC",
            title:
              "Input Limbah",
            description:
              `${Number(
                row.total_kg ?? 0,
              ).toLocaleString(
                "id-ID",
                {
                  maximumFractionDigits: 2,
                },
              )} KG • ${formatDate(
                row.record_date,
              )}`,
            createdAt:
              row.created_at,
            href: "/riwayat",
            type: "INPUT",
          });
        }

        if (
          row.cleanliness_photo_at &&
          row.photo_path
        ) {
          result.push({
            id:
              `${row.id}-photo`,
            actor:
              row.pic_name ||
              "PIC",
            title:
              "Foto Kebersihan",
            description:
              `Bukti kebersihan • ${formatDate(
                row.record_date,
              )}`,
            createdAt:
              row.cleanliness_photo_at,
            href: "/kebersihan",
            type: "PHOTO",
          });
        }
      }

      return result
        .sort(
          (a, b) =>
            new Date(
              b.createdAt,
            ).getTime() -
            new Date(
              a.createdAt,
            ).getTime(),
        )
        .slice(0, 5);
    }, [wasteRows]);

  const notifications =
    notificationItems.slice(
      0,
      5,
    );

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <section className="mt-6">

      <div className="grid gap-5 xl:grid-cols-2">

        {/* ================= AKTIVITAS ================= */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                Activity
              </p>

              <h3 className="mt-1 text-base font-black text-slate-950">
                Aktivitas Terbaru
              </h3>
            </div>

            <Link
              href="/aktivitas"
              className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
            >
              Lihat Semua →
            </Link>

          </div>

          <div className="divide-y divide-slate-100">

            {loading && (
              <div className="px-6 py-10 text-center text-sm font-bold text-slate-400">
                Memuat aktivitas...
              </div>
            )}

            {!loading &&
              errorMessage && (
                <div className="px-6 py-8 text-sm font-bold text-red-600">
                  {errorMessage}
                </div>
              )}

            {!loading &&
              !errorMessage &&
              activities.length ===
                0 && (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-black text-slate-500">
                    Belum ada aktivitas
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Aktivitas input dan foto akan muncul di sini.
                  </p>
                </div>
              )}

            {!loading &&
              activities.map(
                (item) => (
                  <Link
                    key={
                      item.id
                    }
                    href={
                      item.href
                    }
                    className="group flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                  >

                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                        item.type ===
                        "INPUT"
                          ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100"
                          : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
                      ].join(
                        " ",
                      )}
                    >
                      {item.type ===
                      "INPUT"
                        ? "+"
                        : "✓"}
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <p className="truncate text-sm font-black text-slate-900">
                          {
                            item.actor
                          }
                        </p>

                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full",
                            item.type ===
                            "INPUT"
                              ? "bg-blue-500"
                              : "bg-emerald-500",
                          ].join(
                            " ",
                          )}
                        />

                        <p className="text-[11px] font-black text-blue-600">
                          {
                            item.title
                          }
                        </p>

                      </div>

                      <p className="mt-1 truncate text-xs font-medium text-slate-400">
                        {
                          item.description
                        }
                      </p>

                    </div>

                    <div className="shrink-0 text-right">

                      <p className="text-[11px] font-black text-slate-500">
                        {formatClock(
                          item.createdAt,
                        )}
                      </p>

                      <p className="mt-1 text-[10px] font-bold text-slate-300 transition group-hover:text-blue-500">
                        →
                      </p>

                    </div>

                  </Link>
                ),
              )}

          </div>

        </div>


        {/* ================= NOTIFIKASI ================= */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">
                Notification Center
              </p>

              <h3 className="mt-1 text-base font-black text-slate-950">
                Notifikasi
              </h3>
            </div>

            <Link
              href="/notifikasi"
              className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
            >
              Lihat Semua →
            </Link>

          </div>


          <div className="divide-y divide-slate-100">

            {notificationLoading && (
              <div className="px-6 py-10 text-center text-sm font-bold text-slate-400">
                Memuat notifikasi...
              </div>
            )}

            {!notificationLoading &&
              notifications.length ===
                0 && (
                <div className="px-6 py-10 text-center">

                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    ✓
                  </div>

                  <p className="mt-3 text-sm font-black text-slate-700">
                    Semua Aman
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Tidak ada notifikasi yang membutuhkan perhatian.
                  </p>

                </div>
              )}


            {!notificationLoading &&
              notifications.map(
                (
                  item,
                  index,
                ) => {
                  const severity =
                    item.severity;

                  const style =
                    severity ===
                    "danger"
                      ? {
                          icon:
                            "bg-red-50 text-red-600 ring-red-100",
                          dot:
                            "bg-red-500",
                          title:
                            "text-red-700",
                        }
                      : severity ===
                        "warning"
                      ? {
                          icon:
                            "bg-amber-50 text-amber-600 ring-amber-100",
                          dot:
                            "bg-amber-500",
                          title:
                            "text-amber-700",
                        }
                      : {
                          icon:
                            "bg-blue-50 text-blue-600 ring-blue-100",
                          dot:
                            "bg-blue-500",
                          title:
                            "text-blue-700",
                        };

                  return (
                    <Link
                      key={`${item.href}-${index}`}
                      href={
                        item.href
                      }
                      className="group flex items-start gap-4 px-6 py-4 transition hover:bg-slate-50"
                    >

                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ring-1",
                          style.icon,
                        ].join(
                          " ",
                        )}
                      >
                        {severity ===
                        "danger"
                          ? "!"
                          : severity ===
                            "warning"
                          ? "⚠"
                          : "●"}
                      </div>


                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <p
                            className={[
                              "text-sm font-black",
                              style.title,
                            ].join(
                              " ",
                            )}
                          >
                            {
                              item.title
                            }
                          </p>

                          {item.count >
                            1 && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
                              {
                                item.count
                              }
                            </span>
                          )}

                        </div>

                        <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-400">
                          {
                            item.description
                          }
                        </p>

                      </div>


                      <div className="flex shrink-0 items-center gap-2 pt-1">

                        <span
                          className={[
                            "h-2 w-2 rounded-full",
                            style.dot,
                          ].join(
                            " ",
                          )}
                        />

                        <span className="text-xs font-black text-slate-300 transition group-hover:text-blue-500">
                          →
                        </span>

                      </div>

                    </Link>
                  );
                },
              )}

          </div>

        </div>

      </div>

    </section>
  );
}
