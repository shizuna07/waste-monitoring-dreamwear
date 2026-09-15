"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ChangeEvent,
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
  notes: string | null;

  photo_url: string | null;
  photo_before_url: string | null;
  photo_after_url: string | null;

  before_taken_at: string | null;
  after_taken_at: string | null;

  created_at: string;
};

const AREAS = [
  "Office",
  "Sewing",
  "Cutting",
  "Packing",
  "Gudang",
  "Boiler",
  "Utility",
  "Chemical",
  "Kantin",
  "Area Luar",
  "Lainnya",
];

const CATEGORIES = [
  "Jalur Evakuasi",
  "Emergency Exit",
  "Blocking Area",
  "Garis Kuning",
  "APAR",
  "Housekeeping",
  "APD",
  "Kelistrikan",
  "Mesin",
  "Chemical",
  "Rambu K3",
  "Lainnya",
];

export default function DetailTemuanPage() {
  const router = useRouter();

  const [id, setId] = useState("");

  const [finding, setFinding] =
    useState<SafetyFinding | null>(null);

  // EDIT DATA
  const [findingDate, setFindingDate] =
    useState("");

  const [area, setArea] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [notes, setNotes] =
    useState("");

  // AFTER
  const [afterPhoto, setAfterPhoto] =
    useState<File | null>(null);

  const [afterPreview, setAfterPreview] =
    useState("");

  const [afterTakenAt, setAfterTakenAt] =
    useState("");

  // UI
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  // =====================================================
  // FORMAT WAKTU
  // =====================================================

  function formatDateTime(
    value: string | null
  ) {
    if (!value) {
      return "Belum tercatat";
    }

    const date =
      new Date(value);

    const tanggal =
      date.toLocaleDateString(
        "id-ID",
        {
          timeZone:
            "Asia/Jakarta",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );

    const jam =
      date.toLocaleTimeString(
        "id-ID",
        {
          timeZone:
            "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      );

    return `${tanggal} • ${jam} WIB`;
  }

  // =====================================================
  // AMBIL ID DARI URL
  // contoh:
  // /safety-patrol/detail?id=1
  // =====================================================

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const findingId =
      params.get("id");

    if (!findingId) {
      setMessage(
        "ID temuan tidak ditemukan."
      );

      setLoading(false);

      return;
    }

    setId(findingId);
  }, []);

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadFinding =
    useCallback(async () => {
      if (!id) return;

      try {
        setLoading(true);
        setMessage("");

        const { data, error } =
          await supabase
            .from(
              "safety_patrol_monthly"
            )
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
          throw error;
        }

        const item =
          data as SafetyFinding;

        setFinding(item);

        setFindingDate(
          item.finding_date
        );

        setArea(
          item.area
        );

        setCategory(
          item.category
        );

        setDescription(
          item.description
        );

        setNotes(
          item.notes || ""
        );
      } catch (error) {
        console.error(error);

        setFinding(null);

        setMessage(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data temuan."
        );
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    if (id) {
      loadFinding();
    }
  }, [id, loadFinding]);

  // =====================================================
  // PILIH FOTO AFTER BARU
  // =====================================================

  function handleAfterPhoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (afterPreview) {
      URL.revokeObjectURL(
        afterPreview
      );
    }

    setAfterPhoto(file);

    setAfterPreview(
      URL.createObjectURL(file)
    );

    setAfterTakenAt(
      new Date().toISOString()
    );
  }

  // =====================================================
  // UPLOAD AFTER
  // =====================================================

  async function uploadAfterPhoto() {
    if (!afterPhoto) {
      return (
        finding?.photo_after_url ||
        null
      );
    }

    const extension =
      afterPhoto.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const fileName =
      `after/${id}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${extension}`;

    const { error } =
      await supabase.storage
        .from("safety-patrol")
        .upload(
          fileName,
          afterPhoto
        );

    if (error) {
      throw error;
    }

    const { data } =
      supabase.storage
        .from("safety-patrol")
        .getPublicUrl(
          fileName
        );

    return data.publicUrl;
  }

  // =====================================================
  // AMBIL PATH STORAGE DARI PUBLIC URL
  // =====================================================

  function getStoragePath(
    url: string | null
  ) {
    if (!url) {
      return null;
    }

    const marker =
      "/storage/v1/object/public/safety-patrol/";

    const index =
      url.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      url.substring(
        index +
          marker.length
      )
    );
  }

  // =====================================================
  // SIMPAN SEMUA PERUBAHAN
  // =====================================================

  async function handleSave() {
    if (!finding || !id) {
      return;
    }

    if (!findingDate) {
      setMessage(
        "Tanggal temuan wajib diisi."
      );

      return;
    }

    if (!area) {
      setMessage(
        "Area wajib dipilih."
      );

      return;
    }

    if (!category) {
      setMessage(
        "Kategori wajib dipilih."
      );

      return;
    }

    if (!description.trim()) {
      setMessage(
        "Keterangan temuan wajib diisi."
      );

      return;
    }

    try {
      setSaving(true);

      setMessage(
        "Menyimpan perubahan..."
      );

      const oldAfterUrl =
        finding.photo_after_url;

      const afterUrl =
        await uploadAfterPhoto();

      const updateData: {
        finding_date: string;
        area: string;
        category: string;
        description: string;
        notes: string | null;
        photo_after_url: string | null;
        after_taken_at?: string;
      } = {
        finding_date:
          findingDate,

        area,

        category,

        description:
          description.trim(),

        notes:
          notes.trim() ||
          null,

        photo_after_url:
          afterUrl,
      };

      // Kalau upload AFTER baru,
      // waktu AFTER ikut diperbarui.
      if (afterPhoto) {
        updateData.after_taken_at =
          afterTakenAt ||
          new Date().toISOString();
      }

      const { error } =
        await supabase
          .from(
            "safety_patrol_monthly"
          )
          .update(
            updateData
          )
          .eq("id", id);

      if (error) {
        throw error;
      }

      // Kalau foto AFTER diganti,
      // hapus file AFTER lama.
      if (
        afterPhoto &&
        oldAfterUrl &&
        oldAfterUrl !== afterUrl
      ) {
        const oldPath =
          getStoragePath(
            oldAfterUrl
          );

        if (oldPath) {
          const {
            error:
              removeError,
          } =
            await supabase.storage
              .from(
                "safety-patrol"
              )
              .remove([
                oldPath,
              ]);

          if (removeError) {
            console.error(
              "Foto AFTER lama gagal dihapus:",
              removeError
            );
          }
        }
      }

      if (afterPreview) {
        URL.revokeObjectURL(
          afterPreview
        );
      }

      setAfterPhoto(null);
      setAfterPreview("");
      setAfterTakenAt("");

      setMessage(
        "Perubahan berhasil disimpan ✅"
      );

      await loadFinding();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? `Gagal menyimpan: ${error.message}`
          : "Gagal menyimpan perubahan."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // HAPUS TEMUAN
  // =====================================================

  async function handleDelete() {
    if (!finding || !id) {
      return;
    }

    const confirmed =
      window.confirm(
        "Yakin ingin menghapus temuan ini?\n\nData dan dokumentasi foto akan dihapus."
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      setMessage(
        "Menghapus temuan..."
      );

      // kumpulkan semua foto
      const urls = [
        finding.photo_before_url,
        finding.photo_after_url,

        // photo_url biasanya sama
        // dengan BEFORE untuk data lama
        finding.photo_url,
      ];

      const paths =
        urls
          .map(
            getStoragePath
          )
          .filter(
            (
              path
            ): path is string =>
              Boolean(path)
          );

      // hilangkan path duplicate
      const uniquePaths =
        Array.from(
          new Set(paths)
        );

      // Hapus foto dari Storage
      if (
        uniquePaths.length >
        0
      ) {
        const {
          error:
            storageError,
        } =
          await supabase.storage
            .from(
              "safety-patrol"
            )
            .remove(
              uniquePaths
            );

        if (storageError) {
          throw new Error(
            `Gagal menghapus foto: ${storageError.message}`
          );
        }
      }

      // Hapus data database
      const { error } =
        await supabase
          .from(
            "safety_patrol_monthly"
          )
          .delete()
          .eq("id", id);

      if (error) {
        throw error;
      }

      alert(
        "Temuan berhasil dihapus."
      );

      router.push(
        "/safety-patrol"
      );

      router.refresh();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? `Gagal menghapus: ${error.message}`
          : "Gagal menghapus temuan."
      );
    } finally {
      setDeleting(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-12 text-center shadow-sm">

          <div className="text-4xl">
            ⏳
          </div>

          <p className="mt-3 text-slate-500">
            Memuat data temuan...
          </p>

        </div>

      </main>
    );
  }

  // =====================================================
  // NOT FOUND
  // =====================================================

  if (!finding) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-12 text-center shadow-sm">

          <div className="text-5xl">
            ⚠️
          </div>

          <h2 className="mt-4 font-bold text-slate-800">
            Temuan tidak ditemukan
          </h2>

          {message && (
            <p className="mt-2 text-sm text-slate-500">
              {message}
            </p>
          )}

          <Link
            href="/safety-patrol"
            className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            ← Safety Patrol
          </Link>

        </div>

      </main>
    );
  }

  const beforePhoto =
    finding.photo_before_url ||
    finding.photo_url;

  const beforeTime =
    finding.before_taken_at ||
    finding.created_at;

  const afterTime =
    afterPreview
      ? afterTakenAt
      : finding.after_taken_at;

  const completed =
    Boolean(
      finding.photo_after_url
    );

  return (
    <main className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">

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

          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">

            <div>

              <h1 className="text-3xl font-bold text-slate-900">
                Lihat / Edit Temuan
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Temuan #{finding.id}
              </p>

            </div>

            {completed ? (
              <span className="rounded-full bg-green-100 px-4 py-2 text-xs font-bold text-green-700">
                ✅ SUDAH DIPERBAIKI
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700">
                ⏳ BELUM DIPERBAIKI
              </span>
            )}

          </div>

        </div>

        {/* =================================================
            EDIT INFORMASI
        ================================================= */}

        <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">

          <div className="mb-5">

            <h2 className="text-lg font-bold text-slate-900">
              Informasi Temuan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Data di bawah ini dapat diedit.
            </p>

          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* TANGGAL */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tanggal Temuan *
              </label>

              <input
                type="date"
                value={
                  findingDate
                }
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

                {AREAS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* CATEGORY */}

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Kategori *
              </label>

              <select
                value={
                  category
                }
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >

                {CATEGORIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Keterangan Temuan *
              </label>

              <textarea
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

          </div>

        </div>

        {/* =================================================
            BEFORE AFTER
        ================================================= */}

        <div className="mt-6 grid gap-5 md:grid-cols-2">

          {/* BEFORE */}

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

            <div className="border-b border-red-100 bg-red-50 px-5 py-4">

              <p className="text-xs font-bold text-red-600">
                BEFORE
              </p>

              <h2 className="mt-1 font-bold text-slate-900">
                Sebelum Perbaikan
              </h2>

            </div>

            <div className="p-4">

              {beforePhoto ? (
                <a
                  href={
                    beforePhoto
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={
                      beforePhoto
                    }
                    alt="Before"
                    className="h-[340px] w-full rounded-xl bg-slate-100 object-contain"
                  />
                </a>
              ) : (
                <div className="flex h-[340px] items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  Tidak ada foto BEFORE
                </div>
              )}

              <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">

                <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                  🕒 Waktu BEFORE
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatDateTime(
                    beforeTime
                  )}
                </p>

              </div>

            </div>

          </div>

          {/* AFTER */}

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

            <div className="border-b border-green-100 bg-green-50 px-5 py-4">

              <p className="text-xs font-bold text-green-600">
                AFTER
              </p>

              <h2 className="mt-1 font-bold text-slate-900">
                Setelah Perbaikan
              </h2>

            </div>

            <div className="p-4">

              {/* AFTER LAMA */}

              {finding.photo_after_url &&
                !afterPreview && (
                  <a
                    href={
                      finding.photo_after_url
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={
                        finding.photo_after_url
                      }
                      alt="After"
                      className="h-[340px] w-full rounded-xl bg-slate-100 object-contain"
                    />
                  </a>
                )}

              {/* AFTER BARU */}

              {afterPreview && (
                <img
                  src={
                    afterPreview
                  }
                  alt="After baru"
                  className="h-[340px] w-full rounded-xl bg-slate-100 object-contain"
                />
              )}

              {/* BELUM ADA */}

              {!finding.photo_after_url &&
                !afterPreview && (
                  <div className="flex h-[340px] flex-col items-center justify-center rounded-xl bg-slate-100 text-center">

                    <div className="text-5xl">
                      📷
                    </div>

                    <p className="mt-3 font-semibold text-slate-600">
                      Belum ada foto AFTER
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Dokumentasikan setelah perbaikan selesai
                    </p>

                  </div>
                )}

              {/* WAKTU AFTER */}

              {(finding.photo_after_url ||
                afterPreview) && (
                <div className="mt-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">

                  <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                    🕒 Waktu AFTER
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {formatDateTime(
                      afterTime
                    )}
                  </p>

                </div>
              )}

              {/* UPLOAD */}

              <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-green-200 bg-green-50 px-4 py-4 text-center hover:border-green-400">

                <div>

                  <p className="font-semibold text-green-700">
                    📸 Ambil / Ganti Foto AFTER
                  </p>

                  <p className="mt-1 text-xs text-green-600">
                    Tanggal dan jam akan tersimpan otomatis
                  </p>

                </div>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={
                    handleAfterPhoto
                  }
                  className="hidden"
                />

              </label>

            </div>

          </div>

        </div>

        {/* =================================================
            TINDAKAN
        ================================================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm md:p-6">

          <h2 className="text-lg font-bold text-slate-900">
            Tindakan / Perbaikan
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Isi atau edit tindakan yang sudah dilakukan.
          </p>

          <textarea
            value={notes}
            onChange={(e) =>
              setNotes(
                e.target.value
              )
            }
            rows={4}
            placeholder="Contoh: Barang dipindahkan dan area sudah dikosongkan..."
            className="mt-4 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
          />

          {message && (
            <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
              {message}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">

            <Link
              href="/safety-patrol"
              className="rounded-xl border border-slate-200 px-5 py-3 text-center font-semibold text-slate-600 hover:bg-slate-50"
            >
              ← Kembali
            </Link>

            <button
              type="button"
              onClick={
                handleSave
              }
              disabled={
                saving ||
                deleting
              }
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Menyimpan..."
                : "💾 Simpan Perubahan"}
            </button>

          </div>

        </div>

        {/* =================================================
            HAPUS
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm md:p-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="font-bold text-red-700">
                Hapus Temuan
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Data, foto BEFORE, dan foto AFTER akan dihapus permanen.
              </p>

            </div>

            <button
              type="button"
              onClick={
                handleDelete
              }
              disabled={
                deleting ||
                saving
              }
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting
                ? "Menghapus..."
                : "🗑 Hapus Temuan"}
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}