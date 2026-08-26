"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type WorkCalendarRow = {
  work_date: string;
  is_workday: boolean;
  note: string | null;
};

type HolidayRow = {
  holiday_date: string;
  holiday_name: string;
  holiday_type:
    | "NATIONAL"
    | "COLLECTIVE_LEAVE";
};

function jakartaMonth() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  let year = "";
  let month = "";

  for (const part of parts) {
    if (part.type === "year") {
      year = part.value;
    }

    if (part.type === "month") {
      month = part.value;
    }
  }

  if (!year || !month) {
    return "2026-08";
  }

  return `${year}-${month}`;
}

function nextMonth(
  monthKey: string,
) {
  const match =
    /^(\d{4})-(\d{2})$/.exec(
      monthKey,
    );

  if (!match) {
    return monthKey;
  }

  let year =
    Number(match[1]);

  let month =
    Number(match[2]);

  month += 1;

  if (month === 13) {
    month = 1;
    year += 1;
  }

  return `${year}-${String(
    month,
  ).padStart(
    2,
    "0",
  )}`;
}

function monthLabel(
  monthKey: string,
) {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const match =
    /^(\d{4})-(\d{2})$/.exec(
      monthKey,
    );

  if (!match) {
    return "Pilih periode";
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  if (
    month < 1 ||
    month > 12
  ) {
    return "Pilih periode";
  }

  return `${months[month - 1]} ${year}`;
}

function dateLabel(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Jakarta",
    },
  ).format(
    new Date(
      `${value}T00:00:00+07:00`,
    ),
  );
}

