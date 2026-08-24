"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { supabase } from "@/lib/supabase";

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

type Summary = {
  cutting: number;
  plastic: number;
  paper: number;
  carton: number;
  pedding: number;
  wet: number;
  total: number;
};

const monthNames = [
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

function currentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function currentYear() {
  return String(
    new Date().getFullYear(),
  );
}

function formatKg(value: number) {
  return Number(value ?? 0).toLocaleString(
    "id-ID",
    {
      maximumFractionDigits: 2,
    },
  );
}

function formatDate(value: string) {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function emptySummary(): Summary {
  return {
    cutting: 0,
    plastic: 0,
    paper: 0,
    carton: 0,
    pedding: 0,
    wet: 0,
    total: 0,
  };
}

export default function RecapPage() {
  const [records, setRecords] =
    useState<WasteRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [mode, setMode] =
    useState<"monthly" | "yearly">(
      "monthly",
    );

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth());

  const [selectedYear, setSelectedYear] =
    useState(currentYear());

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");

      const { data, error } =
        await supabase
          .from("waste_daily")
          .select("*")
          .order("record_date", {
            ascending: true,
          });

      if (error) {
        setErrorMessage(
          error.message,
        );
      } else {
        setRecords(data ?? []);
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRecords =
    useMemo(() => {
      if (mode === "monthly") {
        return records.filter(
          (item) =>
            item.record_date.startsWith(
              selectedMonth,
            ),
        );
      }

      return records.filter(
        (item) =>
          item.record_date.startsWith(
            selectedYear,
          ),
      );
    }, [
      records,
      mode,
      selectedMonth,
      selectedYear,
    ]);

  const summary =
    useMemo(() => {
      return filteredRecords.reduce(
        (result, item) => {
          result.cutting += Number(
            item.cutting_kg ?? 0,
          );

          result.plastic += Number(
            item.plastic_kg ?? 0,
          );

          result.paper += Number(
            item.paper_kg ?? 0,
          );

          result.carton += Number(
            item.carton_kg ?? 0,
          );

          result.pedding += Number(
            item.pedding_kg ?? 0,
          );

          result.wet += Number(
            item.wet_waste_kg ?? 0,
          );

          result.total += Number(
            item.total_kg ?? 0,
          );

          return result;
        },
        emptySummary(),
      );
    }, [filteredRecords]);

  const yearlyRows =
    useMemo(() => {
      if (mode !== "yearly") {
        return [];
      }

      return monthNames.map(
        (monthName, index) => {
          const monthCode =
            `${selectedYear}-${String(
              index + 1,
            ).padStart(2, "0")}`;

          const monthRecords =
            filteredRecords.filter(
              (item) =>
                item.record_date.startsWith(
                  monthCode,
                ),
            );

          const result =
            monthRecords.reduce(
              (total, item) => {
                total.cutting += Number(
                  item.cutting_kg ?? 0,
                );

                total.plastic += Number(
                  item.plastic_kg ?? 0,
                );

                total.paper += Number(
                  item.paper_kg ?? 0,
                );

                total.carton += Number(
                  item.carton_kg ?? 0,
                );

                total.pedding += Number(
                  item.pedding_kg ?? 0,
                );

                total.wet += Number(
                  item.wet_waste_kg ?? 0,
                );

                total.total += Number(
                  item.total_kg ?? 0,
                );

                return total;
              },
              emptySummary(),
            );

          return {
            month: monthName,
            count: monthRecords.length,
            ...result,
          };
        },
      );
    }, [
      mode,
      filteredRecords,
      selectedYear,
    ]);

  const categoryCards = [
    {
      label: "Bahan Cutting",
      value: summary.cutting,
      icon: "✂️",
    },
    {
      label: "Plastik",
      value: summary.plastic,
      icon: "♻️",
    },
    {
      label: "Paper",
      value: summary.paper,
      icon: "📄",
    },
    {
      label: "Karton",
      value: summary.carton,
      icon: "📦",
    },
    {
      label: "Pedding",
      value: summary.pedding,
      icon: "🧵",
    },
    {
      label: "Basah / Umum",
      value: summary.wet,
      icon: "🗑️",
    },
  ];

  function periodTitle() {
    if (mode === "monthly") {
      const [year, month] =
        selectedMonth.split("-");

      return `${monthNames[
        Number(month) - 1
      ]} ${year}`;
    }

    return `Tahun ${selectedYear}`;
  }

  function exportExcel() {
    let rows: Record<
      string,
      string | number
    >[] = [];

    if (mode === "monthly") {
      rows = filteredRecords.map(
        (item, index) => ({
          No: index + 1,
          Tanggal: formatDate(
            item.record_date,
          ),
          "Bahan Cutting (KG)":
            Number(
              item.cutting_kg ?? 0,
            ),
          "Plastik (KG)":
            Number(
              item.plastic_kg ?? 0,
            ),
          "Paper (KG)":
            Number(
              item.paper_kg ?? 0,
            ),
          "Karton (KG)":
            Number(
              item.carton_kg ?? 0,
            ),
          "Pedding (KG)":
            Number(
              item.pedding_kg ?? 0,
            ),
          "Basah / Umum (KG)":
            Number(
              item.wet_waste_kg ?? 0,
            ),
          "Total (KG)":
            Number(
              item.total_kg ?? 0,
            ),
          PIC:
            item.pic_name ?? "",
          Keterangan:
            item.notes ?? "",
        }),
      );
    } else {
      rows = yearlyRows.map(
        (item, index) => ({
          No: index + 1,
          Bulan: item.month,
          "Hari Pencatatan":
            item.count,
          "Bahan Cutting (KG)":
            item.cutting,
          "Plastik (KG)":
            item.plastic,
          "Paper (KG)":
            item.paper,
          "Karton (KG)":
            item.carton,
          "Pedding (KG)":
            item.pedding,
          "Basah / Umum (KG)":
            item.wet,
          "Total (KG)":
            item.total,
        }),
      );
    }

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Rekap Limbah",
    );

    XLSX.writeFile(
      workbook,
      mode === "monthly"
        ? `Rekap-Limbah-${selectedMonth}.xlsx`
        : `Rekap-Limbah-${selectedYear}.xlsx`,
    );
  }

  function exportPdf() {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);

    doc.text(
      "PT.DREAMWEAR",
      14,
      15,
    );

    doc.setFontSize(13);

    doc.text(
      "REKAP PENCATATAN LIMBAH",
      14,
      22,
    );

    doc.setFontSize(10);

    doc.text(
      `Periode: ${periodTitle()}`,
      14,
      29,
    );

    doc.text(
      `Total Limbah: ${formatKg(
        summary.total,
      )} KG`,
      14,
      35,
    );

    if (mode === "monthly") {
      autoTable(doc, {
        startY: 42,

        head: [[
          "No",
          "Tanggal",
          "Cutting",
          "Plastik",
          "Paper",
          "Karton",
          "Pedding",
          "Basah/Umum",
          "Total",
          "PIC",
        ]],

        body: filteredRecords.map(
          (item, index) => [
            index + 1,
            formatDate(
              item.record_date,
            ),
            formatKg(
              item.cutting_kg,
            ),
            formatKg(
              item.plastic_kg,
            ),
            formatKg(
              item.paper_kg,
            ),
            formatKg(
              item.carton_kg,
            ),
            formatKg(
              item.pedding_kg,
            ),
            formatKg(
              item.wet_waste_kg,
            ),
            formatKg(
              item.total_kg,
            ),
            item.pic_name ?? "-",
          ],
        ),

        styles: {
          fontSize: 8,
        },

        headStyles: {
          fillColor: [
            37,
            99,
            235,
          ],
        },
      });
    } else {
      autoTable(doc, {
        startY: 42,

        head: [[
          "No",
          "Bulan",
          "Hari",
          "Cutting",
          "Plastik",
          "Paper",
          "Karton",
          "Pedding",
          "Basah/Umum",
          "Total",
        ]],

        body: yearlyRows.map(
          (item, index) => [
            index + 1,
            item.month,
            item.count,
            formatKg(
              item.cutting,
            ),
            formatKg(
              item.plastic,
            ),
            formatKg(
              item.paper,
            ),
            formatKg(
              item.carton,
            ),
            formatKg(
              item.pedding,
            ),
            formatKg(
              item.wet,
            ),
            formatKg(
              item.total,
            ),
          ],
        ),

        styles: {
          fontSize: 8,
        },

        headStyles: {
          fillColor: [
            37,
            99,
            235,
          ],
        },
      });
    }

    doc.save(
      mode === "monthly"
        ? `Rekap-Limbah-${selectedMonth}.pdf`
        : `Rekap-Limbah-${selectedYear}.pdf`,
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
              PT.DREAMWEAR
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Rekap Limbah
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Rekap bulanan dan tahunan
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm"
          >
            ← Dashboard
          </Link>
        </div>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Jenis Rekap
              </label>

              <select
                value={mode}
                onChange={(event) =>
                  setMode(
                    event.target.value as
                      | "monthly"
                      | "yearly",
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="monthly">
                  Rekap Bulanan
                </option>

                <option value="yearly">
                  Rekap Tahunan
                </option>
              </select>
            </div>

            {mode === "monthly" ? (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Pilih Bulan
                </label>

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) =>
                    setSelectedMonth(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Pilih Tahun
                </label>

                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={selectedYear}
                  onChange={(event) =>
                    setSelectedYear(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
            )}

            <div className="flex items-end">
              <button
                type="button"
                onClick={exportExcel}
                disabled={
                  filteredRecords.length ===
                  0
                }
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-40"
              >
                Export Excel
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={exportPdf}
                disabled={
                  filteredRecords.length ===
                  0
                }
                className="w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-40"
              >
                Export PDF
              </button>
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            Mengambil data...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-600">
            {errorMessage}
          </div>
        )}

        {!loading &&
          !errorMessage && (
            <>
              <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
                  <p className="text-sm text-blue-100">
                    Total Limbah
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {formatKg(
                      summary.total,
                    )}
                  </p>

                  <p className="text-sm text-blue-100">
                    KG
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Periode
                  </p>

                  <p className="mt-2 text-xl font-black text-slate-900">
                    {periodTitle()}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Hari Pencatatan
                  </p>

                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {
                      filteredRecords.length
                    }
                  </p>

                  <p className="text-sm text-slate-400">
                    Hari
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
                  <p className="text-sm text-slate-300">
                    Rata-rata
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {formatKg(
                      filteredRecords.length
                        ? summary.total /
                            filteredRecords.length
                        : 0,
                    )}
                  </p>

                  <p className="text-sm text-slate-400">
                    KG / hari
                  </p>
                </div>
              </section>

              <section className="mb-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {categoryCards.map(
                    (item) => (
                      <div
                        key={
                          item.label
                        }
                        className="rounded-2xl bg-white p-4 shadow-sm"
                      >
                        <div className="text-2xl">
                          {
                            item.icon
                          }
                        </div>

                        <p className="mt-3 text-xs font-bold text-slate-500">
                          {
                            item.label
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

              <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-black text-slate-900">
                    {mode ===
                    "monthly"
                      ? "Detail Harian"
                      : "Rekap Per Bulan"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {periodTitle()}
                  </p>
                </div>

                {filteredRecords.length ===
                0 ? (
                  <div className="p-10 text-center text-slate-500">
                    Belum ada data pada periode ini.
                  </div>
                ) : mode ===
                  "monthly" ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1050px] w-full text-sm">
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
                            Basah/Umum
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
                        {filteredRecords.map(
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
                                {item.pic_name ??
                                  "-"}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1000px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-4 text-left">
                            Bulan
                          </th>
                          <th className="p-4 text-center">
                            Hari
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
                            Basah/Umum
                          </th>
                          <th className="p-4 text-right">
                            Total
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {yearlyRows.map(
                          (item) => (
                            <tr
                              key={
                                item.month
                              }
                              className="border-t border-slate-100"
                            >
                              <td className="p-4 font-bold">
                                {
                                  item.month
                                }
                              </td>

                              <td className="p-4 text-center">
                                {
                                  item.count
                                }
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.cutting,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.plastic,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.paper,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.carton,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.pedding,
                                )}
                              </td>

                              <td className="p-4 text-right">
                                {formatKg(
                                  item.wet,
                                )}
                              </td>

                              <td className="p-4 text-right font-black text-blue-700">
                                {formatKg(
                                  item.total,
                                )}{" "}
                                KG
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
      </div>
    </main>
  );
}
