"use client";

import { BadgeCheck, BriefcaseBusiness, CheckCircle2, CircleAlert, ClipboardList, CreditCard, Phone, Users, Wallet } from "lucide-react";
import { formatFcfa } from "@/lib/contact";
import { getAdminDashboardStats } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { Card, ErrorBox, Skeleton } from "@/components/ui";

function Metric({ Icon, label, value, detail, tone }: { Icon: typeof Users; label: string; value: string; detail?: string; tone: string }) {
  return (
    <Card className="!p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground/55">{label}</p>
          <p className="mt-1 break-words text-xl font-extrabold">{value}</p>
          {detail && <p className="mt-0.5 text-xs text-foreground/55">{detail}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardOverview() {
  const { data, loading, error } = useQuery("admin:dashboard-stats", getAdminDashboardStats, { refreshMs: 30000 });

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-24" />)}
      </div>
    );
  }

  if (!data) return <ErrorBox message={error || "Impossible de charger les statistiques."} />;

  const metrics = [
    { Icon: Users, label: "Clients inscrits", value: String(data.clients_total), tone: "bg-sky/15 text-brand" },
    { Icon: BriefcaseBusiness, label: "Prestataires", value: String(data.providers_total), detail: `${data.providers_pending} à valider`, tone: "bg-accent/20 text-[#8a5a00]" },
    { Icon: ClipboardList, label: "Demandes actives", value: String(data.requests_active), detail: `${data.requests_total} au total`, tone: "bg-brand/10 text-brand" },
    { Icon: CheckCircle2, label: "Prestations terminées", value: String(data.requests_completed), detail: `${data.requests_cancelled} annulées`, tone: "bg-success/15 text-[#12742b]" },
    { Icon: CreditCard, label: "Paiements confirmés", value: String(data.payments_confirmed), detail: `${data.payments_pending} en attente · ${data.payments_failed} refusés`, tone: "bg-sky/15 text-brand" },
    { Icon: Wallet, label: "Montant confirmé", value: formatFcfa(data.payments_confirmed_amount), detail: `${data.payments_total} transactions`, tone: "bg-success/15 text-[#12742b]" },
    { Icon: BadgeCheck, label: "Commissions reversées", value: formatFcfa(data.commissions_paid), detail: `${data.payouts_pending} reversements à traiter`, tone: "bg-accent/20 text-[#8a5a00]" },
    { Icon: Phone, label: "Appels depuis l’app", value: String(data.calls_total), detail: `${data.notifications_unread} notifications non lues`, tone: "bg-brand/10 text-brand" },
  ];
  const maxDailyRequests = Math.max(1, ...data.requests_by_day.map((item) => item.count));
  const maxCategoryRequests = Math.max(1, ...data.requests_by_category.map((item) => item.count));

  return (
    <div className="space-y-4">
      <ErrorBox message={error} />
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
      </div>
      <section className="space-y-3" aria-labelledby="admin-requests-trend">
        <h2 id="admin-requests-trend" className="text-sm font-bold">Demandes · 7 derniers jours</h2>
        <div className="flex h-36 items-end justify-between gap-2 border-b border-brand/10 pb-2">
          {data.requests_by_day.map((item) => (
            <div key={item.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-semibold text-foreground/60">{item.count}</span>
              <span
                className="w-full max-w-8 rounded-t-md bg-brand"
                style={{ height: `${Math.max(6, (item.count / maxDailyRequests) * 78)}%` }}
                title={`${item.count} demande${item.count === 1 ? "" : "s"}`}
              />
              <span className="text-[9px] text-foreground/50">{new Date(`${item.day}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" })}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3" aria-labelledby="admin-category-demand">
        <h2 id="admin-category-demand" className="text-sm font-bold">Métiers les plus demandés</h2>
        {data.requests_by_category.length === 0 ? (
          <p className="text-sm text-foreground/55">Les catégories apparaîtront dès les premières demandes.</p>
        ) : (
          <div className="space-y-2">
            {data.requests_by_category.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between gap-3 text-xs"><span className="truncate">{item.name}</span><b>{item.count}</b></div>
                <div className="h-2 overflow-hidden rounded-full bg-brand/10">
                  <div className="h-full rounded-full bg-sky" style={{ width: `${(item.count / maxCategoryRequests) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="flex items-start gap-2 rounded-2xl bg-accent/15 px-4 py-3 text-xs text-[#76500a]">
        <CircleAlert size={16} className="mt-0.5 shrink-0" />
        <p>Les montants proviennent des paiements validés dans l’admin. Les paiements Wave sont encore vérifiés manuellement.</p>
      </div>
    </div>
  );
}