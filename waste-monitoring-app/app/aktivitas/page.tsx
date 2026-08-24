"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type JsonData =
  Record<string, unknown>;

type AuditLog = {
  id: number;

  actor_user_id:
    string | null;

  actor_name:
    string | null;

  actor_role:
    string | null;

  action: string;
  entity: string;

  record_id:
    string | null;

  record_date:
    string | null;

  description: string;

  old_data:
    JsonData | null;

  new_data:
    JsonData | null;

  created_at: string;
};

function jakartaDate(
  value = new Date(),
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(value);
}

function jakartaMonth() {
  return jakartaDate()
    .slice(0, 7);
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone:
        "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(
    new Date(value),
  );
}

function createdDateJakarta(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function createdMonthJakarta(
  value: string,
) {
  return createdDateJakarta(
    value,
  ).slice(0, 7);
}

function actionStyle(
  action: string,
) {
  if (
    action.includes(
      "HAPUS",
    )
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    action.includes(
      "FOTO",
    )
  ) {
    return "bg-purple-100 text-purple-700";
  }

  if (
    action.includes(
      "EDIT",
    ) ||
    action.includes(
      "UBAH",
    )
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-blue-100 text-blue-700";
}

function actionLabel(
  action: string,
) {
  const labels:
    Record<
      string,
      string
    > = {
      INPUT_LIMBAH:
        "Input Limbah",

      EDIT_LIMBAH:
        "Edit Limbah",

      HAPUS_LIMBAH:
        "Hapus Limbah",

      UPLOAD_FOTO_KEBERSIHAN:
        "Upload Foto",

      GANTI_FOTO_KEBERSIHAN:
        "Ganti Foto",

      HAPUS_FOTO_KEBERSIHAN:
        "Hapus Foto",

      UBAH_ROLE_USER:
        "Ubah Role",

      UBAH_STATUS_USER:
        "Status User",

      ATUR_TARGET_BULANAN:
        "Atur Target",

      UBAH_TARGET_BULANAN:
        "Ubah Target",

      TAMBAH_PIC:
        "Tambah PIC",

      UBAH_STATUS_PIC:
        "Status PIC",

      EDIT_PIC:
        "Edit PIC",
    };

  return (
    labels[action] ??
    action
  );
}

function formatValue(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Aktif"
      : "Nonaktif";
  }

  return String(value);
}

const fieldNames:
  Record<
    string,
    string
  > = {
    cutting_kg:
      "Cutting",

    plastic_kg:
      "Plastik",

    paper_kg:
      "Paper",

    carton_kg:
      "Karton",

    pedding_kg:
      "Pedding",

    wet_waste_kg:
      "Basah / Umum",

    pic_name:
      "PIC",

    notes:
      "Keterangan",

    role:
      "Role",

    active:
      "Status",

    cutting_target:
      "Target Cutting",

    plastic_target:
      "Target Plastik",

    paper_target:
      "Target Paper",

    carton_target:
      "Target Karton",

    pedding_target:
      "Target Pedding",

    wet_waste_target:
      "Target Basah / Umum",
  };

function changedFields(
  log: AuditLog,
) {
  if (
    !log.old_data ||
    !log.new_data
  ) {
    return [];
  }

  const allowed =
    Object.keys(
      fieldNames,
    );

  return allowed
    .filter(
      (key) =>
        JSON.stringify(
          log.old_data?.[
            key
          ],
        ) !==
        JSON.stringify(
          log.new_data?.[
            key
          ],
        ),
    )
    .map(
      (key) => ({
        key,

        label:
          fieldNames[key],

        oldValue:
          log.old_data?.[
            key
          ],

        newValue:
          log.new_data?.[
            key
          ],
      }),
    );
}

export default function ActivityPage() {
  const {
    profile,
  } = useAuth();

  const [
    logs,
    setLogs,
  ] =
    useState<AuditLog[]>(
      [],
    );

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

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    month,
    setMonth,
  ] =
    useState(
      jakartaMonth(),
    );

  const [
    actionFilter,
    setActionFilter,
  ] =
    useState("ALL");

  const loadLogs =
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
      } = await supabase
        .from(
          "audit_logs",
        )
        .select(`
          id,
          actor_user_id,
          actor_name,
          actor_role,
          action,
          entity,
          record_id,
          record_date,
          description,
          old_data,
          new_data,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(500);

      if (error) {
        setErrorMessage(
          error.message,
        );
      } else {
        setLogs(
          (data ??
            []) as AuditLog[],
        );
      }

      setLoading(false);
    }, [profile.role]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const actions =
    useMemo(() => {
      return Array.from(
        new Set(
          logs.map(
            (item) =>
              item.action,
          ),
        ),
      ).sort();
    }, [logs]);

  const filtered =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return logs.filter(
        (item) => {
          const monthMatch =
            !month ||
            createdMonthJakarta(
              item.created_at,
            ) === month;

          const actionMatch =
            actionFilter ===
              "ALL" ||
            item.action ===
              actionFilter;

          const searchMatch =
            !keyword ||
            (
              item.actor_name ??
              ""
            )
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            item.description
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            item.action
              .toLowerCase()
              .includes(
                keyword,
              );

          return (
            monthMatch &&
            actionMatch &&
            searchMatch
          );
        },
      );
    }, [
      logs,
      month,
      actionFilter,
      search,
    ]);

  const today =
    jakartaDate();

  const todayLogs =
    logs.filter(
      (item) =>
        createdDateJakarta(
          item.created_at,
        ) === today,
    );

  const todayInput =
    todayLogs.filter(
      (item) =>
        item.action ===
        "INPUT_LIMBAH",
    ).length;

  const todayPhoto =
    todayLogs.filter(
      (item) =>
        item.action.includes(
          "FOTO",
        ),
    ).length;

  const todayAdminChanges =
    todayLogs.filter(
      (item) =>
        item.actor_role ===
        "ADMIN" &&
        (
          item.action.includes(
            "EDIT",
          ) ||
          item.action.includes(
            "UBAH",
          ) ||
          item.action.includes(
            "HAPUS",
          )
        ),
    ).length;

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-6xl">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Administrator
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Riwayat Aktivitas
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Jejak aktivitas pengguna Waste Monitoring.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadLogs()
            }
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
          >
            ↻ Refresh
          </button>
        </div>


        {/* SUMMARY */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
            <p className="text-sm font-bold text-blue-100">
              Aktivitas Hari Ini
            </p>

            <p className="mt-2 text-3xl font-black">
              {todayLogs.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Input Limbah
            </p>

            <p className="mt-2 text-3xl font-black">
              {todayInput}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Aktivitas Foto
            </p>

            <p className="mt-2 text-3xl font-black">
              {todayPhoto}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Perubahan Admin
            </p>

            <p className="mt-2 text-3xl font-black">
              {todayAdminChanges}
            </p>
          </div>
        </div>


        {/* FILTER */}

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="grid gap-4 lg:grid-cols-3">

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Bulan
              </label>

              <input
                type="month"
                value={month}
                onChange={(
                  event,
                ) =>
                  setMonth(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Aktivitas
              </label>

              <select
                value={
                  actionFilter
                }
                onChange={(
                  event,
                ) =>
                  setActionFilter(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="ALL">
                  Semua Aktivitas
                </option>

                {actions.map(
                  (action) => (
                    <option
                      key={action}
                      value={action}
                    >
                      {actionLabel(
                        action,
                      )}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Cari
              </label>

              <input
                type="search"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Nama / aktivitas..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>
          </div>
        </section>


        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-600">
            ⚠ {errorMessage}
          </div>
        )}


        {/* LOG */}

        <section className="mt-6">

          <div className="mb-4 flex items-center justify-between">

            <div>
              <h2 className="text-xl font-black text-slate-900">
                Aktivitas
              </h2>

              <p className="text-sm text-slate-500">
                {filtered.length} aktivitas ditemukan
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">
              Mengambil riwayat aktivitas...
            </div>
          ) : filtered.length ===
            0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">
                ◷
              </div>

              <p className="mt-3 font-black text-slate-900">
                Belum Ada Aktivitas
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Aktivitas baru akan tercatat setelah fitur Audit Log diaktifkan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              {filtered.map(
                (item) => {
                  const changes =
                    changedFields(
                      item,
                    );

                  return (
                    <article
                      key={
                        item.id
                      }
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        <div className="flex items-start gap-4">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-700">
                            {item.actor_role ===
                            "ADMIN"
                              ? "A"
                              : item.actor_role ===
                                  "PIC"
                                ? "P"
                                : "S"}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-black text-slate-900">
                                {item.actor_name ??
                                  "SYSTEM"}
                              </p>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${actionStyle(
                                  item.action,
                                )}`}
                              >
                                {actionLabel(
                                  item.action,
                                )}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                                {item.actor_role ??
                                  "SYSTEM"}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-semibold text-slate-700">
                              {item.description}
                            </p>

                            <p className="mt-2 text-xs text-slate-400">
                              {formatDateTime(
                                item.created_at,
                              )}{" "}
                              WIB
                            </p>
                          </div>
                        </div>
                      </div>


                      {/* PERUBAHAN DATA */}

                      {changes.length >
                        0 && (
                        <div className="mt-4 border-t border-slate-100 pt-4">

                          <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                            Perubahan
                          </p>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">

                            {changes.map(
                              (
                                change,
                              ) => (
                                <div
                                  key={
                                    change.key
                                  }
                                  className="rounded-xl bg-slate-50 p-3"
                                >
                                  <p className="text-xs font-bold text-slate-500">
                                    {change.label}
                                  </p>

                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">

                                    <span className="font-bold text-red-500 line-through">
                                      {formatValue(
                                        change.oldValue,
                                      )}
                                    </span>

                                    <span className="text-slate-400">
                                      →
                                    </span>

                                    <span className="font-black text-blue-700">
                                      {formatValue(
                                        change.newValue,
                                      )}
                                    </span>

                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
