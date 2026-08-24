"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

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
  month_key: string;

  cutting_target: number | string;
  plastic_target: number | string;
  paper_target: number | string;
  carton_target: number | string;
  pedding_target: number | string;
  wet_waste_target: number | string;
};

type AlertItem = {
  id: string;
  level:
    | "danger"
    | "warning"
    | "info";

  title: string;
  description: string;
};

function jakartaNow() {
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
    date:
      `${values.year}-${values.month}-${values.day}`,

    month:
      `${values.year}-${values.month}`,

    hour:
      Number(
        values.hour,
      ),

    minute:
      Number(
        values.minute,
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

function numberValue(
  value:
    | number
    | string
    | null
    | undefined,
) {
  return Number(
    value ?? 0,
  );
}

export default function TodayAttentionPanel() {
  const {
    profile,
  } =
    useAuth();

  const [
    todayRecord,
    setTodayRecord,
  ] =
    useState<
      WasteRecord | null
    >(null);

  const [
    calendar,
    setCalendar,
  ] =
    useState<
      WorkCalendar | null
    >(null);

  const [
    target,
    setTarget,
  ] =
    useState<
      TargetRow | null
    >(null);

  const [
    monthRecords,
    setMonthRecords,
  ] =
    useState<
      WasteRecord[]
    >([]);

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

  const loadData =
    useCallback(
      async () => {
        if (
          profile.role !==
          "ADMIN"
        ) {
          return;
        }

        const now =
          jakartaNow();

        const monthStart =
          `${now.month}-01`;

        const monthEnd =
          `${nextMonth(
            now.month,
          )}-01`;

        const [
          todayResult,
          calendarResult,
          targetResult,
          monthResult,
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
              .eq(
                "record_date",
                now.date,
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
                now.date,
              )
              .maybeSingle(),

            supabase
              .from(
                "waste_monthly_targets",
              )
              .select("*")
              .eq(
                "month_key",
                now.month,
              )
              .maybeSingle(),

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
                monthStart,
              )
              .lt(
                "record_date",
                monthEnd,
              ),
          ]);

        const firstError =
          todayResult.error ??
          calendarResult.error ??
          targetResult.error ??
          monthResult.error;

        if (
          firstError
        ) {
          setErrorMessage(
            firstError.message,
          );

          setLoading(
            false,
          );

          return;
        }

        setTodayRecord(
          todayResult.data as
            | WasteRecord
            | null,
        );

        setCalendar(
          calendarResult.data as
            | WorkCalendar
            | null,
        );

        setTarget(
          targetResult.data as
            | TargetRow
            | null,
        );

        setMonthRecords(
          (
            monthResult.data ??
            []
          ) as WasteRecord[],
        );

        setErrorMessage(
          "",
        );

        setLoading(
          false,
        );
      },
      [
        profile.role,
      ],
    );

  useEffect(() => {
    void loadData();

    const timer =
      window.setInterval(
        () => {
          void loadData();
        },
        30000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    loadData,
  ]);

  const alerts =
    useMemo(() => {
      const result:
        AlertItem[] = [];

      const now =
        jakartaNow();

      /*
       * JADWAL KERJA
       */
      if (
        !calendar
      ) {
        result.push({
          id:
            "calendar",

          level:
            "warning",

          title:
            "Jadwal hari ini belum diatur",

          description:
            "Atur Hari Kerja / Libur melalui menu Pengaturan.",
        });

        return result;
      }

      /*
       * HARI LIBUR
       */
      if (
        !calendar.is_workday
      ) {
        return result;
      }

      /*
       * INPUT LIMBAH
       */
      if (
        !todayRecord
      ) {
        result.push({
          id:
            "input",

          level:
            "danger",

          title:
            "Limbah hari ini belum diinput",

          description:
            "Belum ditemukan pencatatan limbah untuk hari kerja ini.",
        });
      }

      /*
       * FOTO KEBERSIHAN
       */
      if (
        todayRecord &&
        !todayRecord.photo_path
      ) {
        if (
          now.hour < 16
        ) {
          result.push({
            id:
              "photo",

            level:
              "warning",

            title:
              "Foto kebersihan belum dikirim",

            description:
              "Masih menunggu bukti kebersihan. Pengingat utama mulai pukul 16:00 WIB.",
          });
        } else {
          result.push({
            id:
              "photo",

            level:
              "danger",

            title:
              "Foto kebersihan belum dikirim",

            description:
              "Sudah melewati pukul 16:00 WIB.",
          });
        }
      }

      /*
       * TARGET BULANAN
       */
      if (
        target
      ) {
        const totals = {
          cutting: 0,
          plastic: 0,
          paper: 0,
          carton: 0,
          pedding: 0,
          wet: 0,
        };

        monthRecords.forEach(
          (
            item,
          ) => {
            totals.cutting +=
              numberValue(
                item.cutting_kg,
              );

            totals.plastic +=
              numberValue(
                item.plastic_kg,
              );

            totals.paper +=
              numberValue(
                item.paper_kg,
              );

            totals.carton +=
              numberValue(
                item.carton_kg,
              );

            totals.pedding +=
              numberValue(
                item.pedding_kg,
              );

            totals.wet +=
              numberValue(
                item.wet_waste_kg,
              );
          },
        );

        const categories =
          [
            {
              id:
                "cutting",
              label:
                "Bahan Cutting",
              actual:
                totals.cutting,
              target:
                numberValue(
                  target.cutting_target,
                ),
            },
            {
              id:
                "plastic",
              label:
                "Plastik",
              actual:
                totals.plastic,
              target:
                numberValue(
                  target.plastic_target,
                ),
            },
            {
              id:
                "paper",
              label:
                "Paper",
              actual:
                totals.paper,
              target:
                numberValue(
                  target.paper_target,
                ),
            },
            {
              id:
                "carton",
              label:
                "Karton",
              actual:
                totals.carton,
              target:
                numberValue(
                  target.carton_target,
                ),
            },
            {
              id:
                "pedding",
              label:
                "Pedding",
              actual:
                totals.pedding,
              target:
                numberValue(
                  target.pedding_target,
                ),
            },
            {
              id:
                "wet",
              label:
                "Basah / Umum",
              actual:
                totals.wet,
              target:
                numberValue(
                  target.wet_waste_target,
                ),
            },
          ];

        categories.forEach(
          (
            item,
          ) => {
            if (
              item.target <=
              0
            ) {
              return;
            }

            const percentage =
              (
                item.actual /
                item.target
              ) *
              100;

            if (
              percentage >
              100
            ) {
              result.push({
                id:
                  `target-${item.id}`,

                level:
                  "danger",

                title:
                  `${item.label} melebihi batas bulanan`,

                description:
                  `${percentage.toLocaleString(
                    "id-ID",
                    {
                      maximumFractionDigits:
                        1,
                    },
                  )}% dari batas bulan ini.`,
              });
            } else if (
              percentage >=
              80
            ) {
              result.push({
                id:
                  `target-${item.id}`,

                level:
                  "warning",

                title:
                  `${item.label} mendekati batas`,

                description:
                  `${percentage.toLocaleString(
                    "id-ID",
                    {
                      maximumFractionDigits:
                        1,
                    },
                  )}% dari batas bulan ini.`,
              });
            }
          },
        );
      }

      return result;
    }, [
      calendar,
      todayRecord,
      target,
      monthRecords,
    ]);

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  if (
    loading
  ) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">
          Memeriksa kondisi hari ini...
        </p>
      </div>
    );
  }

  if (
    errorMessage
  ) {
    return (
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="font-black text-red-700">
          ⚠ Monitoring gagal dimuat
        </p>

        <p className="mt-1 text-sm text-red-600">
          {errorMessage}
        </p>
      </div>
    );
  }

  /*
   * LIBUR
   */
  if (
    calendar &&
    !calendar.is_workday
  ) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Status Hari Ini
        </p>

        <div className="mt-3 flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
            ○
          </div>

          <div>
            <p className="text-lg font-black text-slate-900">
              Hari Libur
            </p>

            <p className="text-sm text-slate-500">
              {calendar.note ??
                "Tidak ada kewajiban pencatatan hari ini."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * SEMUA AMAN
   */
  if (
    alerts.length ===
    0
  ) {
    return (
      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white">
            ✓
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Status Hari Ini
            </p>

            <p className="mt-1 text-lg font-black text-slate-900">
              Semua Aman Hari Ini
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Pencatatan limbah dan bukti kebersihan sudah lengkap.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between gap-4">

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
            Perlu Perhatian
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            {alerts.length} Hal Perlu Dicek
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Kondisi monitoring hari ini dan batas limbah bulanan.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData()
          }
          className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
        >
          ↻ Refresh
        </button>
      </div>


      <div className="mt-5 grid gap-3">

        {alerts.map(
          (
            item,
          ) => {
            const danger =
              item.level ===
              "danger";

            const info =
              item.level ===
              "info";

            return (
              <div
                key={
                  item.id
                }
                className={[
                  "flex items-start gap-4 rounded-xl border p-4",

                  danger
                    ? "border-red-200 bg-red-50"
                    : info
                      ? "border-blue-200 bg-blue-50"
                      : "border-amber-200 bg-amber-50",
                ].join(
                  " ",
                )}
              >

                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black",

                    danger
                      ? "bg-red-100 text-red-700"
                      : info
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700",
                  ].join(
                    " ",
                  )}
                >
                  {danger
                    ? "!"
                    : "⚠"}
                </div>

                <div>
                  <p
                    className={[
                      "font-black",

                      danger
                        ? "text-red-700"
                        : "text-amber-700",
                    ].join(
                      " ",
                    )}
                  >
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}