export default function WorkCalendarGenerator() {
  const {
    profile,
  } = useAuth();

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState(
      jakartaMonth(),
    );

  const [
    rows,
    setRows,
  ] =
    useState<
      WorkCalendarRow[]
    >([]);

  const [
    holidays,
    setHolidays,
  ] =
    useState<
      HolidayRow[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    generating,
    setGenerating,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const loadData =
    useCallback(
      async () => {
        if (
          profile.role !==
          "ADMIN"
        ) {
          return;
        }

        setLoading(true);
        setErrorMessage("");

        const start =
          `${selectedMonth}-01`;

        const end =
          `${nextMonth(
            selectedMonth,
          )}-01`;

        const [
          calendarResult,
          holidayResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "work_calendar",
              )
              .select(`
                work_date,
                is_workday,
                note
              `)
              .gte(
                "work_date",
                start,
              )
              .lt(
                "work_date",
                end,
              )
              .order(
                "work_date",
              ),

            supabase
              .from(
                "indonesia_holidays",
              )
              .select(`
                holiday_date,
                holiday_name,
                holiday_type
              `)
              .gte(
                "holiday_date",
                start,
              )
              .lt(
                "holiday_date",
                end,
              )
              .order(
                "holiday_date",
              ),
          ]);

        const error =
          calendarResult.error ??
          holidayResult.error;

        if (error) {
          setErrorMessage(
            error.message,
          );

          setLoading(false);
          return;
        }

        setRows(
          (
            calendarResult.data ??
            []
          ) as WorkCalendarRow[],
        );

        setHolidays(
          (
            holidayResult.data ??
            []
          ) as HolidayRow[],
        );

        setLoading(false);
      },
      [
        profile.role,
        selectedMonth,
      ],
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const holidayMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          HolidayRow
        >();

      holidays.forEach(
        (
          holiday,
        ) => {
          map.set(
            holiday.holiday_date,
            holiday,
          );
        },
      );

      return map;
    }, [
      holidays,
    ]);

  const stats =
    useMemo(() => {
      const work =
        rows.filter(
          (
            item,
          ) =>
            item.is_workday,
        ).length;

      const off =
        rows.filter(
          (
            item,
          ) =>
            !item.is_workday,
        ).length;

      return {
        total:
          rows.length,
        work,
        off,
      };
    }, [
      rows,
    ]);

  async function generate() {
    if (generating) {
      return;
    }

    const [
      year,
      month,
    ] =
      selectedMonth
        .split("-")
        .map(Number);

    setGenerating(true);
    setErrorMessage("");
    setMessage("");

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "generate_work_calendar",
          {
            p_year:
              year,
            p_month:
              month,
          },
        );

      if (error) {
        throw error;
      }

      const created =
        Number(
          data ?? 0,
        );

      setMessage(
        created > 0
          ? `✅ ${created} tanggal baru berhasil dibuat.`
          : "✅ Jadwal sudah lengkap. Data manual yang ada tidak diubah.",
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Generate jadwal gagal.",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            Kalender Perusahaan
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            Jadwal Kerja Otomatis
          </h2>

          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Generate jadwal Senin–Sabtu, Minggu dan libur nasional secara otomatis.
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">
          Jadwal manual tidak ditimpa
        </div>
      </div>


      <div className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]">

        <div>

          <label className="text-sm font-black text-slate-700">
            Periode
          </label>

          <input
            type="month"
            value={
              selectedMonth
            }
            onChange={(
              event,
            ) => {
              setSelectedMonth(
                event.target.value,
              );

              setMessage("");
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-black text-slate-900"
          />


          <div className="mt-4 space-y-2">

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">
                Senin – Sabtu
              </span>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                KERJA
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">
                Minggu
              </span>

              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                LIBUR
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">
                Libur Nasional
              </span>

              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                LIBUR
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">
                Cuti Bersama
              </span>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                CEK ADMIN
              </span>
            </div>
          </div>


          <button
            type="button"
            disabled={
              generating
            }
            onClick={() =>
              void generate()
            }
            className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-4 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {generating
              ? "Membuat Jadwal..."
              : "⚡ Generate Jadwal"}
          </button>


          {message && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
              ⚠ {errorMessage}
            </div>
          )}
        </div>


        <div>

          <div className="grid grid-cols-3 gap-3">

            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-2xl font-black text-slate-900">
                {stats.total}
              </p>

              <p className="text-[10px] font-black uppercase text-slate-400">
                Terjadwal
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-2xl font-black text-blue-700">
                {stats.work}
              </p>

              <p className="text-[10px] font-black uppercase text-blue-500">
                Hari Kerja
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-4 text-center">
              <p className="text-2xl font-black text-slate-700">
                {stats.off}
              </p>

              <p className="text-[10px] font-black uppercase text-slate-400">
                Libur
              </p>
            </div>
          </div>


          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">

            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">

              <p className="font-black capitalize text-slate-900">
                {monthLabel(
                  selectedMonth,
                )}
              </p>

              <p className="text-xs text-slate-500">
                Preview jadwal tersimpan
              </p>
            </div>


            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Memuat jadwal...
              </div>
            ) : rows.length ===
              0 ? (
              <div className="p-8 text-center">

                <p className="font-black text-slate-700">
                  Belum ada jadwal
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Tekan Generate Jadwal untuk membuat jadwal bulan ini.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">

                {rows.map(
                  (
                    row,
                  ) => {
                    const holiday =
                      holidayMap.get(
                        row.work_date,
                      );

                    return (
                      <div
                        key={
                          row.work_date
                        }
                        className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                      >

                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {dateLabel(
                              row.work_date,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {row.note ??
                              "-"}
                          </p>

                          {holiday && (
                            <p
                              className={[
                                "mt-1 text-xs font-black",
                                holiday.holiday_type ===
                                  "NATIONAL"
                                  ? "text-red-600"
                                  : "text-amber-600",
                              ].join(
                                " ",
                              )}
                            >
                              {holiday.holiday_type ===
                              "NATIONAL"
                                ? "🔴"
                                : "🟠"}{" "}
                              {
                                holiday.holiday_name
                              }
                            </p>
                          )}
                        </div>

                        <span
                          className={[
                            "shrink-0 rounded-full px-3 py-1 text-[10px] font-black",
                            row.is_workday
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-200 text-slate-600",
                          ].join(
                            " ",
                          )}
                        >
                          {row.is_workday
                            ? "KERJA"
                            : "LIBUR"}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
