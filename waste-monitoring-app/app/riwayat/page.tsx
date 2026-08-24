"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import CleanlinessEvidence from "@/components/CleanlinessEvidence";


type WasteRecord = {
  id: string;
  record_date: string;
  cutting_kg: number;
  plastic_kg: number;
  paper_kg: number;
  carton_kg: number;
  pedding_kg: number;
  wet_waste_kg: number;
  total_kg: number;
  pic_name: string | null;
  notes: string | null;
  photo_path: string | null;
  cleanliness_photo_at: string | null;
};

type EditForm = {
  record_date: string;
  cutting_kg: string;
  plastic_kg: string;
  paper_kg: string;
  carton_kg: string;
  pedding_kg: string;
  wet_waste_kg: string;
  pic_name: string;
  notes: string;
};

function currentMonth() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  return `${year}-${month}`;
}

function numberValue(value: string) {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

function formatKg(value: number) {
  return Number(value ?? 0).toLocaleString(
    "id-ID",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  );
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

export default function HistoryPage() {
  const [records, setRecords] =
    useState<WasteRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [monthFilter, setMonthFilter] =
    useState(currentMonth());

  const [search, setSearch] =
    useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editForm, setEditForm] =
    useState<EditForm | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } =
      await supabase
        .from("waste_daily")
        .select("*")
        .order("record_date", {
          ascending: false,
        });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setRecords(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRecords =
    useMemo(() => {
      return records.filter((item) => {
        const matchMonth =
          !monthFilter ||
          item.record_date.startsWith(
            monthFilter,
          );

        const keyword =
          search.trim().toLowerCase();

        const matchSearch =
          !keyword ||
          item.record_date
            .toLowerCase()
            .includes(keyword) ||
          (item.pic_name ?? "")
            .toLowerCase()
            .includes(keyword) ||
          (item.notes ?? "")
            .toLowerCase()
            .includes(keyword);

        return matchMonth && matchSearch;
      });
    }, [
      records,
      monthFilter,
      search,
    ]);

  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (result, item) => {
        result.total += Number(
          item.total_kg ?? 0,
        );

        result.cutting += Number(
          item.cutting_kg ?? 0,
        );

        result.plastic += Number(
          item.plastic_kg ?? 0,
        );

        result.paper += Number(
          item.paper_kg ?? 0,
        );

        result.carton += Number(
          item.carton_kg ?? 0,
        );

        result.pedding += Number(
          item.pedding_kg ?? 0,
        );

        result.wet += Number(
          item.wet_waste_kg ?? 0,
        );

        return result;
      },
      {
        total: 0,
        cutting: 0,
        plastic: 0,
        paper: 0,
        carton: 0,
        pedding: 0,
        wet: 0,
      },
    );
  }, [filteredRecords]);

  function startEdit(
    item: WasteRecord,
  ) {
    setMessage("");
    setErrorMessage("");

    setEditingId(item.id);

    setEditForm({
      record_date: item.record_date,
      cutting_kg: String(
        item.cutting_kg ?? 0,
      ),
      plastic_kg: String(
        item.plastic_kg ?? 0,
      ),
      paper_kg: String(
        item.paper_kg ?? 0,
      ),
      carton_kg: String(
        item.carton_kg ?? 0,
      ),
      pedding_kg: String(
        item.pedding_kg ?? 0,
      ),
      wet_waste_kg: String(
        item.wet_waste_kg ?? 0,
      ),
      pic_name:
        item.pic_name ?? "",
      notes:
        item.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !editingId ||
      !editForm
    ) {
      return;
    }

    if (
      !editForm.pic_name.trim()
    ) {
      setErrorMessage(
        "Nama PIC wajib diisi.",
      );

      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } =
      await supabase
        .from("waste_daily")
        .update({
          record_date:
            editForm.record_date,

          cutting_kg:
            numberValue(
              editForm.cutting_kg,
            ),

          plastic_kg:
            numberValue(
              editForm.plastic_kg,
            ),

          paper_kg:
            numberValue(
              editForm.paper_kg,
            ),

          carton_kg:
            numberValue(
              editForm.carton_kg,
            ),

          pedding_kg:
            numberValue(
              editForm.pedding_kg,
            ),

          wet_waste_kg:
            numberValue(
              editForm.wet_waste_kg,
            ),

          pic_name:
            editForm.pic_name.trim(),

          notes:
            editForm.notes.trim() ||
            null,
        })
        .eq(
          "id",
          editingId,
        );

    if (error) {
      if (error.code === "23505") {
        setErrorMessage(
          "Tanggal tersebut sudah memiliki data.",
        );
      } else {
        setErrorMessage(
          error.message,
        );
      }

      setSaving(false);
      return;
    }

    setMessage(
      "Data berhasil diperbarui.",
    );

    setEditingId(null);
    setEditForm(null);

    await loadData();

    setSaving(false);
  }

  async function deleteRecord(
    item: WasteRecord,
  ) {
    const confirmed =
      window.confirm(
        `Hapus data limbah tanggal ${formatDate(
          item.record_date,
        )}?`,
      );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    const { error } =
      await supabase
        .from("waste_daily")
        .delete()
        .eq(
          "id",
          item.id,
        );

    if (error) {
      setErrorMessage(
        error.message,
      );

      return;
    }

    setMessage(
      "Data berhasil dihapus.",
    );

    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              PT.DREAMWEAR
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Riwayat Limbah
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Data pencatatan limbah harian
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/input-limbah"
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
            >
              + Input Limbah
            </Link>

            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <section className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Jumlah Pencatatan
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {filteredRecords.length}
            </p>

            <p className="text-sm text-slate-400">
              Hari
            </p>
          </div>

          <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
            <p className="text-sm text-blue-100">
              Total Limbah
            </p>

            <p className="mt-2 text-3xl font-black">
              {formatKg(
                summary.total,
              )}
            </p>

            <p className="text-sm text-blue-100">
              KG
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Bahan Cutting
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {formatKg(
                summary.cutting,
              )}{" "}
              KG
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Limbah Basah / Umum
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {formatKg(
                summary.wet,
              )}{" "}
              KG
            </p>
          </div>
        </section>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Filter Bulan
              </label>

              <input
                type="month"
                value={monthFilter}
                onChange={(event) =>
                  setMonthFilter(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Cari
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="PIC / tanggal / keterangan..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setMonthFilter("");
                  setSearch("");
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-700"
              >
                Tampilkan Semua
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-700">
            ✓ {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-600">
            {errorMessage}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-bold text-slate-900">
              Data Limbah
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Mengambil data...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Belum ada data untuk filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1150px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-4 text-left">
                      Tanggal
                    </th>

                    <th className="p-4 text-right">
                      Cutting
                    </th>

                    <th className="p-4 text-right">
                      Plastik
                    </th>

                    <th className="p-4 text-right">
                      Paper
                    </th>

                    <th className="p-4 text-right">
                      Karton
                    </th>

                    <th className="p-4 text-right">
                      Pedding
                    </th>

                    <th className="p-4 text-right">
                      Basah/Umum
                    </th>

                    <th className="p-4 text-right">
                      Total
                    </th>

                    <th className="p-4 text-left">
                      PIC
                    </th>

                    <th className="p-4 text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100"
                      >
                        <td className="p-4 font-semibold">
                          {formatDate(
                            item.record_date,
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {formatKg(
                            item.cutting_kg,
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {formatKg(
                            item.plastic_kg,
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {formatKg(
                            item.paper_kg,
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {formatKg(
                            item.carton_kg,
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {formatKg(
                            item.pedding_kg,
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {formatKg(
                            item.wet_waste_kg,
                          )}
                        </td>

                        <td className="p-4 text-right font-black text-blue-700">
                          {formatKg(
                            item.total_kg,
                          )}{" "}
                          KG
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-slate-800">
                            {item.pic_name || "-"}
                          </p>

                          <CleanlinessEvidence
                            photoPath={item.photo_path}
                            photoAt={item.cleanliness_photo_at}
                          />
                        </td>

                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(
                                  item,
                                )
                              }
                              className="rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-600"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void deleteRecord(
                                  item,
                                )
                              }
                              className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-600"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {editingId && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={saveEdit}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-600">
                    Edit Data
                  </p>

                  <h2 className="text-2xl font-bold text-slate-900">
                    Pencatatan Limbah
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">
                    Tanggal
                  </label>

                  <input
                    type="date"
                    value={
                      editForm.record_date
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        record_date:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>

                {[
                  [
                    "Bahan Cutting",
                    "cutting_kg",
                  ],
                  [
                    "Plastik",
                    "plastic_kg",
                  ],
                  [
                    "Paper",
                    "paper_kg",
                  ],
                  [
                    "Karton",
                    "carton_kg",
                  ],
                  [
                    "Pedding",
                    "pedding_kg",
                  ],
                  [
                    "Limbah Basah / Umum",
                    "wet_waste_kg",
                  ],
                ].map(
                  ([label, field]) => (
                    <div key={field}>
                      <label className="mb-2 block text-sm font-semibold">
                        {label}
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            editForm[
                              field as keyof EditForm
                            ]
                          }
                          onChange={(
                            event,
                          ) =>
                            setEditForm({
                              ...editForm,
                              [field]:
                                event
                                  .target
                                  .value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12"
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          KG
                        </span>
                      </div>
                    </div>
                  ),
                )}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">
                    PIC
                  </label>

                  <input
                    type="text"
                    value={
                      editForm.pic_name
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        pic_name:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">
                    Keterangan
                  </label>

                  <textarea
                    rows={3}
                    value={
                      editForm.notes
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        notes:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
