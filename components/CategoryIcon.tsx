import Image from "next/image";
import { getCategory } from "@/lib/categories";

export default function CategoryIcon({ slug, size = 64, className = "" }: { slug: string; size?: number; className?: string }) {
  const cat = getCategory(slug);
  if (!cat) return null;
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src={cat.icon}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        className={`h-full w-full select-none object-contain ${className}`}
        draggable={false}
      />
    </span>
  );
}
