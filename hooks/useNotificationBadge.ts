import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

const POLL_MS = 30_000;

export function useNotificationBadge(enabled: boolean) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setUnread(0);
      return;
    }

    let cancelled = false;

    const refresh = () => {
      api
        .getMyNotifications()
        .then((res) => {
          if (!cancelled) setUnread(res.unreadCount);
        })
        .catch(() => {
          if (!cancelled) setUnread(0);
        });
    };

    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  return unread;
}
