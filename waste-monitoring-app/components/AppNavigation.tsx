"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";
import { useChatUnread } from "@/components/useChatUnread";

const ADMIN_MENUS = [
  {
    label: "Dashboard",
    href: "/",
    icon: "▦",
  },
  {
    label: "Input Limbah",
    href: "/input-limbah",
    icon: "+",
  },
  {
    label: "Riwayat",
    href: "/riwayat",
    icon: "↺",
  },
  {
    label: "Kebersihan",
    href: "/kebersihan",
    icon: "📷",
  },
      {
        label: "Chat",
        href: "/chat",
        icon: "💬",
      },
  {
    label: "Kepatuhan",
    href: "/kepatuhan",
    icon: "✓",
  },
  {
    label: "Rekap",
    href: "/rekap",
    icon: "▤",
  },
  {
    label: "Kalender",
    href: "/kalender",
    icon: "▣",
  },
  {
    label: "Laporan",
    href: "/laporan",
    icon: "▤",
  },
  {
    label: "Notifikasi",
    href: "/notifikasi",
    icon: "🔔",
  },
  {
    label: "Aktivitas",
    href: "/aktivitas",
    icon: "◉",
  },
  {
    label: "Pengaturan",
    href: "/pengaturan",
    icon: "⚙",
  },
];

const PIC_MENUS = [
  {
    label: "Hari Ini",
    href: "/pic",
    icon: "✓",
  },
  {
    label: "Input",
    href: "/input-limbah",
    icon: "+",
  },
  {
    label: "Kebersihan",
    href: "/kebersihan",
    icon: "📷",
  },
      {
        label: "Chat",
        href: "/chat",
        icon: "💬",
      },
];

function jakartaNow() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).formatToParts(
      new Date(),
    );

  const values: Record<
    string,
    string
  > = {};

  for (
    const part of parts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return {
    date:
      `${values.year}-${values.month}-${values.day}`,

    hour:
      Number(values.hour),

    minute:
      Number(values.minute),
  };
}

export default function AppNavigation() {
  const pathname =
    usePathname();

  const {
    profile,
    logout,
  } = useAuth();

  const {
    unreadCount: chatUnreadCount,
  } = useChatUnread();


  const [
    pending,
    setPending,
  ] = useState(false);

  const [
    reminderActive,
    setReminderActive,
  ] = useState(false);

  const menus =
    profile.role ===
    "ADMIN"
      ? ADMIN_MENUS
      : PIC_MENUS;

  const checkStatus =
    useCallback(async () => {
      const now =
        jakartaNow();

      const active =
        now.hour > 16 ||
        (
          now.hour === 16 &&
          now.minute >= 0
        );

      setReminderActive(
        active,
      );

      if (!active) {
        setPending(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("waste_daily")
        .select(
          "id, photo_path",
        )
        .eq(
          "record_date",
          now.date,
        )
        .maybeSingle();

      if (error) {
        return;
      }

      setPending(
        !data ||
        !data.photo_path,
      );
    }, []);

  useEffect(() => {
    void checkStatus();

    const timer =
      window.setInterval(
        () => {
          void checkStatus();
        },
        30000,
      );

    const focus = () => {
      void checkStatus();
    };

    window.addEventListener(
      "focus",
      focus,
    );

    return () => {
      window.clearInterval(
        timer,
      );

      window.removeEventListener(
        "focus",
        focus,
      );
    };
  }, [checkStatus]);

  function isActive(
    href: string,
  ) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(
      href,
    );
  }

  const logoSrc =
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-dreamwear.png`;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-[#071b3f] shadow-[12px_0_35px_rgba(15,23,42,0.18)] md:flex">
        <div className="border-b border-white/10 px-4 py-5">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
            <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-lg shadow-black/20 ring-1 ring-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="PT.DREAMWEAR"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-sm font-black text-white">
                PT.DREAMWEAR
              </p>

              <p className="text-xs text-blue-200/60">
                Waste Monitoring
              </p>
            </div>
          </div>
        </div>

        <div className="mx-3 mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-inner shadow-black/10">
          <p className="text-xs font-semibold text-blue-300">
            {profile.role ===
            "ADMIN"
              ? "ADMIN / MONITORING"
              : "PIC"}
          </p>

          <p className="mt-1 font-black text-white">
            {profile.name}
          </p>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
          {menus.map(
            (item) => {
              const active =
                isActive(
                  item.href,
                );

                const chatBadge =
                  item.href === "/chat"
                    ? chatUnreadCount
                    : 0;


              const badge =
                item.href ===
                  "/kebersihan" &&
                reminderActive &&
                pending;

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={[
                    "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-950/30 ring-1 ring-white/10"
                      : "text-blue-100/70 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-blue-100 transition group-hover:bg-white/15 group-hover:text-white">
                    {
                      item.icon
                    }
                  </span>

                  <span className="flex-1">
                    {
                      item.label
                    }

                    {chatBadge > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-black text-white shadow-sm">
                        {chatBadge > 99
                          ? "99+"
                          : chatBadge}
                      </span>
                    )}

                  </span>

                  {badge && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-black text-white">
                      !
                    </span>
                  )}
                </Link>
              );
            },
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() =>
              void logout()
            }
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-blue-100 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
          >
            Keluar
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="PT.DREAMWEAR"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">
                {profile.name}
              </p>

              <p className="text-[10px] font-bold text-blue-600">
                {profile.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void logout()
            }
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
          >
            Keluar
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white md:hidden">
        <div
          className={
            profile.role ===
            "ADMIN"
              ? "grid grid-cols-4"
              : "grid grid-cols-4"
          }
        >
          {menus.map(
            (item) => {
              const active =
                isActive(
                  item.href,
                );

                const chatBadge =
                  item.href === "/chat"
                    ? chatUnreadCount
                    : 0;


              const badge =
                item.href ===
                  "/kebersihan" &&
                reminderActive &&
                pending;

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={[
                    "relative flex flex-col items-center justify-center gap-1 px-1 py-2 font-bold",
                    profile.role ===
                    "ADMIN"
                      ? "text-[8px]"
                      : "text-[10px]",
                    active
                      ? "text-blue-600"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "relative flex h-7 w-7 items-center justify-center rounded-lg text-sm",
                      active
                        ? "bg-blue-100"
                        : "",
                    ].join(" ")}
                  >
                    {
                      item.icon
                    }

                    {badge && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">
                        !
                      </span>
                    )}
                  </span>

                  {
                    item.label
                  }

                    {chatBadge > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-black text-white shadow-sm">
                        {chatBadge > 99
                          ? "99+"
                          : chatBadge}
                      </span>
                    )}

                </Link>
              );
            },
          )}
        </div>
      </nav>
    </>
  );
}
