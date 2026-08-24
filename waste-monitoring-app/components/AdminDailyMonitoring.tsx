"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type WasteRecord = {
  id: string;
  record_date: string;
  total_kg: number | string;
  pic_name: string | null;

  created_at: string;
  updated_at: string;

  created_by: string | null;
  updated_by: string | null;

  photo_path: string | null;
  cleanliness_photo_at: string | null;
  cleanliness_uploaded_by: string | null;
};

type ProfileRow = {
  user_id: string;
  name: string;
};

function jakartaNow() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(
      new Date(),
    );

  const result: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !==
      "literal"
    ) {
      result[part.type] =
        part.value;
    }
  }

  return {
    date:
      `${result.year}-${result.month}-${result.day}`,

    hour:
      Number(result.hour),

    minute:
      Number(result.minute),
  };
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(
      `${value}T00:00:00+07:00`,
    ),
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
  ).format(
    new Date(value),
  );
}

function formatKg(
  value: number | string,
) {
  return Number(
    value ?? 0,
  ).toLocaleString(
    "id-ID",
    {
      maximumFractionDigits: 2,
    },
  );
}

export default function AdminDailyMonitoring() {
  const {
    profile,
  } = useAuth();

  const [
    record,
    setRecord,
  ] =
    useState<WasteRecord | null>(
      null,
    );

  const [
    userNames,
    setUserNames,
  ] =
    useState<Record<string, string>>(
      {},
    );

  const [
    current,
    setCurrent,
  ] =
    useState(
      jakartaNow(),
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    photoUrl,
    setPhotoUrl,
  ] =
    useState("");

  const [
    photoOpen,
    setPhotoOpen,
  ] =
    useState(false);

  const loadData =
    useCallback(async () => {
      if (
        profile.role !==
        "ADMIN"
      ) {
        return;
      }

      const now =
        jakartaNow();

      setCurrent(now);
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from("waste_daily")
        .select(`
          id,
          record_date,
          total_kg,
          pic_name,
          created_at,
          updated_at,
          created_by,
          updated_by,
          photo_path,
          cleanliness_photo_at,
          cleanliness_uploaded_by
        `)
        .eq(
          "record_date",
          now.date,
        )
        .maybeSingle();

      if (error) {
        setErrorMessage(
          error.message,
        );

        setLoading(false);
        return;
      }

      if (!data) {
        setRecord(null);
        setUserNames({});
        setLoading(false);
        return;
      }

      const waste =
        data as WasteRecord;

      setRecord(waste);

      const ids =
        Array.from(
          new Set(
            [
              waste.created_by,
              waste.updated_by,
              waste.cleanliness_uploaded_by,
            ].filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
          ),
        );

      if (
        ids.length === 0
      ) {
        setUserNames({});
        setLoading(false);
        return;
      }

      const {
        data: profiles,
        error:
          profilesError,
      } = await supabase
        .from("user_profiles")
        .select(
          "user_id, name",
        )
        .in(
          "user_id",
          ids,
        );

      if (!profilesError) {
        const mapping: Record<
          string,
          string
        > = {};

        (
          (profiles ??
            []) as ProfileRow[]
        ).forEach(
          (item) => {
            mapping[
              item.user_id
            ] =
              item.name;
          },
        );

        setUserNames(
          mapping,
        );
      }

      setLoading(false);
    }, [profile.role]);

  useEffect(() => {
    void loadData();

    const timer =
      window.setInterval(
        () => {
          void loadData();
        },
        30000,
      );

    const handleFocus =
      () => {
        void loadData();
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
  }, [loadData]);

  const minutesNow =
    current.hour * 60 +
    current.minute;

  const reminderActive =
    minutesNow >=
    16 * 60;

  const inputDone =
    Boolean(record);

  const photoDone =
    Boolean(
      record?.photo_path,
    );

  const inputBy =
    record?.created_by
      ? userNames[
          record.created_by
        ] ??
        record.pic_name ??
        "-"
      : record?.pic_name ??
        "-";

  const photoBy =
    record
      ?.cleanliness_uploaded_by
      ? userNames[
          record
            .cleanliness_uploaded_by
        ] ??
        record.pic_name ??
        "-"
      : record?.pic_name ??
        "-";

  const updatedBy =
    record?.updated_by
      ? userNames[
          record.updated_by
        ] ??
        "-"
      : "-";

  let statusLabel =
    "PROSES";

  let statusClass =
    "bg-amber-100 text-amber-700";

  let statusIcon =
    "◷";

  if (!inputDone) {
    statusLabel =
      "BELUM INPUT";

    statusClass =
      "bg-red-100 text-red-700";

    statusIcon =
      "!";
  } else if (photoDone) {
    statusLabel =
      "LENGKAP";

    statusClass =
      "bg-blue-100 text-blue-700";

    statusIcon =
      "✓";
  } else if (
    reminderActive
  ) {
    statusLabel =
      "BELUM LENGKAP";

    statusClass =
      "bg-red-100 text-red-700";

    statusIcon =
      "!";
  }

  async function openPhoto() {
    if (
      !record?.photo_path
    ) {
      return;
    }

    setErrorMessage("");

    const {
      data,
      error,
    } =
      await supabase.storage
        .from(
          "waste-evidence",
        )
        .createSignedUrl(
          record.photo_path,
          600,
        );

    if (error) {
      setErrorMessage(
        error.message,
      );

      return;
    }

    setPhotoUrl(
      data.signedUrl,
    );

    setPhotoOpen(
      true,
    );
  }

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <>
      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Admin Monitoring
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Monitoring PIC Hari Ini
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatDate(
                current.date,
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            ↻ Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            ⚠ {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            Mengecek aktivitas PIC...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">

            {/* ==============================
                INPUT LIMBAH
            ============================== */}

            <div
              className={[
                "rounded-2xl border-2 p-5 shadow-sm",
                inputDone
                  ? "border-blue-200 bg-white"
                  : "border-red-200 bg-red-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Pencatatan Limbah
                  </p>

                  <h3 className="mt-2 text-xl font-black text-slate-900">
                    {inputDone
                      ? "Sudah Diisi"
                      : "Belum Diisi"}
                  </h3>
                </div>

                <div
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-xl text-xl font-black",
                    inputDone
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-600",
                  ].join(" ")}
                >
                  {inputDone
                    ? "✓"
                    : "!"}
                </div>
              </div>

              {record ? (
                <div className="mt-6 space-y-3 text-sm">

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      PIC
                    </span>

                    <span className="text-right font-black text-slate-900">
                      {record.pic_name ??
                        "-"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Input Oleh
                    </span>

                    <span className="text-right font-black text-slate-900">
                      {inputBy}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Jam Input
                    </span>

                    <span className="text-right font-black text-slate-900">
                      {formatTime(
                        record.created_at,
                      )}{" "}
                      WIB
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold text-slate-400">
                      TOTAL HARI INI
                    </p>

                    <p className="mt-1 text-3xl font-black text-blue-700">
                      {formatKg(
                        record.total_kg,
                      )}{" "}
                      <span className="text-base">
                        KG
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl bg-red-100 p-4 text-sm font-bold text-red-700">
                  Belum ada pencatatan limbah hari ini.
                </div>
              )}
            </div>


            {/* ==============================
                KEBERSIHAN
            ============================== */}

            <div
              className={[
                "rounded-2xl border-2 p-5 shadow-sm",
                photoDone
                  ? "border-blue-200 bg-white"
                  : reminderActive
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Kebersihan Area
                  </p>

                  <h3 className="mt-2 text-xl font-black text-slate-900">
                    {photoDone
                      ? "Foto Sudah Masuk"
                      : reminderActive
                        ? "Foto Belum Masuk"
                        : "Menunggu Jadwal"}
                  </h3>
                </div>

                <div
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-xl text-xl",
                    photoDone
                      ? "bg-blue-100"
                      : reminderActive
                        ? "bg-red-100"
                        : "bg-amber-100",
                  ].join(" ")}
                >
                  📷
                </div>
              </div>

              {photoDone &&
              record ? (
                <div className="mt-6 space-y-3 text-sm">

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Dikirim Oleh
                    </span>

                    <span className="text-right font-black text-slate-900">
                      {photoBy}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Jam Foto
                    </span>

                    <span className="text-right font-black text-slate-900">
                      {formatTime(
                        record.cleanliness_photo_at,
                      )}{" "}
                      WIB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void openPhoto()
                    }
                    className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white transition hover:bg-blue-700"
                  >
                    📷 Lihat Bukti Foto
                  </button>
                </div>
              ) : reminderActive ? (
                <div className="mt-6 rounded-xl bg-red-100 p-4">
                  <p className="font-black text-red-700">
                    ⚠ Belum Lengkap
                  </p>

                  <p className="mt-1 text-sm text-red-600">
                    Bukti kebersihan belum dikirim setelah pukul 16:00 WIB.
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-xl bg-amber-100 p-4">
                  <p className="font-black text-amber-700">
                    Belum Waktunya
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    Pengingat foto kebersihan aktif mulai pukul 16:00 WIB.
                  </p>
                </div>
              )}
            </div>


            {/* ==============================
                STATUS
            ============================== */}

            <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Status Hari Ini
                  </p>

                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-black ${statusClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl font-black">
                  {statusIcon}
                </div>
              </div>

              <div className="mt-6 space-y-4">

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span className="text-sm text-slate-400">
                    Input Limbah
                  </span>

                  <span
                    className={
                      inputDone
                        ? "font-black text-blue-300"
                        : "font-black text-red-300"
                    }
                  >
                    {inputDone
                      ? "SELESAI"
                      : "BELUM"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span className="text-sm text-slate-400">
                    Bukti Foto
                  </span>

                  <span
                    className={
                      photoDone
                        ? "font-black text-blue-300"
                        : "font-black text-red-300"
                    }
                  >
                    {photoDone
                      ? "SELESAI"
                      : "BELUM"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span className="text-sm text-slate-400">
                    PIC
                  </span>

                  <span className="font-black">
                    {record?.pic_name ??
                      "-"}
                  </span>
                </div>

                {record?.updated_by && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-slate-400">
                      Update Terakhir
                    </span>

                    <div className="text-right">
                      <p className="font-black">
                        {updatedBy}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatTime(
                          record.updated_at,
                        )}{" "}
                        WIB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {inputDone &&
                photoDone && (
                  <div className="mt-6 rounded-xl bg-blue-600 p-4 text-center">
                    <p className="font-black">
                      ✓ Tugas Hari Ini Lengkap
                    </p>

                    <p className="mt-1 text-xs text-blue-100">
                      Input limbah dan bukti kebersihan sudah selesai.
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}
      </section>


      {/* ==============================
          MODAL FOTO
      ============================== */}

      {photoOpen &&
        photoUrl && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
            onClick={() =>
              setPhotoOpen(
                false,
              )
            }
          >
            <div
              className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl"
              onClick={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div className="mb-4 flex items-center justify-between gap-4">

                <div>
                  <p className="font-black text-slate-900">
                    Bukti Kebersihan
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {record
                      ? formatDate(
                          record.record_date,
                        )
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPhotoOpen(
                      false,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black text-slate-700"
                >
                  ✕
                </button>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Bukti kebersihan area limbah"
                className="max-h-[75vh] w-full rounded-xl object-contain"
              />

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    PIC
                  </span>

                  <span className="font-black text-slate-900">
                    {record?.pic_name ??
                      "-"}
                  </span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-slate-500">
                    Waktu
                  </span>

                  <span className="font-black text-slate-900">
                    {formatTime(
                      record?.cleanliness_photo_at ??
                        null,
                    )}{" "}
                    WIB
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
