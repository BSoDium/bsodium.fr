export default function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
        <a href="#" className="text-lg font-semibold tracking-tight">
          BSoDium
        </a>
        <ul className="hidden gap-6 text-sm text-gray-400 sm:flex">
          {["Experience", "Projects", "Education", "Contact"].map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase()}`}
                className="transition hover:text-foreground"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
