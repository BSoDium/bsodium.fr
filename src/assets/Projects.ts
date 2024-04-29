export const platforms = ['github', 'gitlab', 'figma', 'deviantart'] as const;
export type Platform = (typeof platforms)[number]

export interface Project {
  title: string;
  description: string;
  thumbnail?: string;
  source: string;
  demo?: string;
  language?: string;
  platform: Platform;
}

const projects: Project[] = [
];

export default projects;
