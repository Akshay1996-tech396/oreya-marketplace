import { randomUUID } from "crypto";
import path from "path";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileToSupabaseStorage } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IMAGE_UPLOAD_SIZE_SETTING_KEY =
  "maxImageUploadSizeMb";

const DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB = 5;
const MIN_MAX_IMAGE_UPLOAD_SIZE_MB = 1;
const MAX_MAX_IMAGE_UPLOAD_SIZE_MB = 50;

const MAX_LICENSE_FILE_SIZE_BYTES =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

type UploadResult = {
  success: boolean;
  status: number;
  message: string;
  urls: string[];
};

function cleanString(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function formatMegabytes(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}

function getSafeImageExtension(
  fileName: string,
  mimeType: string
) {
  const originalExtension = path
    .extname(fileName)
    .toLowerCase();

  if (
    ALLOWED_IMAGE_EXTENSIONS.has(
      originalExtension
    )
  ) {
    return originalExtension;
  }

  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/jpg"
  ) {
    return ".jpg";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/gif") {
    return ".gif";
  }

  if (mimeType === "image/avif") {
    return ".avif";
  }

  return "";
}

function isPdfFile(file: File) {
  const fileName = file.name || "";
  const fileType = file.type || "";
  const extension = path
    .extname(fileName)
    .toLowerCase();

  return (
    extension === ".pdf" &&
    (fileType === "application/pdf" ||
      fileType ===
        "application/octet-stream" ||
      fileType === "")
  );
}

function isVendorLicenseUpload(
  formData: FormData
) {
  const purpose = cleanString(
    formData.get("purpose")
  ).toLowerCase();

  const uploadType = cleanString(
    formData.get("uploadType")
  ).toLowerCase();

  const folder = cleanString(
    formData.get("folder")
  ).toLowerCase();

  const hasLicenseFileField = formData
    .getAll("licenseFile")
    .some(
      (item) => typeof item !== "string"
    );

  return (
    purpose === "vendor-license" ||
    purpose === "license" ||
    uploadType === "vendor-license" ||
    uploadType === "license" ||
    folder === "vendor-license" ||
    folder === "licenses" ||
    hasLicenseFileField
  );
}

function getImageUploadFolder(
  formData: FormData
) {
  const requestedFolder = (
    cleanString(formData.get("folder")) ||
    cleanString(formData.get("purpose")) ||
    cleanString(formData.get("uploadType"))
  ).toLowerCase();

  const folderMap: Record<string, string> = {
    product: "products",
    products: "products",
    service: "services",
    services: "services",
    restaurant: "restaurants",
    restaurants: "restaurants",
    "restaurant-menu": "restaurant-menu-items",
    "restaurant-menu-item":
      "restaurant-menu-items",
    "restaurant-menu-items":
      "restaurant-menu-items",
    menu: "restaurant-menu-items",
    category: "categories",
    categories: "categories",
    "service-provider":
      "service-providers",
    "service-providers":
      "service-providers",
    provider: "service-providers",
    providers: "service-providers",
  };

  return folderMap[requestedFolder] || "images";
}

function collectUploadedFiles(
  formData: FormData
) {
  return [
    ...formData.getAll("files"),
    ...formData.getAll("file"),
    ...formData.getAll("image"),
    ...formData.getAll("licenseFile"),
  ].filter(
    (item): item is File =>
      typeof item !== "string"
  );
}

async function getMaximumImageUploadSize() {
  try {
    const setting =
      await prisma.setting.findUnique({
        where: {
          key: IMAGE_UPLOAD_SIZE_SETTING_KEY,
        },
        select: {
          value: true,
        },
      });

    if (!setting) {
      return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
    }

    const configuredValue = Number(
      setting.value
    );

    if (
      !Number.isFinite(configuredValue) ||
      configuredValue <
        MIN_MAX_IMAGE_UPLOAD_SIZE_MB ||
      configuredValue >
        MAX_MAX_IMAGE_UPLOAD_SIZE_MB
    ) {
      console.warn(
        "INVALID_IMAGE_UPLOAD_SIZE_SETTING",
        {
          key: IMAGE_UPLOAD_SIZE_SETTING_KEY,
          value: setting.value,
          fallback:
            DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB,
        }
      );

      return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
    }

    return configuredValue;
  } catch (error) {
    console.error(
      "READ_IMAGE_UPLOAD_SIZE_SETTING_ERROR",
      error
    );

    return DEFAULT_MAX_IMAGE_UPLOAD_SIZE_MB;
  }
}

