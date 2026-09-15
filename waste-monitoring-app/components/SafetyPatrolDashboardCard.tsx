"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type SafetyFinding = {
  id: number;
  finding_date: string;
  area: string;
  category: string;
  description: string;
  photo_after_url: string | null;
};

function getJakartaMonthRange() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  let year = 0;
  let month = 0;

  for (const part of parts) {
    if (part.type === "year") {
      year = Number(part.value);
    }

    if (part.type === "month") {
      month = Number(part.value);
    }
  }

  const currentMonth =
    String(month).padStart(2, "0");

  const nextMonthNumber =
    month === 12
      ? 1
      : month + 1;

  const nextYear =
    month === 12
      ? year + 1
      : year;

  const nextMonth =
    String(
      nextMonthNumber,
    ).padStart(2, "0");

  return {
    start:
      `${year}-${currentMonth}-01`,

    end:
      `${nextYear}-${nextMonth}-01`,
  };
}

export default function SafetyPatrolDashboardCard() {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    completed,
    setCompleted,
  ] = useState(0);

  const [
    pending,
    setPending,
  ] = useState(0);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    oldestPending,
    setOldestPending,
  ] = useState<SafetyFinding | null>(null);

  const loadSafetyPatrol =
    useCallback(async () => {
      setErrorMessage("");

      const range =
        getJakartaMonthRange();

      const {
        data,
        error,
      } = await supabase
        .from(
          "safety_patrol_monthly",
        )
        .select(
          "id, finding_date, area, category, description, photo_after_url",
        )
        .gte(
          "finding_date",
          range.start,
        )
        .lt(
          "finding_date",
          range.end,
        );

      if (error) {
        console.error(
          "Gagal mengambil Safety Patrol:",
          error,
        );

        setErrorMessage(
          "Data Safety Patrol belum dapat dimuat.",
        );

        setLoading(false);

        return;
      }

      const rows =
        (data ??
          []) as SafetyFinding[];

      const totalData =
        rows.length;

      const selesai =
        rows.filter(
          (item) =>
            Boolean(
              item.photo_after_url,
            ),
        ).length;

      setTotal(totalData);
      setCompleted(selesai);
      setPending(
        totalData - selesai,
      );

      const {
        data: oldestData,
        error: oldestError,
      } = await supabase
        .from(
          "safety_patrol_monthly",
        )
        .select(
          "id, finding_date, area, category, description, photo_after_url",
        )
        .is(
          "photo_after_url",
          null,
        )
        .order(
          "finding_date",
          {
            ascending: true,
          },
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        )
        .limit(1)
        .maybeSingle();

      if (oldestError) {
        console.error(
          "Gagal mengambil pending terlama:",
          oldestError,
        );
      } else {
        setOldestPending(
          oldestData as SafetyFinding | null,
        );
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadSafetyPatrol();

    const handleFocus =
      () => {
        void loadSafetyPatrol();
      };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [loadSafetyPatrol]);

  return (
    <section className="mt-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl ring-1 ring-amber-100">
              🦺
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                Safety Monitoring
              </p>

              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                Safety Patrol
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500">
                Ringkasan temuan dan tindak lanjut keselamatan bulan ini.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            <Link
              href="/safety-patrol/temuan-baru"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-600"
            >
              <span className="text-lg leading-none">+</span>
              Temuan Baru
            </Link>

            <Link
              href="/safety-patrol"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#071b3f] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-900"
            >
              Buka Safety Patrol →
            </Link>

          </div>

        </div>

        {loading ? (
          <div className="p-6 text-sm font-bold text-slate-500">
            Mengambil data Safety Patrol...
          </div>
        ) : errorMessage ? (
          <div className="p-6">

            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {errorMessage}
            </div>

          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Total Temuan
              </p>

              <p className="mt-3 text-3xl font-black text-slate-950">
                {total}
              </p>

              <p className="mt-2 text-xs font-medium text-slate-500">
                Temuan bulan berjalan
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Sudah Diperbaiki
              </p>

              <p className="mt-3 text-3xl font-black text-emerald-700">
                {completed}
              </p>

              <p className="mt-2 text-xs font-medium text-emerald-700/70">
                Sudah memiliki foto AFTER
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                Belum Diperbaiki
              </p>

              <p className="mt-3 text-3xl font-black text-amber-700">
                {pending}
              </p>

              <p className="mt-2 text-xs font-medium text-amber-700/70">
                Menunggu tindak lanjut
              </p>
            </div>

            {oldestPending && (
              <div className="sm:col-span-3 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                      Pending Terlama
                    </span>

                    <span className="text-xs font-bold text-amber-700">
                      {oldestPending.finding_date}
                    </span>

                  </div>

                  <p className="mt-3 text-sm font-black text-slate-900">
                    {oldestPending.description}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {oldestPending.area}
                    {" • "}
                    {oldestPending.category}
                  </p>

                </div>

                <Link
                  href={`/safety-patrol/detail?id=${oldestPending.id}`}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-xs font-black text-amber-700 shadow-sm transition hover:bg-amber-100"
                >
                  Lihat Temuan →
                </Link>

              </div>
            )}

          </div>
        )}

      </div>
    </section>
  );
}
