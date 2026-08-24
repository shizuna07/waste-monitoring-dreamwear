"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import CleanlinessEvidence from "@/components/CleanlinessEvidence";
import ComplianceExportButtons from "@/components/ComplianceExportButtons";

import { supabase } from "@/lib/supabase";

type WasteRecord = {
  id: string;
  record_date: string;
  pic_name: string | null;
  photo_path: string | null;
  cleanliness_photo_at: string | null;
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

function formatDate(value: string) {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(new Date(value));
}

export default function CompliancePage() {
  const [records, setRecords] =
    useState<WasteRecord[]>([]);

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth());

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const startDate =
      `${selectedMonth}-01`;

    const [year, month] =
      selectedMonth
        .split("-")
        .map(Number);

    const nextMonthDate =
      new Date(
        year,
        month,
        1,
      );

    const nextYear =
      nextMonthDate.getFullYear();

    const nextMonth =
      String(
        nextMonthDate.getMonth() + 1,
      ).padStart(2, "0");

    const endDate =
      `${nextYear}-${nextMonth}-01`;

    const {
      data,
      error,
    } = await supabase
      .from("waste_daily")
      .select(
        `
        id,
        record_date,
        pic_name,
        photo_path,
        cleanliness_photo_at
        `,
      )
      .gte(
        "record_date",
        startDate,
      )
      .lt(
        "record_date",
        endDate,
      )
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
  }, [selectedMonth]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total =
      records.length;

    const complete =
      records.filter(
        (item) =>
          Boolean(
            item.photo_path,
          ),
      ).length;

    const incomplete =
      total - complete;

    const percentage =
      total > 0
        ? (complete / total) *
          100
        : 0;

    return {
      total,
      complete,
      incomplete,
      percentage,
    };
  }, [records]);

  const periodName =
    useMemo(() => {
      const [
        year,
        month,
      ] =
        selectedMonth.split(
          "-",
        );

      return `${monthNames[
        Number(month) - 1
      ]} ${year}`;
    }, [selectedMonth]);

  function statusText() {
    if (
      stats.total === 0
    ) {
      return "Belum Ada Data";
    }

    if (
      stats.percentage ===
      100
    ) {
      return "Lengkap";
    }

    if (
      stats.percentage >=
      90
    ) {
      return "Baik";
    }

    if (
      stats.percentage >=
      75
    ) {
      return "Perlu Perhatian";
    }

    return "Tidak Memenuhi";
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            PT.DREAMWEAR
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Kepatuhan Kebersihan
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Rekap bukti foto kebersihan area limbah
          </p>
        </div>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Pilih Bulan
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
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
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
            >
              ↻ Refresh
            </button>

            <ComplianceExportButtons
              selectedMonth={selectedMonth}
              records={records}
            />
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            Mengambil data kepatuhan...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-600">
            {errorMessage}
          </div>
        )}

        {!loading &&
          !errorMessage && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Hari Pencatatan
                  </p>

                  <p className="mt-2 text-4xl font-black text-slate-900">
                    {
                      stats.total
                    }
                  </p>

                  <p className="text-sm text-slate-400">
                    Hari
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
                  <p className="text-sm text-blue-100">
                    Bukti Lengkap
                  </p>

                  <p className="mt-2 text-4xl font-black">
                    {
                      stats.complete
                    }
                  </p>

                  <p className="text-sm text-blue-100">
                    Hari
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-5 shadow-sm">
                  <p className="text-sm text-red-500">
                    Belum Ada Foto
                  </p>

                  <p className="mt-2 text-4xl font-black text-red-600">
                    {
                      stats.incomplete
                    }
                  </p>

                  <p className="text-sm text-red-400">
                    Hari
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
                  <p className="text-sm text-slate-300">
                    Tingkat Kepatuhan
                  </p>

                  <p className="mt-2 text-4xl font-black">
                    {stats.percentage.toLocaleString(
                      "id-ID",
                      {
                        maximumFractionDigits:
                          1,
                      },
                    )}
                    %
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-300">
                    {statusText()}
                  </p>
                </div>
              </section>

              <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      Kepatuhan Bulan
                    </p>

                    <h2 className="text-xl font-black text-slate-900">
                      {
                        periodName
                      }
                    </h2>
                  </div>

                  <p className="text-lg font-black text-blue-700">
                    {
                      stats.complete
                    }
                    /
                    {
                      stats.total
                    }{" "}
                    Hari
                  </p>
                </div>

                <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width:
                        `${Math.min(
                          stats.percentage,
                          100,
                        )}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex justify-between text-xs font-semibold text-slate-500">
                  <span>
                    0%
                  </span>

                  <span>
                    Target 100%
                  </span>
                </div>
              </section>

              <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-black text-slate-900">
                    Detail Kepatuhan Harian
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {periodName}
                  </p>
                </div>

                {records.length ===
                0 ? (
                  <div className="p-10 text-center text-slate-500">
                    Belum ada pencatatan pada bulan ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[800px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-4 text-left">
                            Tanggal
                          </th>

                          <th className="p-4 text-left">
                            PIC
                          </th>

                          <th className="p-4 text-center">
                            Status
                          </th>

                          <th className="p-4 text-center">
                            Jam Foto
                          </th>

                          <th className="p-4 text-center">
                            Bukti
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {records.map(
                          (item) => {
                            const complete =
                              Boolean(
                                item.photo_path,
                              );

                            return (
                              <tr
                                key={
                                  item.id
                                }
                                className="border-t border-slate-100"
                              >
                                <td className="p-4 font-bold text-slate-900">
                                  {formatDate(
                                    item.record_date,
                                  )}
                                </td>

                                <td className="p-4">
                                  {item.pic_name ||
                                    "-"}
                                </td>

                                <td className="p-4 text-center">
                                  {complete ? (
                                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                                      ✓ Lengkap
                                    </span>
                                  ) : (
                                    <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">
                                      ✕ Belum Foto
                                    </span>
                                  )}
                                </td>

                                <td className="p-4 text-center font-semibold">
                                  {complete
                                    ? `${formatTime(
                                        item.cleanliness_photo_at,
                                      )} WIB`
                                    : "-"}
                                </td>

                                <td className="p-4 text-center">
                                  <div className="inline-block text-left">
                                    <CleanlinessEvidence
                                      photoPath={
                                        item.photo_path
                                      }
                                      photoAt={
                                        item.cleanliness_photo_at
                                      }
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          },
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
