"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

export function useChatUnread() {
  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    userId,
    setUserId,
  ] = useState("");

  /*
   * Ambil jumlah pesan yang
   * belum dibaca untuk user.
   */
  const loadUnread =
    useCallback(
      async (
        targetUserId: string,
      ) => {
        if (!targetUserId) {
          setUnreadCount(0);
          return;
        }

        const {
          count,
          error,
        } =
          await supabase
            .from(
              "chat_messages",
            )
            .select(
              "id",
              {
                count: "exact",
                head: true,
              },
            )
            .eq(
              "receiver_id",
              targetUserId,
            )
            .is(
              "read_at",
              null,
            );

        if (error) {
          console.error(
            "Unread chat error:",
            error,
          );

          return;
        }

        setUnreadCount(
          count ?? 0,
        );
      },
      [],
    );


  /*
   * Cari user yang sedang login.
   */
  useEffect(() => {
    let active = true;

    async function init() {
      const {
        data,
        error,
      } =
        await supabase.auth
          .getUser();

      if (error) {
        console.error(
          "Get user chat:",
          error,
        );

        return;
      }

      const id =
        data.user?.id ?? "";

      if (!active) {
        return;
      }

      setUserId(id);

      if (id) {
        await loadUnread(id);
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, [loadUnread]);


  /*
   * Realtime unread.
   *
   * PENTING:
   * channel dibuat UNIQUE.
   *
   * Sidebar dan card PIC boleh
   * memakai hook yang sama tanpa
   * bentrok channel Supabase.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    const uniqueId =
      Math.random()
        .toString(36)
        .slice(2, 10);

    const channelName =
      `chat-unread-${userId}-${uniqueId}`;

    const channel =
      supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "chat_messages",
          },
          () => {
            void loadUnread(
              userId,
            );
          },
        )
        .subscribe();


    /*
     * Fallback setiap 15 detik.
     * Kalau realtime terlambat,
     * badge tetap update.
     */
    const timer =
      window.setInterval(
        () => {
          void loadUnread(
            userId,
          );
        },
        15000,
      );


    /*
     * Refresh ketika user
     * balik ke tab aplikasi.
     */
    const handleFocus =
      () => {
        void loadUnread(
          userId,
        );
      };

    window.addEventListener(
      "focus",
      handleFocus,
    );


    return () => {
      window.clearInterval(
        timer,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      void supabase
        .removeChannel(
          channel,
        );
    };
  }, [
    userId,
    loadUnread,
  ]);


  return {
    unreadCount,

    refreshUnread:
      () =>
        userId
          ? loadUnread(userId)
          : Promise.resolve(),
  };
}
