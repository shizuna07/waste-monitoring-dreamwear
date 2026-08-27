"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type Contact = {
  user_id: string;
  name: string;
  role: "ADMIN" | "PIC";
};

type ChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

function formatTime(
  value: string,
) {
  try {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone:
          "Asia/Jakarta",
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

function formatDate(
  value: string,
) {
  try {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone:
          "Asia/Jakarta",
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    ).format(
      new Date(value),
    );
  } catch {
    return "-";
  }
}

export default function ChatPage() {
  const { profile } =
    useAuth();

  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState("");

  const [
    contacts,
    setContacts,
  ] =
    useState<Contact[]>([]);

  const [
    messages,
    setMessages,
  ] =
    useState<ChatMessage[]>(
      [],
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState("");

  const [
    draft,
    setDraft,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const bottomRef =
    useRef<HTMLDivElement>(
      null,
    );

  const loadContacts =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "chat_contacts",
          );

        if (error) {
          throw error;
        }

        const rows =
          (data ??
            []) as Contact[];

        setContacts(rows);

        setSelectedId(
          (current) =>
            current ||
            rows[0]
              ?.user_id ||
            "",
        );
      },
      [],
    );

  const loadMessages =
    useCallback(
      async (
        userId: string,
      ) => {
        if (!userId) {
          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "chat_messages",
            )
            .select(`
              id,
              sender_id,
              receiver_id,
              message,
              created_at,
              read_at
            `)
            .or(
              `sender_id.eq.${userId},receiver_id.eq.${userId}`,
            )
            .order(
              "created_at",
              {
                ascending: true,
              },
            )
            .limit(500);

        if (error) {
          throw error;
        }

        setMessages(
          (data ??
            []) as ChatMessage[],
        );
      },
      [],
    );

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data,
          error,
        } =
          await supabase.auth
            .getUser();

        if (error) {
          throw error;
        }

        const userId =
          data.user?.id;

        if (!userId) {
          throw new Error(
            "User login tidak ditemukan.",
          );
        }

        if (!active) {
          return;
        }

        setCurrentUserId(
          userId,
        );

        await Promise.all([
          loadContacts(),
          loadMessages(
            userId,
          ),
        ]);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat chat.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, [
    loadContacts,
    loadMessages,
  ]);

  /*
   * Supabase Realtime
   */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `chat-${currentUserId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "chat_messages",
          },
          () => {
            void loadMessages(
              currentUserId,
            );
          },
        )
        .subscribe();

    /*
     * Fallback refresh.
     * Kalau realtime lambat,
     * chat tetap update.
     */
    const timer =
      window.setInterval(
        () => {
          void loadMessages(
            currentUserId,
          );
        },
        15000,
      );

    return () => {
      window.clearInterval(
        timer,
      );

      void supabase
        .removeChannel(
          channel,
        );
    };
  }, [
    currentUserId,
    loadMessages,
  ]);

  const selectedContact =
    useMemo(
      () =>
        contacts.find(
          (item) =>
            item.user_id ===
            selectedId,
        ) ?? null,
      [
        contacts,
        selectedId,
      ],
    );

  const conversation =
    useMemo(
      () =>
        messages.filter(
          (item) =>
            (
              item.sender_id ===
                currentUserId &&
              item.receiver_id ===
                selectedId
            ) ||
            (
              item.sender_id ===
                selectedId &&
              item.receiver_id ===
                currentUserId
            ),
        ),
      [
        messages,
        currentUserId,
        selectedId,
      ],
    );

  /*
   * Tandai pesan dari kontak aktif
   * sebagai sudah dibaca.
   */
  const selectedUnread =
    useMemo(
      () =>
        messages.filter(
          (item) =>
            item.sender_id ===
              selectedId &&
            item.receiver_id ===
              currentUserId &&
            !item.read_at,
        ).length,
      [
        messages,
        selectedId,
        currentUserId,
      ],
    );

  useEffect(() => {
    if (
      !selectedId ||
      !currentUserId ||
      selectedUnread <= 0
    ) {
      return;
    }

    async function markRead() {
      const {
        error,
      } =
        await supabase.rpc(
          "mark_chat_read",
          {
            p_sender_id:
              selectedId,
          },
        );

      if (!error) {
        await loadMessages(
          currentUserId,
        );
      }
    }

    void markRead();
  }, [
    selectedId,
    selectedUnread,
    currentUserId,
    loadMessages,
  ]);

  useEffect(() => {
    bottomRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [
    conversation.length,
    selectedId,
  ]);

  const contactsWithInfo =
    useMemo(
      () =>
        contacts
          .map(
            (contact) => {
              const related =
                messages.filter(
                  (item) =>
                    item.sender_id ===
                      contact.user_id ||
                    item.receiver_id ===
                      contact.user_id,
                );

              const last =
                related.at(
                  -1,
                );

              const unread =
                related.filter(
                  (item) =>
                    item.sender_id ===
                      contact.user_id &&
                    item.receiver_id ===
                      currentUserId &&
                    !item.read_at,
                ).length;

              return {
                ...contact,
                last,
                unread,
              };
            },
          )
          .filter(
            (contact) =>
              contact.name
                .toLowerCase()
                .includes(
                  search
                    .trim()
                    .toLowerCase(),
                ),
          )
          .sort(
            (a, b) => {
              if (
                a.last &&
                b.last
              ) {
                return (
                  new Date(
                    b.last
                      .created_at,
                  ).getTime() -
                  new Date(
                    a.last
                      .created_at,
                  ).getTime()
                );
              }

              if (a.last) {
                return -1;
              }

              if (b.last) {
                return 1;
              }

              return a.name
                .localeCompare(
                  b.name,
                );
            },
          ),
      [
        contacts,
        messages,
        currentUserId,
        search,
      ],
    );

  const totalUnread =
    useMemo(
      () =>
        messages.filter(
          (item) =>
            item.receiver_id ===
              currentUserId &&
            !item.read_at,
        ).length,
      [
        messages,
        currentUserId,
      ],
    );

  async function sendMessage(
    event?: FormEvent,
  ) {
    event?.preventDefault();

    const message =
      draft.trim();

    if (
      !message ||
      !selectedId ||
      !currentUserId ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setErrorMessage("");

      const {
        error,
      } =
        await supabase
          .from(
            "chat_messages",
          )
          .insert({
            sender_id:
              currentUserId,

            receiver_id:
              selectedId,

            message,
          });

      if (error) {
        throw error;
      }

      setDraft("");

      await loadMessages(
        currentUserId,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pesan gagal dikirim.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void sendMessage();
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-6 sm:px-8">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
              Internal Communication
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Chat
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {profile.role ===
              "ADMIN"
                ? "Komunikasi langsung dengan PIC."
                : "Komunikasi langsung dengan Admin."}
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm">
            💬 {totalUnread} Belum Dibaca
          </div>

        </div>


        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {errorMessage}
          </div>
        )}


        <div className="grid min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">

          {/* ================= CONTACT LIST ================= */}

          <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">

            <div className="border-b border-slate-200 p-4">

              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                {profile.role ===
                "ADMIN"
                  ? "Daftar PIC"
                  : "Daftar Admin"}
              </p>

              <div className="relative mt-3">

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Cari..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />

              </div>

            </div>


            <div className="max-h-[290px] overflow-y-auto lg:max-h-[610px]">

              {loading && (
                <div className="p-6 text-center text-sm font-bold text-slate-400">
                  Memuat kontak...
                </div>
              )}

              {!loading &&
                contactsWithInfo.length ===
                  0 && (
                  <div className="p-6 text-center">

                    <p className="text-sm font-black text-slate-500">
                      Belum ada kontak
                    </p>

                  </div>
                )}


              {contactsWithInfo.map(
                (contact) => {
                  const active =
                    contact.user_id ===
                    selectedId;

                  return (
                    <button
                      key={
                        contact.user_id
                      }
                      type="button"
                      onClick={() =>
                        setSelectedId(
                          contact.user_id,
                        )
                      }
                      className={[
                        "flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition",
                        active
                          ? "bg-blue-50"
                          : "hover:bg-white",
                      ].join(
                        " ",
                      )}
                    >

                      <div
                        className={[
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black",
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-600",
                        ].join(
                          " ",
                        )}
                      >
                        {contact.name
                          .slice(
                            0,
                            1,
                          )
                          .toUpperCase()}
                      </div>


                      <div className="min-w-0 flex-1">

                        <div className="flex items-center justify-between gap-2">

                          <p className="truncate text-sm font-black text-slate-900">
                            {
                              contact.name
                            }
                          </p>

                          {contact.last && (
                            <span className="shrink-0 text-[9px] font-bold text-slate-400">
                              {formatTime(
                                contact
                                  .last
                                  .created_at,
                              )}
                            </span>
                          )}

                        </div>


                        <div className="mt-1 flex items-center justify-between gap-2">

                          <p className="truncate text-xs text-slate-400">
                            {contact.last
                              ? contact
                                  .last
                                  .message
                              : contact.role}
                          </p>

                          {contact.unread >
                            0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                              {
                                contact.unread
                              }
                            </span>
                          )}

                        </div>

                      </div>

                    </button>
                  );
                },
              )}

            </div>

          </aside>


          {/* ================= CONVERSATION ================= */}

          <section className="flex min-h-[620px] flex-col bg-white">

            {!selectedContact ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">

                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-3xl">
                  💬
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-800">
                  Pilih Percakapan
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Pilih user untuk mulai mengirim pesan.
                </p>

              </div>
            ) : (
              <>

                {/* CHAT HEADER */}

                <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">
                    {selectedContact.name
                      .slice(
                        0,
                        1,
                      )
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">

                    <h2 className="truncate text-sm font-black text-slate-950">
                      {
                        selectedContact.name
                      }
                    </h2>

                    <div className="mt-1 flex items-center gap-2">

                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>

                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {
                          selectedContact.role
                        }
                      </span>

                    </div>

                  </div>

                </div>


                {/* MESSAGES */}

                <div className="flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-5 sm:px-6">

                  {conversation.length ===
                    0 && (
                    <div className="flex h-full min-h-[330px] items-center justify-center text-center">

                      <div>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                          👋
                        </div>

                        <p className="mt-3 text-sm font-black text-slate-600">
                          Belum ada pesan
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Mulai percakapan dengan {selectedContact.name}.
                        </p>
                      </div>

                    </div>
                  )}


                  <div className="space-y-3">

                    {conversation.map(
                      (
                        item,
                        index,
                      ) => {
                        const mine =
                          item.sender_id ===
                          currentUserId;

                        const previous =
                          conversation[
                            index -
                              1
                          ];

                        const showDate =
                          !previous ||
                          formatDate(
                            previous.created_at,
                          ) !==
                            formatDate(
                              item.created_at,
                            );

                        return (
                          <div
                            key={
                              item.id
                            }
                          >

                            {showDate && (
                              <div className="my-5 flex justify-center">

                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 shadow-sm">
                                  {formatDate(
                                    item.created_at,
                                  )}
                                </span>

                              </div>
                            )}


                            <div
                              className={[
                                "flex",
                                mine
                                  ? "justify-end"
                                  : "justify-start",
                              ].join(
                                " ",
                              )}
                            >

                              <div
                                className={[
                                  "max-w-[82%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%]",
                                  mine
                                    ? "rounded-br-md bg-blue-600 text-white"
                                    : "rounded-bl-md border border-slate-200 bg-white text-slate-800",
                                ].join(
                                  " ",
                                )}
                              >

                                <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed">
                                  {
                                    item.message
                                  }
                                </p>

                                <div
                                  className={[
                                    "mt-2 flex items-center justify-end gap-1.5 text-[9px] font-bold",
                                    mine
                                      ? "text-blue-100"
                                      : "text-slate-400",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  <span>
                                    {formatTime(
                                      item.created_at,
                                    )}
                                  </span>

                                  {mine && (
                                    <span>
                                      {item.read_at
                                        ? "✓✓ Dibaca"
                                        : "✓ Terkirim"}
                                    </span>
                                  )}

                                </div>

                              </div>

                            </div>

                          </div>
                        );
                      },
                    )}

                    <div
                      ref={
                        bottomRef
                      }
                    />

                  </div>

                </div>


                {/* INPUT */}

                <form
                  onSubmit={
                    sendMessage
                  }
                  className="border-t border-slate-200 bg-white p-4"
                >

                  <div className="flex items-end gap-3">

                    <textarea
                      value={draft}
                      onChange={(
                        event,
                      ) =>
                        setDraft(
                          event
                            .target
                            .value,
                        )
                      }
                      onKeyDown={
                        handleKeyDown
                      }
                      rows={1}
                      maxLength={
                        2000
                      }
                      placeholder={`Ketik pesan untuk ${selectedContact.name}...`}
                      className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="submit"
                      disabled={
                        sending ||
                        !draft.trim()
                      }
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending
                        ? "…"
                        : "➤"}
                    </button>

                  </div>

                  <div className="mt-2 flex items-center justify-between px-1">

                    <p className="text-[9px] font-semibold text-slate-400">
                      Enter kirim • Shift + Enter baris baru
                    </p>

                    <p className="text-[9px] font-bold text-slate-300">
                      {draft.length}/2000
                    </p>

                  </div>

                </form>

              </>
            )}

          </section>

        </div>

      </div>

    </main>
  );
}
