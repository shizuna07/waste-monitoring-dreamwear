"use client";

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type WasteRecord = {
  id: string;
  record_date: string;
  pic_name: string | null;
  photo_path: string | null;
  cleanliness_photo_at: string | null;
};

type Props = {
  selectedMonth: string;
  records: WasteRecord[];
};

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function periodName(
  selectedMonth: string,
) {
  const [year, month] =
    selectedMonth.split("-");

  return `${monthNames[
    Number(month) - 1
  ]} ${year}`;
}

function formatDate(
  value: string,
) {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
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

export default function ComplianceExportButtons({
  selectedMonth,
  records,
}: Props) {
  const total =
    records.length;

  const complete =
    records.filter(
      (item) =>
        Boolean(
          item.photo_path,
        ),
    ).length;

  const incomplete =
    total - complete;

  const percentage =
    total > 0
      ? (complete / total) *
        100
      : 0;

  function exportExcel() {
    const rows =
      records.map(
        (item, index) => ({
          No:
            index + 1,

          Tanggal:
            formatDate(
              item.record_date,
            ),

          PIC:
            item.pic_name ??
            "-",

          Status:
            item.photo_path
              ? "Lengkap"
              : "Belum Ada Foto",

          "Jam Foto":
            item.photo_path
              ? `${formatTime(
                  item.cleanliness_photo_at,
                )} WIB`
              : "-",
        }),
      );

    rows.push({
      No: 0,
      Tanggal:
        "TOTAL / REKAP",
      PIC:
        `${complete}/${total} Hari`,
      Status:
        `Kepatuhan ${percentage.toFixed(
          1,
        )}%`,
      "Jam Foto":
        `${incomplete} Hari Belum Lengkap`,
    });

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows,
      );

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Kepatuhan Kebersihan",
    );

    XLSX.writeFile(
      workbook,
      `Kepatuhan-Kebersihan-${selectedMonth}.xlsx`,
    );
  }

  function exportPdf() {
    const doc =
      new jsPDF({
        orientation:
          "portrait",
        unit: "mm",
        format: "a4",
      });

    doc.setFontSize(16);
    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.text(
      "PT.DREAMWEAR",
      14,
      16,
    );

    doc.setFontSize(13);

    doc.text(
      "LAPORAN KEPATUHAN KEBERSIHAN AREA LIMBAH",
      14,
      24,
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(10);

    doc.text(
      `Periode: ${periodName(
        selectedMonth,
      )}`,
      14,
      32,
    );

    doc.text(
      `Hari Pencatatan: ${total} Hari`,
      14,
      39,
    );

    doc.text(
      `Bukti Lengkap: ${complete} Hari`,
      14,
      45,
    );

    doc.text(
      `Belum Ada Foto: ${incomplete} Hari`,
      14,
      51,
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.text(
      `Tingkat Kepatuhan: ${percentage.toFixed(
        1,
      )}%`,
      14,
      59,
    );

    autoTable(
      doc,
      {
        startY: 67,

        head: [[
          "No",
          "Tanggal",
          "PIC",
          "Status",
          "Jam Foto",
        ]],

        body:
          records.map(
            (
              item,
              index,
            ) => [
              index + 1,

              formatDate(
                item.record_date,
              ),

              item.pic_name ??
                "-",

              item.photo_path
                ? "Lengkap"
                : "Belum Foto",

              item.photo_path
                ? `${formatTime(
                    item.cleanliness_photo_at,
                  )} WIB`
                : "-",
            ],
          ),

        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },

        headStyles: {
          fillColor: [
            37,
            99,
            235,
          ],
        },

        columnStyles: {
          0: {
            cellWidth: 12,
          },

          1: {
            cellWidth: 42,
          },

          2: {
            cellWidth: 42,
          },

          3: {
            cellWidth: 35,
          },

          4: {
            cellWidth: 28,
          },
        },
      },
    );

    const pages =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= pages;
      page++
    ) {
      doc.setPage(page);

      doc.setFontSize(8);
      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        `Waste Monitoring PT.DREAMWEAR | Halaman ${page}/${pages}`,
        14,
        290,
      );
    }

    doc.save(
      `Kepatuhan-Kebersihan-${selectedMonth}.pdf`,
    );
  }

  const disabled =
    records.length === 0;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={
          exportExcel
        }
        disabled={
          disabled
        }
        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        📊 Export Excel
      </button>

      <button
        type="button"
        onClick={
          exportPdf
        }
        disabled={
          disabled
        }
        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        📄 Export PDF
      </button>
    </div>
  );
}
