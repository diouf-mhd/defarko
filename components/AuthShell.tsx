import BackButton from "./BackButton";
import Logo from "./Logo";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="relative overflow-hidden rounded-b-[2.5rem] bg-brand px-6 pb-16 pt-10 text-white">
        <div className="absolute -right-10 -top-10 h-48 w-48 rotate-12 rounded-3xl bg-brand-dark/60" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <BackButton />
            <Logo size={36} />
            <span className="text-xl font-extrabold tracking-tight">Defar ko</span>
          </div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        </div>
      </header>
      <section className="relative z-10 -mt-8 flex-1 px-5 pb-10">
        <div className="card-shadow fade-up rounded-3xl bg-white p-6">{children}</div>
      </section>
    </main>
  );
}
