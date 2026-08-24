"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type TodayRecord = {
  id: string;
  record_date: string;
  pic_name: string | null;
  photo_path: string | null;
  cleanliness_photo_at: string | null;
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

function formatDate(value: string) {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );
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
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(new Date(value));
}

export default function TodayCleanlinessStatus() {
  const [record, setRecord] =
    useState<TodayRecord | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [opening, setOpening] =
    useState(false);

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [showPhoto, setShowPhoto] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadStatus =
    useCallback(async () => {
      setLoading(true);

      const today =
        jakartaToday();

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
        .eq(
          "record_date",
          today,
        )
        .maybeSingle();

      if (error) {
        setErrorMessage(
          error.message,
        );
      } else {
        setRecord(
          data ?? null,
        );

        setErrorMessage("");
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadStatus();

    const timer =
      window.setInterval(
        () => {
          void loadStatus();
        },
        30000,
      );

    const handleFocus = () => {
      void loadStatus();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(
        timer,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [loadStatus]);

  async function openPhoto() {
    if (!record?.photo_path) {
      return;
    }

    setOpening(true);

    const {
      data,
      error,
    } = await supabase.storage
      .from("waste-evidence")
      .createSignedUrl(
        record.photo_path,
        60 * 10,
      );

    if (error) {
      setErrorMessage(
        error.message,
      );

      setOpening(false);
      return;
    }

    setPhotoUrl(
      data.signedUrl,
    );

    setShowPhoto(true);
    setOpening(false);
  }

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">
          Mengecek bukti kebersihan hari ini...
        </p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="font-bold text-red-600">
          Gagal mengecek bukti kebersihan
        </p>

        <p className="mt-1 text-sm text-red-500">
          {errorMessage}
        </p>
      </section>
    );
  }

  if (!record) {
    return (
      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-2xl">
            ⚠
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-amber-600">
              Kebersihan Area Limbah Hari Ini
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Belum Ada Pencatatan Hari Ini
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Input data limbah dan foto kondisi area limbah sebelum pulang kerja.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!record.photo_path) {
    return (
      <section className="mt-6 rounded-2xl border-2 border-red-200 bg-red-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-2xl">
              ⚠
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-red-600">
                Kebersihan Area Limbah Hari Ini
              </p>

              <h2 className="mt-1 text-xl font-black text-red-700">
                Belum Ada Bukti Kebersihan
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                PIC:{" "}
                <span className="font-bold">
                  {record.pic_name || "-"}
                </span>
              </p>

              <p className="mt-1 text-sm text-red-600">
                Foto kondisi terkini area limbah wajib dilengkapi sebelum pulang.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-2xl text-white">
              ✓
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                Kebersihan Area Limbah Hari Ini
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Bukti Kebersihan Sudah Masuk
              </h2>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                <p>
                  Tanggal:{" "}
                  <span className="font-bold text-slate-900">
                    {formatDate(
                      record.record_date,
                    )}
                  </span>
                </p>

                <p>
                  PIC:{" "}
                  <span className="font-bold text-slate-900">
                    {record.pic_name ||
                      "-"}
                  </span>
                </p>

                <p>
                  Foto:{" "}
                  <span className="font-bold text-blue-700">
                    {formatTime(
                      record.cleanliness_photo_at,
                    )}{" "}
                    WIB
                  </span>
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void openPhoto()
            }
            disabled={opening}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50"
          >
            {opening
              ? "Membuka..."
              : "📷 Lihat Foto"}
          </button>
        </div>
      </section>

      {showPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-white">
                <p className="font-black">
                  Bukti Kebersihan Area Limbah
                </p>

                <p className="text-sm text-slate-300">
                  {record.pic_name ||
                    "-"}{" "}
                  •{" "}
                  {formatTime(
                    record.cleanliness_photo_at,
                  )}{" "}
                  WIB
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPhoto(
                    false,
                  )
                }
                className="rounded-xl bg-white px-4 py-2 font-black text-slate-900"
              >
                ✕ Tutup
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Bukti kebersihan area limbah"
              className="max-h-[82vh] w-full rounded-2xl bg-white object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
