export type MentorCapacityRegistration = { userId: number; status: string };
export type MentorCapacityPerson = { id: number; name: string | null };
export type MentorCapacityRequest = { mentorId: number; status: string };

export function summarizeMentorCapacity(
  mentors: MentorCapacityRegistration[],
  people: MentorCapacityPerson[],
  requests: MentorCapacityRequest[],
) {
  return mentors.filter(mentor => mentor.status !== "withdrawn").map(mentor => ({
    mentorId: mentor.userId,
    name: people.find(person => person.id === mentor.userId)?.name || "Registered mentor",
    pendingRequests: requests.filter(request => request.mentorId === mentor.userId && request.status === "pending").length,
    acceptedRequests: requests.filter(request => request.mentorId === mentor.userId && request.status === "accepted").length,
    respondedRequests: requests.filter(request => request.mentorId === mentor.userId && ["accepted", "declined", "redirected"].includes(request.status)).length,
  }));
}
