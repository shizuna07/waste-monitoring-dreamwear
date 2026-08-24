"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthGate";
import { useAdminNotifications } from "@/components/useAdminNotifications";

export default function SidebarNotificationBell() {
  const {
    profile,
  } =
    useAuth();

  const {
    totalCount,
  } =
    useAdminNotifications();

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <Link
      href="/notifikasi"
      title="Notifikasi"
      className="
        fixed
        right-16
        top-5
        z-[160]
        flex
        h-11
        w-11
        items-center
        justify-center
        rounded-full
        border
        border-slate-200
        bg-white
        text-lg
        shadow-lg
        transition
        hover:scale-105

        md:bottom-20
        md:left-5
        md:right-auto
        md:top-auto
      "
    >
      🔔

      {totalCount >
        0 && (
        <span
          className="
            absolute
            -right-2
            -top-2
            flex
            min-h-6
            min-w-6
            items-center
            justify-center
            rounded-full
            bg-red-600
            px-1.5
            text-[10px]
            font-black
            text-white
            ring-2
            ring-white
          "
        >
          {totalCount >
          99
            ? "99+"
            : totalCount}
        </span>
      )}
    </Link>
  );
}
