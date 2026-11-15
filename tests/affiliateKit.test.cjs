// Affiliate dashboard logic (Nov 14 2026): prices match the site, the follow-up plan never over-contacts, the emails
// carry the right link, credit and disclosure.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const K = require("../affiliate-kit.js");
const D = K.DAY, T0 = Date.parse("2026-11-16T14:00:00Z");

test("every tier on amenityfit.app is in the estimator, including 501 to 1,000 units and every hotel tier", () => {
  const site = fs.readFileSync(__dirname + "/../index.html", "utf8");
  for (const [, price] of [...K.BUILDING, ...K.HOTEL]) assert.match(site, new RegExp(`data-usd="${price}"`), String(price));
  assert.equal(K.estimate("building", 600, 1).monthly, 599.85);
  assert.equal(K.estimate("building", 1000, 1).twelve, 7198.2);
  assert.equal(K.estimate("building", 1001, 1).custom, true);
  assert.equal(K.estimate("building", 500, 1).monthly, 419.85);
  assert.equal(K.estimate("building", 80, 1).monthly, 149.85);
  assert.equal(K.estimate("hotel", 150, 1).monthly, 104.85);
  assert.equal(K.estimate("hotel", 1000, 1).monthly, 329.85);
});
test("yearly prepay, portfolios and the hotel bonus are counted the way the agreement does", () => {
  const y = K.estimate("building", 80, 1);
  assert.equal(y.yearlyMonthly, 134.87); assert.equal(y.priceYearlyPerMonth, 899.1);
  const p = K.estimate("building", 80, 5); // 10% off five buildings
  assert.equal(p.priceMonthly, 4495.5); assert.equal(p.monthly, 674.33);
  const big = K.estimate("building", 80, 20); // 17% off, then 10% yearly: 25.3% is capped at 25%
  assert.equal(big.priceYearlyPerMonth, 14985);
  assert.equal(K.estimate("building", 80, 40).custom, true);
  assert.equal(K.estimate("hotel", 150, 3).bonus, 500); assert.equal(K.estimate("hotel", 150, 10).bonus, 1500);
  assert.equal(K.estimate("building", 150, 10).bonus, 0);
});
test("the dashboard and the server use the same prices", () => {
  const srv = fs.readFileSync(__dirname + "/../demo/index.html", "utf8");
  assert.match(srv, /\[1000, 3999, "501 to 1,000 units"\]/);
});

