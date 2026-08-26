"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { useTodayWorkStatus } from "@/components/useTodayWorkStatus";
import { supabase } from "@/lib/supabase";

type PicOption = {
  id: string;
  name: string;
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

function toNumber(
  value: string,
) {
  const result =
    Number(value);

  return Number.isFinite(
    result,
  )
    ? result
    : 0;
}

export default function InputWastePage() {

  const {
    loading:
      workLockLoading,

    errorMessage:
      workLockError,

    isWorkday:
      workLockIsWorkday,

    statusLabel:
      workLockStatusLabel,

    note:
      workLockNote,

    holiday:
      workLockHoliday,
  } =
    useTodayWorkStatus();

  const {
    userId,
    profile,
  } = useAuth();

  const [
    recordDate,
    setRecordDate,
  ] =
    useState(
      todayJakarta(),
    );

  const [cutting, setCutting] =
    useState("");

  const [plastic, setPlastic] =
    useState("");

  const [paper, setPaper] =
    useState("");

  const [carton, setCarton] =
    useState("");

  const [pedding, setPedding] =
    useState("");

  const [
    wetWaste,
    setWetWaste,
  ] = useState("");

  const [
    picName,
    setPicName,
  ] =
    useState(
      profile.role === "PIC"
        ? profile.name
        : "",
    );

  const [
    picOptions,
    setPicOptions,
  ] =
    useState<PicOption[]>(
      [],
    );

  const [notes, setNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    if (
      profile.role ===
      "PIC"
    ) {
      setPicName(
        profile.name,
      );

      return;
    }

    async function loadPics() {
      const {
        data,
        error,
      } = await supabase
        .from("waste_pics")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (!error) {
        setPicOptions(
          data ?? [],
        );
      }
    }

    void loadPics();
  }, [
    profile.role,
    profile.name,
  ]);

  const total =
    useMemo(() => {
      return (
        toNumber(
          cutting,
        ) +
        toNumber(
          plastic,
        ) +
        toNumber(
          paper,
        ) +
        toNumber(
          carton,
        ) +
        toNumber(
          pedding,
        ) +
        toNumber(
          wetWaste,
        )
      );
    }, [
      cutting,
      plastic,
      paper,
      carton,
      pedding,
      wetWaste,
    ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setSuccess("");
    setErrorMessage("");

    if (!picName) {
      setErrorMessage(
        "PIC wajib diisi.",
      );

      setSaving(false);
      return;
    }

    if (total <= 0) {
      setErrorMessage(
        "Isi minimal satu jenis limbah.",
      );

      setSaving(false);
      return;
    }

    const {
      error,
    } = await supabase
      .from("waste_daily")
      .insert({
        record_date:
          recordDate,

        cutting_kg:
          toNumber(
            cutting,
          ),

        plastic_kg:
          toNumber(
            plastic,
          ),

        paper_kg:
          toNumber(
            paper,
          ),

        carton_kg:
          toNumber(
            carton,
          ),

        pedding_kg:
          toNumber(
            pedding,
          ),

        wet_waste_kg:
          toNumber(
            wetWaste,
          ),

        pic_name:
          picName,

        notes:
          notes.trim() ||
          null,

        created_by:
          userId,

        updated_by:
          userId,
      });

    if (error) {
      if (
        error.code ===
        "23505"
      ) {
        setErrorMessage(
          "Data limbah hari ini sudah ada.",
        );
      } else {
        setErrorMessage(
          error.message,
        );
      }

      setSaving(false);
      return;
    }

    setSuccess(
      "Data limbah berhasil disimpan.",
    );

    setCutting("");
    setPlastic("");
    setPaper("");
    setCarton("");
    setPedding("");
    setWetWaste("");
    setNotes("");

    setSaving(false);
  }

  const inputs = [
    {
      label:
        "Bahan Cutting",
      value:
        cutting,
      setter:
        setCutting,
    },
    {
      label:
        "Plastik",
      value:
        plastic,
      setter:
        setPlastic,
    },
    {
      label:
        "Paper",
      value:
        paper,
      setter:
        setPaper,
    },
    {
      label:
        "Karton",
      value:
        carton,
      setter:
        setCarton,
    },
    {
      label:
        "Pedding",
      value:
        pedding,
      setter:
        setPedding,
    },
    {
      label:
        "Limbah Basah / Umum",
      value:
        wetWaste,
      setter:
        setWetWaste,
    },
  ];


  // PIC_WORKDAY_LOCK_INPUT_LIMBAH

  if (
    profile.role === "PIC" &&
    workLockLoading
  ) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
            ◌
          </div>

          <p className="mt-4 font-black text-slate-800">
            Memeriksa Jadwal Kerja...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Sistem sedang memeriksa status operasional hari ini.
          </p>

        </div>
      </main>
    );
  }


  if (
    profile.role === "PIC" &&
    workLockError
  ) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
            !
          </div>

          <h1 className="mt-4 text-xl font-black text-slate-900">
            Jadwal Tidak Dapat Diverifikasi
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {workLockError}
          </p>

          <p className="mt-4 text-sm text-slate-500">
            Untuk keamanan data, akses PIC sementara dinonaktifkan.
          </p>

        </div>
      </main>
    );
  }


  if (
    profile.role === "PIC" &&
    !workLockIsWorkday
  ) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">

        <div className="mx-auto max-w-2xl">

          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              ○
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Status Operasional
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              {workLockStatusLabel}
            </h1>

            {workLockHoliday && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                <p className="text-xs font-black uppercase text-red-600">
                  🔴 Libur Nasional
                </p>

                <p className="mt-1 text-sm font-black text-red-700">
                  {workLockHoliday.holiday_name}
                </p>

              </div>
            )}

            {workLockNote && (
              <p className="mt-4 text-sm font-semibold text-slate-600">
                {workLockNote}
              </p>
            )}

            <div className="mt-6 rounded-2xl bg-blue-50 p-5">

              <p className="font-black text-blue-700">
                Akses PIC Dinonaktifkan
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Input limbah dinonaktifkan pada hari libur.
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Status mengikuti Kalender Kerja PT.DREAMWEAR.
              </p>

            </div>

          </div>

        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">
          PT.DREAMWEAR
        </p>

        <h1 className="mt-1 text-3xl font-black">
          Input Limbah Harian
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Pencatatan rutin limbah dalam KG.
        </p>

        {profile.role === "PIC" && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="font-black text-blue-700">
              Pencatatan PIC
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Pastikan data sudah benar sebelum disimpan.
              Setelah tersimpan, perubahan data limbah hanya dapat dilakukan oleh ADMIN.
            </p>
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-6 space-y-5"
        >
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-bold">
              Tanggal
            </label>

            {profile.role === "PIC" ? (
              <>
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="font-black text-slate-900">
                    {recordDate}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-blue-600">
                    🔒 PIC hanya dapat menginput data untuk hari ini.
                  </p>
                </div>
              </>
            ) : (
              <input
                type="date"
                value={recordDate}
                onChange={(event) =>
                  setRecordDate(
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black">
              Berat Limbah
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {inputs.map(
                (item) => (
                  <div
                    key={
                      item.label
                    }
                  >
                    <label className="mb-2 block text-sm font-bold">
                      {
                        item.label
                      }
                    </label>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0"
                        value={
                          item.value
                        }
                        onChange={(
                          event,
                        ) =>
                          item.setter(
                            event
                              .target
                              .value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-14 text-lg font-bold"
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600">
                        KG
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
            <p className="text-sm text-blue-100">
              Total Limbah
            </p>

            <p className="mt-1 text-4xl font-black">
              {total.toLocaleString(
                "id-ID",
                {
                  maximumFractionDigits:
                    2,
                },
              )}{" "}
              <span className="text-lg">
                KG
              </span>
            </p>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-bold">
              PIC
            </label>

            {profile.role ===
            "PIC" ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-black text-blue-700">
                {
                  profile.name
                }
              </div>
            ) : (
              <select
                value={
                  picName
                }
                onChange={(
                  event,
                ) =>
                  setPicName(
                    event.target
                      .value,
                  )
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">
                  -- Pilih PIC --
                </option>

                {picOptions.map(
                  (pic) => (
                    <option
                      key={
                        pic.id
                      }
                      value={
                        pic.name
                      }
                    >
                      {
                        pic.name
                      }
                    </option>
                  ),
                )}
              </select>
            )}

            <label className="mb-2 mt-5 block text-sm font-bold">
              Keterangan
            </label>

            <textarea
              value={
                notes
              }
              onChange={(
                event,
              ) =>
                setNotes(
                  event.target
                    .value,
                )
              }
              rows={3}
              placeholder="Opsional..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3"
            />
          </section>

          {success && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-700">
              ✓ {success}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-600">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving
            }
            className="w-full rounded-2xl bg-slate-900 px-6 py-4 text-lg font-black text-white disabled:opacity-100"
          >
            {saving
              ? "Menyimpan..."
              : "Simpan Data Limbah"}
          </button>
        </form>
      </div>
    </main>
  );
}