async function saveVendorLicenseFiles(
  files: File[]
): Promise<UploadResult> {
  for (const file of files) {
    const fileName =
      file.name || "vendor-license.pdf";

    if (!isPdfFile(file)) {
      return {
        success: false,
        status: 400,
        message:
          "Unsupported license document type. Upload a valid PDF document.",
        urls: [],
      };
    }

    if (
      file.size >
      MAX_LICENSE_FILE_SIZE_BYTES
    ) {
      return {
        success: false,
        status: 400,
        message: `License document "${fileName}" exceeds the maximum allowed size of 5 MB.`,
        urls: [],
      };
    }
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const uniqueFileName = `vendor-license-${randomUUID()}.pdf`;
    const storagePath = `vendors/licenses/${uniqueFileName}`;

    const uploadedUrl = await uploadFileToSupabaseStorage({
      path: storagePath,
      file,
      contentType: "application/pdf",
    });

    uploadedUrls.push(uploadedUrl);
  }

  return {
    success: true,
    status: 200,
    message:
      files.length === 1
        ? "License document uploaded successfully."
        : "License documents uploaded successfully.",
    urls: uploadedUrls,
  };
}

async function saveImageFiles(
  files: File[],
  uploadFolder: string,
  maximumFileSizeMb: number
): Promise<UploadResult> {
  const maximumFileSizeBytes = Math.floor(
    maximumFileSizeMb * 1024 * 1024
  );

  for (const file of files) {
    const fileName =
      file.name || "uploaded-image";

    const fileType = file.type || "";

    const extension = getSafeImageExtension(
      fileName,
      fileType
    );

    if (!extension) {
      return {
        success: false,
        status: 400,
        message:
          "Unsupported image type. Upload a JPG, PNG, WEBP, GIF or AVIF image.",
        urls: [],
      };
    }

    if (
      fileType &&
      !ALLOWED_IMAGE_MIME_TYPES.has(fileType)
    ) {
      return {
        success: false,
        status: 400,
        message: `Unsupported image type "${fileType}". Upload a JPG, PNG, WEBP, GIF or AVIF image.`,
        urls: [],
      };
    }

    if (file.size <= 0) {
      return {
        success: false,
        status: 400,
        message: `Image "${fileName}" is empty or invalid.`,
        urls: [],
      };
    }

    if (file.size > maximumFileSizeBytes) {
      return {
        success: false,
        status: 400,
        message: `Image "${fileName}" exceeds the administrator-configured limit of ${formatMegabytes(
          maximumFileSizeMb
        )} MB per image.`,
        urls: [],
      };
    }
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const extension = getSafeImageExtension(
      file.name || "uploaded-image",
      file.type || ""
    );

    const uniqueFileName = `${randomUUID()}${extension}`;
    const storagePath = `${uploadFolder}/${uniqueFileName}`;

    const uploadedUrl = await uploadFileToSupabaseStorage({
      path: storagePath,
      file,
      contentType: file.type || undefined,
    });

    uploadedUrls.push(uploadedUrl);
  }

  return {
    success: true,
    status: 200,
    message:
      files.length === 1
        ? "Image uploaded successfully."
        : "Images uploaded successfully.",
    urls: uploadedUrls,
  };
}

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const files =
      collectUploadedFiles(formData);

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No file was received. Select a file and try again.",
        },
        {
          status: 400,
        }
      );
    }

    if (isVendorLicenseUpload(formData)) {
      const uploadResult =
        await saveVendorLicenseFiles(files);

      return NextResponse.json(
        {
          success: uploadResult.success,
          message: uploadResult.message,
          url:
            uploadResult.urls[0] || null,
          urls: uploadResult.urls,
        },
        {
          status: uploadResult.status,
        }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please sign in to upload images.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      user.role !== "VENDOR" &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only administrators and vendors can upload marketplace images.",
        },
        {
          status: 403,
        }
      );
    }

    const maximumImageUploadSizeMb =
      await getMaximumImageUploadSize();

    const uploadFolder =
      getImageUploadFolder(formData);

    const uploadResult =
      await saveImageFiles(
        files,
        uploadFolder,
        maximumImageUploadSizeMb
      );

    return NextResponse.json(
      {
        success: uploadResult.success,
        message: uploadResult.message,
        url:
          uploadResult.urls[0] || null,
        urls: uploadResult.urls,
        maximumImageUploadSizeMb,
      },
      {
        status: uploadResult.status,
      }
    );
  } catch (error) {
    console.error(
      "UPLOAD_FILE_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "File upload failed.",
      },
      {
        status: 500,
      }
    );
  }
}