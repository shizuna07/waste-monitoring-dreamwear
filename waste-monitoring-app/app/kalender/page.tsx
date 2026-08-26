"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type WasteRecord = {
  id: string;
  record_date: string;

  cutting_kg: number | string;
  plastic_kg: number | string;
  paper_kg: number | string;
  carton_kg: number | string;
  pedding_kg: number | string;
  wet_waste_kg: number | string;
  total_kg: number | string;

  pic_name: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;

  created_by: string | null;
  updated_by: string | null;

  photo_path: string | null;
  cleanliness_photo_at: string | null;
  cleanliness_uploaded_by: string | null;
};


type HolidayRow = {
  holiday_date: string;
  holiday_name: string;
  holiday_type:
    | "NATIONAL"
    | "COLLECTIVE_LEAVE";
};

type WorkCalendarRow = {
  work_date: string;
  is_workday: boolean;
  note: string | null;
};

type Profile = {
  user_id: string;
  name: string;
};

const WEEKDAYS = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min",
];

function jakartaNow() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Jakarta",
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

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (
      part.type !==
      "literal"
    ) {
      values[
        part.type
      ] = part.value;
    }
  }

  return {
    date:
      `${values.year}-${values.month}-${values.day}`,

    month:
      `${values.year}-${values.month}`,

    hour:
      Number(
        values.hour,
      ),

    minute:
      Number(
        values.minute,
      ),
  };
}

function monthLabel(
  monthKey: string,
) {
  const [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(Number);

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      month: "long",
      year: "numeric",
      timeZone:
        "Asia/Jakarta",
    },
  ).format(
    new Date(
      `${year}-${String(
        month,
      ).padStart(
        2,
        "0",
      )}-01T00:00:00+07:00`,
    ),
  );
}

