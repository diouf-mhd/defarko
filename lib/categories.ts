export type CategoryDef = { slug: string; name: string; icon: string };

// Les métiers sont définis ici et enregistrés aussi dans la base (table categories).
export const CATEGORIES: CategoryDef[] = [
  { slug: "electricien", name: "Électricien", icon: "/icons/electricien.png" },
  { slug: "soudeur", name: "Soudeur métallique", icon: "/icons/soudeur.png" },
  { slug: "menuisier-bois", name: "Menuisier bois", icon: "/icons/menuisier-bois.png" },
  { slug: "menuisier-alu", name: "Menuisier aluminium", icon: "/icons/menuisier-alu.png" },
  { slug: "froid-clim", name: "Froid & climatisation", icon: "/icons/froid-clim.png" },
  { slug: "mecanicien", name: "Mécanicien", icon: "/icons/mecanicien.png" },
  { slug: "carreleur", name: "Carreleur", icon: "/icons/carreleur.png" },
  { slug: "macon", name: "Maçon", icon: "/icons/macon.png" },
  { slug: "plombier", name: "Plombier", icon: "/icons/plombier.png" },
  { slug: "peintre", name: "Peintre", icon: "/icons/peintre.png" },
  { slug: "platrier", name: "Plâtrier / staffeur", icon: "/icons/platrier.png" },
  { slug: "ferrailleur", name: "Ferrailleur", icon: "/icons/ferrailleur.png" },
  { slug: "tolier", name: "Tôlier auto", icon: "/icons/tolier.png" },
  { slug: "telephone", name: "Réparateur téléphone", icon: "/icons/telephone.png" },
  { slug: "electromenager", name: "Électroménager", icon: "/icons/electromenager.png" },
  { slug: "enseignant", name: "Enseignant", icon: "/icons/enseignant.png" },
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
