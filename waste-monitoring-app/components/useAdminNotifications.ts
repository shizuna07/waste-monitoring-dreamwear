"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

export type NotificationSeverity =
  | "danger"
  | "warning"
  | "info";

export type AdminNotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  severity: NotificationSeverity;
  count: number;
};

type WasteRecord = {
  record_date: string;

  cutting_kg: number | string;
  plastic_kg: number | string;
  paper_kg: number | string;
  carton_kg: number | string;
  pedding_kg: number | string;
  wet_waste_kg: number | string;

  photo_path: string | null;
};

type WorkCalendar = {
  work_date: string;
  is_workday: boolean;
  note: string | null;
};

type TargetRow = {
  cutting_target: number | string;
  plastic_target: number | string;
  paper_target: number | string;
  carton_target: number | string;
  pedding_target: number | string;
  wet_waste_target: number | string;
};

function jakartaNow() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(
      new Date(),
    );

  const value:
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
      value[
        part.type
      ] =
        part.value;
    }
  }

  return {
    date:
      `${value.year}-${value.month}-${value.day}`,

    month:
      `${value.year}-${value.month}`,

    hour:
      Number(
        value.hour,
      ),
  };
}

function nextMonth(
  monthKey: string,
) {
  let [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(Number);

  month += 1;

  if (
    month === 13
  ) {
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

function num(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return Number(
    value ?? 0,
  );
}

export function useAdminNotifications() {
  const {
    profile,
  } = useAuth();

  const [
    records,
    setRecords,
  ] =
    useState<WasteRecord[]>(
      [],
    );

  const [
    schedules,
    setSchedules,
  ] =
    useState<WorkCalendar[]>(
      [],
    );

  const [
    target,
    setTarget,
  ] =
    useState<TargetRow | null>(
      null,
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

  const loadNotifications =
    useCallback(async () => {
      if (
        profile.role !==
        "ADMIN"
      ) {
        return;
      }

      const now =
        jakartaNow();

      const start =
        `${now.month}-01`;

      const end =
        `${nextMonth(
          now.month,
        )}-01`;

      const [
        recordResult,
        scheduleResult,
        targetResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "waste_daily",
            )
            .select(`
              record_date,
              cutting_kg,
              plastic_kg,
              paper_kg,
              carton_kg,
              pedding_kg,
              wet_waste_kg,
              photo_path
            `)
            .gte(
              "record_date",
              start,
            )
            .lt(
              "record_date",
              end,
            ),

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
            ),

          supabase
            .from(
              "waste_monthly_targets",
            )
            .select(`
              cutting_target,
              plastic_target,
              paper_target,
              carton_target,
              pedding_target,
              wet_waste_target
            `)
            .eq(
              "month_key",
              now.month,
            )
            .maybeSingle(),
        ]);

      const error =
        recordResult.error ??
        scheduleResult.error ??
        targetResult.error;

      if (error) {
        setErrorMessage(
          error.message,
        );

        setLoading(false);
        return;
      }

      setRecords(
        (recordResult.data ??
          []) as WasteRecord[],
      );

      setSchedules(
        (scheduleResult.data ??
          []) as WorkCalendar[],
      );

      setTarget(
        targetResult.data as
          | TargetRow
          | null,
      );

      setErrorMessage("");
      setLoading(false);
    }, [
      profile.role,
    ]);

  useEffect(() => {
    void loadNotifications();

    const interval =
      window.setInterval(
        () => {
          void loadNotifications();
        },
        30000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    loadNotifications,
  ]);

  const result =
    useMemo(() => {
      const now =
        jakartaNow();

      const items:
        AdminNotificationItem[] =
          [];

      const recordMap =
        new Map<
          string,
          WasteRecord
        >();

      records.forEach(
        (
          record,
        ) => {
          recordMap.set(
            record.record_date,
            record,
          );
        },
      );

      const scheduleMap =
        new Map<
          string,
          WorkCalendar
        >();

      schedules.forEach(
        (
          schedule,
        ) => {
          scheduleMap.set(
            schedule.work_date,
            schedule,
          );
        },
      );

      const todaySchedule =
        scheduleMap.get(
          now.date,
        );

      const todayRecord =
        recordMap.get(
          now.date,
        );

      let inputCount =
        0;

      let cleanlinessCount =
        0;

      /*
       * JADWAL BELUM DIATUR
       */
      if (!todaySchedule) {
        items.push({
          id:
            "schedule-today",

          title:
            "Jadwal hari ini belum diatur",

          description:
            "Tentukan apakah hari ini Hari Kerja atau Libur.",

          href:
            "/pengaturan",

          severity:
            "warning",

          count: 1,
        });
      }

      /*
       * INPUT HARI INI
       */
      if (
        todaySchedule
          ?.is_workday &&
        !todayRecord
      ) {
        inputCount = 1;

        items.push({
          id:
            "today-input",

          title:
            "Limbah hari ini belum diinput",

          description:
            "Belum ada pencatatan limbah untuk hari kerja ini.",

          href:
            "/input-limbah",

          severity:
            "danger",

          count: 1,
        });
      }

      /*
       * FOTO HARI INI
       */
      if (
        todaySchedule
          ?.is_workday &&
        todayRecord &&
        !todayRecord.photo_path
      ) {
        cleanlinessCount =
          1;

        items.push({
          id:
            "today-photo",

          title:
            "Foto kebersihan belum dikirim",

          description:
            now.hour >= 16
              ? "Sudah melewati pukul 16:00 WIB."
              : "Bukti foto masih menunggu. Batas monitoring pukul 16:00 WIB.",

          href:
            "/kebersihan",

          severity:
            now.hour >= 16
              ? "danger"
              : "warning",

          count: 1,
        });
      }

      /*
       * HARI KERJA SEBELUMNYA
       */
      const incompletePastDays =
        schedules.filter(
          (
            schedule,
          ) => {
            if (
              !schedule.is_workday ||
              schedule.work_date >=
                now.date
            ) {
              return false;
            }

            const record =
              recordMap.get(
                schedule.work_date,
              );

            return (
              !record ||
              !record.photo_path
            );
          },
        );

      if (
        incompletePastDays.length >
        0
      ) {
        items.push({
          id:
            "past-compliance",

          title:
            `${incompletePastDays.length} hari kerja belum lengkap`,

          description:
            "Ada pencatatan atau bukti kebersihan bulan ini yang belum lengkap.",

          href:
            "/kepatuhan",

          severity:
            "danger",

          count:
            incompletePastDays.length,
        });
      }

      /*
       * TARGET BULANAN
       */
      let targetCount =
        0;

      if (target) {
        const totals = {
          cutting: 0,
          plastic: 0,
          paper: 0,
          carton: 0,
          pedding: 0,
          wet: 0,
        };

        records.forEach(
          (
            record,
          ) => {
            totals.cutting +=
              num(
                record.cutting_kg,
              );

            totals.plastic +=
              num(
                record.plastic_kg,
              );

            totals.paper +=
              num(
                record.paper_kg,
              );

            totals.carton +=
              num(
                record.carton_kg,
              );

            totals.pedding +=
              num(
                record.pedding_kg,
              );

            totals.wet +=
              num(
                record.wet_waste_kg,
              );
          },
        );

        const categories =
          [
            {
              key:
                "cutting",
              name:
                "Bahan Cutting",
              actual:
                totals.cutting,
              limit:
                num(
                  target.cutting_target,
                ),
            },
            {
              key:
                "plastic",
              name:
                "Plastik",
              actual:
                totals.plastic,
              limit:
                num(
                  target.plastic_target,
                ),
            },
            {
              key:
                "paper",
              name:
                "Paper",
              actual:
                totals.paper,
              limit:
                num(
                  target.paper_target,
                ),
            },
            {
              key:
                "carton",
              name:
                "Karton",
              actual:
                totals.carton,
              limit:
                num(
                  target.carton_target,
                ),
            },
            {
              key:
                "pedding",
              name:
                "Pedding",
              actual:
                totals.pedding,
              limit:
                num(
                  target.pedding_target,
                ),
            },
            {
              key:
                "wet",
              name:
                "Basah / Umum",
              actual:
                totals.wet,
              limit:
                num(
                  target.wet_waste_target,
                ),
            },
          ];

        categories.forEach(
          (
            category,
          ) => {
            if (
              category.limit <=
              0
            ) {
              return;
            }

            const percentage =
              (
                category.actual /
                category.limit
              ) *
              100;

            if (
              percentage >=
              80
            ) {
              targetCount +=
                1;

              items.push({
                id:
                  `target-${category.key}`,

                title:
                  percentage > 100
                    ? `${category.name} melebihi batas`
                    : `${category.name} mendekati batas`,

                description:
                  `${percentage.toLocaleString(
                    "id-ID",
                    {
                      maximumFractionDigits:
                        1,
                    },
                  )}% dari batas bulan ini.`,

                href:
                  "/pengaturan",

                severity:
                  percentage > 100
                    ? "danger"
                    : "warning",

                count: 1,
              });
            }
          },
        );
      }

      const totalCount =
        items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.count,
          0,
        );

      return {
        items,
        totalCount,

        counts: {
          input:
            inputCount,

          kebersihan:
            cleanlinessCount,

          kepatuhan:
            incompletePastDays.length,

          target:
            targetCount,
        },
      };
    }, [
      records,
      schedules,
      target,
    ]);

  return {
    ...result,

    loading,
    errorMessage,

    refresh:
      loadNotifications,
  };
}
