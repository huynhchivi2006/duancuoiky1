const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://duanbida-1.onrender.com/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  statusCode: number;
  error?: string;
  constructor(message: string, statusCode: number, error?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.error = error;
  }
}

/**
 * Trả về danh sách URL ứng viên cho request:
 * - Khi chạy trên HTTPS và backend là HTTP: ưu tiên qua proxy.php để giải quyết triệt để Mixed Content
 * - Dự phòng tự động chuyển sang URL trực tiếp nếu proxy gặp sự cố
 */
function getCandidateUrls(endpoint: string, qs: string): string[] {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const directUrl = `${DEFAULT_API_URL}${cleanEndpoint}${
    qs ? (cleanEndpoint.includes("?") ? "&" : "?") + qs : ""
  }`;

  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/huynhchivi/doan")
      ? "/huynhchivi/doan"
      : "";

    const proxyUrl = `${basePath}/proxy.php?path=${encodeURIComponent(cleanEndpoint)}${
      qs ? `&${qs}` : ""
    }`;

    // Nếu trang mở qua HTTPS mà API là HTTP, ưu tiên proxy.php để tránh trình duyệt chặn Mixed Content
    // (trừ khi đã ghi nhận proxy không kết nối được backend trong phiên này)
    const proxyDown = sessionStorage.getItem("billiards_proxy_down") === "1";
    if (isHttps && DEFAULT_API_URL.startsWith("http://") && !proxyDown) {
      return [proxyUrl, directUrl];
    }
    return [directUrl, proxyUrl];
  }

  return [directUrl];
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let qs = "";
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    qs = searchParams.toString();
  }

  // Lấy token từ localStorage dự phòng nếu client không dùng cookie
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("billiards_access_token");
  }

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const candidateUrls = getCandidateUrls(endpoint, qs);
  let response: Response | null = null;
  let lastError: any = null;

  for (const targetUrl of candidateUrls) {
    try {
      const res = await fetch(targetUrl, {
        credentials: "include", // Luôn gửi HttpOnly cookie
        headers: {
          ...defaultHeaders,
          ...(headers as Record<string, string>),
        },
        ...restOptions,
      });
      // proxy.php trả 502 khi hosting không kết nối được backend -> thử URL tiếp theo
      if (
        res.status === 502 &&
        targetUrl.includes("proxy.php") &&
        targetUrl !== candidateUrls[candidateUrls.length - 1]
      ) {
        response = res;
        sessionStorage.setItem("billiards_proxy_down", "1");
        continue;
      }
      response = res;
      break;
    } catch (fetchErr: any) {
      lastError = fetchErr;
    }
  }

  if (!response) {
    throw new ApiError(
      lastError?.message || "Không thể kết nối đến máy chủ API",
      0,
      "NETWORK_ERROR",
    );
  }

  // Xử lý response kiểu file (CSV export)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/csv")) {
    if (!response.ok) {
      throw new ApiError("Lỗi khi tải file", response.status);
    }
    return (await response.text()) as any;
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Lỗi HTTP ${response.status}`;
    throw new ApiError(message, response.status, data?.error);
  }

  // Nếu backend trả về enveloped response: { success: true, data: ..., meta: ... }
  if (data && typeof data === "object" && "data" in data) {
    return data.data as T;
  }

  return data as T;
}
