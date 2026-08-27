type WatermarkOptions = {
  picName: string;
  recordDate: string;
};

function loadImage(
  file: File,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();
      const url =
        URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(
          url,
        );

        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          url,
        );

        reject(
          new Error(
            "Gagal membaca foto.",
          ),
        );
      };

      image.src = url;
    },
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(
    radius,
    width / 2,
    height / 2,
  );

  ctx.beginPath();

  ctx.moveTo(
    x + r,
    y,
  );

  ctx.lineTo(
    x + width - r,
    y,
  );

  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + r,
  );

  ctx.lineTo(
    x + width,
    y + height - r,
  );

  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height,
  );

  ctx.lineTo(
    x + r,
    y + height,
  );

  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - r,
  );

  ctx.lineTo(
    x,
    y + r,
  );

  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y,
  );

  ctx.closePath();
}

function formatRecordDate(
  recordDate: string,
) {
  try {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone:
          "Asia/Jakarta",
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    ).format(
      new Date(
        `${recordDate}T00:00:00+07:00`,
      ),
    );
  } catch {
    return recordDate;
  }
}

function jakartaTime() {
  try {
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
      new Date(),
    );
  } catch {
    return "";
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
) {
  return new Promise<Blob>(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Gagal membuat foto watermark.",
              ),
            );

            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        0.9,
      );
    },
  );
}

export async function addPhotoWatermark(
  file: File,
  {
    picName,
    recordDate,
  }: WatermarkOptions,
): Promise<File> {
  try {
    const image =
      await loadImage(file);

    const canvas =
      document.createElement(
        "canvas",
      );

    /*
     * PENTING:
     * Ukuran canvas SAMA dengan foto.
     * Tidak ada footer tambahan.
     */
    canvas.width =
      image.naturalWidth;

    canvas.height =
      image.naturalHeight;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      return file;
    }

    const width =
      canvas.width;

    const height =
      canvas.height;

    ctx.drawImage(
      image,
      0,
      0,
      width,
      height,
    );

    /*
     * Semua ukuran mengikuti
     * resolusi foto.
     */
    const scale =
      Math.max(
        0.7,
        Math.min(
          width / 1200,
          1.8,
        ),
      );

    const margin =
      Math.max(
        22,
        Math.round(
          36 * scale,
        ),
      );

    const paddingX =
      Math.round(
        28 * scale,
      );

    const paddingY =
      Math.round(
        24 * scale,
      );

    const titleSize =
      Math.max(
        22,
        Math.round(
          34 * scale,
        ),
      );

    const subtitleSize =
      Math.max(
        15,
        Math.round(
          20 * scale,
        ),
      );

    const smallSize =
      Math.max(
        13,
        Math.round(
          17 * scale,
        ),
      );

    const titleLine =
      Math.round(
        titleSize * 1.25,
      );

    const subtitleLine =
      Math.round(
        subtitleSize * 1.4,
      );

    const smallLine =
      Math.round(
        smallSize * 1.5,
      );

    const boxHeight =
      paddingY * 2 +
      titleLine +
      subtitleLine +
      smallLine * 2;

    /*
     * Lebar watermark ±60% foto,
     * tapi tidak boleh terlalu besar.
     */
    const boxWidth =
      Math.min(
        width -
          margin * 2,
        Math.max(
          Math.round(
            width * 0.58,
          ),
          Math.round(
            480 * scale,
          ),
        ),
      );

    const x =
      margin;

    const y =
      height -
      margin -
      boxHeight;

    const radius =
      Math.round(
        18 * scale,
      );

    /*
     * Backdrop transparan.
     */
    roundedRect(
      ctx,
      x,
      y,
      boxWidth,
      boxHeight,
      radius,
    );

    ctx.fillStyle =
      "rgba(2, 10, 28, 0.43)";

    ctx.fill();

    /*
     * Border tipis transparan.
     */
    roundedRect(
      ctx,
      x,
      y,
      boxWidth,
      boxHeight,
      radius,
    );

    ctx.strokeStyle =
      "rgba(255, 255, 255, 0.16)";

    ctx.lineWidth =
      Math.max(
        1,
        Math.round(scale),
      );

    ctx.stroke();

    /*
     * Garis aksen biru kiri.
     */
    ctx.fillStyle =
      "rgba(59, 130, 246, 0.90)";

    roundedRect(
      ctx,
      x,
      y,
      Math.max(
        5,
        Math.round(
          6 * scale,
        ),
      ),
      boxHeight,
      Math.max(
        3,
        Math.round(
          5 * scale,
        ),
      ),
    );

    ctx.fill();

    const textX =
      x +
      paddingX;

    let textY =
      y +
      paddingY;

    ctx.textBaseline =
      "top";

    /*
     * PT.DREAMWEAR
     */
    ctx.font =
      `800 ${titleSize}px Arial, sans-serif`;

    ctx.fillStyle =
      "rgba(255,255,255,0.96)";

    ctx.fillText(
      "PT.DREAMWEAR",
      textX,
      textY,
    );

    textY +=
      titleLine;

    /*
     * Judul bukti
     */
    ctx.font =
      `700 ${subtitleSize}px Arial, sans-serif`;

    ctx.fillStyle =
      "rgba(96,165,250,0.98)";

    ctx.fillText(
      "BUKTI KEBERSIHAN AREA LIMBAH",
      textX,
      textY,
    );

    textY +=
      subtitleLine;

    /*
     * Tanggal + jam
     */
    ctx.font =
      `500 ${smallSize}px Arial, sans-serif`;

    ctx.fillStyle =
      "rgba(255,255,255,0.88)";

    ctx.fillText(
      `${formatRecordDate(
        recordDate,
      )} • ${jakartaTime()} WIB`,
      textX,
      textY,
    );

    textY +=
      smallLine;

    /*
     * PIC
     */
    ctx.fillStyle =
      "rgba(255,255,255,0.88)";

    ctx.fillText(
      `PIC: ${picName}`,
      textX,
      textY,
    );

    const blob =
      await canvasToBlob(
        canvas,
      );

    const originalName =
      file.name.replace(
        /\.[^.]+$/,
        "",
      );

    return new File(
      [
        blob,
      ],
      `${originalName}-watermarked.jpg`,
      {
        type: "image/jpeg",
        lastModified:
          Date.now(),
      },
    );
  } catch (error) {
    console.error(
      "Gagal menambahkan watermark:",
      error,
    );

    /*
     * Jangan bikin upload gagal
     * cuma gara-gara watermark.
     */
    return file;
  }
}
