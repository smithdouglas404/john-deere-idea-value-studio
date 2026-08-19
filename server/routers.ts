import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { hackathonsRouter } from "./routers/hackathons";
import { governanceRouter } from "./routers/governance";
import { judgingRouter } from "./routers/judging";
import { opportunitiesRouter } from "./routers/opportunities";
import { repositoriesRouter } from "./routers/repositories";
import { studioRouter } from "./routers/studio";
import { talentRouter } from "./routers/talent";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  opportunities: opportunitiesRouter,
  repositories: repositoriesRouter,
  hackathons: hackathonsRouter,
  governance: governanceRouter,
  judging: judgingRouter,
  talent: talentRouter,
  studio: studioRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