const link = (x) => ({ url: "https://amenityfit.app/demo/?t=abc", firstName: "Kim", building: "The Brook", state: "live", createdAtMs: T0, opens: 0, touches: [], ...x });
test("the plan: intro, one follow-up after 4 days, one last note, then stop", () => {
  let p = K.plan(link(), T0); assert.equal(p.kind, "intro"); assert.equal(p.due, true);
  p = K.plan(link({ touches: [{ kind: "sent", atMs: T0 }] }), T0 + D); assert.equal(p.kind, "nudge"); assert.equal(p.due, false); assert.equal(p.dueAtMs, T0 + 4 * D);
  assert.equal(K.plan(link({ touches: [{ kind: "sent", atMs: T0 }] }), T0 + 4 * D).due, true);
  p = K.plan(link({ touches: [{ kind: "sent", atMs: T0 }, { kind: "followup", atMs: T0 + 4 * D }] }), T0 + 5 * D); assert.equal(p.kind, "last"); assert.equal(p.dueAtMs, T0 + 9 * D);
  p = K.plan(link({ touches: [{ kind: "sent", atMs: T0 }, { kind: "followup", atMs: T0 + 4 * D }, { kind: "followup", atMs: T0 + 9 * D }] }), T0 + 30 * D);
  assert.equal(p.done, true); assert.match(p.text, /limit/);
});
test("the plan once they open it: next step, one check-in, then leave it", () => {
  let p = K.plan(link({ opens: 2, firstOpenedAtMs: T0 + D, touches: [{ kind: "sent", atMs: T0 }] }), T0 + D); assert.equal(p.kind, "thanks"); assert.equal(p.dueAtMs, T0 + 3 * D);
  p = K.plan(link({ opens: 1, firstOpenedAtMs: T0 + D, completedAtMs: T0 + D, touches: [{ kind: "sent", atMs: T0 }] }), T0 + D); assert.equal(p.dueAtMs, T0 + 2 * D, "watched it all: a day sooner");
  p = K.plan(link({ opens: 1, firstOpenedAtMs: T0 + D, touches: [{ kind: "sent", atMs: T0 }, { kind: "followup", atMs: T0 + 3 * D }] }), T0 + 4 * D); assert.equal(p.kind, "checkin"); assert.equal(p.dueAtMs, T0 + 10 * D);
  p = K.plan(link({ opens: 1, firstOpenedAtMs: T0 + D, touches: [{ kind: "sent", atMs: T0 }, { kind: "followup", atMs: T0 + 3 * D }, { kind: "followup", atMs: T0 + 10 * D }] }), T0 + 20 * D); assert.equal(p.done, true);
  p = K.plan(link({ opens: 1 }), T0 + D); assert.equal(p.kind, "thanks", "opened without I sent it: counts as sent");
});
test("their own date, a reply, Apply and the outcomes", () => {
  assert.equal(K.plan(link({ nextFollowUpAtMs: T0 + 2 * D }), T0).dueAtMs, T0 + 2 * D);
  assert.equal(K.plan(link({ nextFollowUpAtMs: T0 + 2 * D, touches: [{ kind: "replied", atMs: T0 }] }), T0).kind, "apply");
  assert.equal(K.plan(link({ touches: [{ kind: "sent", atMs: T0 }, { kind: "replied", atMs: T0 + D }] }), T0 + 9 * D).done, true, "no automatic emails once they answer");
  assert.match(K.plan(link({ applyClickedAtMs: T0 }), T0).text, /AmenityFit takes it from here/);
  assert.equal(K.plan(link({ outcome: "not_interested", nextFollowUpAtMs: T0 }), T0).done, true);
  assert.equal(K.plan(link({ state: "expired" }), T0).done, true);
});
test("emails: their link, the affiliate's apply link (so they are credited), the disclosure, no dashes", () => {
  const o = { me: "Ana Diaz", applyUrl: "https://amenityfit.app/?ref=ANA7#apply" };
  for (const [k] of K.LIBRARY) {
    const e = K.email(k, link(), o);
    assert.ok(e.body.length > 40, k); assert.doesNotMatch(e.body + e.subject, /[—–]/, k);
    assert.doesNotMatch(e.body, /\bAI\b|Senz/, k);
  }
  assert.match(K.email("intro", link(), o).body, /demo\/\?t=abc[\s\S]*Full disclosure: I'm an AmenityFit partner/);
  assert.match(K.email("thanks", link(), o).body, /\?ref=ANA7#apply/);
  assert.match(K.email("apply", link(), o).body, /\?ref=ANA7#apply/);
  assert.match(K.email("intro", link(), { ...o, informal: true }).body, /I'm not paid for this/);
  assert.doesNotMatch(K.email("intro", link(), { ...o, informal: true }).body, /referral fee/);
});
test("handed to Asenso: no more emails from the affiliate; the talking points stay on message", () => {
  assert.match(K.plan(link({ handedOffAtMs: T0, opens: 1, touches: [{ kind: "sent", atMs: T0 - D }, { kind: "handoff", atMs: T0 }] }), T0 + 5 * D).text, /Handed to Asenso/);
  assert.equal(K.plan(link({ handedOffAtMs: T0 }), T0).done, true);
  const all = K.TALK.map(([h, t]) => h + " " + t).join(" ");
  assert.doesNotMatch(all, /[—–]|\bAI\b|Senz/); assert.match(all, /Residents never pay/); assert.match(all, /Hand to Asenso/);
});
