"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import RequireAuth from "@/components/RequireAuth";
import { AddProviderTab, KEY_PAYMENTS, KEY_PROVIDERS, PaymentsTab, ProvidersTab, RequestsTab } from "@/components/admin/tabs";
import DashboardOverview from "@/components/admin/DashboardOverview";
import NotificationsTab from "@/components/admin/NotificationsTab";
import { getAdminNotifications, getAllProviders, getPaymentsToCheck } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import type { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";

type Auth = ReturnType<typeof useAuth>;
type TabKey = "dashboard" | "notifications" | "valider" | "ouvriers" | "paiements" | "demandes" | "ajouter";

const TABS: { key: TabKey; label: string }[] = [
  { key: "dashboard", label: "Vue générale" },
  { key: "notifications", label: "Notifications" },
  { key: "valider", label: "À valider" },
  { key: "ouvriers", label: "Ouvriers" },
  { key: "paiements", label: "Paiements" },
  { key: "demandes", label: "Demandes" },
  { key: "ajouter", label: "Ajouter" },
];

function Inner({ auth }: { auth: Auth }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = TABS.some((item) => item.key === requestedTab) ? (requestedTab as TabKey) : "dashboard";
  const { data: providers } = useQuery(KEY_PROVIDERS, getAllProviders);
  const { data: payments } = useQuery(KEY_PAYMENTS, getPaymentsToCheck, { refreshMs: 20000 });
  const { data: notifications } = useQuery("admin:notifications", getAdminNotifications, { refreshMs: 20000 });

  function change(k: TabKey) {
    router.replace(`/admin?tab=${k}`, { scroll: false });
  }

  const badge: Partial<Record<TabKey, number>> = {
    notifications: (notifications ?? []).filter((item) => !item.read_at).length,
    valider: (providers ?? []).filter((p) => p.status === "en_attente").length,
    paiements: (payments ?? []).filter((p) => p.status === "declare").length,
  };

  return (
    <main className="pb-6">
      <header className="rounded-b-4xl bg-brand px-5 pb-5 pt-8 text-white">
        <div className="flex items-center gap-3">
          <BackButton fallback="/compte" />
          <h1 className="text-xl font-bold">Administration</h1>
        </div>
        <nav className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => change(t.key)}
              aria-current={tab === t.key}
              className={`press relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t.key ? "bg-white text-brand" : "bg-white/15 text-white"}`}
            >
              {t.label}
              {!!badge[t.key] && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">{badge[t.key]}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <section className="space-y-3 px-5 pt-4">
        {tab === "dashboard" && <DashboardOverview />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "valider" && <ProvidersTab pendingOnly />}
        {tab === "ouvriers" && <ProvidersTab pendingOnly={false} />}
        {tab === "paiements" && <PaymentsTab />}
        {tab === "demandes" && <RequestsTab />}
        {tab === "ajouter" && <AddProviderTab adminId={auth.user!.id} onAdded={() => change("ouvriers")} />}
      </section>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Spinner className="min-h-[60vh]" />}>
      <RequireAuth role="admin">{(auth) => <Inner auth={auth} />}</RequireAuth>
    </Suspense>
  );
}
