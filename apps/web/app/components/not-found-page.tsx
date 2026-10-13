import { Link } from "react-router";
import { pageTitle } from "~/lib/meta";
import { Button, Icon, StatePanel } from "~/components/ui";

/** Global 404 (unmatched URL, or an entry slug that does not exist): the empty state of the UI system on the plain page. */
export function NotFoundPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-6 pt-[calc(var(--navbar-height)+3rem)] pb-24 outline-none">
      <title>{pageTitle("Page not found")}</title>
      <meta name="robots" content="noindex" />
      <StatePanel
        state="empty"
        headingLevel={1}
        title="Page not found"
        description="There is nothing at this address. It may have been moved or never existed."
        action={
          <Button asChild variant="primary">
            <Link to="/">
              <Icon name="arrow-left" size="inline" />
              Back to the globe
            </Link>
          </Button>
        }
      />
    </main>
  );
}
