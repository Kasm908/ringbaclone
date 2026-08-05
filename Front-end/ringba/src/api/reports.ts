import client from "./client";
import type { PaginatedReports, ScamReport, Stats, ActionResult, SentEmail, ScreenshotAvailability, ScreenshotType, BulkScanProgress } from "../types";

/** Save an in-memory payload to the user's disk via a temporary object URL. */
const saveBlob = (data: BlobPart, mime: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Errors on `responseType: "blob"` requests arrive with a Blob body, so the
 * usual `err.response.data.detail` is undefined. Read the Blob back to text
 * to recover the real message.
 */
const readBlobError = async (err: any, fallback: string): Promise<string> => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        return parsed.detail || parsed.message || fallback;
      } catch {
        return text || fallback;
      }
    } catch {
      return fallback;
    }
  }
  return data?.detail || err?.message || fallback;
};

export const reportsApi = {
  getStats: async (): Promise<Stats> => {
    const res = await client.get("/v1/stats");
    return res.data;
  },

  listReports: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedReports> => {
    const res = await client.get("/v1/reports", { params });
    return res.data;
  },

  createReport: async (data: {
    brand: string;
    phone_number: string;
    landing_url?: string;
    notes?: string;
  }): Promise<ScamReport> => {
    const res = await client.post("/v1/reports", data);
    return res.data;
  },

  getReport: async (id: string): Promise<ScamReport> => {
    const res = await client.get(`/v1/reports/${id}`);
    return res.data;
  },

  triggerReport: async (id: string): Promise<ActionResult> => {
    const res = await client.post(`/v1/reports/${id}/report`);
    return res.data;
  },

  killReport: async (id: string): Promise<ActionResult> => {
    const res = await client.post(`/v1/reports/${id}/kill`);
    return res.data;
  },

  updateStatus: async (id: string, status: string): Promise<ActionResult> => {
    const res = await client.patch(`/v1/reports/${id}/status`, null, {
      params: { status },
    });
    return res.data;
  },

  lookup: async (data: { input: string; is_url: boolean }): Promise<any> => {
    const res = await client.post("/v1/lookup", data);
    return res.data;
  },

  getLookupResult: async (lookupId: string): Promise<any> => {
    const res = await client.get(`/v1/lookup/${lookupId}/result`);
    return res.data;
  },

  sendEmail: async (reportId: string, payload: { to: string; cc: string[]; bcc: string[]; subject: string; body: string; attachments: { name: string; type: string; data: string }[] }) => {
    const response = await client.post(`/v1/reports/${reportId}/email`, payload);
    return response.data;
  },

  getReportEmails: async (reportId: string): Promise<SentEmail[]> => {
    const response = await client.get(`/v1/reports/${reportId}/emails`);
    return response.data;
  },

  getAllEmails: async (): Promise<SentEmail[]> => {
  const response = await client.get("/v1/emails/all");
  return response.data;
  } ,

  searchFacebookAds: async (domain: string, campaignId: string = "") => {
      const res = await client.get("/v1/ad-library/facebook", {
          params: { domain, campaign_id: campaignId },
      });
      return res.data;
  },

  searchGoogleAds: async (domain: string) => {
    const res = await client.get("/v1/ad-library/google", {
        params: { domain },
    });
    return res.data;
  },

  /**
   * Fetch the CSV through the authenticated axios client rather than
   * window.open. Bearer auth lives in an Authorization header, which a plain
   * browser navigation cannot set — the old `?token=` URL always came back 401.
   */
  exportCsv: async (): Promise<void> => {
    try {
      const res = await client.get("/v1/reports/export", { responseType: "blob" });
      const disposition = res.headers["content-disposition"] as string | undefined;
      const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] || "scam_reports.csv";
      saveBlob(res.data, "text/csv;charset=utf-8", filename);
    } catch (err: any) {
      throw new Error(await readBlobError(err, "Could not export reports."));
    }
  },

  startBulkScan: async (
    urls: string[]
  ): Promise<{ scan_id: string; total: number; truncated: number; message: string }> => {
    const res = await client.post("/v1/bulk-scan", { urls });
    return res.data;
  },

  getBulkScan: async (scanId: string): Promise<BulkScanProgress> => {
    const res = await client.get(`/v1/bulk-scan/${scanId}`);
    return res.data;
  },

  getScreenshots: async (reportId: string): Promise<ScreenshotAvailability> => {
    const res = await client.get(`/v1/reports/${reportId}/screenshots`);
    return res.data;
  },

  downloadScreenshot: async (reportId: string, type: ScreenshotType): Promise<void> => {
    try {
      const res = await client.get(`/v1/reports/${reportId}/screenshot`, {
        params: { type },
        responseType: "blob",
      });
      saveBlob(res.data, "image/png", `${type}_complaint_${reportId}.png`);
    } catch (err: any) {
      throw new Error(
        await readBlobError(err, `No ${type.toUpperCase()} screenshot available yet.`)
      );
    }
  },
  sendComplaint: async (reportId: string, payload: any) => {
  const response = await client.post(`/v1/reports/${reportId}/send-complaint`, payload);
  return response.data;
  },
};