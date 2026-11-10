export default function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground/80">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-brand/15 bg-[#f3f6fd] px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
