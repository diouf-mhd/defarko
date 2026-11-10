import { getCategory } from "@/lib/categories";

export default function CategoryIcon({ slug, size = 64, className = "" }: { slug: string; size?: number; className?: string }) {
  const cat = getCategory(slug);
  if (!cat) return null;
  const Icon = cat.icon;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{ width: size, height: size, color: cat.color, backgroundColor: cat.background }}
    >
      <Icon size={Math.max(14, Math.round(size * 0.68))} strokeWidth={2.6} className={`select-none ${className}`} />
    </span>
  );
}
