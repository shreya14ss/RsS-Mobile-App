export interface User {
  id: string;
  name: string;
  roles: string[];
  mode: string;
  project_id?: string;
}
