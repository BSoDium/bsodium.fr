import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
/**
 * Custom hook that retrieves the value of the 'overlay' query parameter from the URL.
 * Returns a boolean indicating whether the overlay should be hidden or not,
 * the word overlay referring to the navbar, the copyright banner, and any floating elements
 * that aren't the main page content.
 *
 * @returns {boolean} A boolean indicating whether the overlay should be hidden or not.
 */
export default function useOverlayQueryParam(): boolean {
  const [urlSearchParams] = useSearchParams();
  const hidden = useMemo(() => urlSearchParams.get('overlay') === 'false', [urlSearchParams]);
  return hidden;
}
