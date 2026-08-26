"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type Holiday = {
  holiday_date: string;
  holiday_name: string;
  holiday_type:
    | "NATIONAL"
    | "COLLECTIVE_LEAVE";
};

type WorkCalendar = {
  work_date: string;
  is_workday: boolean;
  note: string | null;
};

function jakartaParts() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Jakarta",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23",
      },
    ).formatToParts(
      new Date(),
    );

  const values:
    Record<
      string,
      string
    > = {};

  for (
    const part
    of parts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      values[
        part.type
      ] =
        part.value;
    }
  }

  return {
    isoDate:
      `${values.year}-${values.month}-${values.day}`,

    time:
      `${values.hour}:${values.minute}:${values.second}`,
  };
}

function longDate(
  isoDate: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone:
        "Asia/Jakarta",

      weekday:
        "long",

      day:
        "numeric",

      month:
        "long",

      year:
        "numeric",
    },
  )
    .format(
      new Date(
        `${isoDate}T00:00:00+07:00`,
      ),
    )
    .toUpperCase();
}

export default function RealtimeWorkClock() {
  const {
    profile,
  } =
    useAuth();

  const [
    current,
    setCurrent,
  ] =
    useState(
      jakartaParts(),
    );

  const [
    holiday,
    setHoliday,
  ] =
    useState<
      Holiday | null
    >(null);

  const [
    workDay,
    setWorkDay,
  ] =
    useState<
      WorkCalendar | null
    >(null);

  const loadStatus =
    useCallback(
      async (
        date:
          string,
      ) => {
        const [
          holidayResult,
          workResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "indonesia_holidays",
              )
              .select(`
                holiday_date,
                holiday_name,
                holiday_type
              `)
              .eq(
                "holiday_date",
                date,
              )
              .maybeSingle(),

            supabase
              .from(
                "work_calendar",
              )
              .select(`
                work_date,
                is_workday,
                note
              `)
              .eq(
                "work_date",
                date,
              )
              .maybeSingle(),
          ]);

        if (
          !holidayResult.error
        ) {
          setHoliday(
            holidayResult.data as
              | Holiday
              | null,
          );
        }

        if (
          !workResult.error
        ) {
          setWorkDay(
            workResult.data as
              | WorkCalendar
              | null,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void loadStatus(
      current.isoDate,
    );
  }, [
    current.isoDate,
    loadStatus,
  ]);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrent(
            jakartaParts(),
          );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  let statusLabel =
    "JADWAL BELUM DIATUR";

  let statusClass =
    "bg-amber-100 text-amber-700";

  /*
   * Jadwal perusahaan tetap menjadi
   * sumber utama untuk kewajiban PIC.
   */
  if (
    workDay
  ) {
    if (
      workDay.is_workday
    ) {
      statusLabel =
        "HARI KERJA";

      statusClass =
        "bg-blue-100 text-blue-700";
    } else {
      statusLabel =
        "LIBUR PERUSAHAAN";

      statusClass =
        "bg-slate-200 text-slate-700";
    }
  } else if (
    holiday?.holiday_type ===
    "NATIONAL"
  ) {
    statusLabel =
      "LIBUR NASIONAL";

    statusClass =
      "bg-red-100 text-red-700";
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            Waktu Sekarang
          </p>

          <h2 className="mt-1 text-lg font-black text-slate-900">
            {longDate(
              current.isoDate,
            )}
          </h2>

          <p className="mt-1 font-mono text-3xl font-black tabular-nums text-slate-900">
            {current.time}
            <span className="ml-2 text-sm font-black text-slate-400">
              WIB
            </span>
          </p>
        </div>


        <div className="sm:text-right">

          <span
            className={`inline-flex rounded-full px-4 py-2 text-xs font-black ${statusClass}`}
          >
            {statusLabel}
          </span>

          {holiday && (
            <div className="mt-3">

              <p
                className={[
                  "text-sm font-black",
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

              {holiday.holiday_type ===
                "COLLECTIVE_LEAVE" && (
                <p className="mt-1 text-xs text-slate-500">
                  Cuti bersama mengikuti kebijakan perusahaan.
                </p>
              )}
            </div>
          )}

          {workDay?.note && (
            <p className="mt-2 text-xs text-slate-500">
              {workDay.note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
