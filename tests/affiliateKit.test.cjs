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
  assert.equal(y.yearlyMonthly, 134.86, "rounded down, as paid"); assert.equal(y.priceYearlyPerMonth, 899.1);
  const p = K.estimate("building", 80, 5); // 10% off five buildings
  assert.equal(p.priceMonthly, 4495.5); assert.equal(p.monthly, 674.32);
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
test("the plan (Senz, Nov 14): intro, a follow-up a week later, a last note 5 days after that, then stop", () => {
  let p = K.plan(link(), T0); assert.equal(p.kind, "intro"); assert.equal(p.due, true);
  p = K.plan(link({ touches: [{ kind: "sent", atMs: T0 }] }), T0 + D); assert.equal(p.kind, "nudge"); assert.equal(p.due, false); assert.equal(p.dueAtMs, T0 + 7 * D);
  assert.equal(K.plan(link({ touches: [{ kind: "sent", atMs: T0 }] }), T0 + 6 * D).due, false);
  assert.equal(K.plan(link({ touches: [{ kind: "sent", atMs: T0 }] }), T0 + 7 * D).due, true);
  p = K.plan(link({ touches: [{ kind: "sent", atMs: T0 }, { kind: "followup", atMs: T0 + 7 * D }] }), T0 + 8 * D); assert.equal(p.kind, "last"); assert.equal(p.dueAtMs, T0 + 12 * D);
  p = K.plan(link({ touches: [{ kind: "sent", atMs: T0 }, { kind: "followup", atMs: T0 + 7 * D }, { kind: "followup", atMs: T0 + 12 * D }] }), T0 + 30 * D);
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

test("emails (Nov 14): the first carries the walkthrough and the affiliate's website link; the last note the walkthrough again", () => {
  const o = { me: "Ana Diaz", applyUrl: "https://amenityfit.app/?ref=ANA7#apply", siteUrl: "https://amenityfit.app/?ref=ANA7" };
  const intro = K.email("intro", link(), o).body;
  assert.match(intro, /demo\/\?t=abc[\s\S]*https:\/\/amenityfit\.app\/\?ref=ANA7/);
  assert.match(K.email("last", link(), o).body, /demo\/\?t=abc/);
  assert.match(K.LIBRARY.find((x) => x[0] === "nudge")[2], /A week after the first email/);
});
test("the website keeps the affiliate's code for 90 days, so a later visit still credits them", () => {
  const src = fs.readFileSync(__dirname + "/../index.html", "utf8");
  const i = src.indexOf("(function prefillReferralCode() {"), j = src.indexOf("})();", i) + 5;
  const run = (search, store, now) => {
    const fields = {}; ["f-referral", "h-referral", "pb-referral", "ph-referral"].forEach((k) => { fields[k] = { value: "" }; });
    new Function("window", "document", "localStorage", "Date", "URLSearchParams", src.slice(i, j))({ location: { search } }, { getElementById: (k) => fields[k] }, store, { now: () => now }, URLSearchParams);
    return fields["f-referral"].value;
  };
  const mem = {}; const store = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  assert.equal(run("?ref=ana7", store, 1000), "ANA7");
  assert.equal(run("", store, 1000 + 30 * 86400000), "ANA7", "came back a month later");
  assert.equal(run("", store, 1000 + 91 * 86400000), "", "after 90 days it is gone");
  assert.equal(run("?ref=ben1", store, 2000), "BEN1", "a newer link wins");
  assert.equal(run("?ref=<script>", store, 3000), "BEN1", "junk is ignored");
});
test("a link to #apply lands on the top of Request Access once the page settles, and stops if they scroll", () => {
  const src = fs.readFileSync(__dirname + "/../index.html", "utf8");
  const i = src.indexOf("(function landOnSection() {");
  assert.ok(i > 0);
  const b = src.slice(i, i + 900);
  assert.match(b, /try \{ scrollToSection\(id\); \}/); assert.match(b, /window\.addEventListener\('load', go\)/); assert.match(b, /setTimeout\(go, 1500\)/);
  assert.match(b, /\['wheel', 'touchstart', 'keydown'\]/);
});
test("the sample emails (Nov 14, from an affiliate's own): the first has the walkthrough, the apply link and their code; no dashes, no AI", () => {
  const o = { me: "Ana Diaz", applyUrl: "https://amenityfit.app/?ref=ANA7#apply", siteUrl: "https://amenityfit.app/?ref=ANA7", code: "ANA7" };
  const intro = K.email("intro", link(), o);
  assert.equal(intro.subject, "The gym at The Brook");
  assert.match(intro.body, /demo\/\?t=abc[\s\S]*my referral code, ANA7, is already filled in[\s\S]*\?ref=ANA7#apply[\s\S]*Full disclosure/);
  assert.match(K.email("nudge", link(), o).body, /brings neighbors together[\s\S]*demo\/\?t=abc/);
  for (const k of ["intro", "nudge", "last"]) { const b = K.email(k, link(), o).body; assert.doesNotMatch(b, /[—–]|\bAI\b|Senz|Lucille/); }
  assert.doesNotMatch(K.email("intro", link(), { ...o, code: "" }).body, /referral code/);
});

test("next step: they sign up with Apply on their walkthrough (code filled in), then the affiliate tells Asenso", () => {
  const step = K.TALK.find((t) => t[0] === "The next step")[1];
  assert.match(step, /sign up with the Apply button/);
  assert.match(step, /referral code is already filled in/);
  assert.match(step, /Hand to Asenso/);
  assert.doesNotMatch(step, /takes it from there/);
  const html = require("fs").readFileSync(require("path").join(__dirname, "../affiliate-dashboard.html"), "utf8");
  assert.ok(html.includes("Interested? Have them sign up, then tell Asenso"));
  assert.ok(!html.includes("He reaches out himself"));
});

test("Nov 16 2026: the first email and the call open on the real pain point, from Asenso's 7 years in residential gyms; affiliates are told to add one personal line", () => {
  const b = K.email("intro", { firstName: "Maria", building: "The Brook", url: "https://amenityfit.app/demo/?t=abc" }, { me: "Pat", code: "ANA7" }).body;
  assert.match(b, /^Hi Maria,\n\nI wanted to share something that could help residents at The Brook get more out of the gym\. The founder of AmenityFit, Asenso Ampim, spent 7 years as a personal trainer in buildings like yours and kept hearing the same thing: people wanted to use the gym but weren't sure what to do, and a trainer every week could get costly\. Without a plan, most stopped going consistently\.\n\nThat's why he built AmenityFit, so every resident gets workouts built around the exact equipment in your gym/);
  assert.doesNotMatch(b, /[—–]|\bAI\b/);
  assert.match(K.email("call", { firstName: "Maria", building: "The Brook", url: "x" }, { me: "Pat" }).body, /aren't sure what to do, and a trainer every week can get costly/);
  assert.ok(K.TALK.some(([h, t]) => h === "Make it yours" && /one line at the top in your own words/.test(t)));
  assert.ok(K.TALK.some(([h]) => h === "The problem it solves"));
  assert.match(K.LIBRARY.find((l) => l[0] === "intro")[2], /Add one personal line at the top/);
});

test("Nov 24 2026: every first message says plainly it is an app with no trainers on site, and no subject says personal trainer", () => {
  const L = "no trainers on site";
  const lead = { firstName: "Maria", building: "The Brook", url: "https://amenityfit.app/demo/?t=x" };
  for (const k of ["intro", "linkedin", "call"]) assert.match(K.email(k, lead, { me: "Pat", code: "AB12" }).body, new RegExp(L, "i"), k);
  for (const [k] of K.LIBRARY) assert.doesNotMatch(K.email(k, lead, { me: "Pat" }).subject, /personal trainer/i, k);
  assert.ok(K.TALK.find((x) => x[0] === "What it is")[1].includes("It's an app: no trainers on site, no staff time, nothing for your team to run."));
});

test("stage shows exact watched time, pressed play and video errors (Nov 24 2026)", () => {
  const K = require("../affiliate-kit.js");
  assert.deepEqual(K.stage({ state: "live", opens: 2, maxSeconds: 42 }), ["warm", "Watched 0:42"]);
  assert.deepEqual(K.stage({ state: "live", opens: 1, maxSeconds: 135 }), ["warm", "Watched 2:15"]);
  assert.deepEqual(K.stage({ state: "live", opens: 1, maxSeconds: 0, playedAtMs: 5 }), ["warm", "Pressed play"]);
  assert.deepEqual(K.stage({ state: "live", opens: 1, maxSeconds: 0, playedAtMs: 5, videoErrorAtMs: 6 }), ["off", "Video didn't play"]);
  assert.deepEqual(K.stage({ state: "live", opens: 8, maxSeconds: 0 }), ["cold", "Opened, didn't press play"]);
  assert.deepEqual(K.stage({ state: "live", opens: 0 }), ["cold", "Not opened yet"]);
  assert.deepEqual(K.stage({ state: "live", opens: 1, maxSeconds: 450 }), ["hot", "Watched it all"]);
});
