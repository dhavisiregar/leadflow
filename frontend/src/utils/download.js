// Triggers a browser download for an in-memory blob (used for authenticated
// CSV export responses, which can't just be linked to directly since they
// need the Authorization header).
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// axios error responses inherit the request's responseType, so a failed
// `blob` request (e.g. a 403 plan-limit error) comes back as a Blob instead
// of parsed JSON. This reads it back out so the usual `message` field works.
export async function readBlobErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      return JSON.parse(text).message || fallback;
    } catch {
      return fallback;
    }
  }
  return err?.response?.data?.message || fallback;
}
