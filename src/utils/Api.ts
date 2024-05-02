import { Project } from 'assets/Projects';
import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

export default async function getProjects() {
  return instance.get<Project[]>('/api/featured').then((res) => res.data);
}
