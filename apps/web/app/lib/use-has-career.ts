import { useContext } from "react";
import { UNSAFE_DataRouterStateContext } from "react-router";

/**
 * Whether the projection has a career document (the root loader's `hasCareer`): the navigation draws the career links only then.
 * Read from the data router's state, which is absent (false, not an error) where there is no data router: a component rendered alone
 * in a test, or an error boundary.
 */
export function useHasCareer(): boolean {
  const state = useContext(UNSAFE_DataRouterStateContext);
  const root = state?.loaderData?.root as { hasCareer?: unknown } | undefined;
  return root?.hasCareer === true;
}
