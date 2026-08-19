import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { userProfiles, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The data service is not available." });
  return db;
}

export const governanceRouter = router({
  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
    return profile || null;
  }),
  directory: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can view or assign program personas." });
    const db = await dbOrThrow();
    return db.select({ id: users.id, name: users.name, email: users.email, persona: userProfiles.persona }).from(users).leftJoin(userProfiles, eq(userProfiles.userId, users.id));
  }),
  assignPersona: protectedProcedure.input(z.object({ userId: z.number().int().positive(), persona: z.enum(["participant", "organizer", "sponsor", "judge", "mentor", "admin"]) })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can assign a program persona." });
    const db = await dbOrThrow();
    await db.insert(userProfiles).values({ userId: input.userId, persona: input.persona }).onDuplicateKeyUpdate({ set: { persona: input.persona } });
    return { success: true };
  }),
});
