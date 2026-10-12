/**
 * DEV ONLY: `/dev/design` is the styleguide of the UI system (docs/design-system.md): every token and component, a scheme
 * toggle, sample entries of the four kinds as cards and as a panel mock, and the loading / empty / error states.
 * It exists only where `routes.ts` includes it (development, or a build made with CATALYST_DEV_ROUTES=1) and answers 404
 * anywhere else, exactly like `/dev/street`. Every sample string below is a made-up placeholder, never real content.
 *
 * Query: `?scheme=light|dark` starts in a forced scheme (default: follow the system).
 */
import { useEffect, useState, type ReactNode } from "react";
import { data, useSearchParams } from "react-router";
import {
  Button,
  Col,
  CoverArt,
  DataList,
  DataRow,
  Divider,
  EntryCard,
  ExpandToggle,
  Frame,
  Grid,
  IconButton,
  KindTag,
  LogoMark,
  LogoWordmark,
  MetadataStrip,
  MicroLabel,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  Stack,
  StatePanel,
  StatusTag,
  TagList,
  Toggle,
  type GlyphName,
} from "~/components/ui";
import { parseColor, contrastRatio, over } from "~/lib/contrast";
import { COVER_PATTERNS } from "~/lib/cover-art";
import { ENTRY_KINDS, ENTRY_KIND_LABEL, type EntryKind } from "~/lib/entry-kind";
import { formatPlaceCoordinates, formatStamp, STATUSES } from "~/lib/labelling";
import { cn } from "~/lib/utils";

const enabled = () => import.meta.env.DEV || process.env.CATALYST_DEV_ROUTES === "1";

export function loader() {
  if (!enabled()) throw data("Not found", { status: 404 });
  return null;
}

export function meta() {
  return [{ title: "Design system (dev)" }, { name: "robots", content: "noindex" }];
}

type Scheme = "system" | "light" | "dark";

const SAMPLES: Record<Exclude<EntryKind, "place">, { title: string; summary: string; meta: { label: string; value: string }[]; status?: string }> = {
  article: {
    title: "Notes on a quiet compiler",
    summary: "A sample summary written for the styleguide: two lines of reading text to check the clamp, the contrast and the rhythm of a card.",
    meta: [
      { label: "Date", value: formatStamp("2026-10-08") },
      { label: "Read", value: "6 min read" },
    ],
    status: "published",
  },
  project: {
    title: "Tessera, a tiling toy",
    summary: "A placeholder project: a small program that fills a plane with tiles and lets you break the rules one at a time.",
    meta: [
      { label: "Stack", value: "TypeScript, SVG" },
      { label: "Year", value: "2026" },
    ],
    status: "live",
  },
  artwork: {
    title: "Harbour at low tide, study 3",
    summary: "A made-up artwork entry. Ink on paper, scanned flat; the cover below is generated, not the work itself.",
    meta: [
      { label: "Medium", value: "Ink on paper" },
      { label: "Year", value: "2025" },
    ],
    status: "published",
  },
  poem: {
    title: "Nine lines for no one",
    summary: "A placeholder poem about a light that stays on in a room nobody uses, set in nine short lines.",
    meta: [
      { label: "Lines", value: "9" },
      { label: "Date", value: formatStamp("2026-03-14") },
    ],
    status: "draft",
  },
};

const SAMPLE_COORDS = formatPlaceCoordinates(12.35, 65.43);

/** Sets the forced scheme on <html> (so the fixed navbar follows too) and puts it back on the way out. */
function useForcedScheme(scheme: Scheme) {
  useEffect(() => {
    const root = document.documentElement;
    if (scheme === "system") root.removeAttribute("data-scheme");
    else root.setAttribute("data-scheme", scheme);
    return () => root.removeAttribute("data-scheme");
  }, [scheme]);
}

function Section({ index, title, meta, children }: { index: number; title: string; meta?: ReactNode; children: ReactNode }) {
  const id = `s${index}`;
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-16 scroll-mt-24">
      <SectionHeader title={title} id={`${id}-h`} meta={meta} />
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="m-0 max-w-prose text-sm text-muted-foreground">{children}</p>;
}

