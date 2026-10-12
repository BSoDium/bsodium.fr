export const GRID: number;
export const MARK: string[];
export function markPath(rows?: string[]): string;
export function markSvg(options?: { px?: number; fill?: string | null; rows?: string[] }): string;
