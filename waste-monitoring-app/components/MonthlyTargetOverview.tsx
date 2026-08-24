"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type Target = {
  cutting_target: number;
  plastic_target: number;
  paper_target: number;
  carton_target: number;
  pedding_target: number;
  wet_waste_target: number;
};

type Actual = {
  cutting: number;
  plastic: number;
  paper: number;
  carton: number;
  pedding: number;
  wet: number;
};

function currentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function formatKg(value: number) {
  return Number(value ?? 0).toLocaleString(
    "id-ID",
    {
      maximumFractionDigits: 2,
    },
  );
}

function getStatus(
  actual: number,
  target: number,
) {
  if (target <= 0) {
    return {
      label: "Belum Diatur",
      badge:
        "bg-slate-100 text-slate-600",
      bar: "bg-slate-300",
    };
  }

  const percentage =
    (actual / target) * 100;

  if (percentage > 100) {
    return {
      label: "Melebihi Batas",
      badge:
        "bg-red-100 text-red-700",
      bar: "bg-red-500",
    };
  }

  if (percentage >= 80) {
    return {
      label: "Mendekati Batas",
      badge:
        "bg-amber-100 text-amber-700",
      bar: "bg-amber-500",
    };
  }

  return {
    label: "Aman",
    badge:
      "bg-blue-100 text-blue-700",
    bar: "bg-blue-600",
  };
}

export default function MonthlyTargetOverview() {
  const [target, setTarget] =
    useState<Target | null>(null);

  const [actual, setActual] =
    useState<Actual>({
      cutting: 0,
      plastic: 0,
      paper: 0,
      carton: 0,
      pedding: 0,
      wet: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const loadData =
    useCallback(async () => {
      setLoading(true);

      const month =
        currentMonth();

      const [
        targetResult,
        wasteResult,
      ] = await Promise.all([
        supabase
          .from(
            "waste_monthly_targets",
          )
          .select("*")
          .eq(
            "month_key",
            month,
          )
          .maybeSingle(),

        supabase
          .from("waste_daily")
          .select(`
            cutting_kg,
            plastic_kg,
            paper_kg,
            carton_kg,
            pedding_kg,
            wet_waste_kg
          `)
          .gte(
            "record_date",
            `${month}-01`,
          )
          .lt(
            "record_date",
            getNextMonth(month),
          ),
      ]);

      if (!targetResult.error) {
        setTarget(
          targetResult.data ??
            null,
        );
      }

      if (!wasteResult.error) {
        const totals =
          (
            wasteResult.data ??
            []
          ).reduce(
            (sum, item) => {
              sum.cutting +=
                Number(
                  item.cutting_kg ??
                    0,
                );

              sum.plastic +=
                Number(
                  item.plastic_kg ??
                    0,
                );

              sum.paper +=
                Number(
                  item.paper_kg ??
                    0,
                );

              sum.carton +=
                Number(
                  item.carton_kg ??
                    0,
                );

              sum.pedding +=
                Number(
                  item.pedding_kg ??
                    0,
                );

              sum.wet +=
                Number(
                  item.wet_waste_kg ??
                    0,
                );

              return sum;
            },
            {
              cutting: 0,
              plastic: 0,
              paper: 0,
              carton: 0,
              pedding: 0,
              wet: 0,
            },
          );

        setActual(totals);
      }

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = [
    {
      name:
        "Bahan Cutting",
      actual:
        actual.cutting,
      target:
        Number(
          target?.cutting_target ??
            0,
        ),
    },
    {
      name:
        "Plastik",
      actual:
        actual.plastic,
      target:
        Number(
          target?.plastic_target ??
            0,
        ),
    },
    {
      name:
        "Paper",
      actual:
        actual.paper,
      target:
        Number(
          target?.paper_target ??
            0,
        ),
    },
    {
      name:
        "Karton",
      actual:
        actual.carton,
      target:
        Number(
          target?.carton_target ??
            0,
        ),
    },
    {
      name:
        "Pedding",
      actual:
        actual.pedding,
      target:
        Number(
          target?.pedding_target ??
            0,
        ),
    },
    {
      name:
        "Basah / Umum",
      actual:
        actual.wet,
      target:
        Number(
          target?.wet_waste_target ??
            0,
        ),
    },
  ];

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">
          Mengambil batas limbah...
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-4">
        <h2 className="text-xl font-black text-slate-900">
          Batas Limbah Bulan Ini
        </h2>

        <p className="text-sm text-slate-500">
          Perbandingan aktual dengan batas maksimal bulanan.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((item) => {
          const status =
            getStatus(
              item.actual,
              item.target,
            );

          const percentage =
            item.target > 0
              ? (item.actual /
                  item.target) *
                100
              : 0;

          const progress =
            Math.min(
              percentage,
              100,
            );

          return (
            <div
              key={item.name}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900">
                    {item.name}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Aktual
                  </p>

                  <p className="text-2xl font-black text-slate-900">
                    {formatKg(
                      item.actual,
                    )}{" "}
                    KG
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${status.badge}`}
                >
                  {status.label}
                </span>
              </div>

              <div className="mt-5">
                <div className="flex justify-between gap-3 text-xs font-bold text-slate-500">
                  <span>
                    {item.target >
                    0
                      ? `${percentage.toLocaleString(
                          "id-ID",
                          {
                            maximumFractionDigits:
                              1,
                          },
                        )}%`
                      : "Target belum diatur"}
                  </span>

                  <span>
                    Batas:{" "}
                    {item.target >
                    0
                      ? `${formatKg(
                          item.target,
                        )} KG`
                      : "-"}
                  </span>
                </div>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${status.bar}`}
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>

                {percentage >
                  100 && (
                  <p className="mt-3 text-xs font-bold text-red-600">
                    ⚠ Melebihi batas{" "}
                    {formatKg(
                      item.actual -
                        item.target,
                    )}{" "}
                    KG
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getNextMonth(
  monthKey: string,
) {
  const [year, month] =
    monthKey
      .split("-")
      .map(Number);

  const next =
    new Date(
      year,
      month,
      1,
    );

  return `${next.getFullYear()}-${String(
    next.getMonth() + 1,
  ).padStart(2, "0")}-01`;
}
