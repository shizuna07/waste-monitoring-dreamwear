"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

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

function todayJakarta() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const values:
    Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] =
        part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function jakartaDayOfWeek(
  dateString: string,
) {
  return new Date(
    `${dateString}T00:00:00+07:00`,
  ).getDay();
}

export function useTodayWorkStatus() {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    schedule,
    setSchedule,
  ] =
    useState<
      WorkCalendarRow | null
    >(null);

  const [
    holiday,
    setHoliday,
  ] =
    useState<
      HolidayRow | null
    >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const today =
    todayJakarta();

  const loadStatus =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");

      const [
        scheduleResult,
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
            .eq(
              "work_date",
              today,
            )
            .maybeSingle(),

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
              today,
            )
            .maybeSingle(),
        ]);

      const error =
        scheduleResult.error ??
        holidayResult.error;

      if (error) {
        setErrorMessage(
          error.message,
        );

        setLoading(false);
        return;
      }

      setSchedule(
        scheduleResult.data as
          | WorkCalendarRow
          | null,
      );

      setHoliday(
        holidayResult.data as
          | HolidayRow
          | null,
      );

      setLoading(false);
    }, [today]);

  useEffect(() => {
    void loadStatus();

    const timer =
      window.setInterval(
        () => {
          void loadStatus();
        },
        60000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [loadStatus]);

  /*
   * PRIORITAS:
   *
   * 1. Override work_calendar Admin
   * 2. Libur Nasional
   * 3. Minggu
   * 4. Senin-Sabtu = kerja
   *
   * Cuti bersama tidak otomatis libur.
   */

  let isWorkday = true;

  let statusLabel =
    "HARI KERJA";

  let note =
    schedule?.note ??
    "";

  if (schedule) {
    isWorkday =
      schedule.is_workday;

    statusLabel =
      schedule.is_workday
        ? "HARI KERJA"
        : "LIBUR PERUSAHAAN";
  } else if (
    holiday?.holiday_type ===
    "NATIONAL"
  ) {
    isWorkday = false;

    statusLabel =
      "LIBUR NASIONAL";

    note =
      holiday.holiday_name;
  } else if (
    jakartaDayOfWeek(
      today,
    ) === 0
  ) {
    isWorkday = false;

    statusLabel =
      "LIBUR MINGGU";

    note =
      "Hari Minggu";
  }

  return {
    today,
    loading,
    errorMessage,

    schedule,
    holiday,

    isWorkday,
    statusLabel,
    note,

    refresh:
      loadStatus,
  };
}
