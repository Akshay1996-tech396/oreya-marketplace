const DEFAULT_BUCKET = "oreya-uploads";

type UploadFileOptions = {
  path: string;
  file: File;
  contentType?: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
    bucket,
  };
}

function encodeStoragePath(value: string) {
  return value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function uploadFileToSupabaseStorage({
  path,
  file,
  contentType,
}: UploadFileOptions) {
  const { url, serviceRoleKey, bucket } = getSupabaseConfig();
  const encodedPath = encodeStoragePath(path);
  const uploadUrl = `${url}/storage/v1/object/${encodeURIComponent(
    bucket
  )}/${encodedPath}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": contentType || file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: Buffer.from(await file.arrayBuffer()),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Supabase Storage upload failed (${response.status}): ${responseText || response.statusText}`
    );
  }

  return getSupabasePublicUrl(path);
}

export function getSupabasePublicUrl(path: string) {
  const { url, bucket } = getSupabaseConfig();
  const encodedPath = encodeStoragePath(path);

  return `${url}/storage/v1/object/public/${encodeURIComponent(
    bucket
  )}/${encodedPath}`;
}
