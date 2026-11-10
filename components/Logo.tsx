export default function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="Defar ko" width={size} height={size} className={`shrink-0 ${className}`} style={{ width: size, height: size }} draggable={false} />
  );
}