/** A labelled specimen: a plain caption over the thing (a styleguide has to say what it shows). */
function Spec({ caption, children, className }: { caption: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <p className="m-0 text-sm text-muted-foreground">{caption}</p>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ colour */

const SWATCHES: { token: string; role: string }[] = [
  { token: "--background", role: "Page" },
  { token: "--surface", role: "Panel plate" },
  { token: "--accent", role: "Hover, sunken" },
  { token: "--foreground", role: "Text, ink" },
  { token: "--muted-foreground", role: "Secondary text" },
  { token: "--subtle-foreground", role: "Credits line" },
  { token: "--border", role: "Hairline" },
  { token: "--border-strong", role: "Control line" },
  { token: "--line-faint", role: "Grid, texture" },
  { token: "--signal", role: "The one accent" },
  { token: "--signal-wash", role: "Active plate" },
  { token: "--kind-article", role: "Article hue" },
  { token: "--kind-project", role: "Project hue" },
  { token: "--kind-artwork", role: "Artwork hue" },
  { token: "--kind-poem", role: "Poem hue" },
];

const PAIRS: { fg: string; bg: string; need: number; use: string }[] = [
  { fg: "--foreground", bg: "--background", need: 7, use: "Body text" },
  { fg: "--foreground", bg: "--surface", need: 7, use: "Text on a frame" },
  { fg: "--muted-foreground", bg: "--background", need: 4.5, use: "Secondary text" },
  { fg: "--muted-foreground", bg: "--surface", need: 4.5, use: "Secondary text on a frame" },
  { fg: "--muted-foreground", bg: "--accent", need: 4.5, use: "Secondary text on hover" },
  { fg: "--subtle-foreground", bg: "--surface", need: 4.5, use: "Credits on a frame" },
  { fg: "--signal", bg: "--surface", need: 4.5, use: "Signal text" },
  { fg: "--signal-foreground", bg: "--signal", need: 4.5, use: "Text on a signal fill" },
  { fg: "--border-strong", bg: "--background", need: 2.8, use: "Control outline" },
];

/** Reads the live computed values from a probe element, so the table always shows what the browser resolved. */
function useResolved(scheme: Scheme) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const probe = document.createElement("span");
    probe.style.display = "none";
    document.body.appendChild(probe);
    const names = new Set([...SWATCHES.map((s) => s.token), ...PAIRS.flatMap((p) => [p.fg, p.bg])]);
    const next: Record<string, string> = {};
    for (const name of names) {
      probe.style.color = `var(${name})`;
      next[name] = getComputedStyle(probe).color;
    }
    probe.remove();
    setValues(next);
  }, [scheme]);
  return values;
}

