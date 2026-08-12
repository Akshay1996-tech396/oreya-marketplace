"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";

const MAX_LICENSE_FILE_SIZE = 5 * 1024 * 1024;

type UploadResponse = {
  success?: boolean;
  message?: string;
  url?: string | null;
  urls?: string[];
};

type RegisterResponse = {
  message?: string;
  redirectTo?: string;
};

function isPdfFile(file: File) {
  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  return fileName.endsWith(".pdf") || fileType === "application/pdf";
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function uploadLicenseDocument(file: File) {
  const formData = new FormData();

  formData.append("purpose", "vendor-license");
  formData.append("licenseFile", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await readJsonResponse<UploadResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Unable to upload the business license document."
    );
  }

  const uploadedUrl = data.url || data.urls?.[0];

  if (!uploadedUrl) {
    throw new Error(
      "The business license document was uploaded, but no file URL was returned."
    );
  }

  return uploadedUrl;
}

export default function VendorRegisterForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [mobileCountryCode, setMobileCountryCode] = useState("+971");
  const [phone, setPhone] = useState("");

  const [licenseFile, setLicenseFile] = useState("");
  const [licenseDocumentFile, setLicenseDocumentFile] = useState<File | null>(
    null
  );
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const cleanFirstName = firstName.trim();
      const cleanLastName = lastName.trim();
      const fullName = `${cleanFirstName} ${cleanLastName}`.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();

      if (!cleanFirstName) {
        setErrorMessage("Please enter your first name.");
        return;
      }

      if (!cleanLastName) {
        setErrorMessage("Please enter your last name.");
        return;
      }

      if (!cleanEmail) {
        setErrorMessage("Please enter your email address.");
        return;
      }

      if (!cleanPhone) {
        setErrorMessage("Please enter your mobile number.");
        return;
      }

      if (!licenseDocumentFile) {
        setErrorMessage("Please upload your business license document.");
        return;
      }

      if (!isPdfFile(licenseDocumentFile)) {
        setErrorMessage("Please upload a valid PDF license document.");
        return;
      }

      if (licenseDocumentFile.size > MAX_LICENSE_FILE_SIZE) {
        setErrorMessage("License document must be 5 MB or smaller.");
        return;
      }

      if (!licenseExpiry) {
        setErrorMessage("Please select the license expiry date.");
        return;
      }

      if (!termsAccepted) {
        setErrorMessage("Please accept the terms and conditions.");
        return;
      }

      setSuccessMessage("Uploading business license document...");

      const uploadedLicenseFile = await uploadLicenseDocument(
        licenseDocumentFile
      );

      setLicenseFile(uploadedLicenseFile);
      setSuccessMessage("");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "VENDOR",

          firstName: cleanFirstName,
          lastName: cleanLastName,
          name: fullName,

          email: cleanEmail,
          mobileCountryCode,
          phone: cleanPhone,

          licenseFile: uploadedLicenseFile,
          licenseExpiry,
          termsAccepted,

          /*
           * These values are intentionally kept for compatibility with the
           * existing vendor registration API. The vendor will complete the
           * detailed business profile later from /vendor/profile.
           */
          brandName: "",
          businessName: fullName,
          companyName: "",
          branchName: "",
          website: "",
          residentialCountryCode: "",
          residentialPhone: "",
          country: "",
          state: "",
          city: "",
          addressLine1: "",
          addressLine2: "",
          zipCode: "",
        }),
      });

      const data = await readJsonResponse<RegisterResponse>(response);

      if (!response.ok) {
        setErrorMessage(
          data.message || "Unable to create the vendor account."
        );
        return;
      }

      setSuccessMessage(
        data.message || "Vendor account created successfully."
      );

      setTimeout(() => {
        router.push(data.redirectTo || "/login");
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error("VENDOR_REGISTER_ERROR", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-black outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-black";

  const selectClass =
    "h-11 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-black outline-none transition-colors duration-200 focus:border-black";

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-black">
          Welcome To OREYA Marketplace
        </p>

        <p className="mx-auto mt-6 max-w-[560px] text-sm leading-6 text-black">
          Hi! We would love to have you sell with us. To register, please fill the form below. We will get in touch with you soon.
        </p>
      </div>

      {errorMessage ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-1">
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name*"
            className={inputClass}
            autoComplete="given-name"
            required
          />

          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Last name*"
            className={inputClass}
            autoComplete="family-name"
            required
          />

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address*"
            className={inputClass}
            autoComplete="email"
            required
          />

          <div className="grid grid-cols-[110px_1fr] gap-3">
            <select
              value={mobileCountryCode}
              onChange={(event) => setMobileCountryCode(event.target.value)}
              className={selectClass}
              aria-label="Mobile country code"
            >
              <option value="+971">+971</option>
              <option value="+91">+91</option>
              <option value="+93">+93</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
            </select>

            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Mobile number*"
              className={inputClass}
              autoComplete="tel"
              required
            />
          </div>

          <div>
            <input
              id="vendorLicenseFile"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] || null;

                setLicenseDocumentFile(selectedFile);
                setLicenseFile(selectedFile?.name || "");
              }}
              className="sr-only"
              required
            />

            <label
              htmlFor="vendorLicenseFile"
              className="flex h-11 w-full overflow-hidden rounded-md border border-gray-300 bg-white text-sm text-black outline-none transition-colors duration-200 hover:border-black focus:border-black"
            >
              <span className="group flex h-full cursor-pointer items-center gap-2 bg-[linear-gradient(135deg,#000000_0%,#1f1f1f_45%,#4b4b4b_75%,#ffffff_160%)] px-4 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-[1px] hover:shadow-md active:translate-y-0">
                <FontAwesomeIcon
                  icon={faCloudArrowUp}
                  className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:-translate-y-0.5"
                />
                Choose file
              </span>

              <span className="flex min-w-0 flex-1 items-center truncate px-4 text-gray-500">
                {licenseFile || "Upload business license PDF*"}
              </span>
            </label>

            <p className="mt-2 px-1 text-xs leading-5 text-gray-500">
              Only PDF files are accepted. Maximum file size is 5 MB.
            </p>
          </div>

          <CustomDatePicker
            id="licenseExpiry"
            name="licenseExpiry"
            value={licenseExpiry}
            onChange={setLicenseExpiry}
            required
            placeholder="Select license expiry date*"
          />
        </div>

        <label className="flex gap-3 px-2 pt-2 text-xs leading-5 text-black">
          <input
            id="termsAccepted"
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
            required
          />

          <span className="text-xs leading-5 text-black">
            I agree to the {" "}
            <Link href="/terms-of-service" className="underline">
              Terms and Conditions
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 h-11 w-full rounded-md bg-black text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Submitting application..." : "Join as Partner"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-black">
        Already a partner?{" "}
        <Link href="/vendor/login" className="font-medium underline">
          Sign in.
        </Link>
      </div>

      <div className="mt-3 text-center text-sm text-gray-600">
        Want to shop?{" "}
        <Link href="/register" className="font-medium text-black underline">
          Create customer account
        </Link>
      </div>
    </div>
  );
}