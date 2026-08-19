import { and, desc, eq, isNull } from "drizzle-orm";
import { repositoryConnections } from "../drizzle/schema";
import { getDb } from "../server/db";
import { createHeartbeatJob } from "../server/_core/heartbeat";

const db = await getDb();
if (!db) throw new Error("Database unavailable");

const [connection] = await db
  .select()
  .from(repositoryConnections)
  .where(and(isNull(repositoryConnections.revokedAt), isNull(repositoryConnections.scheduleCronTaskUid)))
  .orderBy(desc(repositoryConnections.createdAt))
  .limit(1);

if (!connection) throw new Error("No unscheduled approved repository connection was found");

const job = await createHeartbeatJob(
  {
    name: `repository-monitor-${connection.id}`,
    cron: "0 */5 * * * *",
    path: "/api/scheduled/monitorRepository",
    description: `Test-only authorized repository observation for project ${connection.projectId}`,
  },
  ""
);

await db.update(repositoryConnections).set({ scheduleCronTaskUid: job.taskUid }).where(eq(repositoryConnections.id, connection.id));

console.log(JSON.stringify({ connectionId: connection.id, projectId: connection.projectId, repository: connection.githubUrl, taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt ?? null }, null, 2));
