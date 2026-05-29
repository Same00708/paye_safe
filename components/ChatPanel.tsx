'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { CounterpartHeader } from "./UserChip";
import "./ChatPanel.css";
import "./UserChip.css";

interface Message {
  messageId: number;
  senderId: number;
  senderUsername?: string;
  senderFullName?: string;
  messageText: string;
  createdAt: string;
  isSystem?: boolean;
}

interface Participant {
  userId: number;
  fullName: string;
  username: string;
}

interface ChatPanelProps {
  transactionId: number;
  buyer: Participant;
  seller: Participant;
  disabled?: boolean;
}

export function ChatPanel({ transactionId, buyer, seller, disabled }: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isBuyer = user?.userId === buyer.userId;
  const counterpart = isBuyer ? seller : buyer;
  const counterpartRole = isBuyer ? "Vendeur" : "Acheteur";

  const load = useCallback(async () => {
    try {
      const res = await api.getMessages(transactionId);
      setMessages(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chat");
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (!user) return;
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled || sending) return;
    setSending(true);
    try {
      await api.sendMessage(transactionId, text.trim());
      setText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  return (
    <div className="chat-panel card" id="chat">
      <CounterpartHeader
        name={counterpart.fullName}
        username={counterpart.username}
        role={counterpartRole}
      />

      <p className="chat-subtitle">
        Discutez avec {counterpart.fullName} — historique conservé pour litiges.
      </p>

      {loading && messages.length === 0 && (
        <p className="chat-hint">Chargement de la conversation…</p>
      )}
      {error && <p className="chat-error">{error}</p>}

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <p className="chat-empty">
            Aucun message. Présentez-vous ou partagez une photo du colis.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === user.userId;
          if (m.isSystem || m.messageText.startsWith("🔒")) {
            return (
              <div key={m.messageId} className="chat-system">
                {m.messageText}
              </div>
            );
          }
          return (
            <div key={m.messageId} className={`chat-row ${mine ? "mine" : "theirs"}`}>
              {!mine && (
                <span className="chat-sender-label">
                  {m.senderFullName ?? m.senderUsername ?? "Partenaire"}
                </span>
              )}
              <div className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
                <p>{m.messageText}</p>
                <time>
                  {new Date(m.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={
            disabled
              ? "Conversation archivée"
              : `Message à ${counterpart.fullName.split(" ")[0]}…`
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || sending}
          maxLength={500}
        />
        <button type="submit" className="btn btn-primary" disabled={disabled || sending || !text.trim()}>
          {sending ? "…" : "➤"}
        </button>
      </form>
    </div>
  );
}
