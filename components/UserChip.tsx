'use client';

import type { AuthUser } from "@/context/AuthContext";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface UserChipProps {
  user: Pick<AuthUser, "fullName" | "username">;
  role: "Acheteur" | "Vendeur";
  highlight?: boolean;
}

export function UserChip({ user, role, highlight }: UserChipProps) {
  return (
    <div className={`user-chip ${highlight ? "highlight" : ""}`}>
      <div className="user-chip-avatar">{initials(user.fullName)}</div>
      <div>
        <span className="user-chip-role">{role}</span>
        <strong>{user.fullName}</strong>
        <span className="user-chip-username">{user.username}</span>
      </div>
    </div>
  );
}

interface CounterpartHeaderProps {
  name: string;
  username: string;
  role: string;
}

export function CounterpartHeader({ name, username, role }: CounterpartHeaderProps) {
  return (
    <div className="chat-counterpart">
      <div className="user-chip-avatar">{initials(name)}</div>
      <div>
        <strong>{name}</strong>
        <span className="user-chip-username">
          {username} · {role}
        </span>
      </div>
      <span className="chat-online-dot" title="Discussion active" />
    </div>
  );
}
