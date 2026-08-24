"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  photoPath: string | null;
  photoAt: string | null;
};

function formatPhotoTime(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );
}

export default function CleanlinessEvidence({
  photoPath,
  photoAt,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function openPhoto() {
    if (!photoPath) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const {
      data,
      error,
    } = await supabase.storage
      .from("waste-evidence")
      .createSignedUrl(
        photoPath,
        60 * 10,
      );

    if (error) {
      setErrorMessage(
        error.message,
      );

      setLoading(false);
      return;
    }

    setPhotoUrl(
      data.signedUrl,
    );

    setOpen(true);
    setLoading(false);
  }

  if (!photoPath) {
    return (
      <div className="mt-2">
        <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
          ⚠ Belum Ada Foto
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="mt-2">
        <div className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
          ✓ Bukti Kebersihan
        </div>

        {photoAt && (
          <p className="mt-1 text-[11px] text-slate-400">
            {formatPhotoTime(
              photoAt,
            )} WIB
          </p>
        )}

        <button
          type="button"
          onClick={() =>
            void openPhoto()
          }
          disabled={loading}
          className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading
            ? "Membuka..."
            : "📷 Lihat Foto"}
        </button>

        {errorMessage && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {errorMessage}
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-white">
                <p className="font-black">
                  Bukti Kebersihan Area Limbah
                </p>

                {photoAt && (
                  <p className="text-sm text-slate-300">
                    {formatPhotoTime(
                      photoAt,
                    )} WIB
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
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
              className="max-h-[80vh] w-full rounded-2xl bg-white object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
