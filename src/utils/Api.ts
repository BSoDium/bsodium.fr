import { Project } from 'assets/Projects';
import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://api.bsodium.fr',
});

export default async function getProjects() {
  return instance.get<Project[]>('/api/featured').then((res) => res.data);
}