function Colour({ scheme }: { scheme: Scheme }) {
  const values = useResolved(scheme);
  const ratio = (fg: string, bg: string) => {
    const f = parseColor(values[fg] ?? "");
    const b = parseColor(values[bg] ?? "");
    if (!f || !b) return null;
    return contrastRatio(f, over(b, [128, 128, 128, 1]));
  };
  return (
    <Stack gap={6}>
      <Note>
        One grey family (the map's near-black and near-white) and one accent, which marks state: focus, the active thing, a link under the pointer. The
        faint kind hues only tint the generated covers. Values below are the browser's resolved ones for the current scheme.
      </Note>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5">
        {SWATCHES.map((s) => (
          <li key={s.token} className="flex min-w-0 flex-col gap-1">
            <div className="h-12 border border-border-strong" style={{ background: `var(${s.token})` }} />
            <span className="mt-1 truncate text-sm font-medium">{s.token.slice(2)}</span>
            <span className="truncate text-sm text-muted-foreground">{s.role}</span>
            <span className="ds-meta truncate">{values[s.token] ?? " "}</span>
          </li>
        ))}
      </ul>
      <Frame padding="md">
        <DataList>
          {PAIRS.map((p) => {
            const r = ratio(p.fg, p.bg);
            const ok = r !== null && r >= p.need;
            return (
              <DataRow key={`${p.fg}${p.bg}`} label={`${p.use} (${p.fg.slice(2)} on ${p.bg.slice(2)})`} mono>
                {r === null ? "--" : `${r.toFixed(2)}:1 (needs ${p.need}:1), ${ok ? "pass" : "fail"}`}
              </DataRow>
            );
          })}
        </DataList>
      </Frame>
    </Stack>
  );
}

/* -------------------------------------------------------------------- type */

function Type() {
  return (
    <Stack gap={8}>
      <Grid>
        <Col span={12} spanMd={7}>
          <Frame>
            <Stack gap={3}>
              <p className="m-0 text-sm text-muted-foreground">Sans: titles, reading and every sentence (system grotesk stack)</p>
              <p className="m-0 text-4xl leading-[3.25rem] font-semibold tracking-tight">Display 48 / 52</p>
              <p className="m-0 text-3xl font-semibold tracking-tight">Page title 36 / 40</p>
              <p className="m-0 text-2xl font-semibold tracking-tight">Panel title 28 / 34</p>
              <p className="m-0 text-xl font-semibold tracking-tight">Card title 22 / 30</p>
              <p className="m-0 text-lg text-muted-foreground">Summary 18 / 28, muted</p>
              <p className="m-0 text-base">Body 16 / 26. The quick brown fox jumps over the lazy dog, 0123456789.</p>
              <p className="m-0 text-sm text-muted-foreground">Secondary 14 / 22: metadata sentences, captions, tags.</p>
            </Stack>
          </Frame>
        </Col>
        <Col span={12} spanMd={5}>
          <Frame>
            <Stack gap={3}>
              <p className="m-0 text-sm text-muted-foreground">Mono: dates, coordinates, codes (system mono stack)</p>
              <p className="ds-meta m-0">{formatStamp("2026-10-08")}</p>
              <p className="ds-meta m-0">{SAMPLE_COORDS}</p>
              <p className="m-0 font-mono text-sm tabular-nums">const slashed0 = 0O; // tabular 1111</p>
              <p className="m-0 text-sm text-muted-foreground">A short code in capitals is the exception:</p>
              <MicroLabel>ERR / 500</MicroLabel>
            </Stack>
          </Frame>
        </Col>
      </Grid>
      <Note>
        No web font is loaded: the system stacks give crisp, native-feeling grotesk and mono at zero bytes. Changing a face is one token (`--font-sans`, `--font-mono`).
        Body is never under 16 px and secondary text never under 14 px; reading text is held to about 60 characters of measure.
      </Note>
    </Stack>
  );
}

/* -------------------------------------------------------- lines and layout */

function Lines() {
  return (
    <Stack gap={8}>
      <Grid>
        {(["plain", "active", "inverted"] as const).map((variant) => (
          <Col key={variant} span={12} spanMd={4}>
            <Frame variant={variant} className="h-32">
              <p className="m-0 text-base font-medium">Frame, {variant}</p>
              <p className="mt-2 mb-0 text-sm text-muted-foreground">
                {variant === "plain" ? "A hairline on the surface: for the few things that are a box." : variant === "active" ? "Strong line and a faint wash: the selected thing." : "The opposite scheme, for a call-out."}
              </p>
            </Frame>
          </Col>
        ))}
      </Grid>
      <Grid>
        <Col span={12} spanMd={6}>
          <Spec caption="Divider: one hairline">
            <Divider />
          </Spec>
        </Col>
        <Col span={12} spanMd={6}>
          <Spec caption="Texture, for a placeholder or an empty frame only">
            <div className="ds-grid-bg flex h-16 items-center border border-border p-3 text-sm text-muted-foreground">16 px grid, 7 % ink</div>
          </Spec>
        </Col>
      </Grid>
      <Spec caption="4 px spacing scale (1 to 10 steps) and the 12-column panel grid">
        <div className="flex items-end gap-4">
          {[1, 2, 3, 4, 6, 8, 10].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <div className="bg-foreground" style={{ width: n * 4, height: n * 4 }} />
              <span className="ds-meta">{n * 4}</span>
            </div>
          ))}
        </div>
        <Grid className="mt-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Col key={i} span={1} className="ds-hatch flex h-8 items-center justify-center border border-border">
              <span className="ds-meta">{i + 1}</span>
            </Col>
          ))}
        </Grid>
      </Spec>
    </Stack>
  );
}

/* -------------------------------------------------------------- components */

