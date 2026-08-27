"use client";

import PicAdminMessageCard from "@/components/PicAdminMessageCard";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { useTodayWorkStatus } from "@/components/useTodayWorkStatus";
import { supabase } from "@/lib/supabase";

type TodayRecord = {
  id: string;
  total_kg: number;
  pic_name: string | null;
  photo_path: string | null;
  cleanliness_photo_at: string | null;
};

function todayJakarta() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function formatToday() {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone:
        "Asia/Jakarta",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(new Date());
}

function formatTime(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone:
        "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(
    new Date(value),
  );
}

export default function PicPage() {

  const {
    loading:
      workStatusLoading,

    isWorkday,

    statusLabel:
      workStatusLabel,

    note:
      workStatusNote,

    holiday:
      todayHoliday,
  } =
    useTodayWorkStatus();

  const {
    profile,
  } = useAuth();

  const [
    record,
    setRecord,
  ] =
    useState<TodayRecord | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const loadToday =
    useCallback(async () => {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("waste_daily")
        .select(
          `
          id,
          total_kg,
          pic_name,
          photo_path,
          cleanliness_photo_at
          `,
        )
        .eq(
          "record_date",
          todayJakarta(),
        )
        .maybeSingle();

      if (!error) {
        setRecord(
          data ?? null,
        );
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadToday();

    const timer =
      window.setInterval(
        () => {
          void loadToday();
        },
        20000,
      );

    const focus = () => {
      void loadToday();
    };

    window.addEventListener(
      "focus",
      focus,
    );


  return () => {
      window.clearInterval(
        timer,
      );

      window.removeEventListener(
        "focus",
        focus,
      );
    };
  }, [loadToday]);

  if (workStatusLoading) {
      return (
        <main className="min-h-screen bg-slate-100 p-6">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="font-black text-slate-700">
              Memeriksa jadwal kerja...
            </p>
          </div>
        </main>
      );
    }
  
    if (!isWorkday) {
      return (
        <main className="min-h-screen bg-slate-100 px-4 py-8">
          <div className="mx-auto max-w-3xl">
  
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
  
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                ○
              </div>
  
              <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Status Hari Ini
              </p>
  
              <h1 className="mt-2 text-3xl font-black text-slate-900">
                {workStatusLabel}
              </h1>
  
              {todayHoliday && (
                <p className="mt-3 font-bold text-red-600">
                  🔴 {todayHoliday.holiday_name}
                </p>
              )}
  
              {workStatusNote && (
                <p className="mt-2 text-sm text-slate-500">
                  {workStatusNote}
                </p>
              )}
  
              <div className="mt-6 rounded-2xl bg-blue-50 p-5">
                <p className="font-black text-blue-700">
                  Tidak Ada Tugas PIC Hari Ini
                </p>
  
                <p className="mt-1 text-sm text-slate-600">
                  Input limbah dan bukti kebersihan tidak diwajibkan pada hari libur.
                </p>
              </div>
  
            </div>
          </div>
        </main>
      );
    }


  const wasteDone =
    Boolean(record);

  const photoDone =
    Boolean(
      record?.photo_path,
    );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-blue-700 p-6 text-white shadow-sm">
          <p className="text-sm font-bold text-blue-100">
            PIC WASTE MONITORING
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Halo,{" "}
            {profile.name}
          </h1>

          <p className="mt-2 text-sm text-blue-100">
            {formatToday()}
          </p>
        </div>

        <div className="mt-6">
          <PicAdminMessageCard />

            <h2 className="text-xl font-black text-slate-900">
            Tugas Hari Ini
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Selesaikan dua pekerjaan rutin berikut.
          </p>
        </div>

        {loading ? (
          <div className="mt-5 rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            Mengecek tugas hari ini...
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <section
              className={[
                "rounded-2xl border-2 p-5 shadow-sm",
                wasteDone
                  ? "border-blue-200 bg-blue-50"
                  : "border-amber-200 bg-amber-50",
              ].join(" ")}
            >
              <div className="flex items-start gap-4">
                <div
                  className={[
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black",
                    wasteDone
                      ? "bg-blue-600 text-white"
                      : "bg-amber-100 text-amber-700",
                  ].join(" ")}
                >
                  {wasteDone
                    ? "✓"
                    : "1"}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-500">
                    TUGAS 1
                  </p>

                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    Pencatatan Limbah
                  </h3>

                  {wasteDone ? (
                    <>
                      <p className="mt-2 font-bold text-blue-700">
                        ✓ Sudah Diisi
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Total hari ini:{" "}
                        <span className="font-black">
                          {Number(
                            record?.total_kg ??
                              0,
                          ).toLocaleString(
                            "id-ID",
                            {
                              maximumFractionDigits:
                                2,
                            },
                          )}{" "}
                          KG
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-slate-600">
                        Data limbah hari ini belum diinput.
                      </p>

                      <Link
                        href="/input-limbah"
                        className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
                      >
                        + Input Sekarang
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section
              className={[
                "rounded-2xl border-2 p-5 shadow-sm",
                photoDone
                  ? "border-blue-200 bg-blue-50"
                  : "border-red-200 bg-red-50",
              ].join(" ")}
            >
              <div className="flex items-start gap-4">
                <div
                  className={[
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black",
                    photoDone
                      ? "bg-blue-600 text-white"
                      : "bg-red-100 text-red-600",
                  ].join(" ")}
                >
                  {photoDone
                    ? "✓"
                    : "2"}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-500">
                    TUGAS 2
                  </p>

                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    Foto Kebersihan Area
                  </h3>

                  {!wasteDone ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Input limbah hari ini terlebih dahulu.
                    </p>
                  ) : photoDone ? (
                    <>
                      <p className="mt-2 font-bold text-blue-700">
                        ✓ Bukti Sudah Masuk
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Dikirim pukul{" "}
                        <span className="font-black">
                          {formatTime(
                            record?.cleanliness_photo_at ??
                              null,
                          )}{" "}
                          WIB
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        Foto belum dikirim.
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Ambil foto kondisi terkini area limbah sebelum pulang.
                      </p>

                      <Link
                        href="/kebersihan"
                        className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
                      >
                        📷 Ambil Foto
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </section>

            {wasteDone &&
              photoDone && (
                <div className="rounded-2xl bg-slate-900 p-5 text-center text-white">
                  <div className="text-3xl">
                    ✓
                  </div>

                  <p className="mt-2 text-lg font-black">
                    Tugas Hari Ini Selesai
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    Pencatatan limbah dan bukti kebersihan sudah lengkap.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </main>
  );
}
