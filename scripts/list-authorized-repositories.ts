import { listAuthorizedInstallationRepositories } from "../server/services/githubApp";

const repositories = await listAuthorizedInstallationRepositories();
console.log(JSON.stringify(repositories.map(repository => ({
  id: repository.id,
  full_name: repository.full_name,
  html_url: repository.html_url,
  private: repository.private,
})), null, 2));
