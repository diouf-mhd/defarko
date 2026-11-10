"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink } from "lucide-react";
import { Card, ErrorBox, Skeleton } from "@/components/ui";
import { getAdminNotifications, markAdminNotificationRead } from "@/lib/api";
import { formatDateTime } from "@/lib/contact";
import { clearQueryCache, useQuery } from "@/lib/useQuery";

function getTarget(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  if (entityType === "request") return `/demande/${entityId}`;
  if (entityType === "provider") return `/admin/prestataire/${entityId}`;
  return null;
}

export default function NotificationsTab() {
  const { data, loading, error, reload } = useQuery("admin:notifications", getAdminNotifications, { refreshMs: 20000 });
  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");

  async function markRead(id: string) {
    setBusyId(id);
    setActionError("");
    try {
      await markAdminNotificationRead(id);
      clearQueryCache("admin:");
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de mettre à jour la notification.");
    } finally {
      setBusyId("");
    }
  }

  if (loading && !data) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;

  const notifications = data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="space-y-3">
      <ErrorBox message={error || actionError} />
      <p className="text-sm text-foreground/60">{unreadCount} non lue{unreadCount === 1 ? "" : "s"}</p>
      {notifications.length === 0 && (
        <Card className="text-center">
          <Bell size={28} className="mx-auto text-foreground/35" />
          <p className="mt-2 text-sm text-foreground/60">Aucune notification pour le moment.</p>
        </Card>
      )}
      {notifications.map((notification) => {
        const activity = notification.activity;
        if (!activity) return null;
        const target = getTarget(activity.entity_type, activity.entity_id);
        return (
          <article key={notification.id} className={`fade-up rounded-2xl border p-4 ${notification.read_at ? "border-brand/10 bg-white" : "border-sky/40 bg-sky/10"}`}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand">
                <Bell size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{activity.title}</p>
                <p className="mt-1 text-sm text-foreground/70">{activity.message}</p>
                <p className="mt-2 text-xs text-foreground/45">{formatDateTime(activity.created_at)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {target && <Link href={target} className="inline-flex items-center gap-1 text-sm font-semibold text-brand underline"><ExternalLink size={14} /> Voir le détail</Link>}
                  {!notification.read_at && (
                    <button type="button" disabled={busyId === notification.id} onClick={() => markRead(notification.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-foreground/60 underline disabled:opacity-50">
                      <Check size={14} /> {busyId === notification.id ? "Mise à jour…" : "Marquer comme lue"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}