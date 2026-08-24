"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type CalendarRow = {
  work_date: string;
  is_workday: boolean;
  note: string | null;
};

const WEEKDAYS = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min",
];

function currentMonthJakarta() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
      },
    ).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}`;
}

function getNextMonth(
  monthKey: string,
) {
  let [year, month] =
    monthKey
      .split("-")
      .map(Number);

  month += 1;

  if (month === 13) {
    year += 1;
    month = 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(
  monthKey: string,
) {
  const [year, month] =
    monthKey
      .split("-")
      .map(Number);

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    },
  ).format(
    new Date(
      `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`,
    ),
  );
}

function dateLabel(
  date: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    },
  ).format(
    new Date(
      `${date}T00:00:00+07:00`,
    ),
  );
}

function getMonthInfo(
  monthKey: string,
) {
  const [year, month] =
    monthKey
      .split("-")
      .map(Number);

  const totalDays =
    new Date(
      year,
      month,
      0,
    ).getDate();

  const firstDay =
    new Date(
      Date.UTC(
        year,
        month - 1,
        1,
      ),
    ).getUTCDay();

  const offset =
    (firstDay + 6) % 7;

  return {
    year,
    month,
    totalDays,
    offset,
  };
}

function dayOfWeek(
  date: string,
) {
  const [year, month, day] =
    date
      .split("-")
      .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  ).getUTCDay();
}

export default function WorkCalendarSettings() {
  const {
    userId,
    profile,
  } = useAuth();

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState(
      currentMonthJakarta(),
    );

  const [
    rows,
    setRows,
  ] =
    useState<CalendarRow[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState("");

  const [
    selectedWorkday,
    setSelectedWorkday,
  ] =
    useState(true);

  const [
    selectedNote,
    setSelectedNote,
  ] =
    useState("");

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

  const loadCalendar =
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
          "work_calendar",
        )
        .select(
          "work_date, is_workday, note",
        )
        .gte(
          "work_date",
          `${selectedMonth}-01`,
        )
        .lt(
          "work_date",
          `${getNextMonth(selectedMonth)}-01`,
        )
        .order(
          "work_date",
          {
            ascending: true,
          },
        );

      if (error) {
        setErrorMessage(
          error.message,
        );
      } else {
        setRows(
          (data ??
            []) as CalendarRow[],
        );
      }

      setLoading(false);
    }, [
      profile.role,
      selectedMonth,
    ]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const rowMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          CalendarRow
        >();

      rows.forEach(
        (item) => {
          map.set(
            item.work_date,
            item,
          );
        },
      );

      return map;
    }, [rows]);

  const monthInfo =
    useMemo(
      () =>
        getMonthInfo(
          selectedMonth,
        ),
      [selectedMonth],
    );

  const calendarCells =
    useMemo(() => {
      const result:
        Array<
          string | null
        > = [];

      for (
        let i = 0;
        i <
        monthInfo.offset;
        i += 1
      ) {
        result.push(null);
      }

      for (
        let day = 1;
        day <=
        monthInfo.totalDays;
        day += 1
      ) {
        result.push(
          `${selectedMonth}-${String(
            day,
          ).padStart(
            2,
            "0",
          )}`,
        );
      }

      while (
        result.length % 7 !==
        0
      ) {
        result.push(null);
      }

      return result;
    }, [
      monthInfo,
      selectedMonth,
    ]);

  const workdayCount =
    rows.filter(
      (item) =>
        item.is_workday,
    ).length;

  const holidayCount =
    rows.filter(
      (item) =>
        !item.is_workday,
    ).length;

  const unconfiguredCount =
    monthInfo.totalDays -
    rows.length;

  function openDate(
    date: string,
  ) {
    const row =
      rowMap.get(date);

    setSelectedDate(date);

    setSelectedWorkday(
      row
        ? row.is_workday
        : true,
    );

    setSelectedNote(
      row?.note ?? "",
    );

    setMessage("");
    setErrorMessage("");
  }

  async function saveDate() {
    if (!selectedDate) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const existing =
      rowMap.get(
        selectedDate,
      );

    if (existing) {
      const {
        error,
      } = await supabase
        .from(
          "work_calendar",
        )
        .update({
          is_workday:
            selectedWorkday,

          note:
            selectedNote
              .trim() ||
            null,

          updated_by:
            userId,
        })
        .eq(
          "work_date",
          selectedDate,
        );

      if (error) {
        setErrorMessage(
          error.message,
        );

        setSaving(false);
        return;
      }
    } else {
      const {
        error,
      } = await supabase
        .from(
          "work_calendar",
        )
        .insert({
          work_date:
            selectedDate,

          is_workday:
            selectedWorkday,

          note:
            selectedNote
              .trim() ||
            null,

          created_by:
            userId,

          updated_by:
            userId,
        });

      if (error) {
        setErrorMessage(
          error.message,
        );

        setSaving(false);
        return;
      }
    }

    setMessage(
      `Jadwal ${dateLabel(
        selectedDate,
      )} berhasil disimpan.`,
    );

    setSelectedDate("");

    await loadCalendar();

    setSaving(false);
  }

  async function applyPattern(
    mode:
      | "MON_FRI"
      | "MON_SAT",
  ) {
    const label =
      mode === "MON_FRI"
        ? "Senin–Jumat"
        : "Senin–Sabtu";

    const ok =
      window.confirm(
        `Terapkan pola kerja ${label} untuk seluruh ${monthLabel(
          selectedMonth,
        )}? Pengaturan tanggal yang sudah ada akan ditimpa.`,
      );

    if (!ok) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const items = [];

    for (
      let day = 1;
      day <=
      monthInfo.totalDays;
      day += 1
    ) {
      const date =
        `${selectedMonth}-${String(
          day,
        ).padStart(
          2,
          "0",
        )}`;

      const weekday =
        dayOfWeek(date);

      let isWorkday =
        false;

      if (
        mode ===
        "MON_FRI"
      ) {
        isWorkday =
          weekday >= 1 &&
          weekday <= 5;
      } else {
        isWorkday =
          weekday >= 1 &&
          weekday <= 6;
      }

      items.push({
        work_date: date,

        is_workday:
          isWorkday,

        note:
          isWorkday
            ? null
            : weekday === 0
              ? "Minggu"
              : "Libur",

        updated_by:
          userId,
      });
    }

    const {
      error,
    } = await supabase
      .from(
        "work_calendar",
      )
      .upsert(
        items,
        {
          onConflict:
            "work_date",
        },
      );

    if (error) {
      setErrorMessage(
        error.message,
      );
    } else {
      setMessage(
        `Pola kerja ${label} berhasil diterapkan untuk ${monthLabel(
          selectedMonth,
        )}.`,
      );

      await loadCalendar();
    }

    setSaving(false);
  }

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <>
      <section className="mt-8">

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            Kalender Kerja
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Jadwal Kerja & Hari Libur
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Tentukan tanggal yang wajib dilakukan pencatatan limbah.
          </p>
        </div>


        {/* MONTH */}

        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">

          <label className="text-sm font-bold text-slate-700">
            Bulan
          </label>

          <input
            type="month"
            value={
              selectedMonth
            }
            onChange={(
              event,
            ) =>
              setSelectedMonth(
                event.target
                  .value,
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 sm:max-w-xs"
          />

          <div className="mt-5 flex flex-wrap gap-3">

            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void applyPattern(
                  "MON_FRI",
                )
              }
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
            >
              Set Senin–Jumat
            </button>

            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void applyPattern(
                  "MON_SAT",
                )
              }
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              Set Senin–Sabtu
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Setelah menggunakan pola otomatis, tanggal libur khusus tetap bisa diubah satu per satu.
          </p>
        </div>


        {/* SUMMARY */}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl bg-blue-600 p-5 text-white">
            <p className="text-sm font-bold text-blue-100">
              Hari Kerja
            </p>

            <p className="mt-2 text-3xl font-black">
              {workdayCount}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-5 text-white">
            <p className="text-sm font-bold text-slate-300">
              Hari Libur
            </p>

            <p className="mt-2 text-3xl font-black">
              {holidayCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Belum Diatur
            </p>

            <p className="mt-2 text-3xl font-black text-amber-600">
              {unconfiguredCount}
            </p>
          </div>
        </div>


        {message && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
            ✓ {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            ⚠ {errorMessage}
          </div>
        )}


        {/* LEGEND */}

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">

          <span className="rounded-full bg-blue-100 px-3 py-2 text-blue-700">
            Hari Kerja
          </span>

          <span className="rounded-full bg-slate-200 px-3 py-2 text-slate-700">
            Libur
          </span>

          <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-700">
            Belum Diatur
          </span>
        </div>


        {/* CALENDAR */}

        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="grid grid-cols-7 bg-slate-50">

            {WEEKDAYS.map(
              (item) => (
                <div
                  key={item}
                  className="p-3 text-center text-[10px] font-black text-slate-500 sm:text-xs"
                >
                  {item}
                </div>
              ),
            )}
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Mengambil jadwal...
            </div>
          ) : (
            <div className="grid grid-cols-7">

              {calendarCells.map(
                (
                  date,
                  index,
                ) => {
                  if (!date) {
                    return (
                      <div
                        key={
                          `blank-${index}`
                        }
                        className="min-h-20 border border-slate-100 bg-slate-50 sm:min-h-28"
                      />
                    );
                  }

                  const row =
                    rowMap.get(
                      date,
                    );

                  const day =
                    Number(
                      date.slice(
                        -2,
                      ),
                    );

                  const className =
                    !row
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : row.is_workday
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-100 text-slate-600";

                  return (
                    <button
                      type="button"
                      key={date}
                      onClick={() =>
                        openDate(
                          date,
                        )
                      }
                      className={`min-h-20 border p-2 text-left transition hover:shadow-md sm:min-h-28 sm:p-3 ${className}`}
                    >
                      <p className="font-black">
                        {day}
                      </p>

                      <p className="mt-2 hidden text-[10px] font-black sm:block">
                        {!row
                          ? "BELUM DIATUR"
                          : row.is_workday
                            ? "HARI KERJA"
                            : "LIBUR"}
                      </p>

                      {row?.note && (
                        <p className="mt-1 hidden truncate text-[10px] sm:block">
                          {row.note}
                        </p>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>
      </section>


      {/* MODAL */}

      {selectedDate && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
          onClick={() =>
            setSelectedDate(
              "",
            )
          }
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                  Atur Tanggal
                </p>

                <h3 className="mt-1 text-xl font-black capitalize">
                  {dateLabel(
                    selectedDate,
                  )}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    "",
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  setSelectedWorkday(
                    true,
                  )
                }
                className={[
                  "rounded-xl border-2 p-4 font-black",
                  selectedWorkday
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200",
                ].join(" ")}
              >
                Hari Kerja
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedWorkday(
                    false,
                  )
                }
                className={[
                  "rounded-xl border-2 p-4 font-black",
                  !selectedWorkday
                    ? "border-slate-900 bg-slate-100 text-slate-900"
                    : "border-slate-200",
                ].join(" ")}
              >
                Libur
              </button>
            </div>

            <label className="mb-2 mt-5 block text-sm font-bold">
              Keterangan
            </label>

            <input
              type="text"
              value={
                selectedNote
              }
              onChange={(
                event,
              ) =>
                setSelectedNote(
                  event.target
                    .value,
                )
              }
              placeholder={
                selectedWorkday
                  ? "Contoh: Hari kerja normal"
                  : "Contoh: Libur Nasional"
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void saveDate()
              }
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-black text-white disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : "Simpan Jadwal"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
