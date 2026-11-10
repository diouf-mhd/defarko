"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, User } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Accueil", Icon: Home, match: ["/dashboard", "/categorie", "/prestataire"] },
  { href: "/demandes", label: "Demandes", Icon: ClipboardList, match: ["/demandes", "/demande"] },
  { href: "/compte", label: "Compte", Icon: User, match: ["/compte", "/espace-prestataire", "/devenir-prestataire", "/admin"] },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-3xl bg-brand px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(27,31,168,0.25)]"
    >
      <ul className="flex items-center justify-around">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`press flex flex-col items-center gap-0.5 rounded-2xl px-5 py-1.5 text-[11px] font-medium transition-colors ${
                  active ? "text-white" : "text-white/60"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ${
                    active ? "bg-white/20" : "bg-transparent"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
