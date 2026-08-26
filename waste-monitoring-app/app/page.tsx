"use client";

import ThemeToggle from "@/components/ThemeToggle";
import RealtimeWorkClock from "@/components/RealtimeWorkClock";

import DashboardWasteCharts from "@/components/DashboardWasteCharts";
import PremiumDashboardOverview from "@/components/PremiumDashboardOverview";
import PremiumDashboardFeed from "@/components/PremiumDashboardFeed";

import Link from "next/link";
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
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";
import MonthlyTargetOverview from "@/components/MonthlyTargetOverview";

import TodayCleanlinessStatus from "@/components/TodayCleanlinessStatus";
import AdminDailyMonitoring from "@/components/AdminDailyMonitoring";


type WasteRecord = {
  id: string;
  record_date: string;
  cutting_kg: number;
  plastic_kg: number;
  paper_kg: number;
  carton_kg: number;
  pedding_kg: number;
  wet_waste_kg: number;
  total_kg: number;
  pic_name: string | null;
  notes: string | null;
};

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function getCurrentYear() {
  return String(
    new Date().getFullYear(),
  );
}

function formatKg(
  value: number,
) {
  return Number(
    value ?? 0,
  ).toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  });
}

function formatDate(
  value: string,
) {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

export default function Home() {
  const [records, setRecords] =
    useState<WasteRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from("waste_daily")
        .select("*")
        .order(
          "record_date",
          {
            ascending: false,
          },
        );

      if (error) {
        setErrorMessage(
          error.message,
        );
      } else {
        setRecords(
          data ?? [],
        );
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const today =
    getToday();

  const currentMonth =
    getCurrentMonth();

  const currentYear =
    getCurrentYear();

  const todayRecords =
    useMemo(() => {
      return records.filter(
        (item) =>
          item.record_date ===
          today,
      );
    }, [records, today]);

  const monthRecords =
    useMemo(() => {
      return records.filter(
        (item) =>
          item.record_date.startsWith(
            currentMonth,
          ),
      );
    }, [
      records,
      currentMonth,
    ]);

  const yearRecords =
    useMemo(() => {
      return records.filter(
        (item) =>
          item.record_date.startsWith(
            currentYear,
          ),
      );
    }, [
      records,
      currentYear,
    ]);

  const totalToday =
    useMemo(() => {
      return todayRecords.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_kg ??
              0,
          ),
        0,
      );
    }, [todayRecords]);

  const totalMonth =
    useMemo(() => {
      return monthRecords.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_kg ??
              0,
          ),
        0,
      );
    }, [monthRecords]);

  const totalYear =
    useMemo(() => {
      return yearRecords.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_kg ??
              0,
          ),
        0,
      );
    }, [yearRecords]);

  const categorySummary =
    useMemo(() => {
      const result = {
        cutting: 0,
        plastic: 0,
        paper: 0,
        carton: 0,
        pedding: 0,
        wet: 0,
      };

      monthRecords.forEach(
        (item) => {
          result.cutting +=
            Number(
              item.cutting_kg ??
                0,
            );

          result.plastic +=
            Number(
              item.plastic_kg ??
                0,
            );

          result.paper +=
            Number(
              item.paper_kg ??
                0,
            );

          result.carton +=
            Number(
              item.carton_kg ??
                0,
            );

          result.pedding +=
            Number(
              item.pedding_kg ??
                0,
            );

          result.wet +=
            Number(
              item.wet_waste_kg ??
                0,
            );
        },
      );

      return result;
    }, [monthRecords]);

  const categoryChart =
    useMemo(() => {
      return [
        {
          name:
            "Cutting",
          kg:
            categorySummary.cutting,
        },
        {
          name:
            "Plastik",
          kg:
            categorySummary.plastic,
        },
        {
          name:
            "Paper",
          kg:
            categorySummary.paper,
        },
        {
          name:
            "Karton",
          kg:
            categorySummary.carton,
        },
        {
          name:
            "Pedding",
          kg:
            categorySummary.pedding,
        },
        {
          name:
            "Umum",
          kg:
            categorySummary.wet,
        },
      ];
    }, [
      categorySummary,
    ]);

  const dailyChart =
    useMemo(() => {
      return [...monthRecords]
        .sort((a, b) =>
          a.record_date.localeCompare(
            b.record_date,
          ),
        )
        .map((item) => ({
          tanggal:
            item.record_date.slice(
              8,
              10,
            ),
          total:
            Number(
              item.total_kg ??
                0,
            ),
        }));
    }, [monthRecords]);

  const recentRecords =
    records.slice(0, 5);

  const categoryCards = [
    {
      name:
        "Bahan Cutting",
      value:
        categorySummary.cutting,
      icon: "✂️",
    },
    {
      name:
        "Plastik",
      value:
        categorySummary.plastic,
      icon: "♻️",
    },
    {
      name:
        "Paper",
      value:
        categorySummary.paper,
      icon: "📄",
    },
    {
      name:
        "Karton",
      value:
        categorySummary.carton,
      icon: "📦",
    },
    {
      name:
        "Pedding",
      value:
        categorySummary.pedding,
      icon: "🧵",
    },
    {
      name:
        "Basah / Umum",
      value:
        categorySummary.wet,
      icon: "🗑️",
    },
  ];


  const premiumCuttingToday =
    todayRecords.reduce(
      (total, item) =>
        total +
        Number(
          item.cutting_kg ?? 0,
        ),
      0,
    );

  const premiumWetToday =
    todayRecords.reduce(
      (total, item) =>
        total +
        Number(
          item.wet_waste_kg ?? 0,
        ),
      0,
    );

  const premiumOtherToday =
    todayRecords.reduce(
      (total, item) =>
        total +
        Number(
          item.plastic_kg ?? 0,
        ) +
        Number(
          item.paper_kg ?? 0,
        ) +
        Number(
          item.carton_kg ?? 0,
        ) +
        Number(
          item.pedding_kg ?? 0,
        ),
      0,
    );

  const premiumPercent = (
    value: number,
  ) => {
    if (totalToday <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        (value / totalToday) *
          100,
      ),
    );
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 ring-1 ring-blue-100">
                PT.DREAMWEAR
              </span>

              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Live Monitoring
              </span>
            </div>

            <div className="mt-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Waste Monitoring
              </h1>

              <p className="mt-1 max-w-xl text-sm font-medium text-slate-500">
                Monitoring, pencatatan, dan kontrol limbah harian PT.DREAMWEAR.
              </p>
            </div>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <ThemeToggle inline />

            <Link
              href="/rekap"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Rekap
            </Link>

            <Link
              href="/riwayat"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Riwayat
            </Link>

            <Link
              href="/input-limbah"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:-translate-y-0.5"
            >
              <span className="text-lg leading-none">+</span>
              Input Limbah
            </Link>

          </div>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {loading && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            Mengambil data Waste Monitoring...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
            {errorMessage}
          </div>
        )}

        {!loading &&
          !errorMessage && (
            <>
              <RealtimeWorkClock />

        <section className="mt-6">

            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                  Ringkasan Hari Ini
                </p>

                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                  Limbah Hari Ini
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Distribusi limbah berdasarkan kategori hari ini.
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
                Live Data
              </div>

            </div>


            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {/* CUTTING */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">

                <div className="absolute inset-x-0 top-0 h-1 bg-blue-600"></div>

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Limbah Cutting
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                      <p className="text-3xl font-black tracking-tight text-slate-950">
                        {premiumCuttingToday.toLocaleString(
                          "id-ID",
                          {
                            maximumFractionDigits: 2,
                          },
                        )}
                      </p>

                      <span className="pb-1 text-xs font-black text-slate-400">
                        KG
                      </span>
                    </div>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg font-black text-blue-600 ring-1 ring-blue-100">
                    ✂
                  </div>

                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400">
                      Kontribusi
                    </span>

                    <span className="text-blue-600">
                      {premiumPercent(
                        premiumCuttingToday,
                      ).toFixed(1)}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${premiumPercent(
                          premiumCuttingToday,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-[11px] font-medium text-slate-400">
                  Bahan Cutting • Hari ini
                </p>

              </div>


              {/* BASAH */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">

                <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500"></div>

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Limbah Basah / Umum
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                      <p className="text-3xl font-black tracking-tight text-slate-950">
                        {premiumWetToday.toLocaleString(
                          "id-ID",
                          {
                            maximumFractionDigits: 2,
                          },
                        )}
                      </p>

                      <span className="pb-1 text-xs font-black text-slate-400">
                        KG
                      </span>
                    </div>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-lg font-black text-cyan-600 ring-1 ring-cyan-100">
                    ◉
                  </div>

                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400">
                      Kontribusi
                    </span>

                    <span className="text-cyan-600">
                      {premiumPercent(
                        premiumWetToday,
                      ).toFixed(1)}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all"
                      style={{
                        width: `${premiumPercent(
                          premiumWetToday,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-[11px] font-medium text-slate-400">
                  Basah / Umum • Hari ini
                </p>

              </div>


              {/* LAINNYA */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">

                <div className="absolute inset-x-0 top-0 h-1 bg-violet-500"></div>

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Limbah Lainnya
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                      <p className="text-3xl font-black tracking-tight text-slate-950">
                        {premiumOtherToday.toLocaleString(
                          "id-ID",
                          {
                            maximumFractionDigits: 2,
                          },
                        )}
                      </p>

                      <span className="pb-1 text-xs font-black text-slate-400">
                        KG
                      </span>
                    </div>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-lg font-black text-violet-600 ring-1 ring-violet-100">
                    ♻
                  </div>

                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400">
                      Kontribusi
                    </span>

                    <span className="text-violet-600">
                      {premiumPercent(
                        premiumOtherToday,
                      ).toFixed(1)}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{
                        width: `${premiumPercent(
                          premiumOtherToday,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-[11px] font-medium leading-relaxed text-slate-400">
                  Plastik • Paper • Karton • Pedding
                </p>

              </div>


              {/* TOTAL */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1730] p-5 text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:shadow-xl">

                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-500/10"></div>

                <div className="relative flex items-start justify-between gap-4">

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200/70">
                      Total Hari Ini
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                      <p className="text-3xl font-black tracking-tight">
                        {totalToday.toLocaleString(
                          "id-ID",
                          {
                            maximumFractionDigits: 2,
                          },
                        )}
                      </p>

                      <span className="pb-1 text-xs font-black text-blue-200/60">
                        KG
                      </span>
                    </div>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl font-black ring-1 ring-white/10">
                    ∑
                  </div>

                </div>

                <div className="relative mt-5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3">

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-100/60">
                      Status pencatatan
                    </span>

                    <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      LIVE
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-white/80">
                    Akumulasi seluruh jenis limbah hari ini.
                  </p>

                </div>

              </div>

            </div>

          </section>

              <TodayCleanlinessStatus />

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Statistik
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Ringkasan Periode
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Total pencatatan berdasarkan periode.
            </p>
          </div>


          <div className="mt-5 grid gap-4 sm:grid-cols-3">

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs font-bold text-slate-500">
                Total Bulan Ini
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {monthRecords
                  .reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.total_kg ??
                          0,
                      ),
                    0,
                  )
                  .toLocaleString(
                    "id-ID",
                    {
                      maximumFractionDigits:
                        2,
                    },
                  )}
                <span className="ml-1 text-xs text-slate-400">
                  KG
                </span>
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {monthRecords.length} hari pencatatan
              </p>
            </div>


            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs font-bold text-slate-500">
                Total Tahun Ini
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {yearRecords
                  .reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.total_kg ??
                          0,
                      ),
                    0,
                  )
                  .toLocaleString(
                    "id-ID",
                    {
                      maximumFractionDigits:
                        2,
                    },
                  )}
                <span className="ml-1 text-xs text-slate-400">
                  KG
                </span>
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Akumulasi tahun berjalan
              </p>
            </div>


            <div className="rounded-xl bg-slate-900 p-4 text-white">

              <p className="text-xs font-bold text-slate-300">
                Total Pencatatan
              </p>

              <p className="mt-2 text-2xl font-black">
                {records.length}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Hari tersimpan di database
              </p>
            </div>

          </div>
        </section>


              <PremiumDashboardOverview />

            <PremiumDashboardFeed />

        <AdminDailyMonitoring />

      <MonthlyTargetOverview />

              <section className="mt-6">
                <div className="mb-4">
                  <h2 className="text-xl font-black text-slate-900">
                    Rekap Jenis Limbah Bulan Ini
                  </h2>

                  <p className="text-sm text-slate-500">
                    Total masing-masing jenis limbah dalam KG
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {categoryCards.map(
                    (item) => (
                      <div
                        key={
                          item.name
                        }
                        className="rounded-2xl bg-white p-4 shadow-sm"
                      >
                        <div className="text-2xl">
                          {
                            item.icon
                          }
                        </div>

                        <p className="mt-3 text-xs font-semibold text-slate-500">
                          {
                            item.name
                          }
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-900">
                          {formatKg(
                            item.value,
                          )}
                        </p>

                        <p className="text-xs font-bold text-slate-400">
                          KG
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section className="mt-6 grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <h2 className="font-black text-slate-900">
                      Limbah Berdasarkan Jenis
                    </h2>

                    <p className="text-sm text-slate-500">
                      Rekap bulan berjalan
                    </p>
                  </div>

                  <div className="h-[320px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={
                          categoryChart
                        }
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                        />

                        <XAxis
                          dataKey="name"
                          fontSize={
                            11
                          }
                        />

                        <YAxis
                          fontSize={
                            11
                          }
                        />

                        <Tooltip />

                        <Legend />

                        <Bar
                          dataKey="kg"
                          name="Berat (KG)"
                          fill="#2563eb"
                          radius={[
                            6,
                            6,
                            0,
                            0,
                          ]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <h2 className="font-black text-slate-900">
                      Tren Limbah Harian
                    </h2>

                    <p className="text-sm text-slate-500">
                      Total limbah setiap hari pada bulan ini
                    </p>
                  </div>

                  <div className="h-[320px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart
                        data={
                          dailyChart
                        }
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                        />

                        <XAxis
                          dataKey="tanggal"
                          fontSize={
                            11
                          }
                        />

                        <YAxis
                          fontSize={
                            11
                          }
                        />

                        <Tooltip />

                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="total"
                          name="Total KG"
                          stroke="#2563eb"
                          strokeWidth={
                            3
                          }
                          dot={{
                            r: 4,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 p-5">
                  <div>
                    <h2 className="font-black text-slate-900">
                      Pencatatan Terbaru
                    </h2>

                    <p className="text-sm text-slate-500">
                      5 data limbah terakhir
                    </p>
                  </div>

                  <Link
                    href="/riwayat"
                    className="text-sm font-bold text-blue-600"
                  >
                    Lihat Semua →
                  </Link>
                </div>

                {recentRecords.length ===
                0 ? (
                  <div className="p-8 text-center text-slate-500">
                    Belum ada data limbah.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[850px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-4 text-left">
                            Tanggal
                          </th>

                          <th className="p-4 text-right">
                            Cutting
                          </th>

                          <th className="p-4 text-right">
                            Plastik
                          </th>

                          <th className="p-4 text-right">
                            Paper
                          </th>

                          <th className="p-4 text-right">
                            Karton
                          </th>

                          <th className="p-4 text-right">
                            Pedding
                          </th>

                          <th className="p-4 text-right">
                            Umum
                          </th>

                          <th className="p-4 text-right">
                            Total
                          </th>

                          <th className="p-4 text-left">
                            PIC
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentRecords.map(
                          (item) => (
                            <tr
                              key={
                                item.id
                              }
                              className="border-t border-slate-100"
                            >
                              <td className="p-4 font-semibold">
                                {formatDate(
                                  item.record_date,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.cutting_kg,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.plastic_kg,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.paper_kg,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.carton_kg,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.pedding_kg,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.wet_waste_kg,
                                )}
                              </td>

                              <td className="p-4 text-right font-black text-blue-700">
                                {formatKg(
                                  item.total_kg,
                                )}{" "}
                                KG
                              </td>

                              <td className="p-4">
                                {item.pic_name ||
                                  "-"}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    void loadData()
                  }
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm"
                >
                  ↻ Refresh Data
                </button>
              </div>
            </>
          )}
      </div>
    </main>
  );
}
