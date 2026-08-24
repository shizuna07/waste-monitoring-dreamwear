"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  total_kg: number | string;
};

type WorkDay = {
  work_date: string;
  is_workday: boolean;
};

function jakartaToday() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function addDays(
  dateString: string,
  days: number,
) {
  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + days,
      ),
    );

  return date
    .toISOString()
    .slice(0, 10);
}

function currentMonthStart() {
  return `${jakartaToday().slice(0, 7)}-01`;
}

function nextMonthStart() {
  let [year, month] =
    jakartaToday()
      .slice(0, 7)
      .split("-")
      .map(Number);

  month += 1;

  if (month === 13) {
    month = 1;
    year += 1;
  }

  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function shortDate(
  dateString: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
    },
  ).format(
    new Date(
      `${dateString}T00:00:00+07:00`,
    ),
  );
}

function kg(
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

function formatKg(
  value: number,
) {
  return value.toLocaleString(
    "id-ID",
    {
      maximumFractionDigits: 2,
    },
  );
}

export default function DashboardWasteCharts() {
  const {
    profile,
  } = useAuth();

  const [
    monthRecords,
    setMonthRecords,
  ] =
    useState<WasteRecord[]>(
      [],
    );

  const [
    sevenDayRecords,
    setSevenDayRecords,
  ] =
    useState<WasteRecord[]>(
      [],
    );

  const [
    workDays,
    setWorkDays,
  ] =
    useState<WorkDay[]>(
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

      const today =
        jakartaToday();

      const sevenDaysAgo =
        addDays(
          today,
          -6,
        );

      const [
        monthResult,
        sevenDayResult,
        calendarResult,
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
              total_kg
            `)
            .gte(
              "record_date",
              currentMonthStart(),
            )
            .lt(
              "record_date",
              nextMonthStart(),
            ),

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
              total_kg
            `)
            .gte(
              "record_date",
              sevenDaysAgo,
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
            .select(
              "work_date, is_workday",
            )
            .gte(
              "work_date",
              sevenDaysAgo,
            )
            .lte(
              "work_date",
              today,
            ),
        ]);

      if (
        monthResult.error
      ) {
        setErrorMessage(
          monthResult.error.message,
        );

        setLoading(false);
        return;
      }

      if (
        sevenDayResult.error
      ) {
        setErrorMessage(
          sevenDayResult.error.message,
        );

        setLoading(false);
        return;
      }

      if (
        calendarResult.error
      ) {
        setErrorMessage(
          calendarResult.error.message,
        );

        setLoading(false);
        return;
      }

      setMonthRecords(
        (monthResult.data ??
          []) as WasteRecord[],
      );

      setSevenDayRecords(
        (sevenDayResult.data ??
          []) as WasteRecord[],
      );

      setWorkDays(
        (calendarResult.data ??
          []) as WorkDay[],
      );

      setLoading(false);
    }, [
      profile.role,
    ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const distributionData =
    useMemo(() => {
      const totals = {
        cutting: 0,
        wet: 0,
        plastic: 0,
        paper: 0,
        carton: 0,
        pedding: 0,
      };

      monthRecords.forEach(
        (item) => {
          totals.cutting +=
            kg(
              item.cutting_kg,
            );

          totals.wet +=
            kg(
              item.wet_waste_kg,
            );

          totals.plastic +=
            kg(
              item.plastic_kg,
            );

          totals.paper +=
            kg(
              item.paper_kg,
            );

          totals.carton +=
            kg(
              item.carton_kg,
            );

          totals.pedding +=
            kg(
              item.pedding_kg,
            );
        },
      );

      return [
        {
          name:
            "Cutting",
          kg:
            totals.cutting,
        },
        {
          name:
            "Basah / Umum",
          kg:
            totals.wet,
        },
        {
          name:
            "Karton",
          kg:
            totals.carton,
        },
        {
          name:
            "Plastik",
          kg:
            totals.plastic,
        },
        {
          name:
            "Paper",
          kg:
            totals.paper,
        },
        {
          name:
            "Pedding",
          kg:
            totals.pedding,
        },
      ].sort(
        (a, b) =>
          b.kg -
          a.kg,
      );
    }, [
      monthRecords,
    ]);

  const trendData =
    useMemo(() => {
      const today =
        jakartaToday();

      const recordMap =
        new Map<
          string,
          WasteRecord
        >();

      sevenDayRecords.forEach(
        (item) => {
          recordMap.set(
            item.record_date,
            item,
          );
        },
      );

      const workMap =
        new Map<
          string,
          boolean
        >();

      workDays.forEach(
        (item) => {
          workMap.set(
            item.work_date,
            item.is_workday,
          );
        },
      );

      return Array.from(
        {
          length: 7,
        },
        (
          _,
          index,
        ) => {
          const date =
            addDays(
              today,
              index - 6,
            );

          const record =
            recordMap.get(
              date,
            );

          const workStatus =
            workMap.get(
              date,
            );

          const isHoliday =
            workStatus ===
            false;

          return {
            date,
            label:
              shortDate(
                date,
              ),

            total:
              isHoliday
                ? null
                : record
                  ? kg(
                      record.total_kg,
                    )
                  : 0,

            status:
              isHoliday
                ? "Libur"
                : record
                  ? "Ada Data"
                  : "Belum Ada Data",
          };
        },
      );
    }, [
      sevenDayRecords,
      workDays,
    ]);

  const totalMonth =
    distributionData.reduce(
      (total, item) =>
        total +
        item.kg,
      0,
    );

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <section className="mt-6">

      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
          Analisis Limbah
        </p>

        <h2 className="mt-1 text-xl font-black text-slate-900">
          Grafik Monitoring
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Distribusi bulan berjalan dan tren 7 hari terakhir.
        </p>
      </div>


      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
          ⚠ {errorMessage}
        </div>
      )}


      {loading ? (
        <div className="mt-4 rounded-2xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Memuat grafik...
        </div>
      ) : (
        <div className="mt-4 grid gap-5 xl:grid-cols-2">

          {/* DISTRIBUSI */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-sm font-black text-slate-900">
                  Distribusi Limbah Bulan Ini
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Total seluruh kategori bulan berjalan
                </p>
              </div>

              <div className="text-right">

                <p className="text-xl font-black text-blue-700">
                  {formatKg(
                    totalMonth,
                  )}
                </p>

                <p className="text-[10px] font-black uppercase text-slate-400">
                  KG
                </p>
              </div>
            </div>


            <div className="mt-5 h-[310px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    distributionData
                  }
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 25,
                    left: 20,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fontSize: 11,
                      fill:
                        "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={95}
                    tick={{
                      fontSize: 11,
                      fill:
                        "#475569",
                      fontWeight:
                        700,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(
                      value,
                    ) => [
                      `${formatKg(
                        Number(
                          value ??
                            0,
                        ),
                      )} KG`,
                      "Total",
                    ]}
                    contentStyle={{
                      borderRadius:
                        "12px",
                    }}
                  />

                  <Bar
                    dataKey="kg"
                    fill="#2563eb"
                    radius={[
                      0,
                      8,
                      8,
                      0,
                    ]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>


            <div className="mt-3 space-y-2">

              {distributionData.map(
                (
                  item,
                  index,
                ) => {
                  const percent =
                    totalMonth >
                    0
                      ? (
                          item.kg /
                          totalMonth
                        ) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        item.name
                      }
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                    >

                      <div className="flex items-center gap-2">

                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-[10px] font-black text-blue-700">
                          {index +
                            1}
                        </span>

                        <span className="text-xs font-bold text-slate-700">
                          {
                            item.name
                          }
                        </span>
                      </div>

                      <div className="text-right">

                        <span className="text-xs font-black text-slate-900">
                          {formatKg(
                            item.kg,
                          )}{" "}
                          KG
                        </span>

                        <span className="ml-2 text-[10px] font-bold text-slate-400">
                          {percent.toLocaleString(
                            "id-ID",
                            {
                              maximumFractionDigits:
                                1,
                            },
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>


          {/* TREND */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div>
              <p className="text-sm font-black text-slate-900">
                Tren Total Limbah
              </p>

              <p className="mt-1 text-xs text-slate-500">
                7 hari terakhir
              </p>
            </div>


            <div className="mt-5 h-[310px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    trendData
                  }
                  margin={{
                    top: 15,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 10,
                      fill:
                        "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill:
                        "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(
                      value,
                      _name,
                      item,
                    ) => {
                      const status =
                        item.payload
                          ?.status;

                      if (
                        status ===
                        "Libur"
                      ) {
                        return [
                          "Libur",
                          "Status",
                        ];
                      }

                      return [
                        `${formatKg(
                          Number(
                            value ??
                              0,
                          ),
                        )} KG`,
                        "Total Limbah",
                      ];
                    }}
                    labelFormatter={(
                      label,
                    ) =>
                      `Tanggal ${label}`
                    }
                    contentStyle={{
                      borderRadius:
                        "12px",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill:
                        "#2563eb",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                    connectNulls={
                      false
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>


            <div className="mt-3 grid grid-cols-7 gap-1">

              {trendData.map(
                (item) => (
                  <div
                    key={
                      item.date
                    }
                    className="rounded-lg bg-slate-50 px-1 py-2 text-center"
                  >

                    <p className="text-[9px] font-bold text-slate-400">
                      {
                        item.label
                      }
                    </p>

                    <p className="mt-1 text-[10px] font-black text-slate-700">
                      {item.status ===
                      "Libur"
                        ? "LIBUR"
                        : item.total !==
                            null
                          ? formatKg(
                              item.total,
                            )
                          : "-"}
                    </p>

                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
