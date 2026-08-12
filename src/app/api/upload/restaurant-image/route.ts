import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { uploadFileToSupabaseStorage } from "@/lib/supabase-storage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

function getFileExtension(file: File) {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase();

  if (
    extensionFromName &&
    ["jpg", "jpeg", "png", "webp", "gif"].includes(extensionFromName)
  ) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  if (file.type === "image/jpeg" || file.type === "image/jpg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";

  return "jpg";
}

async function saveImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, WEBP and GIF images are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image size 5MB se kam honi chahiye.");
  }

  const extension = getFileExtension(file);
  const fileName = `${randomUUID()}.${extension}`;
  const storagePath = `restaurants/${fileName}`;

  return uploadFileToSupabaseStorage({
    path: storagePath,
    file,
    contentType: file.type,
  });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Only vendor/admin can upload images." },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please select at least one image." },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, message: "Maximum 10 images upload kar sakte ho." },
        { status: 400 }
      );
    }

    const urls = [];

    for (const file of files) {
      const url = await saveImage(file);
      urls.push(url);
    }

    return NextResponse.json({
      success: true,
      urls,
    });
  } catch (error) {
    console.error("RESTAURANT_IMAGE_UPLOAD_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Image upload nahi ho payi.",
      },
      { status: 500 }
    );
  }
}