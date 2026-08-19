import { searchIndexedCode } from "../server/services/repositoryCodeIndex";

const results = await searchIndexedCode({
  projectId: 1,
  connectionId: 1,
  actorId: 1,
  query: "hackathon evidence repository workflow",
  limit: 3,
});

console.log(JSON.stringify({
  resultCount: results.length,
  results: results.map(result => ({ filePath: result.filePath, commitSha: result.commitSha, similarity: Number(result.similarity.toFixed(6)), embeddingVersion: result.embeddingVersion })),
}, null, 2));
