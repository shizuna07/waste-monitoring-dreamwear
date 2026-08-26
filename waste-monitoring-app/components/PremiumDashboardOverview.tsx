"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthGate";

type WasteRow = {
  record_date: string;
  total_kg: number | null;
  photo_path: string | null;
};

type WorkRow = {
  work_date: string;
  is_workday: boolean;
};

function jakartaDate() {
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

function addDays(
  value: string,
  amount: number,
) {
  const date =
    new Date(
      `${value}T00:00:00+07:00`,
    );

  date.setDate(
    date.getDate() + amount,
  );

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shortDate(
  value: string,
) {
  const [, month, day] =
    value.split("-");

  const months = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  return `${Number(day)} ${
    months[Number(month)]
  }`;
}

function kg(
  value:
    | number
    | null
    | undefined,
) {
  return Number(
    value ?? 0,
  );
}

export default function PremiumDashboardOverview() {
  const { profile } =
    useAuth();

  const [
    wasteRows,
    setWasteRows,
  ] =
    useState<WasteRow[]>([]);

  const [
    workRows,
    setWorkRows,
  ] =
    useState<WorkRow[]>([]);

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

  const today =
    jakartaDate();

  const sevenDaysAgo =
    addDays(
      today,
      -6,
    );

  const monthStart =
    `${today.slice(0, 7)}-01`;

  const loadData =
    useCallback(async () => {
      if (
        profile.role !==
        "ADMIN"
      ) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const [
        wasteResult,
        calendarResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "waste_daily",
            )
            .select(`
              record_date,
              total_kg,
              photo_path
            `)
            .gte(
              "record_date",
              monthStart,
            )
            .lte(
              "record_date",
              today,
            )
            .order(
              "record_date",
              {
                ascending: true,
              },
            ),

          supabase
            .from(
              "work_calendar",
            )
            .select(`
              work_date,
              is_workday
            `)
            .gte(
              "work_date",
              monthStart,
            )
            .lte(
              "work_date",
              today,
            )
            .order(
              "work_date",
              {
                ascending: true,
              },
            ),
        ]);

      const error =
        wasteResult.error ??
        calendarResult.error;

      if (error) {
        setErrorMessage(
          error.message,
        );

        setLoading(false);
        return;
      }

      setWasteRows(
        (
          wasteResult.data ??
          []
        ) as WasteRow[],
      );

      setWorkRows(
        (
          calendarResult.data ??
          []
        ) as WorkRow[],
      );

      setLoading(false);
    }, [
      profile.role,
      monthStart,
      today,
    ]);

  useEffect(() => {
    void loadData();

    const timer =
      window.setInterval(
        () => {
          void loadData();
        },
        30000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [loadData]);


  const wasteMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          WasteRow
        >();

      for (
        const row
        of wasteRows
      ) {
        map.set(
          row.record_date,
          row,
        );
      }

      return map;
    }, [wasteRows]);


  const chartData =
    useMemo(() => {
      return Array.from(
        { length: 7 },
        (_, index) => {
          const date =
            addDays(
              sevenDaysAgo,
              index,
            );

          const record =
            wasteMap.get(
              date,
            );

          return {
            date,
            label:
              shortDate(
                date,
              ),
            total:
              kg(
                record?.total_kg,
              ),
          };
        },
      );
    }, [
      sevenDaysAgo,
      wasteMap,
    ]);


  const total7Days =
    chartData.reduce(
      (total, item) =>
        total +
        item.total,
      0,
    );

  const activeDays =
    chartData.filter(
      (item) =>
        item.total > 0,
    ).length;

  const average7Days =
    activeDays > 0
      ? total7Days /
        activeDays
      : 0;


  const workdays =
    workRows.filter(
      (row) =>
        row.is_workday,
    );

  const expectedTasks =
    workdays.length * 2;

  let wasteDone = 0;
  let photoDone = 0;

  for (
    const day
    of workdays
  ) {
    const record =
      wasteMap.get(
        day.work_date,
      );

    if (record) {
      wasteDone += 1;
    }

    if (
      record?.photo_path
    ) {
      photoDone += 1;
    }
  }

  const completedTasks =
    wasteDone +
    photoDone;

  const compliance =
    expectedTasks > 0
      ? Math.round(
          (
            completedTasks /
            expectedTasks
          ) * 100,
        )
      : 0;

  const safeCompliance =
    Math.min(
      100,
      Math.max(
        0,
        compliance,
      ),
    );

  const circumference =
    2 *
    Math.PI *
    52;

  const dashOffset =
    circumference *
    (
      1 -
      safeCompliance /
        100
    );


  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }


  return (
    <section className="mt-6">

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
            Analytics
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            Waste Overview
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Tren limbah dan kepatuhan operasional.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData()
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm transition hover:bg-slate-50"
        >
          ↻ Refresh
        </button>

      </div>


      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
          {errorMessage}
        </div>
      )}


      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.85fr)]">


        {/* ================= CHART ================= */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">

            <div>
              <p className="text-sm font-black text-slate-950">
                Tren Limbah 7 Hari
              </p>

              <p className="mt-1 text-xs font-medium text-slate-400">
                Total limbah harian dalam kilogram.
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-700">
              7 Hari Terakhir
            </div>

          </div>


          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">

            <div className="px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Total
              </p>

              <p className="mt-1 text-lg font-black text-slate-950">
                {total7Days.toLocaleString(
                  "id-ID",
                  {
                    maximumFractionDigits: 2,
                  },
                )}
                <span className="ml-1 text-[10px] text-slate-400">
                  KG
                </span>
              </p>
            </div>


            <div className="px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Rata-rata
              </p>

              <p className="mt-1 text-lg font-black text-slate-950">
                {average7Days.toLocaleString(
                  "id-ID",
                  {
                    maximumFractionDigits: 1,
                  },
                )}
                <span className="ml-1 text-[10px] text-slate-400">
                  KG
                </span>
              </p>
            </div>


            <div className="px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Hari Tercatat
              </p>

              <p className="mt-1 text-lg font-black text-slate-950">
                {activeDays}
                <span className="ml-1 text-[10px] text-slate-400">
                  / 7
                </span>
              </p>
            </div>

          </div>


          <div className="h-[300px] px-2 pb-4 pt-6">

            {loading ? (
              <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
                Memuat grafik...
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    chartData
                  }
                  margin={{
                    top: 8,
                    right: 18,
                    left: -12,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={
                      false
                    }
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                    tick={{
                      fontSize: 10,
                      fill: "#94a3b8",
                      fontWeight: 700,
                    }}
                  />

                  <YAxis
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                    width={52}
                    tick={{
                      fontSize: 10,
                      fill: "#94a3b8",
                      fontWeight: 700,
                    }}
                  />

                  <Tooltip
                    formatter={(
                      value,
                    ) => [
                      `${Number(
                        value,
                      ).toLocaleString(
                        "id-ID",
                        {
                          maximumFractionDigits: 2,
                        },
                      )} KG`,
                      "Total Limbah",
                    ]}
                    contentStyle={{
                      borderRadius:
                        14,
                      border:
                        "1px solid #e2e8f0",
                      boxShadow:
                        "0 12px 30px rgba(15,23,42,.10)",
                      fontSize:
                        12,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#ffffff",
                      stroke:
                        "#2563eb",
                      strokeWidth: 3,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>


        {/* ================= COMPLIANCE ================= */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">

            <div className="flex items-center justify-between gap-3">

              <div>
                <p className="text-sm font-black text-slate-950">
                  Skor Kepatuhan
                </p>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Bulan berjalan
                </p>
              </div>

              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                Live
              </span>

            </div>

          </div>


          <div className="flex flex-col items-center px-6 py-7">

            <div className="relative h-40 w-40">

              <svg
                viewBox="0 0 120 120"
                className="h-full w-full -rotate-90"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="9"
                />

                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={
                    circumference
                  }
                  strokeDashoffset={
                    dashOffset
                  }
                  className="transition-all duration-700"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">

                <p className="text-4xl font-black tracking-tight text-slate-950">
                  {safeCompliance}
                  <span className="text-xl">
                    %
                  </span>
                </p>

                <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Complete
                </p>

              </div>

            </div>


            <div className="mt-4 text-center">

              <p
                className={[
                  "text-sm font-black",
                  safeCompliance >=
                  90
                    ? "text-emerald-600"
                    : safeCompliance >=
                      75
                    ? "text-amber-600"
                    : "text-red-600",
                ].join(" ")}
              >
                {safeCompliance >=
                90
                  ? "Sangat Baik"
                  : safeCompliance >=
                    75
                  ? "Perlu Perhatian"
                  : "Belum Memenuhi"}
              </p>

              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                Target minimal 90%
              </p>

            </div>


            <div className="mt-6 grid w-full grid-cols-2 gap-3">

              <div className="rounded-2xl bg-blue-50 p-4">

                <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">
                  Input Limbah
                </p>

                <p className="mt-1 text-xl font-black text-slate-950">
                  {wasteDone}
                  <span className="text-xs text-slate-400">
                    /{workdays.length}
                  </span>
                </p>

              </div>


              <div className="rounded-2xl bg-emerald-50 p-4">

                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                  Foto Bersih
                </p>

                <p className="mt-1 text-xl font-black text-slate-950">
                  {photoDone}
                  <span className="text-xs text-slate-400">
                    /{workdays.length}
                  </span>
                </p>

              </div>

            </div>


            <div className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center justify-between">

                <span className="text-[10px] font-bold text-slate-500">
                  Hari kerja bulan ini
                </span>

                <span className="text-xs font-black text-slate-950">
                  {workdays.length}
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