function dateLabel(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone:
        "Asia/Jakarta",
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
  value:
    | string
    | null,
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

function formatKg(
  value:
    | number
    | string,
) {
  return Number(
    value ?? 0,
  ).toLocaleString(
    "id-ID",
    {
      maximumFractionDigits:
        2,
    },
  );
}

function nextMonth(
  monthKey: string,
) {
  let [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(Number);

  month += 1;

  if (
    month === 13
  ) {
    month = 1;
    year += 1;
  }

  return `${year}-${String(
    month,
  ).padStart(
    2,
    "0",
  )}`;
}

function previousMonth(
  monthKey: string,
) {
  let [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(Number);

  month -= 1;

  if (
    month === 0
  ) {
    month = 12;
    year -= 1;
  }

  return `${year}-${String(
    month,
  ).padStart(
    2,
    "0",
  )}`;
}

function getMonthInfo(
  monthKey: string,
) {
  const [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(Number);

  const totalDays =
    new Date(
      year,
      month,
      0,
    ).getDate();

  const firstDay =
    new Date(
      Date.UTC(
        year,
        month - 1,
        1,
      ),
    ).getUTCDay();

  const offset =
    (firstDay + 6) %
    7;

  return {
    totalDays,
    offset,
  };
}

export default function CalendarMonitoringPage() {
  const {
    profile,
  } = useAuth();

  const current =
    jakartaNow();

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState(
      current.month,
    );

  const [
    records,
    setRecords,
  ] =
    useState<
      WasteRecord[]
    >([]);

  const [
    schedules,
    setSchedules,
  ] =
    useState<
      WorkCalendarRow[]
    >([]);

  const [
    holidays,
    setHolidays,
  ] =
    useState<
      HolidayRow[]
    >([]);

  const [
    userNames,
    setUserNames,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

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
    selectedDate,
    setSelectedDate,
  ] =
    useState("");

  const [
    overrideWorkday,
    setOverrideWorkday,
  ] = useState<boolean | null>(
    null,
  );

  const [
    overrideNote,
    setOverrideNote,
  ] = useState("");

  const [
    savingOverride,
    setSavingOverride,
  ] = useState(false);

  const [
    overrideMessage,
    setOverrideMessage,
  ] = useState("");

  const [
    overrideError,
    setOverrideError,
  ] = useState("");


  const [
    photoUrl,
    setPhotoUrl,
  ] =
    useState("");

  const [
    showPhoto,
    setShowPhoto,
  ] =
    useState(false);

  const loadData =
    useCallback(
      async () => {
        if (
          profile.role !==
          "ADMIN"
        ) {
          return;
        }

        setLoading(
          true,
        );

        setErrorMessage(
          "",
        );

        const start =
          `${selectedMonth}-01`;

        const end =
          `${nextMonth(
            selectedMonth,
          )}-01`;

        const [
          wasteResult,
          scheduleResult,
          holidayResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "waste_daily",
              )
              .select(`
                id,
                record_date,
                cutting_kg,
                plastic_kg,
                paper_kg,
                carton_kg,
                pedding_kg,
                wet_waste_kg,
                total_kg,
                pic_name,
                notes,
                created_at,
                updated_at,
                created_by,
                updated_by,
                photo_path,
                cleanliness_photo_at,
                cleanliness_uploaded_by
              `)
              .gte(
                "record_date",
                start,
              )
              .lt(
                "record_date",
                end,
              )
              .order(
                "record_date",
              ),

            supabase
              .from(
                "work_calendar",
              )
              .select(`
                work_date,
                is_workday,
                note
              `)
              .gte(
                "work_date",
                start,
              )
              .lt(
                "work_date",
                end,
              )
              .order(
                "work_date",
              ),

            supabase
              .from(
                "indonesia_holidays",
              )
              .select(`
                holiday_date,
                holiday_name,
                holiday_type
              `)
              .gte(
                "holiday_date",
                start,
              )
              .lt(
                "holiday_date",
                end,
              )
              .order(
                "holiday_date",
              ),
          ]);

        if (
          wasteResult.error
        ) {
          setErrorMessage(
            wasteResult
              .error
              .message,
          );

          setLoading(
            false,
          );

          return;
        }

        if (
          scheduleResult.error
        ) {
          setErrorMessage(
            scheduleResult
              .error
              .message,
          );

          setLoading(
            false,
          );

          return;
        }

        if (
          holidayResult.error
        ) {
          setErrorMessage(
            holidayResult
              .error
              .message,
          );

          setLoading(
            false,
          );

          return;
        }

        const wasteRows =
          (
            wasteResult
              .data ??
            []
          ) as WasteRecord[];

        const calendarRows =
          (
            scheduleResult
              .data ??
            []
          ) as WorkCalendarRow[];

        setRecords(
          wasteRows,
        );

        setSchedules(
          calendarRows,
        );

        setHolidays(
          (
            holidayResult.data ??
            []
          ) as HolidayRow[],
        );

        const ids =
          Array.from(
            new Set(
              wasteRows
                .flatMap(
                  (
                    record,
                  ) => [
                    record
                      .created_by,
                    record
                      .updated_by,
                    record
                      .cleanliness_uploaded_by,
                  ],
                )
                .filter(
                  (
                    value,
                  ): value is string =>
                    Boolean(
                      value,
                    ),
                ),
            ),
          );

        if (
          ids.length >
          0
        ) {
          const {
            data,
          } =
            await supabase
              .from(
                "user_profiles",
              )
              .select(
                "user_id, name",
              )
              .in(
                "user_id",
                ids,
              );

          const mapping:
            Record<
              string,
              string
            > = {};

          (
            (data ??
              []) as Profile[]
          ).forEach(
            (
              item,
            ) => {
              mapping[
                item.user_id
              ] =
                item.name;
            },
          );

          setUserNames(
            mapping,
          );
        } else {
          setUserNames(
            {},
          );
        }

        setLoading(
          false,
        );
      },
      [
        profile.role,
        selectedMonth,
      ],
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const recordMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          WasteRecord
        >();

      for (
        const record
        of records
      ) {
        map.set(
          record.record_date,
          record,
        );
      }

      return map;
    }, [records]);

  const holidayMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          HolidayRow
        >();

      holidays.forEach(
        (holiday) => {
          map.set(
            holiday.holiday_date,
            holiday,
          );
        },
      );

      return map;
    }, [holidays]);

  const scheduleMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          WorkCalendarRow
        >();

      for (
        const row
        of schedules
      ) {
        map.set(
          row.work_date,
          row,
        );
      }

      return map;
    }, [schedules]);

  const monthInfo =
    useMemo(
      () =>
        getMonthInfo(
          selectedMonth,
        ),
      [
        selectedMonth,
      ],
    );

  const calendarDays =
    useMemo(() => {
      const cells:
        Array<
          string | null
        > = [];

      for (
        let i = 0;
        i <
        monthInfo.offset;
        i += 1
      ) {
        cells.push(
          null,
        );
      }

      for (
        let day = 1;
        day <=
        monthInfo.totalDays;
        day += 1
      ) {
        cells.push(
          `${selectedMonth}-${String(
            day,
          ).padStart(
            2,
            "0",
          )}`,
        );
      }

      while (
        cells.length %
          7 !==
        0
      ) {
        cells.push(
          null,
        );
      }

      return cells;
    }, [
      selectedMonth,
      monthInfo,
    ]);

  function getStatus(
    date: string,
  ) {
    const schedule =
      scheduleMap.get(
        date,
      );

    const record =
      recordMap.get(
        date,
      );

    const holiday =
      holidayMap.get(
        date,
      );

    const now =
      jakartaNow();

    if (
      date >
      now.date
    ) {
      return {
        code:
          "FUTURE",
        label:
          "Belum Tiba",
        symbol:
          "",
        className:
          "border-slate-100 bg-slate-50 text-slate-300",
      };
    }

    if (
      !schedule &&
      holiday?.holiday_type ===
        "NATIONAL"
    ) {
      return {
        code:
          "NATIONAL_HOLIDAY",
        label:
          "Libur Nasional",
        symbol:
          "●",
        className:
          "border-red-200 bg-red-50 text-red-700",
      };
    }

    if (!schedule) {
      return {
        code:
          "UNSET",
        label:
          holiday?.holiday_type ===
            "COLLECTIVE_LEAVE"
            ? "Cuti Bersama"
            : "Belum Diatur",
        symbol:
          holiday?.holiday_type ===
            "COLLECTIVE_LEAVE"
            ? "●"
            : "◌",
        className:
          holiday?.holiday_type ===
            "COLLECTIVE_LEAVE"
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : "border-amber-200 bg-amber-50 text-amber-700",
      };
    }

    if (
      !schedule
        .is_workday
    ) {
      return {
        code:
          "HOLIDAY",
        label:
          "Libur",
        symbol:
          "○",
        className:
          "border-slate-200 bg-slate-100 text-slate-500",
      };
    }

    if (!record) {
      return {
        code:
          "NO_INPUT",
        label:
          "Belum Input",
        symbol:
          "!",
        className:
          "border-red-300 bg-red-50 text-red-700",
      };
    }

    if (
      record.photo_path
    ) {
      return {
        code:
          "COMPLETE",
        label:
          "Lengkap",
        symbol:
          "✓",
        className:
          "border-blue-300 bg-blue-50 text-blue-700",
      };
    }

    if (
      date ===
        now.date &&
      now.hour <
        16
    ) {
      return {
        code:
          "WAITING",
        label:
          "Menunggu Foto",
        symbol:
          "◷",
        className:
          "border-amber-300 bg-amber-50 text-amber-700",
      };
    }

    return {
      code:
        "NO_PHOTO",
      label:
        "Belum Foto",
      symbol:
        "!",
      className:
        "border-red-300 bg-red-50 text-red-700",
    };
  }

  const statistics =
    useMemo(() => {
      let workDays =
        0;

      let complete =
        0;

      let noInput =
        0;

      let noPhoto =
        0;

      let holidays =
        0;

      let unconfigured =
        0;

      for (
        let day = 1;
        day <=
        monthInfo.totalDays;
        day += 1
      ) {
        const date =
          `${selectedMonth}-${String(
            day,
          ).padStart(
            2,
            "0",
          )}`;

        if (
          date >
          current.date
        ) {
          continue;
        }

        const schedule =
          scheduleMap.get(
            date,
          );

        const holiday =
          holidayMap.get(
            date,
          );

        if (
          !schedule &&
          holiday?.holiday_type ===
            "NATIONAL"
        ) {
          holidays += 1;
          continue;
        }

        if (!schedule) {
          unconfigured +=
            1;

          continue;
        }

        if (
          !schedule
            .is_workday
        ) {
          holidays +=
            1;

          continue;
        }

        workDays +=
          1;

        const status =
          getStatus(
            date,
          );

        if (
          status.code ===
          "COMPLETE"
        ) {
          complete +=
            1;
        }

        if (
          status.code ===
          "NO_INPUT"
        ) {
          noInput +=
            1;
        }

        if (
          status.code ===
            "NO_PHOTO" ||
          status.code ===
            "WAITING"
        ) {
          noPhoto +=
            1;
        }
      }

      const compliance =
        workDays > 0
          ? (
              complete /
              workDays
            ) *
            100
          : 0;

      return {
        workDays,
        complete,
        noInput,
        noPhoto,
        holidays,
        unconfigured,
        compliance,
      };
    }, [
      selectedMonth,
      monthInfo,
      scheduleMap,
      holidayMap,
      recordMap,
      current.date,
    ]);

  const totalKg =
    records.reduce(
      (
        total,
        record,
      ) =>
        total +
        Number(
          record.total_kg ??
            0,
        ),
      0,
    );

  const selectedRecord =
    selectedDate
      ? recordMap.get(
          selectedDate,
        ) ??
        null
      : null;

  const selectedSchedule =
    selectedDate
      ? scheduleMap.get(
          selectedDate,
        ) ??
        null
      : null;

  const selectedHoliday =
    selectedDate
      ? holidayMap.get(
          selectedDate,
        ) ??
        null
      : null;

  // ============================================
  // FORM OVERRIDE KALENDER
  // ============================================

  useEffect(() => {
    if (!selectedDate) {
      setOverrideWorkday(null);
      setOverrideNote("");
      setOverrideMessage("");
      setOverrideError("");
      return;
    }

    if (selectedSchedule) {
      setOverrideWorkday(
        selectedSchedule.is_workday,
      );

      setOverrideNote(
        selectedSchedule.note ?? "",
      );
    } else if (
      selectedHoliday?.holiday_type ===
      "NATIONAL"
    ) {
      setOverrideWorkday(false);

      setOverrideNote(
        `Libur Nasional - ${selectedHoliday.holiday_name}`,
      );
    } else {
      setOverrideWorkday(null);
      setOverrideNote("");
    }

    setOverrideMessage("");
    setOverrideError("");
  }, [
    selectedDate,
    selectedSchedule?.is_workday,
    selectedSchedule?.note,
    selectedHoliday?.holiday_type,
    selectedHoliday?.holiday_name,
  ]);


  async function saveScheduleOverride() {
    if (!selectedDate) {
      return;
    }

    if (
      overrideWorkday === null
    ) {
      setOverrideError(
        "Pilih Hari Kerja atau Libur.",
      );

      return;
    }

    setSavingOverride(true);
    setOverrideError("");
    setOverrideMessage("");

    try {
      const defaultNote =
        overrideWorkday
          ? "Hari Kerja"
          : "Libur Perusahaan";

      const {
        error,
      } =
        await supabase
          .from(
            "work_calendar",
          )
          .upsert(
            {
              work_date:
                selectedDate,

              is_workday:
                overrideWorkday,

              note:
                overrideNote.trim() ||
                defaultNote,
            },
            {
              onConflict:
                "work_date",
            },
          );

      if (error) {
        throw error;
      }

      setOverrideMessage(
        overrideWorkday
          ? "✅ Berhasil dijadikan HARI KERJA."
          : "✅ Berhasil dijadikan LIBUR.",
      );

      await loadData();
    } catch (error) {
      setOverrideError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan jadwal.",
      );
    } finally {
      setSavingOverride(false);
    }
  }


  const selectedStatus =
    selectedDate
      ? getStatus(
          selectedDate,
        )
      : null;

  async function openPhoto() {
    if (
      !selectedRecord
        ?.photo_path
    ) {
      return;
    }

    setErrorMessage(
      "",
    );

    const {
      data,
      error,
    } =
      await supabase.storage
        .from(
          "waste-evidence",
        )
        .createSignedUrl(
          selectedRecord
            .photo_path,
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

    setShowPhoto(
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
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:p-8">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Admin Monitoring
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Kalender Monitoring
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Monitoring PIC berdasarkan jadwal kerja perusahaan.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
          >
            ↻ Refresh
          </button>
        </div>


        {/* SUMMARY */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
            <p className="text-sm font-bold text-blue-100">
              Hari Kerja
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                statistics.workDays
              }
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Lengkap
            </p>

            <p className="mt-2 text-3xl font-black text-blue-700">
              {
                statistics.complete
              }
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Belum Lengkap
            </p>

            <p className="mt-2 text-3xl font-black text-red-600">
              {statistics.noInput +
                statistics.noPhoto}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {statistics.noInput} belum input •{" "}
              {statistics.noPhoto} belum foto
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-sm font-bold text-slate-300">
              Kepatuhan
            </p>

            <p className="mt-2 text-3xl font-black">
              {statistics.compliance.toLocaleString(
                "id-ID",
                {
                  maximumFractionDigits:
                    1,
                },
              )}
              %
            </p>
          </div>
        </div>


        {/* MONTH */}

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <button
              type="button"
              onClick={() =>
                setSelectedMonth(
                  previousMonth(
                    selectedMonth,
                  ),
                )
              }
              className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700"
            >
              ← Sebelumnya
            </button>

            <div className="text-center">

              <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                Periode
              </p>

              <h2 className="mt-1 text-2xl font-black capitalize text-slate-900">
                {monthLabel(
                  selectedMonth,
                )}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Total limbah{" "}
                <span className="font-black text-slate-900">
                  {formatKg(
                    totalKg,
                  )}{" "}
                  KG
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedMonth(
                  nextMonth(
                    selectedMonth,
                  ),
                )
              }
              className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700"
            >
              Berikutnya →
            </button>
          </div>

          <div className="mt-4 flex justify-center">

            <input
              type="month"
              value={
                selectedMonth
              }
              onChange={(
                event,
              ) =>
                setSelectedMonth(
                  event.target
                    .value,
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold"
            />
          </div>
        </section>


        {/* INFO */}

        {(statistics.unconfigured >
          0) && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">

            <p className="font-black text-amber-700">
              ⚠ Ada jadwal yang belum diatur
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {
                statistics.unconfigured
              }{" "}
              tanggal sampai hari ini belum mempunyai status hari kerja/libur.
              Atur melalui menu Pengaturan.
            </p>
          </div>
        )}


        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-600">
            ⚠ {
              errorMessage
            }
          </div>
        )}


        {/* LEGEND */}

        <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">

          <span className="rounded-full bg-blue-100 px-3 py-2 text-blue-700">
            ✓ Lengkap
          </span>

          <span className="rounded-full bg-red-100 px-3 py-2 text-red-700">
            ! Belum Input / Foto
          </span>

          <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-700">
            ◷ Menunggu Foto
          </span>

          <span className="rounded-full bg-slate-200 px-3 py-2 text-slate-600">
            ○ Libur
          </span>

          <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-600 ring-1 ring-amber-200">
            ◌ Belum Diatur
          </span>
        </div>


        {/* CALENDAR */}

        <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">

          {loading ? (
            <div className="p-12 text-center text-sm font-semibold text-slate-500">
              Mengambil kalender monitoring...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">

                {WEEKDAYS.map(
                  (
                    day,
                  ) => (
                    <div
                      key={
                        day
                      }
                      className="px-1 py-3 text-center text-[10px] font-black uppercase text-slate-500 sm:text-xs"
                    >
                      {
                        day
                      }
                    </div>
                  ),
                )}
              </div>

              <div className="grid grid-cols-7">

                {calendarDays.map(
                  (
                    date,
                    index,
                  ) => {
                    if (
                      !date
                    ) {
                      return (
                        <div
                          key={
                            `blank-${index}`
                          }
                          className="min-h-24 border-b border-r border-slate-100 bg-slate-50 sm:min-h-32"
                        />
                      );
                    }

                    const record =
                      recordMap.get(
                        date,
                      );

                    const schedule =
                      scheduleMap.get(
                        date,
                      );

                    const holiday =
                      holidayMap.get(
                        date,
                      );

                    const status =
                      getStatus(
                        date,
                      );

                    const day =
                      Number(
                        date.slice(
                          -2,
                        ),
                      );

                    const isToday =
                      date ===
                      jakartaNow()
                        .date;

                    return (
                      <button
                        type="button"
                        key={
                          date
                        }
                        onClick={() =>
                          setSelectedDate(
                            date,
                          )
                        }
                        className={[
                          "relative min-h-24 border-b border-r p-2 text-left transition hover:z-10 hover:shadow-md sm:min-h-32 sm:p-3",
                          status.className,
                          isToday
                            ? "ring-2 ring-inset ring-blue-600"
                            : "",
                        ].join(
                          " ",
                        )}
                      >

                        <div className="flex items-start justify-between">

                          <span
                            className={[
                              "text-sm font-black sm:text-lg",
                              holiday?.holiday_type ===
                                "NATIONAL"
                                ? "text-red-600"
                                : holiday?.holiday_type ===
                                    "COLLECTIVE_LEAVE"
                                  ? "text-amber-600"
                                  : "",
                            ].join(" ")}
                          >
                            {day}
                          </span>

                          {status.symbol && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-xs font-black shadow-sm">
                              {
                                status.symbol
                              }
                            </span>
                          )}
                        </div>

                        <p className="mt-2 hidden text-[10px] font-black uppercase sm:block">
                          {
                            status.label
                          }
                        </p>

                        {schedule &&
                          !schedule.is_workday &&
                          schedule.note && (
                            <p className="mt-1 hidden truncate text-[9px] sm:block">
                              {
                                schedule.note
                              }
                            </p>
                          )}

                        {holiday && (
                          <p
                            className={[
                              "mt-1 hidden truncate text-[9px] font-bold sm:block",
                              holiday.holiday_type ===
                                "NATIONAL"
                                ? "text-red-600"
                                : "text-amber-600",
                            ].join(" ")}
                            title={
                              holiday.holiday_name
                            }
                          >
                            {holiday.holiday_name}
                          </p>
                        )}

                        {record && (
                          <>
                            <p className="mt-2 truncate text-[10px] font-bold text-slate-600 sm:text-xs">
                              {record.pic_name ??
                                "-"}
                            </p>

                            <p className="mt-1 text-[10px] font-black sm:text-xs">
                              {formatKg(
                                record.total_kg,
                              )}{" "}
                              KG
                            </p>
                          </>
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            </>
          )}
        </section>
      </div>


      {/* DETAIL */}

      {selectedDate &&
        selectedStatus && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onClick={() =>
              setSelectedDate(
                "",
              )
            }
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
              onClick={(
                event,
              ) =>
                event.stopPropagation()
              }
            >

              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                    Detail Harian
                  </p>

                  <h2 className="mt-1 text-xl font-black capitalize text-slate-900">
                    {dateLabel(
                      selectedDate,
                    )}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate(
                      "",
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black"
                >
                  ✕
                </button>
              </div>


              {selectedHoliday && (
                <div
                  className={[
                    "mt-5 rounded-2xl border p-4",
                    selectedHoliday.holiday_type ===
                      "NATIONAL"
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50",
                  ].join(" ")}
                >
                  <p
                    className={[
                      "text-xs font-black uppercase tracking-wider",
                      selectedHoliday.holiday_type ===
                        "NATIONAL"
                        ? "text-red-600"
                        : "text-amber-600",
                    ].join(" ")}
                  >
                    {selectedHoliday.holiday_type ===
                      "NATIONAL"
                      ? "🔴 Libur Nasional"
                      : "🟠 Cuti Bersama"}
                  </p>

                  <p className="mt-2 font-black text-slate-900">
                    {selectedHoliday.holiday_name}
                  </p>

                  {selectedHoliday.holiday_type ===
                    "COLLECTIVE_LEAVE" && (
                    <p className="mt-1 text-xs text-slate-600">
                      Status kerja tetap mengikuti kebijakan PT.DREAMWEAR.
                    </p>
                  )}

                  {selectedSchedule?.is_workday && (
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-700">
                      Override perusahaan: HARI KERJA
                    </p>
                  )}
                </div>
              )}

              <div
                className={[
                  "mt-5 rounded-xl border-2 p-4",
                  selectedStatus
                    .className,
                ].join(
                  " ",
                )}
              >
                <p className="text-xs font-bold uppercase">
                  Status
                </p>

                <p className="mt-1 text-lg font-black">
                  {selectedStatus.symbol}{" "}
                  {selectedStatus.label}
                </p>

                {selectedSchedule?.note && (
                  <p className="mt-1 text-sm">
                    {
                      selectedSchedule.note
                    }
                  </p>
                )}
              </div>


              
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                    Admin Override
                  </p>

                  <h3 className="mt-1 font-black text-slate-900">
                    Status Operasional PT.DREAMWEAR
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    Status ini menjadi acuan kewajiban PIC dan kepatuhan.
                  </p>
                </div>


                {selectedHoliday && (
                  <div
                    className={[
                      "mt-3 rounded-xl border px-3 py-2 text-xs font-black",
                      selectedHoliday.holiday_type ===
                        "NATIONAL"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    {selectedHoliday.holiday_type ===
                    "NATIONAL"
                      ? "🔴 LIBUR NASIONAL"
                      : "🟠 CUTI BERSAMA"}

                    <div className="mt-1 font-semibold">
                      {selectedHoliday.holiday_name}
                    </div>
                  </div>
                )}


                <div className="mt-4 grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() => {
                      setOverrideWorkday(true);
                      setOverrideError("");

                      if (
                        !overrideNote.trim() ||
                        overrideNote.startsWith(
                          "Libur",
                        )
                      ) {
                        setOverrideNote(
                          "Hari Kerja",
                        );
                      }
                    }}
                    className={[
                      "rounded-xl border-2 px-3 py-4 text-sm font-black",
                      overrideWorkday === true
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    ✓ HARI KERJA
                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      setOverrideWorkday(false);
                      setOverrideError("");

                      if (
                        !overrideNote.trim() ||
                        overrideNote ===
                          "Hari Kerja"
                      ) {
                        setOverrideNote(
                          selectedHoliday
                            ? `Libur - ${selectedHoliday.holiday_name}`
                            : "Libur Perusahaan",
                        );
                      }
                    }}
                    className={[
                      "rounded-xl border-2 px-3 py-4 text-sm font-black",
                      overrideWorkday === false
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-slate-200 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    ○ LIBUR
                  </button>

                </div>


                <div className="mt-4">

                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Keterangan
                  </label>

                  <textarea
                    value={overrideNote}
                    onChange={(event) =>
                      setOverrideNote(
                        event.target.value,
                      )
                    }
                    rows={2}
                    placeholder="Contoh: Libur khusus perusahaan"
                    className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>


                {overrideMessage && (
                  <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3 text-sm font-bold text-blue-700">
                    {overrideMessage}
                  </div>
                )}


                {overrideError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">
                    ⚠ {overrideError}
                  </div>
                )}


                <button
                  type="button"
                  disabled={
                    savingOverride ||
                    overrideWorkday === null
                  }
                  onClick={() =>
                    void saveScheduleOverride()
                  }
                  className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white disabled:opacity-40"
                >
                  {savingOverride
                    ? "Menyimpan..."
                    : "Simpan Perubahan Jadwal"}
                </button>

              </div>

{selectedSchedule &&
              !selectedSchedule.is_workday ? (
                <div className="mt-4 rounded-2xl bg-slate-100 p-6 text-center">

                  <div className="text-4xl">
                    ○
                  </div>

                  <p className="mt-3 text-lg font-black">
                    Hari Libur
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Tidak dihitung sebagai ketidakpatuhan PIC.
                  </p>
                </div>
              ) : !selectedRecord ? (
                <div className="mt-4 rounded-2xl bg-red-50 p-6 text-center">

                  <div className="text-4xl">
                    !
                  </div>

                  <p className="mt-3 font-black text-red-700">
                    Tidak Ada Pencatatan
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Belum ditemukan data limbah pada tanggal ini.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">

                    <div className="rounded-xl bg-slate-50 p-4">

                      <p className="text-xs font-bold text-slate-500">
                        PIC
                      </p>

                      <p className="mt-1 font-black">
                        {selectedRecord.pic_name ??
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">

                      <p className="text-xs font-bold text-slate-500">
                        Jam Input
                      </p>

                      <p className="mt-1 font-black">
                        {formatTime(
                          selectedRecord.created_at,
                        )}{" "}
                        WIB
                      </p>
                    </div>
                  </div>


                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                    {[
                      [
                        "Bahan Cutting",
                        selectedRecord
                          .cutting_kg,
                      ],
                      [
                        "Plastik",
                        selectedRecord
                          .plastic_kg,
                      ],
                      [
                        "Paper",
                        selectedRecord
                          .paper_kg,
                      ],
                      [
                        "Karton",
                        selectedRecord
                          .carton_kg,
                      ],
                      [
                        "Pedding",
                        selectedRecord
                          .pedding_kg,
                      ],
                      [
                        "Basah / Umum",
                        selectedRecord
                          .wet_waste_kg,
                      ],
                    ].map(
                      (
                        [
                          label,
                          value,
                        ],
                      ) => (
                        <div
                          key={
                            String(
                              label,
                            )
                          }
                          className="rounded-xl border border-slate-200 p-4"
                        >

                          <p className="text-xs font-bold text-slate-500">
                            {
                              label
                            }
                          </p>

                          <p className="mt-1 text-lg font-black">
                            {formatKg(
                              value,
                            )}{" "}
                            KG
                          </p>
                        </div>
                      ),
                    )}
                  </div>


                  <div className="mt-4 rounded-2xl bg-blue-600 p-5 text-white">

                    <p className="text-sm font-bold text-blue-100">
                      Total Limbah
                    </p>

                    <p className="mt-1 text-3xl font-black">
                      {formatKg(
                        selectedRecord.total_kg,
                      )}{" "}
                      KG
                    </p>
                  </div>


                  <div className="mt-4 rounded-2xl border border-slate-200 p-5">

                    <h3 className="font-black text-slate-900">
                      Kebersihan Area
                    </h3>

                    {selectedRecord.photo_path ? (
                      <>
                        <div className="mt-3 rounded-xl bg-blue-50 p-4">

                          <p className="font-black text-blue-700">
                            ✓ Bukti Foto Lengkap
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            Jam:{" "}
                            <span className="font-black">
                              {formatTime(
                                selectedRecord.cleanliness_photo_at,
                              )}{" "}
                              WIB
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            Oleh:{" "}
                            <span className="font-black">
                              {selectedRecord.cleanliness_uploaded_by
                                ? userNames[
                                    selectedRecord.cleanliness_uploaded_by
                                  ] ??
                                  selectedRecord.pic_name ??
                                  "-"
                                : selectedRecord.pic_name ??
                                  "-"}
                            </span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void openPhoto()
                          }
                          className="mt-3 w-full rounded-xl bg-blue-600 px-5 py-3 font-black text-white"
                        >
                          📷 Lihat Bukti Foto
                        </button>
                      </>
                    ) : (
                      <div className="mt-3 rounded-xl bg-red-50 p-4 font-bold text-red-600">
                        ⚠ Belum ada bukti foto kebersihan.
                      </div>
                    )}
                  </div>


                  <div className="mt-4 rounded-2xl bg-slate-50 p-5">

                    <p className="text-xs font-black uppercase text-slate-400">
                      Keterangan
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {selectedRecord.notes ??
                        "Tidak ada keterangan."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}


      {/* FOTO */}

      {showPhoto &&
        photoUrl && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
            onClick={() =>
              setShowPhoto(
                false,
              )
            }
          >

            <div
              className="w-full max-w-4xl rounded-2xl bg-white p-4"
              onClick={(
                event,
              ) =>
                event.stopPropagation()
              }
            >

              <div className="mb-3 flex items-center justify-between">

                <p className="font-black">
                  Bukti Kebersihan
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowPhoto(
                      false,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-black"
                >
                  ✕
                </button>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  photoUrl
                }
                alt="Bukti kebersihan"
                className="max-h-[78vh] w-full rounded-xl object-contain"
              />
            </div>
          </div>
        )}
    </main>
  );
}
