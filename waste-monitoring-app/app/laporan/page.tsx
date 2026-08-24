"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type WasteRecord = {
  id: string;
  record_date: string;

  cutting_kg: number | string;
  plastic_kg: number | string;
  paper_kg: number | string;
  carton_kg: number | string;
  pedding_kg: number | string;
  wet_waste_kg: number | string;
  total_kg: number | string;

  pic_name: string | null;
  notes: string | null;

  photo_path: string | null;
  cleanliness_photo_at: string | null;
  created_at: string;
};

type WorkDay = {
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

type Category = {
  name: string;
  actual: number;
  target: number;
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

function currentMonth() {
  return jakartaToday().slice(0, 7);
}

function nextMonth(monthKey: string) {
  let [year, month] =
    monthKey.split("-").map(Number);

  month += 1;

  if (month === 13) {
    month = 1;
    year += 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(monthKey: string) {
  const [year, month] =
    monthKey.split("-").map(Number);

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

function dateLabel(date: string) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    },
  ).format(
    new Date(
      `${date}T00:00:00+07:00`,
    ),
  );
}

function formatTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    },
  ).format(new Date(value));
}

function kg(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function formatKg(value: number) {
  return value.toLocaleString(
    "id-ID",
    {
      maximumFractionDigits: 2,
    },
  );
}

function getStatus(
  date: string,
  record: WasteRecord | undefined,
  schedule: WorkDay | undefined,
) {
  if (!schedule) {
    return "Belum Diatur";
  }

  if (!schedule.is_workday) {
    return "Libur";
  }

  if (!record) {
    return "Belum Input";
  }

  if (!record.photo_path) {
    return "Belum Foto";
  }

  return "Lengkap";
}

async function imageToDataUrl(
  src: string,
) {
  try {
    const response =
      await fetch(src);

    const blob =
      await response.blob();

    return await new Promise<string>(
      (
        resolve,
        reject,
      ) => {
        const reader =
          new FileReader();

        reader.onloadend =
          () =>
            resolve(
              String(
                reader.result,
              ),
            );

        reader.onerror =
          reject;

        reader.readAsDataURL(
          blob,
        );
      },
    );
  } catch {
    return "";
  }
}

export default function FormalReportPage() {
  const {
    profile,
  } = useAuth();

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState(
      currentMonth(),
    );

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
    useState<WorkDay[]>(
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
    exporting,
    setExporting,
  ] =
    useState(false);

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

      const start =
        `${selectedMonth}-01`;

      const end =
        `${nextMonth(
          selectedMonth,
        )}-01`;

      const [
        wasteResult,
        calendarResult,
        targetResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "waste_daily",
            )
            .select(`
              id,
              record_date,
              cutting_kg,
              plastic_kg,
              paper_kg,
              carton_kg,
              pedding_kg,
              wet_waste_kg,
              total_kg,
              pic_name,
              notes,
              photo_path,
              cleanliness_photo_at,
              created_at
            `)
            .gte(
              "record_date",
              start,
            )
            .lt(
              "record_date",
              end,
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
            )
            .order(
              "work_date",
              {
                ascending: true,
              },
            ),

          supabase
            .from(
              "waste_monthly_targets",
            )
            .select("*")
            .eq(
              "month_key",
              selectedMonth,
            )
            .maybeSingle(),
        ]);

      if (
        wasteResult.error
      ) {
        setErrorMessage(
          wasteResult.error
            .message,
        );

        setLoading(false);
        return;
      }

      if (
        calendarResult.error
      ) {
        setErrorMessage(
          calendarResult.error
            .message,
        );

        setLoading(false);
        return;
      }

      if (
        targetResult.error
      ) {
        setErrorMessage(
          targetResult.error
            .message,
        );

        setLoading(false);
        return;
      }

      setRecords(
        (wasteResult.data ??
          []) as WasteRecord[],
      );

      setSchedules(
        (calendarResult.data ??
          []) as WorkDay[],
      );

      setTarget(
        targetResult.data as
          | TargetRow
          | null,
      );

      setLoading(false);
    }, [
      profile.role,
      selectedMonth,
    ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const recordMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          WasteRecord
        >();

      records.forEach(
        (item) => {
          map.set(
            item.record_date,
            item,
          );
        },
      );

      return map;
    }, [records]);

  const summary =
    useMemo(() => {
      const today =
        jakartaToday();

      const relevantWorkdays =
        schedules.filter(
          (item) =>
            item.is_workday &&
            item.work_date <=
              today,
        );

      let complete =
        0;

      let noInput =
        0;

      let noPhoto =
        0;

      relevantWorkdays.forEach(
        (day) => {
          const record =
            recordMap.get(
              day.work_date,
            );

          if (!record) {
            noInput += 1;
            return;
          }

          if (
            !record.photo_path
          ) {
            noPhoto += 1;
            return;
          }

          complete += 1;
        },
      );

      const compliance =
        relevantWorkdays.length >
        0
          ? (
              complete /
              relevantWorkdays.length
            ) *
            100
          : 0;

      const totals =
        records.reduce(
          (
            sum,
            item,
          ) => {
            sum.cutting +=
              kg(
                item.cutting_kg,
              );

            sum.plastic +=
              kg(
                item.plastic_kg,
              );

            sum.paper +=
              kg(
                item.paper_kg,
              );

            sum.carton +=
              kg(
                item.carton_kg,
              );

            sum.pedding +=
              kg(
                item.pedding_kg,
              );

            sum.wet +=
              kg(
                item.wet_waste_kg,
              );

            sum.total +=
              kg(
                item.total_kg,
              );

            return sum;
          },
          {
            cutting: 0,
            plastic: 0,
            paper: 0,
            carton: 0,
            pedding: 0,
            wet: 0,
            total: 0,
          },
        );

      return {
        workdays:
          relevantWorkdays
            .length,

        complete,
        noInput,
        noPhoto,
        compliance,
        totals,
      };
    }, [
      schedules,
      records,
      recordMap,
    ]);

  const categories =
    useMemo<Category[]>(
      () => [
        {
          name:
            "Bahan Cutting",

          actual:
            summary.totals
              .cutting,

          target:
            kg(
              target
                ?.cutting_target,
            ),
        },
        {
          name:
            "Plastik",

          actual:
            summary.totals
              .plastic,

          target:
            kg(
              target
                ?.plastic_target,
            ),
        },
        {
          name:
            "Paper",

          actual:
            summary.totals
              .paper,

          target:
            kg(
              target
                ?.paper_target,
            ),
        },
        {
          name:
            "Karton",

          actual:
            summary.totals
              .carton,

          target:
            kg(
              target
                ?.carton_target,
            ),
        },
        {
          name:
            "Pedding",

          actual:
            summary.totals
              .pedding,

          target:
            kg(
              target
                ?.pedding_target,
            ),
        },
        {
          name:
            "Basah / Umum",

          actual:
            summary.totals
              .wet,

          target:
            kg(
              target
                ?.wet_waste_target,
            ),
        },
      ],
      [
        summary,
        target,
      ],
    );

  const detailRows =
    useMemo(() => {
      return schedules.map(
        (schedule) => {
          const record =
            recordMap.get(
              schedule.work_date,
            );

          return {
            date:
              schedule.work_date,

            workday:
              schedule.is_workday,

            note:
              schedule.note,

            record,

            status:
              getStatus(
                schedule.work_date,
                record,
                schedule,
              ),
          };
        },
      );
    }, [
      schedules,
      recordMap,
    ]);

  async function exportPdf() {
    setExporting(true);

    try {
      const doc =
        new jsPDF({
          orientation:
            "portrait",
          unit: "mm",
          format: "a4",
        });

      const logoSrc =
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-dreamwear.png`;

      const logo =
        await imageToDataUrl(
          logoSrc,
        );

      if (logo) {
        try {
          doc.addImage(
            logo,
            "PNG",
            15,
            10,
            34,
            14,
          );
        } catch {
          // lanjut tanpa logo jika format tidak terbaca
        }
      }

      doc.setFontSize(15);
      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.text(
        "PT.DREAMWEAR",
        105,
        15,
        {
          align:
            "center",
        },
      );

      doc.setFontSize(12);

      doc.text(
        "LAPORAN MONITORING LIMBAH",
        105,
        22,
        {
          align:
            "center",
        },
      );

      doc.setFontSize(10);
      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        `Periode: ${monthLabel(
          selectedMonth,
        )}`,
        105,
        28,
        {
          align:
            "center",
        },
      );

      doc.line(
        15,
        33,
        195,
        33,
      );

      autoTable(
        doc,
        {
          startY: 38,

          head: [
            [
              "Ringkasan",
              "Hasil",
            ],
          ],

          body: [
            [
              "Total Limbah",
              `${formatKg(
                summary.totals
                  .total,
              )} KG`,
            ],
            [
              "Hari Kerja",
              String(
                summary.workdays,
              ),
            ],
            [
              "Hari Lengkap",
              String(
                summary.complete,
              ),
            ],
            [
              "Belum Input",
              String(
                summary.noInput,
              ),
            ],
            [
              "Belum Foto",
              String(
                summary.noPhoto,
              ),
            ],
            [
              "Tingkat Kepatuhan",
              `${summary.compliance.toLocaleString(
                "id-ID",
                {
                  maximumFractionDigits:
                    1,
                },
              )}%`,
            ],
          ],

          styles: {
            fontSize: 9,
          },

          headStyles: {
            fillColor: [
              37,
              99,
              235,
            ],
          },
        },
      );

      let y =
        (
          doc as jsPDF & {
            lastAutoTable?: {
              finalY: number;
            };
          }
        ).lastAutoTable
          ?.finalY ??
        75;

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(11);

      doc.text(
        "Aktual vs Batas Limbah",
        15,
        y + 8,
      );

      autoTable(
        doc,
        {
          startY:
            y + 11,

          head: [
            [
              "Jenis Limbah",
              "Aktual",
              "Batas",
              "Pemakaian",
              "Status",
            ],
          ],

          body:
            categories.map(
              (item) => {
                const percent =
                  item.target > 0
                    ? (
                        item.actual /
                        item.target
                      ) *
                      100
                    : 0;

                const status =
                  item.target <= 0
                    ? "Belum Diatur"
                    : percent >
                        100
                      ? "Melebihi Batas"
                      : percent >=
                          80
                        ? "Mendekati Batas"
                        : "Aman";

                return [
                  item.name,

                  `${formatKg(
                    item.actual,
                  )} KG`,

                  item.target >
                  0
                    ? `${formatKg(
                        item.target,
                      )} KG`
                    : "-",

                  item.target >
                  0
                    ? `${percent.toFixed(
                        1,
                      )}%`
                    : "-",

                  status,
                ];
              },
            ),

          styles: {
            fontSize: 8,
          },

          headStyles: {
            fillColor: [
              30,
              64,
              175,
            ],
          },
        },
      );

      y =
        (
          doc as jsPDF & {
            lastAutoTable?: {
              finalY: number;
            };
          }
        ).lastAutoTable
          ?.finalY ??
        y + 50;

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(11);

      doc.text(
        "Detail Monitoring Harian",
        15,
        y + 8,
      );

      autoTable(
        doc,
        {
          startY:
            y + 11,

          head: [
            [
              "Tanggal",
              "PIC",
              "Total",
              "Input",
              "Foto",
              "Status",
            ],
          ],

          body:
            detailRows.map(
              (item) => [
                dateLabel(
                  item.date,
                ),

                item.record
                  ?.pic_name ??
                  "-",

                item.record
                  ? `${formatKg(
                      kg(
                        item.record
                          .total_kg,
                      ),
                    )} KG`
                  : "-",

                item.record
                  ? `${formatTime(
                      item.record
                        .created_at,
                    )} WIB`
                  : "-",

                item.record
                  ?.photo_path
                  ? `${formatTime(
                      item.record
                        .cleanliness_photo_at,
                    )} WIB`
                  : "-",

                item.status,
              ],
            ),

          styles: {
            fontSize: 7,
          },

          headStyles: {
            fillColor: [
              37,
              99,
              235,
            ],
          },

          margin: {
            bottom: 18,
          },

          didDrawPage: (
            data,
          ) => {
            const page =
              doc.getNumberOfPages();

            doc.setFontSize(
              7,
            );

            doc.setFont(
              "helvetica",
              "normal",
            );

            doc.text(
              `Waste Monitoring PT.DREAMWEAR • ${monthLabel(
                selectedMonth,
              )}`,
              15,
              289,
            );

            doc.text(
              `Halaman ${page}`,
              195,
              289,
              {
                align:
                  "right",
              },
            );
          },
        },
      );

      doc.save(
        `Laporan-Monitoring-Limbah-${selectedMonth}.pdf`,
      );
    } finally {
      setExporting(false);
    }
  }

  function exportExcel() {
    const summaryData = [
      [
        "PT.DREAMWEAR",
      ],
      [
        "LAPORAN MONITORING LIMBAH",
      ],
      [
        "Periode",
        monthLabel(
          selectedMonth,
        ),
      ],
      [],
      [
        "RINGKASAN",
      ],
      [
        "Total Limbah",
        summary.totals
          .total,
        "KG",
      ],
      [
        "Hari Kerja",
        summary.workdays,
      ],
      [
        "Hari Lengkap",
        summary.complete,
      ],
      [
        "Belum Input",
        summary.noInput,
      ],
      [
        "Belum Foto",
        summary.noPhoto,
      ],
      [
        "Kepatuhan",
        summary.compliance,
        "%",
      ],
      [],
      [
        "JENIS LIMBAH",
        "AKTUAL KG",
        "BATAS KG",
        "PERSENTASE",
        "STATUS",
      ],
      ...categories.map(
        (item) => {
          const percent =
            item.target > 0
              ? (
                  item.actual /
                  item.target
                ) *
                100
              : 0;

          return [
            item.name,
            item.actual,
            item.target ||
              "",
            item.target >
            0
              ? percent
              : "",
            item.target <=
            0
              ? "Belum Diatur"
              : percent >
                  100
                ? "Melebihi Batas"
                : percent >=
                    80
                  ? "Mendekati Batas"
                  : "Aman",
          ];
        },
      ),
    ];

    const detailData =
      detailRows.map(
        (item) => ({
          Tanggal:
            item.date,

          "Hari Kerja":
            item.workday
              ? "Ya"
              : "Tidak",

          PIC:
            item.record
              ?.pic_name ??
            "",

          "Bahan Cutting KG":
            item.record
              ? kg(
                  item.record
                    .cutting_kg,
                )
              : "",

          "Plastik KG":
            item.record
              ? kg(
                  item.record
                    .plastic_kg,
                )
              : "",

          "Paper KG":
            item.record
              ? kg(
                  item.record
                    .paper_kg,
                )
              : "",

          "Karton KG":
            item.record
              ? kg(
                  item.record
                    .carton_kg,
                )
              : "",

          "Pedding KG":
            item.record
              ? kg(
                  item.record
                    .pedding_kg,
                )
              : "",

          "Basah Umum KG":
            item.record
              ? kg(
                  item.record
                    .wet_waste_kg,
                )
              : "",

          "Total KG":
            item.record
              ? kg(
                  item.record
                    .total_kg,
                )
              : "",

          "Jam Input":
            item.record
              ? formatTime(
                  item.record
                    .created_at,
                )
              : "",

          "Jam Foto":
            item.record
              ?.photo_path
              ? formatTime(
                  item.record
                    .cleanliness_photo_at,
                )
              : "",

          Status:
            item.status,

          Keterangan:
            item.record
              ?.notes ??
            item.note ??
            "",
        }),
      );

    const workbook =
      XLSX.utils.book_new();

    const summarySheet =
      XLSX.utils.aoa_to_sheet(
        summaryData,
      );

    const detailSheet =
      XLSX.utils.json_to_sheet(
        detailData,
      );

    summarySheet[
      "!cols"
    ] = [
      {
        wch: 25,
      },
      {
        wch: 18,
      },
      {
        wch: 15,
      },
      {
        wch: 15,
      },
      {
        wch: 22,
      },
    ];

    detailSheet[
      "!cols"
    ] = [
      {
        wch: 14,
      },
      {
        wch: 12,
      },
      {
        wch: 18,
      },
      ...Array(7).fill({
        wch: 16,
      }),
      {
        wch: 12,
      },
      {
        wch: 12,
      },
      {
        wch: 18,
      },
      {
        wch: 30,
      },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Ringkasan",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      detailSheet,
      "Detail Harian",
    );

    XLSX.writeFile(
      workbook,
      `Laporan-Monitoring-Limbah-${selectedMonth}.xlsx`,
    );
  }

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              PT.DREAMWEAR
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Laporan Monitoring Limbah
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Laporan formal bulanan untuk kebutuhan monitoring dan dokumentasi.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              disabled={
                exporting ||
                loading
              }
              onClick={() =>
                void exportPdf()
              }
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {exporting
                ? "Membuat PDF..."
                : "Download PDF"}
            </button>

            <button
              type="button"
              disabled={
                loading
              }
              onClick={
                exportExcel
              }
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              Download Excel
            </button>
          </div>
        </div>


        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">

          <label className="text-sm font-bold text-slate-700">
            Periode Laporan
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
            className="mt-2 block w-full max-w-xs rounded-xl border border-slate-300 px-4 py-3 font-bold"
          />

          <p className="mt-3 text-sm font-black capitalize text-blue-700">
            {monthLabel(
              selectedMonth,
            )}
          </p>
        </section>


        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-600">
            ⚠ {errorMessage}
          </div>
        )}


        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-12 text-center text-slate-500">
            Menyusun laporan...
          </div>
        ) : (
          <>
            {/* SUMMARY */}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

              <div className="rounded-2xl bg-blue-600 p-5 text-white">
                <p className="text-xs font-bold text-blue-100">
                  Total Limbah
                </p>

                <p className="mt-2 text-2xl font-black">
                  {formatKg(
                    summary.totals
                      .total,
                  )}
                </p>

                <p className="text-xs font-black">
                  KG
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">
                  Hari Kerja
                </p>

                <p className="mt-2 text-2xl font-black">
                  {
                    summary.workdays
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">
                  Lengkap
                </p>

                <p className="mt-2 text-2xl font-black text-blue-700">
                  {
                    summary.complete
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">
                  Belum Input
                </p>

                <p className="mt-2 text-2xl font-black text-red-600">
                  {
                    summary.noInput
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">
                  Belum Foto
                </p>

                <p className="mt-2 text-2xl font-black text-amber-600">
                  {
                    summary.noPhoto
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-5 text-white">
                <p className="text-xs font-bold text-slate-300">
                  Kepatuhan
                </p>

                <p className="mt-2 text-2xl font-black">
                  {summary.compliance.toLocaleString(
                    "id-ID",
                    {
                      maximumFractionDigits:
                        1,
                    },
                  )}
                  %
                </p>
              </div>
            </div>


            {/* TARGET */}

            <section className="mt-6">

              <h2 className="text-xl font-black text-slate-900">
                Aktual vs Batas Limbah
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                {categories.map(
                  (item) => {
                    const percentage =
                      item.target >
                      0
                        ? (
                            item.actual /
                            item.target
                          ) *
                          100
                        : 0;

                    const over =
                      percentage >
                      100;

                    const warning =
                      percentage >=
                        80 &&
                      !over;

                    return (
                      <div
                        key={
                          item.name
                        }
                        className="rounded-2xl bg-white p-5 shadow-sm"
                      >

                        <div className="flex justify-between gap-3">

                          <p className="font-black text-slate-900">
                            {
                              item.name
                            }
                          </p>

                          <span
                            className={[
                              "rounded-full px-3 py-1 text-[10px] font-black",
                              item.target <=
                              0
                                ? "bg-slate-100 text-slate-600"
                                : over
                                  ? "bg-red-100 text-red-700"
                                  : warning
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700",
                            ].join(
                              " ",
                            )}
                          >
                            {item.target <=
                            0
                              ? "BELUM DIATUR"
                              : over
                                ? "MELEBIHI"
                                : warning
                                  ? "MENDEKATI"
                                  : "AMAN"}
                          </span>
                        </div>

                        <p className="mt-4 text-3xl font-black">
                          {formatKg(
                            item.actual,
                          )}{" "}
                          <span className="text-sm">
                            KG
                          </span>
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Batas:{" "}
                          {item.target >
                          0
                            ? `${formatKg(
                                item.target,
                              )} KG`
                            : "-"}
                        </p>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className={[
                              "h-full rounded-full",
                              over
                                ? "bg-red-500"
                                : warning
                                  ? "bg-amber-500"
                                  : "bg-blue-600",
                            ].join(
                              " ",
                            )}
                            style={{
                              width:
                                `${Math.min(
                                  percentage,
                                  100,
                                )}%`,
                            }}
                          />

                        </div>

                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {item.target >
                          0
                            ? `${percentage.toLocaleString(
                                "id-ID",
                                {
                                  maximumFractionDigits:
                                    1,
                                },
                              )}%`
                            : "Target belum diatur"}
                        </p>
                      </div>
                    );
                  },
                )}
              </div>
            </section>


            {/* DETAIL */}

            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">

              <div className="border-b border-slate-200 p-5">

                <h2 className="text-xl font-black">
                  Detail Harian
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Data sesuai jadwal kerja bulan yang dipilih.
                </p>
              </div>

              <div className="overflow-x-auto">

                <table className="min-w-full text-sm">

                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">

                    <tr>
                      <th className="px-4 py-3">
                        Tanggal
                      </th>

                      <th className="px-4 py-3">
                        PIC
                      </th>

                      <th className="px-4 py-3">
                        Total
                      </th>

                      <th className="px-4 py-3">
                        Jam Input
                      </th>

                      <th className="px-4 py-3">
                        Jam Foto
                      </th>

                      <th className="px-4 py-3">
                        Status
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {detailRows.map(
                      (item) => (
                        <tr
                          key={
                            item.date
                          }
                          className="border-t border-slate-100"
                        >

                          <td className="whitespace-nowrap px-4 py-3 font-bold">
                            {dateLabel(
                              item.date,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {item.record
                              ?.pic_name ??
                              "-"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 font-black">
                            {item.record
                              ? `${formatKg(
                                  kg(
                                    item.record
                                      .total_kg,
                                  ),
                                )} KG`
                              : "-"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {item.record
                              ? `${formatTime(
                                  item.record
                                    .created_at,
                                )} WIB`
                              : "-"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {item.record
                              ?.photo_path
                              ? `${formatTime(
                                  item.record
                                    .cleanliness_photo_at,
                                )} WIB`
                              : "-"}
                          </td>

                          <td className="px-4 py-3">

                            <span
                              className={[
                                "rounded-full px-3 py-1 text-xs font-black",
                                item.status ===
                                "Lengkap"
                                  ? "bg-blue-100 text-blue-700"
                                  : item.status ===
                                      "Libur"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-red-100 text-red-700",
                              ].join(
                                " ",
                              )}
                            >
                              {
                                item.status
                              }
                            </span>
                          </td>
                        </tr>
                      ),
                    )}

                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
