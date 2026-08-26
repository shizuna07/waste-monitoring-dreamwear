"use client";

import WorkCalendarGenerator from "@/components/WorkCalendarGenerator";

import WorkCalendarSettings from "@/components/WorkCalendarSettings";

import UserManagement from "@/components/UserManagement";


import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import MonthlyTargetSettings from "@/components/MonthlyTargetSettings";

type Pic = {
  id: string;
  name: string;
  active: boolean;
};

export default function SettingsPage() {
  const [pics, setPics] = useState<Pic[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadPics = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("waste_pics")
      .select("*")
      .order("name", {
        ascending: true,
      });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setPics(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPics();
  }, [loadPics]);

  async function addPic(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("waste_pics")
      .insert({
        name: cleanName,
      });

    if (error) {
      if (error.code === "23505") {
        setErrorMessage(
          "Nama PIC tersebut sudah ada.",
        );
      } else {
        setErrorMessage(error.message);
      }

      setSaving(false);
      return;
    }

    setName("");
    setMessage("PIC berhasil ditambahkan.");

    await loadPics();

    setSaving(false);
  }

  async function togglePic(pic: Pic) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("waste_pics")
      .update({
        active: !pic.active,
      })
      .eq("id", pic.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadPics();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            PT.DREAMWEAR
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Pengaturan
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Master data PIC Waste Monitoring
          </p>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">
            Tambah PIC
          </h2>

          <form
            onSubmit={addPic}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Nama PIC..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : "+ Tambah PIC"}
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-xl bg-blue-50 p-4 font-semibold text-blue-700">
              ✓ {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 font-semibold text-red-600">
              {errorMessage}
            </div>
          )}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-black text-slate-900">
              Daftar PIC
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Mengambil data...
            </div>
          ) : pics.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Belum ada PIC.
            </div>
          ) : (
            <div>
              {pics.map((pic) => (
                <div
                  key={pic.id}
                  className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {pic.name}
                    </p>

                    <p
                      className={
                        pic.active
                          ? "text-xs font-bold text-blue-600"
                          : "text-xs font-bold text-slate-400"
                      }
                    >
                      {pic.active
                        ? "Aktif"
                        : "Nonaktif"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void togglePic(pic)
                    }
                    className={
                      pic.active
                        ? "rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
                        : "rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600"
                    }
                  >
                    {pic.active
                      ? "Nonaktifkan"
                      : "Aktifkan"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <WorkCalendarGenerator />

        <MonthlyTargetSettings />
      </div>
    
      <UserManagement />

      <WorkCalendarSettings />
    </main>
  );
}
