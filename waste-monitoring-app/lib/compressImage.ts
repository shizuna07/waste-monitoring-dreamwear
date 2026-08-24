export type CompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
};

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const TARGET_SIZE = 1024 * 1024; // ± 1 MB

function loadImage(
  file: File,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const img =
        new Image();

      const url =
        URL.createObjectURL(
          file,
        );

      img.onload = () => {
        URL.revokeObjectURL(
          url,
        );

        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(
          url,
        );

        reject(
          new Error(
            "Foto tidak dapat dibaca.",
          ),
        );
      };

      img.src = url;
    },
  );
}

function canvasToBlob(
  canvas:
    HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Gagal mengompres foto.",
              ),
            );

            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        quality,
      );
    },
  );
}

export async function compressImage(
  originalFile: File,
): Promise<CompressionResult> {
  const originalSize =
    originalFile.size;

  // File kecil tidak perlu diproses.
  if (
    originalSize <=
    TARGET_SIZE
  ) {
    return {
      file: originalFile,
      originalSize,
      compressedSize:
        originalSize,
      compressed: false,
    };
  }

  try {
    const image =
      await loadImage(
        originalFile,
      );

    let width =
      image.naturalWidth;

    let height =
      image.naturalHeight;

    const scale =
      Math.min(
        MAX_WIDTH /
          width,
        MAX_HEIGHT /
          height,
        1,
      );

    width =
      Math.round(
        width * scale,
      );

    height =
      Math.round(
        height * scale,
      );

    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width =
      width;

    canvas.height =
      height;

    const context =
      canvas.getContext(
        "2d",
      );

    if (!context) {
      throw new Error(
        "Browser tidak mendukung kompresi gambar.",
      );
    }

    // Background putih agar aman jika input PNG transparan.
    context.fillStyle =
      "#ffffff";

    context.fillRect(
      0,
      0,
      width,
      height,
    );

    context.drawImage(
      image,
      0,
      0,
      width,
      height,
    );

    let quality =
      0.82;

    let blob =
      await canvasToBlob(
        canvas,
        quality,
      );

    // Turunkan kualitas sedikit demi sedikit
    // jika masih lebih dari ±1 MB.
    while (
      blob.size >
        TARGET_SIZE &&
      quality > 0.55
    ) {
      quality -=
        0.07;

      blob =
        await canvasToBlob(
          canvas,
          quality,
        );
    }

    const baseName =
      originalFile.name
        .replace(
          /\.[^.]+$/,
          "",
        )
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "-",
        );

    const compressedFile =
      new File(
        [blob],
        `${baseName}.jpg`,
        {
          type:
            "image/jpeg",

          lastModified:
            Date.now(),
        },
      );

    // Kalau hasil kompres malah lebih besar,
    // pakai foto asli.
    if (
      compressedFile.size >=
      originalSize
    ) {
      return {
        file:
          originalFile,

        originalSize,

        compressedSize:
          originalSize,

        compressed:
          false,
      };
    }

    return {
      file:
        compressedFile,

      originalSize,

      compressedSize:
        compressedFile.size,

      compressed:
        true,
    };
  } catch (error) {
    console.warn(
      "Kompresi dilewati:",
      error,
    );

    // Kalau browser gagal membaca format tertentu
    // seperti format foto tertentu dari HP,
    // upload tetap dilanjutkan memakai file asli.
    return {
      file:
        originalFile,

      originalSize,

      compressedSize:
        originalSize,

      compressed:
        false,
    };
  }
}

export function formatFileSize(
  bytes: number,
) {
  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(
      0,
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(
    1,
  )} MB`;
}
