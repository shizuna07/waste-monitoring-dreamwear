"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { addPhotoWatermark } from "@/lib/addPhotoWatermark";

import {
  compressImage,
  formatFileSize,
} from "@/lib/compressImage";
import { supabase } from "@/lib/supabase";

type TodayRecord = {
  id: string;
  record_date: string;
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
  ).format(
    new Date(),
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

export default function CleanlinessPage() {
  const {
    userId,
    profile,
  } = useAuth();

  const [
    record,
    setRecord,
  ] =
    useState<TodayRecord | null>(
      null,
    );

  const [photo, setPhoto] =
    useState<File | null>(
      null,
    );

  const [preview, setPreview] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

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
          record_date,
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
    void loadToday();
  }, [loadToday]);

  function choosePhoto(
    file: File | null,
  ) {
    if (preview) {
      URL.revokeObjectURL(
        preview,
      );
    }

    if (!file) {
      setPhoto(null);
      setPreview("");
      return;
    }

    if (
      !file.type.startsWith(
        "image/",
      )
    ) {
      setErrorMessage(
        "File harus berupa foto.",
      );

      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setErrorMessage(
        "Ukuran maksimal foto 10 MB.",
      );

      return;
    }

    setPhoto(file);

    setPreview(
      URL.createObjectURL(
        file,
      ),
    );

    setErrorMessage("");
  }

  async function submitPhoto() {
    if (!record) {
      setErrorMessage(
        "Belum ada data limbah hari ini.",
      );

      return;
    }

    if (!photo) {
      setErrorMessage(
        "Ambil foto terlebih dahulu.",
      );

      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    let newPath = "";

    try {
      const extension =
        photo.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      newPath =
        `${userId}/${record.record_date}/${crypto.randomUUID()}.${extension}`;
      setMessage(
        "Mengompres foto..."
      );

      const compression =
        await compressImage(
          photo,
        );

      const uploadFile =
        compression.file;

      console.log(
        "Ukuran foto:",
        formatFileSize(
          compression.originalSize,
        ),
        "→",
        formatFileSize(
          compression.compressedSize,
        ),
      );

      setMessage(
        "Menambahkan watermark..."
      );

      const watermarkedFile =
        await addPhotoWatermark(
          uploadFile,
          {
            picName:
              profile.name,

            recordDate:
              record.record_date,
          },
        );

const {
        error:
          uploadError,
      } =
await supabase.storage
          .from(
            "waste-evidence",
          )
          .upload(
            newPath,
            watermarkedFile,
            {
              cacheControl:
                "3600",
              upsert: false,
            },
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        error:
          updateError,
      } = await supabase
        .from("waste_daily")
        .update({
          photo_path:
            newPath,

          cleanliness_photo_at:
            new Date()
              .toISOString(),

          cleanliness_uploaded_by:
            userId,

          updated_by:
            userId,
        })
        .eq(
          "id",
          record.id,
        );

      if (updateError) {
        await supabase.storage
          .from(
            "waste-evidence",
          )
          .remove([
            newPath,
          ]);

        throw updateError;
      }

      if (
        record.photo_path &&
        record.photo_path !==
          newPath
      ) {
        await supabase.storage
          .from(
            "waste-evidence",
          )
          .remove([
            record.photo_path,
          ]);
      }

      setMessage(
        "Bukti kebersihan berhasil dikirim.",
      );

      setPhoto(null);
      setPreview("");

      await loadToday();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengirim foto.",
      );
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">
          PT.DREAMWEAR
        </p>

        <h1 className="mt-1 text-3xl font-black">
          Kebersihan Area Limbah
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          PIC:{" "}
          <span className="font-bold">
            {
              profile.name
            }
          </span>
        </p>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
            Mengecek data hari ini...
          </div>
        ) : !record ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-black text-amber-700">
              ⚠ Belum Ada Pencatatan Limbah
            </p>

            <p className="mt-2 text-sm text-slate-600">
              Input limbah hari ini terlebih dahulu.
            </p>
          </div>
        ) : (
          <>
            <section
              className={[
                "mt-6 rounded-2xl border-2 p-5",
                record.photo_path
                  ? "border-blue-200 bg-blue-50"
                  : "border-red-200 bg-red-50",
              ].join(" ")}
            >
              {record.photo_path ? (
                <>
                  <p className="font-black text-blue-700">
                    ✓ Bukti Kebersihan Sudah Masuk
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Terakhir diperbarui pukul{" "}
                    <span className="font-black">
                      {formatTime(
                        record.cleanliness_photo_at,
                      )}{" "}
                      WIB
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-red-600">
                    ⚠ Belum Ada Bukti Kebersihan
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Ambil foto kondisi area limbah sebelum pulang.
                  </p>
                </>
              )}
            </section>

            <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 px-5 py-10 text-center">
                <span className="text-5xl">
                  📷
                </span>

                <span className="mt-3 text-lg font-black">
                  Ambil Foto Sekarang
                </span>

                <span className="mt-1 text-sm text-slate-500">
                  Foto kondisi terkini area limbah
                </span>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(
                    event,
                  ) =>
                    choosePhoto(
                      event.target
                        .files?.[0] ??
                        null,
                    )
                  }
                />
              </label>

              {preview && (
                <div className="mt-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      preview
                    }
                    alt="Preview kebersihan"
                    className="max-h-[450px] w-full rounded-2xl object-contain"
                  />
                </div>
              )}
            </section>

            {message && (
              <div className="mt-5 rounded-xl bg-blue-50 p-4 font-bold text-blue-700">
                ✓ {
                  message
                }
              </div>
            )}

            {errorMessage && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-600">
                {
                  errorMessage
                }
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                void submitPhoto()
              }
              disabled={
                saving ||
                !photo
              }
              className="mt-5 w-full rounded-2xl bg-blue-600 px-6 py-4 text-lg font-black text-white disabled:opacity-40"
            >
              {saving
                ? "Mengirim..."
                : record.photo_path
                  ? "Perbarui Bukti Kebersihan"
                  : "Kirim Bukti Kebersihan"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
