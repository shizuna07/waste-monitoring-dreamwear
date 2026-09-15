"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TemuanBaruPage() {
  const router = useRouter();

  const [findingDate, setFindingDate] =
    useState(
      new Date().toISOString().split("T")[0]
    );

  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const [beforePhoto, setBeforePhoto] =
    useState<File | null>(null);

  const [beforePreview, setBeforePreview] =
    useState("");

  const [beforeTakenAt, setBeforeTakenAt] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // =========================================
  // FORMAT WAKTU
  // =========================================

  function formatDateTime(value: string) {
    if (!value) return "-";

    const date = new Date(value);

    return (
      date.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }) +
      " • " +
      date.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) +
      " WIB"
    );
  }

  // =========================================
  // FOTO BEFORE
  // =========================================

  function handleBeforePhoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setBeforePhoto(file);

    setBeforePreview(
      URL.createObjectURL(file)
    );

    // waktu saat foto dipilih / diambil
    setBeforeTakenAt(
      new Date().toISOString()
    );
  }

  // =========================================
  // UPLOAD BEFORE
  // =========================================

  async function uploadBeforePhoto() {
    if (!beforePhoto) {
      return null;
    }

    const extension =
      beforePhoto.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName =
      `before/${findingDate}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${extension}`;

    const { error } =
      await supabase.storage
        .from("safety-patrol")
        .upload(
          fileName,
          beforePhoto
        );

    if (error) {
      throw error;
    }

    const { data } =
      supabase.storage
        .from("safety-patrol")
        .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // =========================================
  // SIMPAN
  // =========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!findingDate) {
      setMessage("Tanggal wajib diisi.");
      return;
    }

    if (!area) {
      setMessage("Area wajib dipilih.");
      return;
    }

    if (!category) {
      setMessage("Kategori wajib dipilih.");
      return;
    }

    if (!description.trim()) {
      setMessage(
        "Keterangan temuan wajib diisi."
      );
      return;
    }

    if (!beforePhoto) {
      setMessage(
        "Foto BEFORE wajib diambil."
      );
      return;
    }

    try {
      setSaving(true);

      setMessage(
        "Menyimpan temuan..."
      );

      const beforeUrl =
        await uploadBeforePhoto();

      const { error } =
        await supabase
          .from("safety_patrol_monthly")
          .insert({
            finding_date: findingDate,

            area,

            category,

            description:
              description.trim(),

            notes:
              notes.trim() || null,

            photo_before_url:
              beforeUrl,

            photo_after_url:
              null,

            before_taken_at:
              beforeTakenAt ||
              new Date().toISOString(),

            after_taken_at:
              null,

            // kompatibilitas data lama
            photo_url:
              beforeUrl,
          });

      if (error) {
        throw error;
      }

      setMessage(
        "Temuan berhasil disimpan ✅"
      );

      setTimeout(() => {
        router.push(
          "/safety-patrol"
        );

        router.refresh();
      }, 700);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? `Gagal menyimpan: ${error.message}`
          : "Gagal menyimpan temuan."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">

        {/* HEADER */}

        <div className="mb-6">

          <Link
            href="/safety-patrol"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Kembali ke Safety Patrol
          </Link>

          <p className="mt-5 text-xs font-bold tracking-[0.2em] text-blue-600">
            PT. DREAMWEAR
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Catat Temuan
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Dokumentasi Safety Patrol
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl bg-white shadow-sm"
        >

          <div className="space-y-5 p-5 md:p-6">

            {/* TANGGAL */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tanggal Temuan *
              </label>

              <input
                type="date"
                value={findingDate}
                onChange={(e) =>
                  setFindingDate(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

            {/* AREA */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Area *
              </label>

              <select
                value={area}
                onChange={(e) =>
                  setArea(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >

                <option value="">
                  Pilih Area
                </option>

                <option value="Office">
                  Office
                </option>

                <option value="Sewing">
                  Sewing
                </option>

                <option value="Cutting">
                  Cutting
                </option>

                <option value="Packing">
                  Packing
                </option>

                <option value="Gudang">
                  Gudang
                </option>

                <option value="Boiler">
                  Boiler
                </option>

                <option value="Utility">
                  Utility
                </option>

                <option value="Chemical">
                  Chemical
                </option>

                <option value="Kantin">
                  Kantin
                </option>

                <option value="Area Luar">
                  Area Luar
                </option>

                <option value="Lainnya">
                  Lainnya
                </option>

              </select>

            </div>

            {/* CATEGORY */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Kategori Temuan *
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >

                <option value="">
                  Pilih Kategori
                </option>

                <option value="Jalur Evakuasi">
                  Jalur Evakuasi
                </option>

                <option value="Emergency Exit">
                  Emergency Exit
                </option>

                <option value="Blocking Area">
                  Blocking Area
                </option>

                <option value="Garis Kuning">
                  Garis Kuning
                </option>

                <option value="APAR">
                  APAR
                </option>

                <option value="Housekeeping">
                  Housekeeping
                </option>

                <option value="APD">
                  APD
                </option>

                <option value="Kelistrikan">
                  Kelistrikan
                </option>

                <option value="Mesin">
                  Mesin
                </option>

                <option value="Chemical">
                  Chemical
                </option>

                <option value="Rambu K3">
                  Rambu K3
                </option>

                <option value="Lainnya">
                  Lainnya
                </option>

              </select>

            </div>

            {/* DESCRIPTION */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Keterangan Temuan *
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Contoh: Karton menghalangi jalur evakuasi..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

            {/* BEFORE */}

            <div>

              <div className="mb-2 flex items-center justify-between">

                <label className="text-sm font-semibold text-slate-700">
                  Foto BEFORE *
                </label>

                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                  SEBELUM
                </span>

              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 p-7 text-center hover:border-red-400">

                <div className="text-4xl">
                  📷
                </div>

                <p className="mt-2 font-semibold text-slate-700">
                  Ambil Foto Temuan
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Dokumentasikan kondisi sebelum diperbaiki
                </p>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={
                    handleBeforePhoto
                  }
                  className="hidden"
                />

              </label>

              {beforePreview && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-red-200 bg-white p-3">

                  <div className="mb-3 flex items-center justify-between">

                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                      BEFORE
                    </span>

                    <span className="text-xs font-semibold text-slate-500">
                      {formatDateTime(
                        beforeTakenAt
                      )}
                    </span>

                  </div>

                  <img
                    src={
                      beforePreview
                    }
                    alt="Foto before"
                    className="max-h-[450px] w-full rounded-xl object-contain"
                  />

                </div>
              )}

            </div>

            {/* TINDAKAN */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tindakan / Perbaikan
                <span className="ml-1 font-normal text-slate-400">
                  (opsional)
                </span>
              </label>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Boleh dikosongkan jika belum diperbaiki..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-slate-400">
                Kalau belum ada tindakan, isi nanti saat upload foto AFTER.
              </p>

            </div>

            {/* INFO */}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

              <p className="text-sm font-semibold text-blue-800">
                ℹ️ Waktu dokumentasi tersimpan otomatis
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Foto BEFORE akan menyimpan tanggal dan jam saat foto dipilih atau diambil. Foto AFTER akan dicatat saat perbaikan didokumentasikan.
              </p>

            </div>

            {message && (
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                {message}
              </div>
            )}

            {/* BUTTON */}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

              <Link
                href="/safety-patrol"
                className="rounded-xl border border-slate-200 px-5 py-3 text-center font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Menyimpan..."
                  : "💾 Simpan Temuan"}
              </button>

            </div>

          </div>

        </form>

      </div>

    </main>
  );
}