"use client";

import { useRef, useState } from "react";
import { useSupplierData } from "@/context/SupplierDataContext";

export function UploadScreen({ title = "Upload supplier data" }: { title?: string }) {
  const { refetch } = useSupplierData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setErrors(["Choose a .xlsx file first."]);
      return;
    }

    setSubmitting(true);
    setErrors(null);
    setSuccessCount(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors ?? ["Upload failed."]);
        return;
      }

      setSuccessCount(data.count);
      if (inputRef.current) inputRef.current.value = "";
      await refetch();
    } catch {
      setErrors(["Upload failed. Check your connection and try again."]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Upload the supplier data template (.xlsx). This replaces the current dataset.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="block w-full text-sm text-ink-soft file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-ink hover:file:opacity-90"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Uploading…" : "Upload"}
        </button>
      </form>

      {successCount !== null && (
        <p className="mt-4 rounded-md bg-healthy-bg px-4 py-3 text-sm text-healthy-fg">
          Uploaded {successCount} supplier{successCount === 1 ? "" : "s"}.
        </p>
      )}

      {errors && errors.length > 0 && (
        <div className="mt-4 rounded-md bg-risk-bg px-4 py-3 text-sm text-risk-fg">
          <p className="font-medium">Upload failed:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
