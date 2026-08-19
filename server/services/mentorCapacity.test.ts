import { describe, expect, it } from "vitest";
import { summarizeMentorCapacity } from "./mentorCapacity";

describe("mentor support capacity", () => {
  it("counts participant-routed requests per active mentor without creating an automatic assignment", () => {
    expect(summarizeMentorCapacity(
      [{ userId: 4, status: "confirmed" }],
      [{ id: 4, name: "Dana Mentor" }],
      [{ mentorId: 4, status: "pending" }, { mentorId: 4, status: "accepted" }, { mentorId: 4, status: "redirected" }],
    )).toEqual([{ mentorId: 4, name: "Dana Mentor", pendingRequests: 1, acceptedRequests: 1, respondedRequests: 2 }]);
  });

  it("excludes withdrawn mentors and ignores requests routed to other mentors", () => {
    expect(summarizeMentorCapacity(
      [{ userId: 4, status: "confirmed" }, { userId: 8, status: "withdrawn" }],
      [{ id: 4, name: "Dana Mentor" }, { id: 8, name: "Withdrawn Mentor" }],
      [{ mentorId: 9, status: "pending" }, { mentorId: 8, status: "accepted" }],
    )).toEqual([{ mentorId: 4, name: "Dana Mentor", pendingRequests: 0, acceptedRequests: 0, respondedRequests: 0 }]);
  });
});
