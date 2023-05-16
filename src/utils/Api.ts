import axios from 'axios';

export interface PinnedRepo {
  owner: string;
  repo: string;
  link: string;
  description: string;
  image: string;
  website: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
}

export default async function getPinnedRepos(): Promise<PinnedRepo[]> {
  return axios.get('https://gh-pinned-repos.egoist.dev/?username=bsodium').then((res) => res.data);
}
