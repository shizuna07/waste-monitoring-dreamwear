type WatermarkOptions = {
  picName: string;
  recordDate?: string | null;
};

function loadImage(
  file: File,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      const url =
        URL.createObjectURL(
          file,
        );

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
            "Foto tidak dapat dibaca.",
          ),
        );
      };

      image.src = url;
    },
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise(
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

function getJakartaDateTime() {
  const now =
    new Date();

  const date =
    new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone:
          "Asia/Jakarta",
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    ).format(now);

  const time =
    new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone:
          "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).format(now);

  return {
    date,
    time,
  };
}

export async function addPhotoWatermark(
  file: File,
  options: WatermarkOptions,
): Promise<File> {
  const image =
    await loadImage(
      file,
    );

  const width =
    image.naturalWidth;

  const height =
    image.naturalHeight;

  if (
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      "Ukuran foto tidak valid.",
    );
  }

  // Footer sekitar 22% tinggi foto.
  // Karena ditambahkan DI LUAR foto,
  // watermark pasti kelihatan.
  const footerHeight =
    Math.max(
      220,
      Math.round(
        height * 0.22,
      ),
    );

  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width =
    width;

  canvas.height =
    height +
    footerHeight;

  const ctx =
    canvas.getContext(
      "2d",
    );

  if (!ctx) {
    throw new Error(
      "Canvas tidak tersedia.",
    );
  }

  // ========================================
  // FOTO
  // ========================================

  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  ctx.drawImage(
    image,
    0,
    0,
    width,
    height,
  );


  // ========================================
  // FOOTER
  // ========================================

  const footerY =
    height;

  ctx.fillStyle =
    "#0f172a";

  ctx.fillRect(
    0,
    footerY,
    width,
    footerHeight,
  );


  // GARIS BIRU ATAS
  const blueHeight =
    Math.max(
      10,
      Math.round(
        footerHeight * 0.045,
      ),
    );

  ctx.fillStyle =
    "#2563eb";

  ctx.fillRect(
    0,
    footerY,
    width,
    blueHeight,
  );


  const padding =
    Math.max(
      32,
      Math.round(
        width * 0.045,
      ),
    );

  const titleSize =
    Math.max(
      32,
      Math.round(
        width * 0.045,
      ),
    );

  const subtitleSize =
    Math.max(
      23,
      Math.round(
        width * 0.029,
      ),
    );

  const detailSize =
    Math.max(
      21,
      Math.round(
        width * 0.025,
      ),
    );

  const {
    date,
    time,
  } =
    getJakartaDateTime();

  let y =
    footerY +
    blueHeight +
    padding;


  // ========================================
  // PT DREAMWEAR
  // ========================================

  ctx.textBaseline =
    "top";

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    `700 ${titleSize}px Arial, sans-serif`;

  ctx.fillText(
    "PT.DREAMWEAR",
    padding,
    y,
  );

  y +=
    titleSize +
    12;


  // ========================================
  // JENIS BUKTI
  // ========================================

  ctx.fillStyle =
    "#60a5fa";

  ctx.font =
    `700 ${subtitleSize}px Arial, sans-serif`;

  ctx.fillText(
    "BUKTI KEBERSIHAN AREA LIMBAH",
    padding,
    y,
  );

  y +=
    subtitleSize +
    18;


  // ========================================
  // TANGGAL DAN JAM
  // ========================================

  ctx.fillStyle =
    "#f8fafc";

  ctx.font =
    `500 ${detailSize}px Arial, sans-serif`;

  ctx.fillText(
    `${date} • ${time} WIB`,
    padding,
    y,
  );

  y +=
    detailSize +
    14;


  // ========================================
  // PIC
  // ========================================

  ctx.fillText(
    `PIC: ${options.picName || "-"}`,
    padding,
    y,
  );


  // ========================================
  // OUTPUT
  // ========================================

  const blob =
    await canvasToBlob(
      canvas,
    );

  const baseName =
    file.name
      .replace(
        /\.[^.]+$/,
        "",
      )
      .replace(
        /[^a-zA-Z0-9-_]/g,
        "-",
      );

  const result =
    new File(
      [blob],
      `${baseName}-dreamwear.jpg`,
      {
        type:
          "image/jpeg",

        lastModified:
          Date.now(),
      },
    );

  console.log(
    "✅ WATERMARK GENERATED",
    {
      original:
        file.size,
      result:
        result.size,
      width:
        canvas.width,
      height:
        canvas.height,
    },
  );

  return result;
}
