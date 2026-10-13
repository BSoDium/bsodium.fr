import type { Route } from "./+types/poetry";
import { EntryListPage } from "~/components/entry-list-page";
import { getProjection } from "~/lib/content.server";
import { listEntries } from "~/lib/entries";
import { listMeta } from "~/lib/entry-meta";
import { metaBase } from "~/lib/meta";

// `/poetry`: the list of poems (the section is called "Poetry"), summaries only (no body, so the page stays cheap however long the texts are).
export async function loader() {
  return { items: listEntries(await getProjection(), "poem") };
}

export function meta(args: Route.MetaArgs) {
  return listMeta("poem", metaBase(args));
}

export default function PoetryRoute({ loaderData }: Route.ComponentProps) {
  return <EntryListPage kind="poem" items={loaderData.items} />;
}
