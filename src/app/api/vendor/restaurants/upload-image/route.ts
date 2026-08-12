import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maximumFileSizeInBytes = 5 * 1024 * 1024;

const allowedImageTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function getFileExtension(file: File) {
  return allowedImageTypes[file.type] || "";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Please sign in to upload restaurant images.",
          urls: [],
        },
        { status: 401 }
      );
    }

    if (user.role !== "VENDOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Only vendors can upload restaurant images.",
          urls: [],
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select at least one image.",
          urls: [],
        },
        { status: 400 }
      );
    }

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "restaurants"
    );

    await mkdir(uploadDirectory, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!allowedImageTypes[file.type]) {
        return NextResponse.json(
          {
            success: false,
            message: "Only JPG, PNG, and WEBP images are allowed.",
            urls: [],
          },
          { status: 400 }
        );
      }

      if (file.size > maximumFileSizeInBytes) {
        return NextResponse.json(
          {
            success: false,
            message: "Each image must be 5 MB or smaller.",
            urls: [],
          },
          { status: 400 }
        );
      }

      const fileExtension = getFileExtension(file);
      const fileName = `${Date.now()}-${randomUUID()}${fileExtension}`;
      const filePath = path.join(uploadDirectory, fileName);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await writeFile(filePath, buffer);

      uploadedUrls.push(`/uploads/restaurants/${fileName}`);
    }

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully.",
      urls: uploadedUrls,
    });
  } catch (error) {
    console.error("VENDOR_RESTAURANT_IMAGE_UPLOAD_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to upload restaurant image.",
        urls: [],
      },
      { status: 500 }
    );
  }
}