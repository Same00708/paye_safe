import { getStoredToken } from "../context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    const msg = body.error ?? body.message;
    if (res.status === 503 && msg) {
      throw new Error(msg);
    }
    throw new Error(msg ?? `Erreur HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () =>
    request<{ status: string; database: string }>("/health"),

  register: (body: { phoneNumber: string; fullName: string; username: string }) =>
    request<{ token: string; user: import("../context/AuthContext").AuthUser; message?: string }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(body) },
    ),

  login: (phoneNumber: string) =>
    request<{ token: string; user: import("../context/AuthContext").AuthUser }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ phoneNumber }) },
    ),

  getMe: () =>
    request<{ data: import("../context/AuthContext").AuthUser }>("/auth/me"),

  getUsers: () =>
    request<{ data: import("../context/AuthContext").AuthUser[] }>("/users"),

  getUsersSearch: (q: string) =>
    request<{ data: import("../context/AuthContext").AuthUser[] }>(
      q ? `/users/search?q=${encodeURIComponent(q)}` : "/users",
    ),

  getTransactions: () =>
    request<{ data: import("../types/transaction").Transaction[] }>("/transactions"),

  getTransaction: (id: number) =>
    request<{ data: import("../types/transaction").Transaction }>(`/transactions/${id}`),

  createTransaction: (body: {
    title: string;
    description?: string;
    amount: number;
    sellerId: number;
  }) =>
    request<{ data: import("../types/transaction").Transaction }>("/transactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  payTransaction: (id: number, body: { mode?: string; phone?: string }) =>
    request<{ data: { paymentUrl: string; stub: boolean } }>(`/transactions/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  simulatePayment: (id: number) =>
    request(`/transactions/${id}/simulate-payment`, { method: "POST" }),

  markShipped: (id: number, note?: string) =>
    request(`/transactions/${id}/mark-shipped`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),

  confirmReceived: (id: number) =>
    request<{ data: import("../types/transaction").Transaction }>(
      `/transactions/${id}/confirm-received`,
      { method: "POST" },
    ),

  releasePayment: (id: number) =>
    request<{ data: import("../types/transaction").Transaction }>(
      `/transactions/${id}/release-payment`,
      { method: "POST" },
    ),

  initiateReturn: (id: number, reason?: string) =>
    request(`/transactions/${id}/initiate-return`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  confirmReturn: (id: number) =>
    request(`/transactions/${id}/confirm-return`, { method: "POST" }),

  openDispute: (id: number, reason?: string) =>
    request(`/transactions/${id}/open-dispute`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  getMessages: (transactionId: number) =>
    request<{
      data: Array<{
        messageId: number;
        senderId: number;
        senderUsername?: string;
        senderFullName?: string;
        messageText: string;
        createdAt: string;
        isSystem?: boolean;
      }>;
    }>(`/transactions/${transactionId}/messages`),

  sendMessage: (transactionId: number, messageText: string) =>
    request(`/transactions/${transactionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ messageText }),
    }),

  adminStats: () =>
    request<{
      data: {
        users: number;
        admins: number;
        transactions: number;
        byStatus: Record<string, number>;
        volumeCompleted: number;
        feesCollected: number;
        feeRatePercent: number;
      };
    }>("/admin/stats"),

  adminUsers: () =>
    request<{
      data: Array<{
        userId: number;
        username: string;
        fullName: string;
        phoneNumber: string;
        role: string;
        createdAt: string;
      }>;
    }>("/admin/users"),

  adminTransactions: () =>
    request<{ data: import("../types/transaction").Transaction[] }>("/admin/transactions"),

  getMyNotifications: () =>
    request<{
      data: Array<{
        notificationId: number;
        transactionId: number | null;
        title: string;
        content: string;
        isSeen: boolean;
        type: string;
      }>;
      unreadCount: number;
    }>("/notifications/me"),

  markNotificationSeen: (id: number) =>
    request(`/notifications/${id}/seen`, { method: "PATCH" }),

  markAllNotificationsSeen: () =>
    request("/notifications/me/seen-all", { method: "POST" }),

  healthIntegrations: () =>
    request<{
      readyForDeploy: boolean;
      fedapay: { ok: boolean; message: string; environment: string };
      notifications: { ok: boolean; message: string };
      hint?: string;
    }>("/health/integrations"),
};
