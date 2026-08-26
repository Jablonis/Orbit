import assert from "node:assert/strict";
import test from "node:test";
import {
  type CrewMember,
  type CrewReaction,
  type CrewSnapshot,
  getCrewFeed,
  getCrewLeaderboard,
  getStandingLine,
  isCrewRequestOutcome,
} from "../src/lib/crew";

const me = "user-me";
const ada = "user-ada";
const bo = "user-bo";

const members: CrewMember[] = [
  { displayName: "Ada Lovelace", friendshipId: "f1", userId: ada },
  { displayName: "Bo", friendshipId: "f2", userId: bo },
];

function snapshot(
  userId: string,
  day: string,
  overrides: Partial<CrewSnapshot> = {},
): CrewSnapshot {
  return {
    altitude: 60,
    day,
    ringsClosed: 1,
    ringsTotal: 3,
    score: 70,
    streak: 3,
    tierId: "mid-orbit",
    userId,
    ...overrides,
  };
}

test("the feed is newest first and never includes your own days", () => {
  const feed = getCrewFeed({
    members,
    reactions: [],
    snapshots: [
      snapshot(ada, "2026-08-22"),
      snapshot(me, "2026-08-24"),
      snapshot(bo, "2026-08-24"),
    ],
    viewerId: me,
  });

  assert.deepEqual(
    feed.map((entry) => `${entry.userId}:${entry.day}`),
    [`${bo}:2026-08-24`, `${ada}:2026-08-22`],
  );
});

test("a day from someone no longer in the crew is not shown", () => {
  const feed = getCrewFeed({
    members: [members[0]],
    reactions: [],
    snapshots: [snapshot(ada, "2026-08-24"), snapshot(bo, "2026-08-24")],
    viewerId: me,
  });

  assert.equal(feed.length, 1);
  assert.equal(feed[0].userId, ada);
});

test("the headline names what happened, in order of what matters", () => {
  const [closed, deep, held, light, off] = getCrewFeed({
    members,
    reactions: [],
    snapshots: [
      snapshot(ada, "2026-08-24", { ringsClosed: 3, ringsTotal: 3 }),
      snapshot(ada, "2026-08-23", { streak: 12 }),
      snapshot(ada, "2026-08-22", { score: 60, streak: 2 }),
      snapshot(ada, "2026-08-21", { score: 20, streak: 0 }),
      snapshot(ada, "2026-08-20", { score: 0, streak: 0 }),
    ],
    viewerId: me,
  });

  assert.equal(closed.headline, "Ada cleared every stage.");
  assert.equal(deep.headline, "Ada is 12 days deep.");
  assert.equal(held.headline, "Ada held orbit.");
  assert.equal(light.headline, "Ada logged a light day.");
  assert.equal(off.headline, "Ada took the day off.");
});

test("reactions are counted per day, and your own are marked", () => {
  const reactions: CrewReaction[] = [
    { day: "2026-08-24", fromUser: me, kind: "fire", toUser: ada },
    { day: "2026-08-24", fromUser: bo, kind: "fire", toUser: ada },
    { day: "2026-08-24", fromUser: bo, kind: "clap", toUser: ada },
    // A different day, and a different person: neither belongs on this card.
    { day: "2026-08-23", fromUser: me, kind: "eyes", toUser: ada },
    { day: "2026-08-24", fromUser: me, kind: "eyes", toUser: bo },
  ];

  const [entry] = getCrewFeed({
    members,
    reactions,
    snapshots: [snapshot(ada, "2026-08-24")],
    viewerId: me,
  });

  assert.deepEqual(
    entry.reactions.map((reaction) => [reaction.kind, reaction.count, reaction.mine]),
    [
      ["fire", 2, true],
      ["clap", 1, false],
      ["eyes", 0, false],
    ],
  );
});

test("the table ranks on days in orbit first, then points", () => {
  const days = ["2026-08-24", "2026-08-25", "2026-08-26"];
  const rows = getCrewLeaderboard({
    days,
    members,
    snapshots: [
      // Ada: two days held.
      snapshot(ada, "2026-08-24", { score: 80 }),
      snapshot(ada, "2026-08-25", { score: 60 }),
      // Bo: one enormous day.
      snapshot(bo, "2026-08-24", { score: 100 }),
      snapshot(bo, "2026-08-25", { score: 10 }),
      // You: two days held, more points than Ada.
      snapshot(me, "2026-08-24", { score: 90 }),
      snapshot(me, "2026-08-25", { score: 70 }),
    ],
    viewerId: me,
    viewerName: "You",
  });

  assert.deepEqual(
    rows.map((row) => [row.position, row.displayName, row.daysInOrbit, row.points]),
    [
      [1, "You", 2, 160],
      [2, "Ada Lovelace", 2, 140],
      [3, "Bo", 1, 110],
    ],
  );
});

test("days outside the window do not count", () => {
  const rows = getCrewLeaderboard({
    days: ["2026-08-24"],
    members: [members[0]],
    snapshots: [
      snapshot(ada, "2026-08-24", { score: 80 }),
      snapshot(ada, "2026-08-17", { score: 100 }),
    ],
    viewerId: me,
    viewerName: "You",
  });

  assert.equal(rows.find((row) => row.userId === ada)?.points, 80);
});

test("you are on the table even with nothing logged", () => {
  const rows = getCrewLeaderboard({
    days: ["2026-08-24"],
    members,
    snapshots: [snapshot(ada, "2026-08-24"), snapshot(bo, "2026-08-24")],
    viewerId: me,
    viewerName: "You",
  });

  const you = rows.find((row) => row.isYou);
  assert.ok(you);
  assert.equal(you.position, 3);
  assert.equal(you.points, 0);
});

test("the standing line says the gap, or the lead", () => {
  const leading = getCrewLeaderboard({
    days: ["2026-08-24", "2026-08-25"],
    members: [members[0]],
    snapshots: [
      snapshot(me, "2026-08-24", { score: 80 }),
      snapshot(me, "2026-08-25", { score: 80 }),
      snapshot(ada, "2026-08-24", { score: 80 }),
    ],
    viewerId: me,
    viewerName: "You",
  });
  const behind = getCrewLeaderboard({
    days: ["2026-08-24", "2026-08-25"],
    members: [members[0]],
    snapshots: [
      snapshot(ada, "2026-08-24", { score: 80 }),
      snapshot(ada, "2026-08-25", { score: 80 }),
    ],
    viewerId: me,
    viewerName: "You",
  });

  assert.equal(getStandingLine(leading), "You lead by 1 day.");
  assert.equal(getStandingLine(behind), "2 days behind Ada Lovelace.");
});

test("an empty crew says so rather than declaring you the winner", () => {
  const rows = getCrewLeaderboard({
    days: ["2026-08-24"],
    members: [],
    snapshots: [],
    viewerId: me,
    viewerName: "You",
  });

  assert.equal(getStandingLine(rows), "Nobody in the crew yet. A code is all it takes.");
});

test("only the outcomes the database can return are accepted", () => {
  assert.equal(isCrewRequestOutcome("accepted"), true);
  assert.equal(isCrewRequestOutcome("unknown"), true);
  assert.equal(isCrewRequestOutcome("something-else"), false);
  assert.equal(isCrewRequestOutcome(null), false);
});
