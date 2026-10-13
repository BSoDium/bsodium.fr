import type { Route } from "./+types/software";
import { EntryListPage } from "~/components/entry-list-page";
import { getProjection } from "~/lib/content.server";
import { listEntries } from "~/lib/entries";
import { listMeta } from "~/lib/entry-meta";
import { metaBase } from "~/lib/meta";

// `/software`: the list of software (the contract's `project` kind; the section is called "Software", see lib/sections.ts), summaries only
// (no body, so the page stays cheap however long the texts are).
export async function loader() {
  return { items: listEntries(await getProjection(), "project") };
}

export function meta(args: Route.MetaArgs) {
  return listMeta("project", metaBase(args));
}

export default function SoftwareRoute({ loaderData }: Route.ComponentProps) {
  return <EntryListPage kind="project" items={loaderData.items} />;
}
