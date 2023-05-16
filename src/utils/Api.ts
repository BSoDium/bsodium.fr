import axios from 'axios';

export default async function getPinnedRepos() {
  return axios.get('https://gh-pinned-repos.egoist.dev/?username=bsodium');
}
