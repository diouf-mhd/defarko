import { getCategory } from "@/lib/categories";

export default function CategoryIcon({ slug, size = 64, className = "" }: { slug: string; size?: number; className?: string }) {
  const cat = getCategory(slug);
  if (!cat) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cat.icon}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`select-none drop-shadow-[0_6px_8px_rgba(27,31,168,0.2)] ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
