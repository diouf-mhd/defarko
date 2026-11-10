import {
  Anvil,
  BrickWall,
  CarFront,
  Construction,
  Faucet,
  GraduationCap,
  Grid2X2,
  Hammer,
  Layers,
  PaintRoller,
  PanelsTopLeft,
  Refrigerator,
  Smartphone,
  Snowflake,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type CategoryDef = {
  slug: string;
  name: string;
  icon: LucideIcon;
  color: string;
  background: string;
};

// Les métiers sont définis ici et enregistrés aussi dans la base (table categories).
export const CATEGORIES: CategoryDef[] = [
  { slug: "electricien", name: "Électricien", icon: Zap, color: "#c2410c", background: "#fff0e6" },
  { slug: "soudeur", name: "Soudeur métallique", icon: Anvil, color: "#b91c1c", background: "#fee2e2" },
  { slug: "menuisier-bois", name: "Menuisier bois", icon: Hammer, color: "#166534", background: "#dcfce7" },
  { slug: "menuisier-alu", name: "Menuisier aluminium", icon: PanelsTopLeft, color: "#0f766e", background: "#ccfbf1" },
  { slug: "froid-clim", name: "Froid & climatisation", icon: Snowflake, color: "#0369a1", background: "#e0f2fe" },
  { slug: "mecanicien", name: "Mécanicien", icon: Wrench, color: "#334155", background: "#e2e8f0" },
  { slug: "carreleur", name: "Carreleur", icon: Grid2X2, color: "#a16207", background: "#fef9c3" },
  { slug: "macon", name: "Maçon", icon: BrickWall, color: "#9a3412", background: "#ffedd5" },
  { slug: "plombier", name: "Plombier", icon: Faucet, color: "#1d4ed8", background: "#dbeafe" },
  { slug: "peintre", name: "Peintre", icon: PaintRoller, color: "#be123c", background: "#ffe4e6" },
  { slug: "platrier", name: "Plâtrier / staffeur", icon: Layers, color: "#6d28d9", background: "#ede9fe" },
  { slug: "ferrailleur", name: "Ferrailleur", icon: Construction, color: "#475569", background: "#e2e8f0" },
  { slug: "tolier", name: "Tôlier auto", icon: CarFront, color: "#b91c1c", background: "#fee2e2" },
  { slug: "telephone", name: "Réparateur téléphone", icon: Smartphone, color: "#4338ca", background: "#e0e7ff" },
  { slug: "electromenager", name: "Électroménager", icon: Refrigerator, color: "#c2410c", background: "#ffedd5" },
  { slug: "enseignant", name: "Enseignant", icon: GraduationCap, color: "#1d4ed8", background: "#dbeafe" },
];

export function getCategory(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
