"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";

import { supabase } from "@/lib/supabase";

// =====================================================
// TYPE
// =====================================================

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

// =====================================================
// OPTION
// =====================================================

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

// =====================================================
// PAGE
// =====================================================

export default function SafetyPatrolPage() {
  const currentMonth = new Date()
    .toISOString()
    .slice(0, 7);

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  const [findings, setFindings] =
    useState<SafetyFinding[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [exportingPdf, setExportingPdf] =
    useState(false);

  const [exportingExcel, setExportingExcel] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  // =====================================================
  // FILTER STATE
  // =====================================================

  const [searchText, setSearchText] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("SEMUA");

  const [areaFilter, setAreaFilter] =
    useState("SEMUA");

  const [categoryFilter, setCategoryFilter] =
    useState("SEMUA");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      setErrorMessage("");

      const { data, error } =
        await supabase
          .from(
            "safety_patrol_monthly"
          )
          .select("*")
          .order(
            "finding_date",
            {
              ascending: false,
            }
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        throw error;
      }

      setFindings(
        (data ?? []) as SafetyFinding[]
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =====================================================
  // FILTER BULAN
  // =====================================================

  const monthlyFindings =
    useMemo(() => {
      return findings.filter(
        (item) =>
          item.finding_date.startsWith(
            selectedMonth
          )
      );
    }, [
      findings,
      selectedMonth,
    ]);

  // =====================================================
  // FILTER DASHBOARD
  // =====================================================

  const filteredFindings =
    useMemo(() => {
      return monthlyFindings.filter(
        (item) => {
          const search =
            searchText
              .trim()
              .toLowerCase();

          const matchesSearch =
            !search ||
            item.description
              .toLowerCase()
              .includes(search) ||
            item.area
              .toLowerCase()
              .includes(search) ||
            item.category
              .toLowerCase()
              .includes(search) ||
            (
              item.notes || ""
            )
              .toLowerCase()
              .includes(search);

          const completed =
            Boolean(
              item.photo_after_url
            );

          const matchesStatus =
            statusFilter ===
              "SEMUA" ||
            (
              statusFilter ===
                "SELESAI" &&
              completed
            ) ||
            (
              statusFilter ===
                "PENDING" &&
              !completed
            );

          const matchesArea =
            areaFilter ===
              "SEMUA" ||
            item.area ===
              areaFilter;

          const matchesCategory =
            categoryFilter ===
              "SEMUA" ||
            item.category ===
              categoryFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesArea &&
            matchesCategory
          );
        }
      );
    }, [
      monthlyFindings,
      searchText,
      statusFilter,
      areaFilter,
      categoryFilter,
    ]);

  // =====================================================
  // SUMMARY
  // =====================================================

  const completedCount =
    useMemo(() => {
      return monthlyFindings.filter(
        (item) =>
          Boolean(
            item.photo_after_url
          )
      ).length;
    }, [monthlyFindings]);

  const pendingCount =
    monthlyFindings.length -
    completedCount;

  const categorySummary =
    useMemo(() => {
      const result: Record<
        string,
        number
      > = {};

      monthlyFindings.forEach(
        (item) => {
          result[item.category] =
            (
              result[
                item.category
              ] || 0
            ) + 1;
        }
      );

      return Object.entries(
        result
      ).sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [monthlyFindings]);

  // =====================================================
  // FORMAT
  // =====================================================

  function formatDate(
    date: string
  ) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  function formatMonth(
    month: string
  ) {
    const [
      year,
      monthNumber,
    ] = month.split("-");

    return new Date(
      Number(year),
      Number(monthNumber) -
        1,
      1
    ).toLocaleDateString(
      "id-ID",
      {
        month: "long",
        year: "numeric",
      }
    );
  }

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

  function formatDateTimeCompact(
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
          month: "2-digit",
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

    return `${tanggal} - ${jam} WIB`;
  }

  // =====================================================
  // RESET FILTER
  // =====================================================

  function resetFilter() {
    setSearchText("");

    setStatusFilter(
      "SEMUA"
    );

    setAreaFilter(
      "SEMUA"
    );

    setCategoryFilter(
      "SEMUA"
    );
  }

  // =====================================================
  // IMAGE HELPER
  // =====================================================

  async function urlToDataUrl(
    url: string
  ): Promise<string> {
    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        "Gagal mengambil foto."
      );
    }

    const blob =
      await response.blob();

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();

        reader.onloadend =
          () => {
            resolve(
              reader.result as string
            );
          };

        reader.onerror =
          reject;

        reader.readAsDataURL(
          blob
        );
      }
    );
  }

  function getImageFormat(
    dataUrl: string
  ) {
    if (
      dataUrl.startsWith(
        "data:image/png"
      )
    ) {
      return "PNG";
    }

    return "JPEG";
  }

  async function addImageContain(
    pdf: jsPDF,
    dataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const props =
      pdf.getImageProperties(
        dataUrl
      );

    const ratio =
      props.width /
      props.height;

    let imgWidth =
      width;

    let imgHeight =
      imgWidth /
      ratio;

    if (
      imgHeight >
      height
    ) {
      imgHeight =
        height;

      imgWidth =
        imgHeight *
        ratio;
    }

    const imgX =
      x +
      (
        width -
        imgWidth
      ) /
        2;

    const imgY =
      y +
      (
        height -
        imgHeight
      ) /
        2;

    pdf.addImage(
      dataUrl,
      getImageFormat(
        dataUrl
      ),
      imgX,
      imgY,
      imgWidth,
      imgHeight
    );
  }

  // =====================================================
  // EXPORT PDF
  // Export tetap semua data bulan.
  // Tidak mengikuti filter.
  // =====================================================

  async function exportPdf() {
    if (
      monthlyFindings.length ===
      0
    ) {
      alert(
        "Belum ada temuan pada bulan ini."
      );

      return;
    }

    try {
      setExportingPdf(
        true
      );

      const pdf =
        new jsPDF({
          orientation:
            "portrait",

          unit: "mm",

          format: "a4",
        });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      const margin = 14;

      const contentWidth =
        pageWidth -
        margin * 2;

      let pageNumber =
        1;

      // =============================================
      // PDF HEADER
      // =============================================

      const drawHeader =
        () => {
          pdf.setFillColor(
            37,
            99,
            235
          );

          pdf.rect(
            0,
            0,
            pageWidth,
            5,
            "F"
          );

          pdf.setFont(
            "helvetica",
            "bold"
          );

          pdf.setFontSize(
            13
          );

          pdf.setTextColor(
            30,
            41,
            59
          );

          pdf.text(
            "PT. DREAMWEAR",
            margin,
            16
          );

          pdf.setFont(
            "helvetica",
            "normal"
          );

          pdf.setFontSize(
            7.5
          );

          pdf.setTextColor(
            100,
            116,
            139
          );

          pdf.text(
            "COMPLIANCE DEPARTMENT",
            margin,
            21
          );

          pdf.setFont(
            "helvetica",
            "bold"
          );

          pdf.setFontSize(
            12
          );

          pdf.setTextColor(
            30,
            41,
            59
          );

          pdf.text(
            "REKAP SAFETY PATROL",
            pageWidth -
              margin,
            16,
            {
              align:
                "right",
            }
          );

          pdf.setFont(
            "helvetica",
            "normal"
          );

          pdf.setFontSize(
            8
          );

          pdf.setTextColor(
            100,
            116,
            139
          );

          pdf.text(
            formatMonth(
              selectedMonth
            ).toUpperCase(),
            pageWidth -
              margin,
            21,
            {
              align:
                "right",
            }
          );

          pdf.setDrawColor(
            220,
            225,
            230
          );

          pdf.line(
            margin,
            27,
            pageWidth -
              margin,
            27
          );
        };

      // =============================================
      // PDF FOOTER
      // =============================================

      const drawFooter =
        (
          number: number
        ) => {
          pdf.setDrawColor(
            230,
            230,
            230
          );

          pdf.line(
            margin,
            pageHeight -
              13,
            pageWidth -
              margin,
            pageHeight -
              13
          );

          pdf.setFont(
            "helvetica",
            "normal"
          );

          pdf.setFontSize(
            7
          );

          pdf.setTextColor(
            130,
            130,
            130
          );

          pdf.text(
            "PT. DREAMWEAR - Safety Patrol Monthly Report",
            margin,
            pageHeight -
              7
          );

          pdf.text(
            `Halaman ${number}`,
            pageWidth -
              margin,
            pageHeight -
              7,
            {
              align:
                "right",
            }
          );
        };

      drawHeader();

      // =============================================
      // PDF SUMMARY
      // =============================================

      pdf.setFillColor(
        248,
        250,
        252
      );

      pdf.roundedRect(
        margin,
        33,
        contentWidth,
        23,
        3,
        3,
        "F"
      );

      // TOTAL

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(
        6.5
      );

      pdf.setTextColor(
        100,
        116,
        139
      );

      pdf.text(
        "TOTAL TEMUAN",
        margin + 6,
        40
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        14
      );

      pdf.setTextColor(
        37,
        99,
        235
      );

      pdf.text(
        String(
          monthlyFindings.length
        ),
        margin + 6,
        49
      );

      // SELESAI

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(
        6.5
      );

      pdf.setTextColor(
        100,
        116,
        139
      );

      pdf.text(
        "SUDAH DIPERBAIKI",
        margin + 45,
        40
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        14
      );

      pdf.setTextColor(
        22,
        163,
        74
      );

      pdf.text(
        String(
          completedCount
        ),
        margin + 45,
        49
      );

      // PENDING

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(
        6.5
      );

      pdf.setTextColor(
        100,
        116,
        139
      );

      pdf.text(
        "BELUM DIPERBAIKI",
        margin + 85,
        40
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        14
      );

      pdf.setTextColor(
        217,
        119,
        6
      );

      pdf.text(
        String(
          pendingCount
        ),
        margin + 85,
        49
      );

      // CATEGORY

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(
        6.5
      );

      pdf.setTextColor(
        100,
        116,
        139
      );

      pdf.text(
        "KATEGORI TERBANYAK",
        margin + 127,
        40
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        8
      );

      pdf.setTextColor(
        30,
        41,
        59
      );

      const categoryText =
        categorySummary.length >
        0
          ? `${categorySummary[0][0]} (${categorySummary[0][1]})`
          : "-";

      pdf.text(
        categoryText,
        margin + 127,
        49
      );

      let y = 63;

      // =============================================
      // PDF LOOP
      // =============================================

      for (
        let i = 0;
        i <
        monthlyFindings.length;
        i++
      ) {
        const item =
          monthlyFindings[i];

        const beforeUrl =
          item.photo_before_url ||
          item.photo_url;

        const afterUrl =
          item.photo_after_url;

        const beforeTime =
          item.before_taken_at ||
          item.created_at;

        const afterTime =
          item.after_taken_at;

        const completed =
          Boolean(
            afterUrl
          );

        const cardHeight =
          96;

        // PAGE BREAK

        if (
          y +
            cardHeight >
          pageHeight -
            18
        ) {
          drawFooter(
            pageNumber
          );

          pdf.addPage();

          pageNumber++;

          drawHeader();

          y = 35;
        }

        // =========================================
        // CARD
        // =========================================

        pdf.setFillColor(
          255,
          255,
          255
        );

        pdf.setDrawColor(
          225,
          230,
          235
        );

        pdf.roundedRect(
          margin,
          y,
          contentWidth,
          cardHeight,
          3,
          3,
          "FD"
        );

        // NUMBER

        pdf.setFillColor(
          37,
          99,
          235
        );

        pdf.roundedRect(
          margin + 5,
          y + 6,
          12,
          9,
          2,
          2,
          "F"
        );

        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(
          8
        );

        pdf.setTextColor(
          255,
          255,
          255
        );

        pdf.text(
          String(
            i + 1
          ).padStart(
            2,
            "0"
          ),
          margin + 11,
          y + 12,
          {
            align:
              "center",
          }
        );

        // CATEGORY

        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(
          10.5
        );

        pdf.setTextColor(
          30,
          41,
          59
        );

        pdf.text(
          item.category.toUpperCase(),
          margin + 22,
          y + 12
        );

        // STATUS

        if (
          completed
        ) {
          pdf.setFillColor(
            220,
            252,
            231
          );

          pdf.setTextColor(
            21,
            128,
            61
          );
        } else {
          pdf.setFillColor(
            254,
            243,
            199
          );

          pdf.setTextColor(
            180,
            83,
            9
          );
        }

        pdf.roundedRect(
          pageWidth -
            margin -
            40,
          y + 5,
          34,
          9,
          2,
          2,
          "F"
        );

        pdf.setFontSize(
          6.5
        );

        pdf.text(
          completed
            ? "SELESAI"
            : "PENDING",
          pageWidth -
            margin -
            23,
          y + 11,
          {
            align:
              "center",
          }
        );

        // =========================================
        // INFO
        // =========================================

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.setFontSize(
          6.5
        );

        pdf.setTextColor(
          100,
          116,
          139
        );

        pdf.text(
          "TANGGAL TEMUAN",
          margin + 6,
          y + 23
        );

        pdf.text(
          "AREA",
          margin + 63,
          y + 23
        );

        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(
          8
        );

        pdf.setTextColor(
          30,
          41,
          59
        );

        pdf.text(
          formatDate(
            item.finding_date
          ),
          margin + 6,
          y + 28
        );

        pdf.text(
          item.area,
          margin + 63,
          y + 28
        );

        // DESCRIPTION

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.setFontSize(
          6.5
        );

        pdf.setTextColor(
          100,
          116,
          139
        );

        pdf.text(
          "KETERANGAN TEMUAN",
          margin + 105,
          y + 23
        );

        pdf.setFontSize(
          7.2
        );

        pdf.setTextColor(
          30,
          41,
          59
        );

        const descLines =
          pdf
            .splitTextToSize(
              item.description,
              68
            )
            .slice(
              0,
              3
            );

        pdf.text(
          descLines,
          margin + 105,
          y + 28
        );

        // =========================================
        // BEFORE AFTER
        // =========================================

        const photoY =
          y + 40;

        const photoWidth =
          55;

        const photoHeight =
          33;

        const beforeX =
          margin + 6;

        const afterX =
          margin + 67;

        // BEFORE LABEL

        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(
          6.5
        );

        pdf.setTextColor(
          220,
          38,
          38
        );

        pdf.text(
          "BEFORE",
          beforeX,
          photoY - 3
        );

        // AFTER LABEL

        pdf.setTextColor(
          22,
          163,
          74
        );

        pdf.text(
          "AFTER",
          afterX,
          photoY - 3
        );

        // BG PHOTO

        pdf.setFillColor(
          245,
          247,
          250
        );

        pdf.roundedRect(
          beforeX,
          photoY,
          photoWidth,
          photoHeight,
          2,
          2,
          "F"
        );

        pdf.roundedRect(
          afterX,
          photoY,
          photoWidth,
          photoHeight,
          2,
          2,
          "F"
        );

        // BEFORE PHOTO

        if (beforeUrl) {
          try {
            const dataUrl =
              await urlToDataUrl(
                beforeUrl
              );

            await addImageContain(
              pdf,
              dataUrl,
              beforeX,
              photoY,
              photoWidth,
              photoHeight
            );
          } catch (
            error
          ) {
            console.error(
              error
            );

            pdf.setFontSize(
              7
            );

            pdf.setTextColor(
              150,
              150,
              150
            );

            pdf.text(
              "Foto gagal",
              beforeX +
                photoWidth /
                  2,
              photoY +
                photoHeight /
                  2,
              {
                align:
                  "center",
              }
            );
          }
        } else {
          pdf.setFontSize(
            7
          );

          pdf.setTextColor(
            150,
            150,
            150
          );

          pdf.text(
            "Tidak ada foto",
            beforeX +
              photoWidth /
                2,
            photoY +
              photoHeight /
                2,
            {
              align:
                "center",
            }
          );
        }

        // AFTER PHOTO

        if (afterUrl) {
          try {
            const dataUrl =
              await urlToDataUrl(
                afterUrl
              );

            await addImageContain(
              pdf,
              dataUrl,
              afterX,
              photoY,
              photoWidth,
              photoHeight
            );
          } catch (
            error
          ) {
            console.error(
              error
            );

            pdf.setFontSize(
              7
            );

            pdf.setTextColor(
              150,
              150,
              150
            );

            pdf.text(
              "Foto gagal",
              afterX +
                photoWidth /
                  2,
              photoY +
                photoHeight /
                  2,
              {
                align:
                  "center",
              }
            );
          }
        } else {
          pdf.setFontSize(
            7
          );

          pdf.setTextColor(
            150,
            150,
            150
          );

          pdf.text(
            "Belum ada AFTER",
            afterX +
              photoWidth /
                2,
            photoY +
              photoHeight /
                2,
            {
              align:
                "center",
            }
          );
        }

        // =========================================
        // WAKTU BEFORE AFTER
        // =========================================

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.setFontSize(
          6.2
        );

        pdf.setTextColor(
          100,
          116,
          139
        );

        pdf.text(
          formatDateTimeCompact(
            beforeTime
          ),
          beforeX,
          photoY +
            photoHeight +
            5
        );

        if (afterUrl) {
          pdf.text(
            formatDateTimeCompact(
              afterTime
            ),
            afterX,
            photoY +
              photoHeight +
              5
          );
        } else {
          pdf.setTextColor(
            180,
            83,
            9
          );

          pdf.text(
            "Waktu AFTER belum ada",
            afterX,
            photoY +
              photoHeight +
              5
          );
        }

        // =========================================
        // ACTION
        // =========================================

        const actionX =
          margin + 129;

        const actionY =
          y + 40;

        const actionWidth =
          contentWidth -
          135;

        if (
          completed
        ) {
          pdf.setFillColor(
            240,
            253,
            244
          );
        } else {
          pdf.setFillColor(
            248,
            250,
            252
          );
        }

        pdf.roundedRect(
          actionX,
          actionY,
          actionWidth,
          43,
          2,
          2,
          "F"
        );

        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(
          6.5
        );

        if (
          completed
        ) {
          pdf.setTextColor(
            22,
            101,
            52
          );
        } else {
          pdf.setTextColor(
            100,
            116,
            139
          );
        }

        pdf.text(
          "TINDAKAN / PERBAIKAN",
          actionX + 4,
          actionY + 6
        );

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.setFontSize(
          7.2
        );

        const noteLines =
          pdf
            .splitTextToSize(
              item.notes ||
                "Belum ada tindakan / perbaikan.",
              actionWidth -
                8
            )
            .slice(
              0,
              7
            );

        pdf.text(
          noteLines,
          actionX + 4,
          actionY + 12
        );

        y +=
          cardHeight +
          7;
      }

      drawFooter(
        pageNumber
      );

      // =============================================
      // SAVE PDF
      // =============================================

      const fileMonth =
        selectedMonth.replace(
          "-",
          "_"
        );

      pdf.save(
        `Safety_Patrol_PT_DREAMWEAR_${fileMonth}.pdf`
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Gagal membuat PDF."
      );
    } finally {
      setExportingPdf(
        false
      );
    }
  }

  // =====================================================
  // EXPORT EXCEL
  // Export tetap semua data bulan.
  // Tidak mengikuti filter.
  // =====================================================

  async function exportExcel() {
    if (
      monthlyFindings.length ===
      0
    ) {
      alert(
        "Belum ada temuan pada bulan ini."
      );

      return;
    }

    try {
      setExportingExcel(
        true
      );

      const workbook =
        new ExcelJS.Workbook();

      workbook.creator =
        "PT. DREAMWEAR";

      workbook.created =
        new Date();

      const sheet =
        workbook.addWorksheet(
          "Safety Patrol",
          {
            views: [
              {
                state:
                  "frozen",
                ySplit: 5,
              },
            ],
          }
        );

      // =============================================
      // EXCEL TITLE
      // =============================================

      sheet.mergeCells(
        "A1:K1"
      );

      sheet.getCell(
        "A1"
      ).value =
        "PT. DREAMWEAR - REKAP SAFETY PATROL";

      sheet.getCell(
        "A1"
      ).font = {
        bold: true,

        size: 16,

        color: {
          argb:
            "FFFFFFFF",
        },
      };

      sheet.getCell(
        "A1"
      ).fill = {
        type:
          "pattern",

        pattern:
          "solid",

        fgColor: {
          argb:
            "FF2563EB",
        },
      };

      sheet.getCell(
        "A1"
      ).alignment = {
        horizontal:
          "center",

        vertical:
          "middle",
      };

      sheet.getRow(
        1
      ).height = 28;

      // PERIOD

      sheet.mergeCells(
        "A2:K2"
      );

      sheet.getCell(
        "A2"
      ).value =
        `Periode: ${formatMonth(
          selectedMonth
        )}`;

      sheet.getCell(
        "A2"
      ).font = {
        bold: true,

        size: 11,
      };

      sheet.getCell(
        "A2"
      ).alignment = {
        horizontal:
          "center",
      };

      // SUMMARY

      sheet.mergeCells(
        "A3:C3"
      );

      sheet.getCell(
        "A3"
      ).value =
        `Total Temuan: ${monthlyFindings.length}`;

      sheet.mergeCells(
        "D3:F3"
      );

      sheet.getCell(
        "D3"
      ).value =
        `Sudah Diperbaiki: ${completedCount}`;

      sheet.mergeCells(
        "G3:I3"
      );

      sheet.getCell(
        "G3"
      ).value =
        `Belum Diperbaiki: ${pendingCount}`;

      sheet.mergeCells(
        "J3:K3"
      );

      sheet.getCell(
        "J3"
      ).value =
        categorySummary.length >
        0
          ? `Kategori: ${categorySummary[0][0]}`
          : "Kategori: -";

      [
        "A3",
        "D3",
        "G3",
        "J3",
      ].forEach(
        (cellName) => {
          const cell =
            sheet.getCell(
              cellName
            );

          cell.font = {
            bold: true,

            size: 10,
          };

          cell.alignment = {
            horizontal:
              "center",

            vertical:
              "middle",
          };
        }
      );

      // =============================================
      // EXCEL HEADER
      // =============================================

      const headerRow =
        sheet.getRow(
          5
        );

      headerRow.values = [
        "NO",

        "TANGGAL TEMUAN",

        "AREA",

        "KATEGORI",

        "KETERANGAN TEMUAN",

        "TINDAKAN / PERBAIKAN",

        "FOTO BEFORE",

        "WAKTU BEFORE",

        "FOTO AFTER",

        "WAKTU AFTER",

        "STATUS",
      ];

      headerRow.height =
        28;

      headerRow.eachCell(
        (cell) => {
          cell.font = {
            bold: true,

            color: {
              argb:
                "FFFFFFFF",
            },
          };

          cell.fill = {
            type:
              "pattern",

            pattern:
              "solid",

            fgColor: {
              argb:
                "FF1E3A5F",
            },
          };

          cell.alignment = {
            horizontal:
              "center",

            vertical:
              "middle",

            wrapText:
              true,
          };

          cell.border = {
            top: {
              style:
                "thin",

              color: {
                argb:
                  "FFD1D5DB",
              },
            },

            left: {
              style:
                "thin",

              color: {
                argb:
                  "FFD1D5DB",
              },
            },

            bottom: {
              style:
                "thin",

              color: {
                argb:
                  "FFD1D5DB",
              },
            },

            right: {
              style:
                "thin",

              color: {
                argb:
                  "FFD1D5DB",
              },
            },
          };
        }
      );

      // =============================================
      // EXCEL WIDTH
      // =============================================

      sheet.getColumn(
        "A"
      ).width = 6;

      sheet.getColumn(
        "B"
      ).width = 18;

      sheet.getColumn(
        "C"
      ).width = 15;

      sheet.getColumn(
        "D"
      ).width = 20;

      sheet.getColumn(
        "E"
      ).width = 34;

      sheet.getColumn(
        "F"
      ).width = 34;

      sheet.getColumn(
        "G"
      ).width = 22;

      sheet.getColumn(
        "H"
      ).width = 24;

      sheet.getColumn(
        "I"
      ).width = 22;

      sheet.getColumn(
        "J"
      ).width = 24;

      sheet.getColumn(
        "K"
      ).width = 20;

      // FILTER HEADER EXCEL

      sheet.autoFilter = {
        from: "A5",

        to: "K5",
      };

      // =============================================
      // EXCEL DATA
      // =============================================

      for (
        let index = 0;
        index <
        monthlyFindings.length;
        index++
      ) {
        const item =
          monthlyFindings[
            index
          ];

        const beforeUrl =
          item.photo_before_url ||
          item.photo_url;

        const afterUrl =
          item.photo_after_url;

        const beforeTime =
          item.before_taken_at ||
          item.created_at;

        const afterTime =
          item.after_taken_at;

        const rowNumber =
          6 + index;

        const row =
          sheet.getRow(
            rowNumber
          );

        row.height = 95;

        row.values = [
          index + 1,

          formatDate(
            item.finding_date
          ),

          item.area,

          item.category,

          item.description,

          item.notes ||
            "Belum ada tindakan / perbaikan.",

          "",

          formatDateTime(
            beforeTime
          ),

          "",

          afterUrl
            ? formatDateTime(
                afterTime
              )
            : "Belum ada AFTER",

          afterUrl
            ? "SUDAH DIPERBAIKI"
            : "BELUM DIPERBAIKI",
        ];

        row.eachCell(
          (
            cell,
            colNumber
          ) => {
            cell.alignment =
              {
                vertical:
                  "middle",

                horizontal:
                  colNumber ===
                    1 ||
                  colNumber ===
                    7 ||
                  colNumber ===
                    8 ||
                  colNumber ===
                    9 ||
                  colNumber ===
                    10 ||
                  colNumber ===
                    11
                    ? "center"
                    : "left",

                wrapText:
                  true,
              };

            cell.border = {
              top: {
                style:
                  "thin",

                color: {
                  argb:
                    "FFE5E7EB",
                },
              },

              left: {
                style:
                  "thin",

                color: {
                  argb:
                    "FFE5E7EB",
                },
              },

              bottom: {
                style:
                  "thin",

                color: {
                  argb:
                    "FFE5E7EB",
                },
              },

              right: {
                style:
                  "thin",

                color: {
                  argb:
                    "FFE5E7EB",
                },
              },
            };
          }
        );

        // BEFORE TIME

        sheet.getCell(
          `H${rowNumber}`
        ).font = {
          size: 9,

          color: {
            argb:
              "FF475569",
          },
        };

        // AFTER TIME

        sheet.getCell(
          `J${rowNumber}`
        ).font = {
          size: 9,

          color: afterUrl
            ? {
                argb:
                  "FF166534",
              }
            : {
                argb:
                  "FFB45309",
              },
        };

        // STATUS

        const statusCell =
          sheet.getCell(
            `K${rowNumber}`
          );

        statusCell.font = {
          bold: true,

          color: afterUrl
            ? {
                argb:
                  "FF15803D",
              }
            : {
                argb:
                  "FFB45309",
              },
        };

        statusCell.fill = {
          type:
            "pattern",

          pattern:
            "solid",

          fgColor: {
            argb: afterUrl
              ? "FFDCFCE7"
              : "FFFEF3C7",
          },
        };

        // =========================================
        // BEFORE PHOTO EXCEL
        // =========================================

        if (beforeUrl) {
          try {
            const base64 =
              await urlToDataUrl(
                beforeUrl
              );

            const extension:
              | "png"
              | "jpeg" =
              base64.startsWith(
                "data:image/png"
              )
                ? "png"
                : "jpeg";

            const imageId =
              workbook.addImage(
                {
                  base64,

                  extension,
                }
              );

            sheet.addImage(
              imageId,
              {
                tl: {
                  col: 6.1,

                  row:
                    rowNumber -
                    1 +
                    0.08,
                },

                ext: {
                  width: 125,

                  height: 115,
                },

                editAs:
                  "oneCell",
              }
            );
          } catch (
            error
          ) {
            console.error(
              "BEFORE image error:",
              error
            );

            sheet.getCell(
              `G${rowNumber}`
            ).value =
              "Foto gagal dimuat";
          }
        } else {
          sheet.getCell(
            `G${rowNumber}`
          ).value =
            "Tidak ada foto";
        }

        // =========================================
        // AFTER PHOTO EXCEL
        // =========================================

        if (afterUrl) {
          try {
            const base64 =
              await urlToDataUrl(
                afterUrl
              );

            const extension:
              | "png"
              | "jpeg" =
              base64.startsWith(
                "data:image/png"
              )
                ? "png"
                : "jpeg";

            const imageId =
              workbook.addImage(
                {
                  base64,

                  extension,
                }
              );

            sheet.addImage(
              imageId,
              {
                tl: {
                  col: 8.1,

                  row:
                    rowNumber -
                    1 +
                    0.08,
                },

                ext: {
                  width: 125,

                  height: 115,
                },

                editAs:
                  "oneCell",
              }
            );
          } catch (
            error
          ) {
            console.error(
              "AFTER image error:",
              error
            );

            sheet.getCell(
              `I${rowNumber}`
            ).value =
              "Foto gagal dimuat";
          }
        } else {
          sheet.getCell(
            `I${rowNumber}`
          ).value =
            "Belum ada AFTER";

          sheet.getCell(
            `I${rowNumber}`
          ).font = {
            italic: true,

            color: {
              argb:
                "FF94A3B8",
            },
          };
        }
      }

      // =============================================
      // EXCEL PRINT SETTINGS
      // =============================================

      sheet.pageSetup = {
        orientation:
          "landscape",

        paperSize: 9,

        fitToPage: true,

        fitToWidth: 1,

        fitToHeight: 0,

        margins: {
          left: 0.25,

          right: 0.25,

          top: 0.5,

          bottom: 0.5,

          header: 0.2,

          footer: 0.2,
        },
      };

      // =============================================
      // DOWNLOAD EXCEL
      // =============================================

      const buffer =
        await workbook.xlsx.writeBuffer();

      const blob =
        new Blob(
          [
            buffer as BlobPart,
          ],
          {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `Safety_Patrol_PT_DREAMWEAR_${selectedMonth.replace(
          "-",
          "_"
        )}.xlsx`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Gagal membuat Excel."
      );
    } finally {
      setExportingExcel(
        false
      );
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-xs font-bold tracking-[0.2em] text-blue-600">
              PT. DREAMWEAR
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Safety Patrol
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Rekap temuan keselamatan bulanan
            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ← Waste Monitoring
            </Link>

            <button
              type="button"
              onClick={
                loadData
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ↻ Refresh
            </button>

            <Link
              href="/safety-patrol/temuan-baru"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Catat Temuan
            </Link>

          </div>

        </div>

        {/* =================================================
            PERIODE
        ================================================= */}

        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Periode Rekap
              </label>

              <input
                type="month"
                value={
                  selectedMonth
                }
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

            <div className="text-left md:text-right">

              <p className="text-sm text-slate-500">
                Periode
              </p>

              <p className="text-xl font-bold text-slate-900">
                {formatMonth(
                  selectedMonth
                )}
              </p>

            </div>

          </div>

        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">

          <SummaryCard
            title="Total Temuan"
            value={
              monthlyFindings.length
            }
            textClass="text-blue-600"
          />

          <SummaryCard
            title="Sudah Diperbaiki"
            value={
              completedCount
            }
            textClass="text-green-600"
          />

          <SummaryCard
            title="Belum Diperbaiki"
            value={
              pendingCount
            }
            textClass="text-amber-500"
          />

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Kategori Terbanyak
            </p>

            <p className="mt-2 text-lg font-bold text-slate-900">

              {categorySummary.length >
              0
                ? categorySummary[0][0]
                : "-"}

            </p>

            <p className="mt-1 text-xs text-slate-400">

              {categorySummary.length >
              0
                ? `${categorySummary[0][1]} temuan`
                : "Belum ada data"}

            </p>

          </div>

        </div>

        {/* =================================================
            EXPORT
        ================================================= */}

        <div className="mt-5 flex flex-wrap gap-3">

          <button
            type="button"
            onClick={
              exportPdf
            }
            disabled={
              exportingPdf ||
              monthlyFindings.length ===
                0
            }
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportingPdf
              ? "Membuat PDF..."
              : "📄 Export PDF"}
          </button>

          <button
            type="button"
            onClick={
              exportExcel
            }
            disabled={
              exportingExcel ||
              monthlyFindings.length ===
                0
            }
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportingExcel
              ? "Membuat Excel..."
              : "📊 Export Excel"}
          </button>

          <div className="flex items-center text-xs text-slate-400">
            Export mengambil seluruh temuan pada bulan yang dipilih.
          </div>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* =================================================
            FILTER
        ================================================= */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="mb-4">

            <h2 className="text-lg font-bold text-slate-900">
              Filter Temuan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cari berdasarkan keterangan, status, area, atau kategori.
            </p>

          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {/* SEARCH */}

            <div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Cari
              </label>

              <input
                type="text"
                value={
                  searchText
                }
                onChange={(e) =>
                  setSearchText(
                    e.target.value
                  )
                }
                placeholder="Cari temuan..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

            </div>

            {/* STATUS */}

            <div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Status
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >

                <option value="SEMUA">
                  Semua Status
                </option>

                <option value="PENDING">
                  Belum Diperbaiki
                </option>

                <option value="SELESAI">
                  Sudah Diperbaiki
                </option>

              </select>

            </div>

            {/* AREA */}

            <div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Area
              </label>

              <select
                value={
                  areaFilter
                }
                onChange={(e) =>
                  setAreaFilter(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >

                <option value="SEMUA">
                  Semua Area
                </option>

                {AREAS.map(
                  (area) => (
                    <option
                      key={
                        area
                      }
                      value={
                        area
                      }
                    >
                      {area}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* CATEGORY */}

            <div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Kategori
              </label>

              <select
                value={
                  categoryFilter
                }
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >

                <option value="SEMUA">
                  Semua Kategori
                </option>

                {CATEGORIES.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {category}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {/* RESULT FILTER */}

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-slate-500">

              Menampilkan{" "}

              <span className="font-bold text-blue-600">
                {
                  filteredFindings.length
                }
              </span>

              {" "}dari{" "}

              <span className="font-bold text-slate-800">
                {
                  monthlyFindings.length
                }
              </span>

              {" "}temuan.

            </p>

            <button
              type="button"
              onClick={
                resetFilter
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              ↺ Reset Filter
            </button>

          </div>

        </div>

        {/* =================================================
            LIST
        ================================================= */}

        <div className="mt-6">

          <div className="mb-4">

            <h2 className="text-xl font-bold text-slate-900">
              Temuan Bulan Ini
            </h2>

            <p className="text-sm text-slate-500">
              Dokumentasi BEFORE & AFTER{" "}
              {formatMonth(
                selectedMonth
              )}
            </p>

          </div>

          {/* LOADING */}

          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

              <div className="text-4xl">
                ⏳
              </div>

              <p className="mt-3 text-slate-500">
                Memuat data...
              </p>

            </div>
          ) : monthlyFindings.length ===
            0 ? (
            // =========================================
            // TIDAK ADA DATA BULAN
            // =========================================

            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

              <div className="text-5xl">
                🦺
              </div>

              <h3 className="mt-4 font-bold text-slate-700">
                Belum Ada Temuan
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Belum ada data untuk{" "}
                {formatMonth(
                  selectedMonth
                )}.
              </p>

              <Link
                href="/safety-patrol/temuan-baru"
                className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Catat Temuan
              </Link>

            </div>
          ) : filteredFindings.length ===
            0 ? (
            // =========================================
            // FILTER TIDAK ADA HASIL
            // =========================================

            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

              <div className="text-5xl">
                🔎
              </div>

              <h3 className="mt-4 font-bold text-slate-700">
                Temuan Tidak Ditemukan
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Tidak ada data yang sesuai dengan filter.
              </p>

              <button
                type="button"
                onClick={
                  resetFilter
                }
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                ↺ Reset Filter
              </button>

            </div>
          ) : (
            // =========================================
            // TEMUAN
            // =========================================

            <div className="grid gap-5">

              {filteredFindings.map(
                (
                  item,
                  index
                ) => {
                  const beforePhoto =
                    item.photo_before_url ||
                    item.photo_url;

                  const beforeTime =
                    item.before_taken_at ||
                    item.created_at;

                  const afterTime =
                    item.after_taken_at;

                  const completed =
                    Boolean(
                      item.photo_after_url
                    );

                  return (
                    <div
                      key={
                        item.id
                      }
                      className="overflow-hidden rounded-2xl bg-white shadow-sm"
                    >

                      {/* =====================================
                          CARD HEADER
                      ===================================== */}

                      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="text-xs font-bold text-blue-600">
                            TEMUAN #
                            {index +
                              1}
                          </p>

                          <h3 className="mt-1 text-xl font-bold text-slate-900">
                            {
                              item.category
                            }
                          </h3>

                        </div>

                        <div className="flex flex-wrap items-center gap-2">

                          {completed ? (
                            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
                              ✅ Sudah Diperbaiki
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
                              ⏳ Belum Diperbaiki
                            </span>
                          )}

                          <Link
                            href={`/safety-patrol/detail?id=${item.id}`}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            {completed
                              ? "Lihat / Edit"
                              : "Tambah AFTER"}
                          </Link>

                        </div>

                      </div>

                      {/* =====================================
                          CARD CONTENT
                      ===================================== */}

                      <div className="p-5">

                        {/* INFO */}

                        <div className="grid gap-3 sm:grid-cols-2">

                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-xs font-bold uppercase text-slate-400">
                              Tanggal Temuan
                            </p>

                            <p className="mt-1 font-semibold text-slate-700">
                              {formatDate(
                                item.finding_date
                              )}
                            </p>

                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-xs font-bold uppercase text-slate-400">
                              Area
                            </p>

                            <p className="mt-1 font-semibold text-slate-700">
                              {
                                item.area
                              }
                            </p>

                          </div>

                        </div>

                        {/* DESCRIPTION */}

                        <div className="mt-4">

                          <p className="text-xs font-bold uppercase text-slate-400">
                            Keterangan Temuan
                          </p>

                          <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">
                            {
                              item.description
                            }
                          </p>

                        </div>

                        {/* =====================================
                            BEFORE AFTER
                        ===================================== */}

                        <div className="mt-5 grid gap-5 md:grid-cols-2">

                          {/* BEFORE */}

                          <div>

                            <div className="mb-2 flex items-center justify-between">

                              <p className="text-xs font-bold text-red-600">
                                BEFORE
                              </p>

                              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                                SEBELUM
                              </span>

                            </div>

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
                                  className="h-[260px] w-full rounded-xl bg-slate-100 object-contain"
                                />

                              </a>
                            ) : (
                              <div className="flex h-[260px] items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                Tidak ada foto
                              </div>
                            )}

                            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">

                              <p className="text-[11px] font-bold uppercase tracking-wide text-red-600">
                                🕒 Waktu Dokumentasi BEFORE
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {formatDateTime(
                                  beforeTime
                                )}
                              </p>

                            </div>

                          </div>

                          {/* AFTER */}

                          <div>

                            <div className="mb-2 flex items-center justify-between">

                              <p className="text-xs font-bold text-green-600">
                                AFTER
                              </p>

                              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-600">
                                SESUDAH
                              </span>

                            </div>

                            {item.photo_after_url ? (
                              <a
                                href={
                                  item.photo_after_url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >

                                <img
                                  src={
                                    item.photo_after_url
                                  }
                                  alt="After"
                                  className="h-[260px] w-full rounded-xl bg-slate-100 object-contain"
                                />

                              </a>
                            ) : (
                              <Link
                                href={`/safety-patrol/detail?id=${item.id}`}
                                className="flex h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-green-200 bg-green-50 text-center"
                              >

                                <div className="text-4xl">
                                  📷
                                </div>

                                <p className="mt-3 font-semibold text-green-700">
                                  Tambah Foto AFTER
                                </p>

                                <p className="mt-1 text-xs text-green-600">
                                  Setelah perbaikan selesai
                                </p>

                              </Link>
                            )}

                            {item.photo_after_url ? (
                              <div className="mt-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">

                                <p className="text-[11px] font-bold uppercase tracking-wide text-green-600">
                                  🕒 Waktu Dokumentasi AFTER
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {formatDateTime(
                                    afterTime
                                  )}
                                </p>

                              </div>
                            ) : (
                              <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">

                                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">
                                  🕒 Waktu Dokumentasi AFTER
                                </p>

                                <p className="mt-1 text-sm font-semibold text-amber-700">
                                  Belum ada
                                </p>

                              </div>
                            )}

                          </div>

                        </div>

                        {/* =====================================
                            ACTION
                        ===================================== */}

                        <div
                          className={`mt-5 rounded-xl p-4 ${
                            item.notes
                              ? "bg-green-50"
                              : "bg-slate-50"
                          }`}
                        >

                          <p
                            className={`text-xs font-bold uppercase ${
                              item.notes
                                ? "text-green-700"
                                : "text-slate-400"
                            }`}
                          >
                            Tindakan / Perbaikan
                          </p>

                          <p
                            className={`mt-1 whitespace-pre-wrap text-sm leading-6 ${
                              item.notes
                                ? "text-green-800"
                                : "text-slate-400"
                            }`}
                          >
                            {item.notes ||
                              "Belum ada tindakan / perbaikan."}
                          </p>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="py-8 text-center text-xs text-slate-400">
          PT. DREAMWEAR • Safety Patrol Monthly Report
        </footer>

      </div>

    </main>
  );
}

// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
  title,
  value,
  textClass,
}: {
  title: string;
  value: number;
  textClass: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${textClass}`}
      >
        {value}
      </p>

    </div>
  );
}