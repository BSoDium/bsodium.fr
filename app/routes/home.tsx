import type { Route } from "./+types/home";
import Header from "~/components/Header";
import Experience from "~/components/sections/Experience";
import Projects from "~/components/sections/Projects";
import Education from "~/components/sections/Education";
import Contact from "~/components/sections/Contact";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BSoDium — Elliot Negrel-Jerzy" },
    { name: "description", content: "Developer & creative tinkerer" },
  ];
}

export default function Home() {
  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="relative flex h-[80vh] min-h-150 items-center overflow-hidden">
          {/* Intro */}
          <div className="relative z-10 mx-auto w-full max-w-5xl px-8 pt-16">
            <div>
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
                Elliot Negrel-Jerzy
              </h1>
              <p className="mt-3 text-xl text-gray-400">
                Developer &amp; creative tinkerer
              </p>
              <p className="mt-4 max-w-md text-base leading-relaxed text-gray-300">
                I build things for the web and beyond. Passionate about clean
                code, interactive experiences, and making software that feels
                alive.
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-gray-500">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </section>

        {/* Content sections */}
        <div className="mx-auto max-w-3xl space-y-32 px-8 py-24">
          <Experience />
          <Projects />
          <Education />
          <Contact />
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Elliot Negrel-Jerzy
      </footer>
    </>
  );
}
