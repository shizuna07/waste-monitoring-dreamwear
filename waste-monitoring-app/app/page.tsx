"use client";

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

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
              PT.DREAMWEAR
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              Waste Monitoring
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Monitoring dan pencatatan limbah harian
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/rekap"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
            >
              Rekap
            </Link>

            <Link
              href="/riwayat"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
            >
              Riwayat
            </Link>

            <Link
              href="/input-limbah"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              + Input Limbah
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
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
                  <p className="text-sm font-medium text-blue-100">
                    Limbah Hari Ini
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <p className="text-3xl font-black">
                      {formatKg(
                        totalToday,
                      )}
                    </p>

                    <p className="pb-1 text-sm font-bold">
                      KG
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-blue-100">
                    {todayRecords.length >
                    0
                      ? "Sudah ada pencatatan hari ini"
                      : "Belum ada pencatatan hari ini"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Total Bulan Ini
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <p className="text-3xl font-black text-slate-900">
                      {formatKg(
                        totalMonth,
                      )}
                    </p>

                    <p className="pb-1 text-sm font-bold text-slate-400">
                      KG
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {
                      monthRecords.length
                    }{" "}
                    hari pencatatan
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Total Tahun Ini
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <p className="text-3xl font-black text-slate-900">
                      {formatKg(
                        totalYear,
                      )}
                    </p>

                    <p className="pb-1 text-sm font-bold text-slate-400">
                      KG
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Tahun{" "}
                    {currentYear}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
                  <p className="text-sm text-slate-300">
                    Total Pencatatan
                  </p>

                  <p className="mt-3 text-3xl font-black">
                    {
                      records.length
                    }
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Hari tersimpan di database
                  </p>
                </div>
              </section>

              <TodayCleanlinessStatus />

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