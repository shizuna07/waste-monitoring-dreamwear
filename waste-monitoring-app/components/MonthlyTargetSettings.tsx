"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

function currentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function numberValue(value: string) {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

export default function MonthlyTargetSettings() {
  const [month, setMonth] =
    useState(currentMonth());

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

  const [wetWaste, setWetWaste] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadTarget = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } =
      await supabase
        .from("waste_monthly_targets")
        .select("*")
        .eq("month_key", month)
        .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setCutting("");
      setPlastic("");
      setPaper("");
      setCarton("");
      setPedding("");
      setWetWaste("");
    } else {
      setCutting(
        String(data.cutting_target ?? 0),
      );

      setPlastic(
        String(data.plastic_target ?? 0),
      );

      setPaper(
        String(data.paper_target ?? 0),
      );

      setCarton(
        String(data.carton_target ?? 0),
      );

      setPedding(
        String(data.pedding_target ?? 0),
      );

      setWetWaste(
        String(data.wet_waste_target ?? 0),
      );
    }

    setLoading(false);
  }, [month]);

  useEffect(() => {
    void loadTarget();
  }, [loadTarget]);

  async function saveTarget(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } =
      await supabase
        .from("waste_monthly_targets")
        .upsert(
          {
            month_key: month,

            cutting_target:
              numberValue(cutting),

            plastic_target:
              numberValue(plastic),

            paper_target:
              numberValue(paper),

            carton_target:
              numberValue(carton),

            pedding_target:
              numberValue(pedding),

            wet_waste_target:
              numberValue(wetWaste),

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "month_key",
          },
        );

    if (error) {
      setErrorMessage(error.message);
    } else {
      setMessage(
        "Batas limbah bulanan berhasil disimpan.",
      );
    }

    setSaving(false);
  }

  const inputs = [
    {
      label: "Bahan Cutting",
      value: cutting,
      setter: setCutting,
    },
    {
      label: "Plastik",
      value: plastic,
      setter: setPlastic,
    },
    {
      label: "Paper",
      value: paper,
      setter: setPaper,
    },
    {
      label: "Karton",
      value: carton,
      setter: setCarton,
    },
    {
      label: "Pedding",
      value: pedding,
      setter: setPedding,
    },
    {
      label: "Limbah Basah / Umum",
      value: wetWaste,
      setter: setWetWaste,
    },
  ];

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">
          Monitoring
        </p>

        <h2 className="mt-1 text-xl font-black text-slate-900">
          Batas Limbah Bulanan
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Atur batas maksimal masing-masing jenis limbah dalam KG.
        </p>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-bold text-slate-700">
          Bulan
        </label>

        <input
          type="month"
          value={month}
          onChange={(event) =>
            setMonth(event.target.value)
          }
          className="w-full rounded-xl border border-slate-300 px-4 py-3 sm:max-w-xs"
        />
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">
          Mengambil target...
        </p>
      ) : (
        <form
          onSubmit={saveTarget}
          className="mt-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {inputs.map((item) => (
              <div key={item.label}>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  {item.label}
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.value}
                    onChange={(event) =>
                      item.setter(
                        event.target.value,
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-14 font-bold"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    KG
                  </span>
                </div>
              </div>
            ))}
          </div>

          {message && (
            <div className="mt-5 rounded-xl bg-blue-50 p-4 font-bold text-blue-700">
              ✓ {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-600">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-black text-white disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : "Simpan Batas Bulanan"}
          </button>
        </form>
      )}
    </section>
  );
}
