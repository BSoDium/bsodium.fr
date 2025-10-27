export const osNames = [
  "macOS",
  "Windows",
  "Linux",
  "iOS",
  "iPadOS",
  "Android",
] as const;
export type OSName = (typeof osNames)[number];

/**
 * Returns the name of the operating system.
 * @returns The name of the operating system.
 */
export function getOS(): OSName {
  const platform = window.navigator.platform.toLowerCase();
  if (platform.includes("mac")) {
    return "macOS";
  }
  if (platform.includes("win")) {
    return "Windows";
  }
  if (platform.includes("linux")) {
    return "Linux";
  }
  if (/iphone|ipod/.test(platform)) {
    return "iOS";
  }
  if (platform.includes("ipad")) {
    return "iPadOS";
  }
  if (platform.includes("android")) {
    return "Android";
  }

  throw new Error("Unsupported OS");
}

export const mapProviders = ["apple", "google"] as const;
export type MapProvider = (typeof mapProviders)[number];

/**
 * Returns the map provider to use, depending on OS or other criteria.
 * @return The map provider to use.
 */
export function getMapProvider(): MapProvider {
  const os = getOS();
  if (os === "iOS" || os === "iPadOS" || os === "macOS") {
    return "apple";
  }
  return "google";
}
