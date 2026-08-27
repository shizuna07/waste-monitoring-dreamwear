"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useChatUnread } from "@/components/useChatUnread";

type MessageRow = {
  id: string;
  message: string;
  created_at: string;
};

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export default function PicAdminMessageCard() {
  const { unreadCount } =
    useChatUnread();

  const [latest, setLatest] =
    useState<MessageRow | null>(null);

  const loadLatest =
    useCallback(async () => {
      if (unreadCount <= 0) {
        setLatest(null);
        return;
      }

      const { data: authData } =
        await supabase.auth.getUser();

      const userId =
        authData.user?.id;

      if (!userId) return;

      const {
        data,
        error,
      } =
        await supabase
          .from("chat_messages")
          .select(`
            id,
            message,
            created_at
          `)
          .eq(
            "receiver_id",
            userId,
          )
          .is(
            "read_at",
            null,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(1);

      if (error) {
        console.error(
          "Load latest message:",
          error,
        );

        return;
      }

      setLatest(
        data?.[0] ?? null,
      );
    }, [unreadCount]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  if (unreadCount <= 0) {
    return null;
  }

  return (
    <Link
      href="/chat"
      className="mb-6 block overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="h-1 bg-blue-600" />

      <div className="p-5 sm:p-6">

        <div className="flex items-start gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl ring-1 ring-blue-100">
            💬
          </div>

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-start justify-between gap-3">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                  Pesan Admin
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Ada pesan baru untuk Anda
                </h3>
              </div>

              <span className="rounded-full bg-red-500 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount} Baru
              </span>

            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">

              <div className="flex items-center justify-between gap-3">

                <p className="text-xs font-black text-slate-700">
                  Admin
                </p>

                {latest && (
                  <p className="text-[10px] font-bold text-slate-400">
                    {formatTime(
                      latest.created_at,
                    )} WIB
                  </p>
                )}

              </div>

              <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">
                {latest
                  ? `“${latest.message}”`
                  : `${unreadCount} pesan belum dibaca dari Admin.`}
              </p>

            </div>

            <div className="mt-4 flex justify-end">

              <span className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">
                Buka Chat →
              </span>

            </div>

          </div>

        </div>

      </div>
    </Link>
  );
}
