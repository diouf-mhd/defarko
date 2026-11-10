import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-brand/10 bg-white px-6 pb-8 pt-6 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-sm font-extrabold text-brand">Defar ko</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-foreground/55">Conçu et développé par</p>
        <p className="text-xs font-semibold text-foreground/75">
          Moussa Diouf <span className="font-normal text-foreground/40">&amp;</span> Abdou Karim Dione
        </p>
        <p className="mt-4 border-t border-brand/10 pt-3 text-[10px] text-foreground/40">© 2026 Defar ko</p>
      </div>
    </footer>
  );
}