function Controls() {
  const [pressed, setPressed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<"all" | EntryKind>("all");
  return (
    <Stack gap={8}>
      <Grid>
        <Col span={12} spanMd={6}>
          <Spec caption="Button / primary, secondary, ghost, link">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="secondary" size="sm">
                Small
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </div>
          </Spec>
        </Col>
        <Col span={12} spanMd={6}>
          <Spec caption="IconButton, Toggle, ExpandToggle">
            <div className="flex flex-wrap items-center gap-3">
              {(["close", "expand", "arrow-right", "arrow-up-right"] as GlyphName[]).map((icon) => (
                <IconButton key={icon} icon={icon} label={icon.replace("-", " ")} />
              ))}
              <IconButton icon="close" label="Close ghost" variant="ghost" />
              <IconButton icon="close" label="Close primary" variant="primary" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Toggle pressed={pressed} onPressedChange={setPressed}>
                Pinned
              </Toggle>
              <ExpandToggle expanded={expanded} onExpandedChange={setExpanded} />
              <ExpandToggle expanded={expanded} onExpandedChange={setExpanded} showLabel />
            </div>
          </Spec>
        </Col>
      </Grid>
      <Spec caption="SegmentedControl (kind filter)">
        <SegmentedControl<"all" | EntryKind>
          label="Kind filter"
          value={filter}
          onValueChange={setFilter}
          options={[{ value: "all", label: "All" }, ...ENTRY_KINDS.map((k) => ({ value: k, label: ENTRY_KIND_LABEL[k] }))]}
        />
      </Spec>
    </Stack>
  );
}

function Tags() {
  return (
    <Stack gap={8}>
      <Grid>
        <Col span={12} spanMd={6}>
          <Spec caption="KindTag: said only where kinds are mixed (search, related)">
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {ENTRY_KINDS.map((k) => (
                <KindTag key={k} kind={k} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {ENTRY_KINDS.map((k) => (
                <KindTag key={k} kind={k} iconOnly solid />
              ))}
            </div>
          </Spec>
        </Col>
        <Col span={12} spanMd={6}>
          <Spec caption="StatusTag: one plain word, shown only when it tells something">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {STATUSES.map((s) => (
                <StatusTag key={s} status={s} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <StatusTag status="featured" tone="solid" />
              <StatusTag status="new" tone="signal-solid" />
            </div>
          </Spec>
        </Col>
      </Grid>
      <Grid>
        <Col span={12} spanMd={6}>
          <Spec caption="DataList: key and value, no rules">
            <DataList>
              <DataRow label="Place">Placeholder Bay</DataRow>
              <DataRow label="Coordinates" mono>
                {SAMPLE_COORDS}
              </DataRow>
              <DataRow label="Visited" mono>
                {formatStamp("2025-05-02")}
              </DataRow>
              <DataRow label="Entries">4</DataRow>
            </DataList>
          </Spec>
        </Col>
        <Col span={12} spanMd={6}>
          <Spec caption="MetadataStrip (two plain lines) and TagList (muted text, links where they go somewhere)">
            <MetadataStrip
              items={[
                { label: "Date", value: <span className="ds-meta">{formatStamp("2026-10-08")}</span> },
                { label: "Place", value: "Placeholder Bay" },
              ]}
            />
            <TagList label="Sample tags" tags={[{ label: "compilers", href: "#s5" }, { label: "notes", href: "#s5" }, { label: "typography", href: "#s5" }]} />
            <TagList label="Sample tags, not links" tags={[{ label: "compilers" }, { label: "notes" }]} />
          </Spec>
        </Col>
      </Grid>
    </Stack>
  );
}

function Covers() {
  return (
    <Stack gap={6}>
      <Note>
        Deterministic from a seed string (same seed, same art, on the server and in the browser), four tonal levels of the ink, tinted by the kind, one or two signal marks.
        Five patterns; the seed picks one.
      </Note>
      <Grid>
        {COVER_PATTERNS.map((pattern, i) => (
          <Col key={pattern} span={6} spanMd={4}>
            <Spec caption={`Pattern: ${pattern}`}>
              <div className="overflow-hidden outline outline-1 -outline-offset-1 outline-border">
                <CoverArt seed={`styleguide-${i}`} pattern={pattern} kind={ENTRY_KINDS[i % ENTRY_KINDS.length]} />
              </div>
            </Spec>
          </Col>
        ))}
        <Col span={6} spanMd={4}>
          <Spec caption="Seeds a, b, c (square 12 x 12)">
            <div className="flex gap-2">
              {["a", "b", "c"].map((seed) => (
                <div key={seed} className="flex-1 overflow-hidden outline outline-1 -outline-offset-1 outline-border">
                  <CoverArt seed={seed} cols={12} rows={12} />
                </div>
              ))}
            </div>
          </Spec>
        </Col>
      </Grid>
    </Stack>
  );
}

function Cards() {
  const kinds = ["article", "project", "artwork", "poem"] as const;
  return (
    <Stack gap={8}>
      <Note>
        No box: the cover, the spacing and the title do the work. One link per card (the title), stretched over the whole card; the pointer underlines the title and the
        keyboard focus draws a ring around the card. The kind is not repeated on a list of one kind.
      </Note>
      <Grid>
        {kinds.map((kind) => {
          const s = SAMPLES[kind];
          return (
            <Col key={kind} span={12} spanMd={6} className="lg:[grid-column:span_3]">
              <EntryCard
                kind={kind}
                title={s.title}
                summary={s.summary}
                href="#s7"
                meta={s.meta.map((m) => ({ label: m.label, value: m.value }))}
                tags={["sample", "placeholder", "styleguide"]}
                className="h-full"
              />
            </Col>
          );
        })}
      </Grid>
      <Spec caption="In a mixed list (related entries, search) the card says its kind">
        <div className="max-w-sm">
          <EntryCard kind="poem" showKind title={SAMPLES.poem.title} summary={SAMPLES.poem.summary} href="#s7" meta={SAMPLES.poem.meta} />
        </div>
      </Spec>
    </Stack>
  );
}

/* -------------------------------------------------------------- panel mock */

/**
 * The shape of a panel / full-screen entry view, assembled from the system's parts (the real views are built on these).
 * `expanded` re-flows the same content into the 12-column grid: reading column and an aside.
 */
function PanelMock({ kind = "article", expanded: forced, className }: { kind?: Exclude<EntryKind, "place">; expanded?: boolean; className?: string }) {
  const [own, setOwn] = useState(false);
  const expanded = forced ?? own;
  const s = SAMPLES[kind];
  const related = [
    { kind: "project" as const, title: "Tessera, a tiling toy" },
    { kind: "poem" as const, title: "Nine lines for no one" },
  ];
  const reading = (
    <Stack gap={6}>
      <div className="overflow-hidden outline outline-1 -outline-offset-1 outline-border">
        <CoverArt seed={s.title} kind={kind} cols={48} rows={20} />
      </div>
      <Stack gap={4}>
        <h3 className="m-0 mt-2 text-2xl font-semibold tracking-tight">A section heading</h3>
        <p className="m-0 max-w-[60ch] text-lg">
          This is placeholder body copy for the panel mock. It exists to show the line length, the leading and the colour of reading text, nothing more.
        </p>
        <p className="m-0 max-w-[60ch] text-lg">
          A second paragraph checks the rhythm between blocks: eighteen pixels of type on a twenty-eight pixel line, a twenty-four pixel gap, and a measure that stays
          comfortable when the panel is half the screen.
        </p>
      </Stack>
    </Stack>
  );
  const aside = (
    <Stack gap={8}>
      <section aria-labelledby={`${kind}-places`}>
        <SectionHeader title="Places" id={`${kind}-places`} as="h3" />
        <ul className="m-0 mt-2 list-none p-0">
          <li>
            <a href="#s8" className="flex min-h-11 items-baseline gap-3 py-2 text-base no-underline hover:underline">
              <span>Placeholder Bay</span>
              <span className="text-sm text-muted-foreground">Sample country</span>
            </a>
          </li>
        </ul>
      </section>
      <section aria-labelledby={`${kind}-related`}>
        <SectionHeader title="Related" id={`${kind}-related`} as="h3" />
        <ul className="m-0 mt-2 list-none p-0">
          {related.map((r) => (
            <li key={r.title}>
              <a href="#s8" className="flex min-h-11 flex-col justify-center py-2 no-underline hover:underline">
                <span className="text-sm text-muted-foreground">{ENTRY_KIND_LABEL[r.kind]}</span>
                <span className="text-base">{r.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </Stack>
  );
  return (
    <article aria-label={`${ENTRY_KIND_LABEL[kind]} view, sample`} className={cn("flex min-w-0 flex-col border border-border bg-surface", className)}>
      <header className="flex items-center justify-end gap-1 p-2">
        {forced === undefined && <ExpandToggle expanded={expanded} onExpandedChange={setOwn} size="sm" />}
        <IconButton icon="close" label="Close" size="sm" variant="ghost" />
      </header>
      <div className="flex flex-col gap-8 px-4 pb-8 md:px-6">
        <div className="flex flex-col gap-2">
          <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            <span>{ENTRY_KIND_LABEL[kind]}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="ds-meta">{formatStamp("2026-10-08")}</span>
            {s.status && s.status !== "published" && (
              <>
                <span aria-hidden="true">&middot;</span>
                <StatusTag status={s.status} />
              </>
            )}
          </p>
          <h2 className={cn("m-0 font-semibold tracking-tight", expanded ? "text-3xl md:text-4xl md:leading-[3.25rem]" : "text-2xl")}>{s.title}</h2>
          <p className="m-0 max-w-[60ch] text-lg text-muted-foreground">{s.summary}</p>
          <TagList label="Sample tags" tags={[{ label: "sample", href: "#s8" }, { label: "placeholder", href: "#s8" }]} />
        </div>
        {expanded ? (
          <Grid>
            <Col span={12} spanMd={8}>
              {reading}
            </Col>
            <Col span={12} spanMd={4}>
              {aside}
            </Col>
          </Grid>
        ) : (
          <>
            {reading}
            {aside}
          </>
        )}
      </div>
    </article>
  );
}

function PanelSection() {
  return (
    <Stack gap={6}>
      <Note>
        The same content in the 440 px side panel and, with the toggle, re-flowed into the full-screen 12-column layout. Use the toggle in the header or the footer.
      </Note>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <PanelMock kind="article" expanded={false} />
        <PanelMock kind="project" expanded />
      </div>
      <Spec caption="Interactive: the toggle switches this one between panel and full screen">
        <PanelMock kind="poem" />
      </Spec>
    </Stack>
  );
}

function SchemePair() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {(["light", "dark"] as const).map((scheme) => (
        <div key={scheme} data-scheme={scheme} className="border border-border-strong bg-background p-4 text-foreground">
          <Stack gap={4}>
            <p className="m-0 text-base font-medium">Scheme: {scheme}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm">
                Primary
              </Button>
              <Button variant="secondary" size="sm">
                Secondary
              </Button>
              <Toggle pressed onPressedChange={() => undefined} size="sm">
                Pressed
              </Toggle>
              <StatusTag status="live" />
            </div>
            <EntryCard kind="artwork" title={SAMPLES.artwork.title} summary={SAMPLES.artwork.summary} meta={SAMPLES.artwork.meta} />
            <Frame variant="active" padding="sm">
              <p className="m-0 text-sm font-medium text-signal">Active frame</p>
              <p className="mt-1 mb-0 text-sm">Selected thing: strong line and a faint wash.</p>
            </Frame>
            <Frame variant="inverted" padding="sm">
              <p className="m-0 text-sm font-medium">Inverted frame</p>
              <p className="mt-1 mb-0 text-sm">The call-out: the opposite scheme for its subtree.</p>
              <Button variant="secondary" size="sm" className="mt-3">
                Action
              </Button>
            </Frame>
          </Stack>
        </div>
      ))}
    </div>
  );
}

function States() {
  return (
    <Grid>
      <Col span={12} spanMd={4}>
        <Spec caption="Loading: the skeleton of the content's shape">
          <StatePanel state="loading" />
        </Spec>
      </Col>
      <Col span={12} spanMd={4}>
        <Spec caption="Empty: one muted line">
          <StatePanel state="empty" title="Nothing here yet." />
        </Spec>
      </Col>
      <Col span={12} spanMd={4}>
        <Spec caption="Error">
          <StatePanel
            state="error"
            code="ERR / 500"
            title="This entry did not load"
            description="Something went wrong on our side. Try again in a moment."
            action={
              <Button variant="primary" size="sm">
                Try again
              </Button>
            }
          />
        </Spec>
      </Col>
      <Col span={12}>
        <Spec caption="Skeleton blocks">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </Spec>
      </Col>
    </Grid>
  );
}

function Motion() {
  return (
    <DataList>
      <DataRow label="--duration-fast" mono>
        120 ms: hover and focus colour
      </DataRow>
      <DataRow label="--duration-base" mono>
        220 ms: state change, slide-over
      </DataRow>
      <DataRow label="--duration-slow" mono>
        360 ms: panel slide, globe re-centre
      </DataRow>
      <DataRow label="--ease-standard" mono>
        0.2, 0, 0, 1
      </DataRow>
      <DataRow label="--duration-scan" mono>
        1600 ms: ambient, off when reduced
      </DataRow>
    </DataList>
  );
}

function Brand() {
  return (
    <Stack gap={6}>
      <Note>
        The mark: a square (the bounding box) and a disc (the globe) overlapping, the overlap knocked out, on a 16 px grid, one bit per cell. It
        takes the text colour, so it follows the scheme; whole multiples of 16 px keep every pixel crisp. The wordmark is the same shapes beside
        the site's name in semibold type. Neither is in the header (the header carries the name as text); the favicon, the home-screen icons and
        the LogoMark component are all drawn from the same data (scripts/brand/mark.mjs).
      </Note>
      <div className="flex flex-wrap items-end gap-8">
        {[16, 32, 64, 128].map((size) => (
          <Spec key={size} caption={`${size} px`}>
            <LogoMark size={size} />
          </Spec>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-8">
        <Spec caption="Wordmark, 16 px mark">
          <LogoWordmark size={16} />
        </Spec>
        <Spec caption="Wordmark, 32 px mark">
          <LogoWordmark size={32} />
        </Spec>
        <Spec caption="Wordmark, 64 px mark">
          <LogoWordmark size={64} />
        </Spec>
      </div>
      <Spec caption="On the inverted frame">
        <Frame variant="inverted" padding="sm" className="w-fit">
          <LogoWordmark size={32} />
        </Frame>
      </Spec>
    </Stack>
  );
}

export default function DevDesign() {
  const [params] = useSearchParams();
  const initial = params.get("scheme");
  const [scheme, setScheme] = useState<Scheme>(initial === "light" || initial === "dark" ? initial : "system");
  useForcedScheme(scheme);

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-6 pt-[calc(var(--navbar-height)+3rem)] pb-24">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-muted-foreground">Development only</p>
          <SegmentedControl<Scheme>
            label="Colour scheme"
            value={scheme}
            onValueChange={setScheme}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </div>
        <h1 className="m-0 text-4xl leading-[3.25rem] font-semibold tracking-tight">Catalyst UI system</h1>
        <p className="m-0 max-w-[60ch] text-lg text-muted-foreground">
          A quiet archive: few boxes, no decorative numbering, a label only where it adds information, generative covers, and one accent for state. Sample text on
          this page is made up.
        </p>
      </header>

      <Section index={1} title="Colour">
        <Colour scheme={scheme} />
      </Section>
      <Section index={2} title="Type">
        <Type />
      </Section>
      <Section index={3} title="Lines and layout">
        <Lines />
      </Section>
      <Section index={4} title="Controls">
        <Controls />
      </Section>
      <Section index={5} title="Labels and data">
        <Tags />
      </Section>
      <Section index={6} title="Cover art">
        <Covers />
      </Section>
      <Section index={7} title="Entry cards">
        <Cards />
      </Section>
      <Section index={8} title="Panel and full screen">
        <PanelSection />
      </Section>
      <Section index={9} title="States">
        <States />
      </Section>
      <Section index={10} title="Both schemes">
        <SchemePair />
      </Section>
      <Section index={11} title="Motion">
        <Motion />
      </Section>
      <Section index={12} title="Brand">
        <Brand />
      </Section>
    </main>
  );
}
