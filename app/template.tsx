// Le template est recréé à chaque navigation : chaque page entre avec une animation douce.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
