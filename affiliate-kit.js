// The affiliate dashboard's plain logic (Nov 14 2026): prices and commission, the follow-up plan for each demo link,
// and the emails and scripts. Kept apart from the page so it is tested. The page loads it as a plain script
// (window.AFKit); the tests load it with require().
(function (root) {
  "use strict";

  // The same prices as amenityfit.app, the demo page and the signed agreement (Exhibit A).
  var BUILDING = [[50, 599, "Up to 50 units"], [100, 999, "51 to 100 units"], [200, 1499, "101 to 200 units"], [300, 1999, "201 to 300 units"], [500, 2799, "301 to 500 units"], [1000, 3999, "501 to 1,000 units"]];
  var HOTEL = [[100, 349, "Up to 100 rooms"], [250, 699, "101 to 250 rooms"], [500, 1299, "251 to 500 rooms"], [1000, 2199, "501 to 1,000 rooms"]];
  var RATE = 0.15;
  var round2 = function (x) { return Math.round(x * 100) / 100; };

  function tiers(kind) { return kind === "hotel" ? HOTEL : BUILDING; }
  function tierFor(kind, size) {
    var n = Math.round(Number(size) || 0);
    if (n < 1) return null;
    var t = tiers(kind).filter(function (x) { return n <= x[0]; })[0];
    return t ? { max: t[0], monthly: t[1], label: t[2] } : null;
  }
  // Portfolio discounts, the same as the portfolio application (one agreement for several properties).
  function portfolioPct(kind, count) {
    var n = Number(count) || 1;
    if (kind === "hotel") return n >= 20 ? 0.10 : n >= 10 ? 0.08 : n >= 3 ? 0.05 : 0;
    if (n >= 40) return null; // custom agreement
    return n >= 20 ? 0.17 : n >= 10 ? 0.13 : n >= 5 ? 0.10 : 0;
  }
  function hotelBonus(kind, count) { return kind !== "hotel" ? 0 : count >= 10 ? 1500 : count >= 3 ? 500 : 0; }

  /**
   * What a deal pays the affiliate. kind "building" or "hotel"; size units or rooms per property; count properties of
   * that size under one agreement. Prices are combined the way the agreement does it, capped at 25% off in all.
   */
  function estimate(kind, size, count) {
    var n = Math.max(1, Math.min(200, Math.round(Number(count) || 1)));
    var t = tierFor(kind, size);
    var pct = portfolioPct(kind, n);
    if (!t || pct === null) return { custom: true, tier: t, count: n, bonus: hotelBonus(kind, n) };
    var base = t.monthly * n;
    var monthlyMult = Math.max(0.75, 1 - pct), yearlyMult = Math.max(0.75, (1 - pct) * 0.9);
    var priceMonthly = round2(base * monthlyMult), priceYearlyPerMonth = round2(base * yearlyMult);
    // The same as the payout: 15% in whole cents, rounded down, so the estimate is never more than what is paid.
    var c1 = Math.floor(Math.round(priceMonthly * 100) * 15 / 100) / 100, c2 = Math.floor(Math.round(priceYearlyPerMonth * 12 * 100) * 15 / 1200) / 100;
    return {
      custom: false, tier: t, count: n, portfolioPct: pct, priceMonthly: priceMonthly, priceYearlyPerMonth: priceYearlyPerMonth,
      monthly: c1, twelve: round2(c1 * 12), yearlyMonthly: c2, yearlyTwelve: round2(c2 * 12), bonus: hotelBonus(kind, n),
    };
  }

  // ----- the follow-up plan for one demo link -----
  // At most three emails before they answer (the first and two follow-ups) and, once they have watched, two notes.
  // Never more: the link stays live for 90 days and they can come back to it.
  var DAY = 86400000;
  var EMAIL_TOUCHES = { sent: 1, followup: 1 };
  function plan(l, now) {
    now = now || Date.now();
    var touches = Array.isArray(l.touches) ? l.touches.slice().sort(function (a, b) { return a.atMs - b.atMs; }) : [];
    var emails = touches.filter(function (t) { return EMAIL_TOUCHES[t.kind]; });
    var last = touches.length ? touches[touches.length - 1].atMs : 0;
    var done = function (text) { return { done: true, text: text }; };
    var step = function (kind, dueAtMs, text) { return { kind: kind, dueAtMs: dueAtMs, due: dueAtMs <= now, text: text }; };
    if (l.state && l.state !== "live") return done("This link is no longer live.");
    if (l.outcome === "not_interested") return done("Not interested. No more emails. Thank them and move on.");
    if (l.outcome === "wrong_person") return done("Wrong person. Make a new link for the right manager.");
    if (l.applyClickedAtMs) return done("They clicked Apply. AmenityFit takes it from here, and it shows under Your referrals once they apply.");
    if (l.handedOffAtMs || touches.some(function (t) { return t.kind === "handoff"; })) return done("Handed to Asenso. He has your note, and it shows under Your referrals once they sign up.");
    var replied = touches.some(function (t) { return t.kind === "replied" || t.kind === "met"; }) || l.outcome === "interested";
    if (l.nextFollowUpAtMs > 0) return step(replied ? "apply" : l.opens > 0 ? "checkin" : "nudge", l.nextFollowUpAtMs, "Your follow-up date.");
    if (l.outcome === "not_now") return done("Not right now. Set a follow-up date for when they said to check back.");
    if (replied) return done("You are talking. Set a follow-up date for your next step, or send the how-to-apply note.");
    var firstSent = emails.length ? emails[0].atMs : l.opens > 0 ? l.createdAtMs : 0;
    if (!firstSent) return step("intro", l.createdAtMs || now, "Send the intro email with their link, then tap I sent it.");
    if (!(l.opens > 0)) {
      var n = Math.max(1, emails.length);
      // Nov 14 2026 (Senz): a week before the follow-up, then 5 days before the last note.
      if (n === 1) return step("nudge", firstSent + 7 * DAY, "Not opened yet. One short follow-up, a week after the first email.");
      if (n === 2) return step("last", (last || firstSent) + 5 * DAY, "Still not opened. One last short note, with the walkthrough link again.");
      return done("Three emails and no open: that is the limit. Leave it. The link stays live for 90 days.");
    }
    var openedAt = l.firstOpenedAtMs || l.lastOpenedAtMs || firstSent;
    var after = emails.filter(function (t) { return t.atMs >= openedAt; }).length;
    var watchedAll = l.completedAtMs || l.maxSeconds >= 444;
    if (after === 0) return step("thanks", openedAt + (watchedAll ? 1 : 2) * DAY, watchedAll ? "They watched it all. Send the next-step note." : "They opened it. Send the next-step note.");
    if (after === 1) return step("checkin", (last || openedAt) + 7 * DAY, "One friendly check-in a week later.");
    return done("They have everything. Leave the next move to them, or call if you know them.");
  }

  function mmss(s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function stage(l) {
    if (l.state && l.state !== "live") return ["off", l.state === "off" ? "Switched off" : "Expired"];
    if (l.applyClickedAtMs) return ["hot", "Clicked Apply"];
    if (l.completedAtMs || l.maxSeconds >= 444) return ["hot", "Watched it all"];
    if (l.maxSeconds > 0) return ["warm", "Watched " + mmss(l.maxSeconds)];
    if (l.videoErrorAtMs) return ["off", "Video didn't play"];
    if (l.playedAtMs) return ["warm", "Pressed play"];
    if (l.opens > 0) return ["cold", "Opened, didn't press play"];
    return ["cold", "Not opened yet"];
  }

  // ----- emails and scripts -----
  // Disclosure: the affiliate agreement and the FTC need paid affiliates to say they may be paid. Informal referrers
  // are never paid, so theirs says so instead.
  function disclosure(informal) {
    return informal
      ? "I'm not paid for this. I just think it's a good fit."
      : "Full disclosure: I'm an AmenityFit partner and may earn a referral fee if you sign up.";
  }
  // Nov 24 2026 (Senz): simpler, in the same words as his own emails: a digital platform, no on-site trainers or staff.
  var PITCH = "AmenityFit is a digital platform that gives residents personalized workouts tailored to the exact equipment already in your gym. It requires no on-site trainers or staff involvement, and your team gets a monthly report on how residents use it. Residents never pay anything.";
  function email(kind, l, o) {
    o = o || {};
    var place = l.building || l.company || "your building";
    var hi = "Hi " + (l.firstName || "there") + ",\n\n";
    var sign = "\n\nBest,\n" + (o.me || "");
    // Nov 24 2026 (Senz): never "personal trainer" in a subject (a manager read it as staffing); the same subject as
    // Asenso's own sales emails, and every first message says plainly it is an app with no trainers on site.
    var subj = "The gym at " + place;
    var apply = o.applyUrl || "https://amenityfit.app/#apply";
    var site = o.siteUrl || "https://amenityfit.app";
    var disc = "\n\n" + disclosure(o.informal);
    switch (kind) {
      // Nov 14 2026: built from an affiliate's own first email and follow-up (Lucille's), tightened and made true to
      // the app: the problem in one question, what residents and the team get, the walkthrough, how to apply with
      // the code already in, and the disclosure.
      case "intro": return { subject: subj, body: hi + "I wanted to share something for the gym at " + place + ". " + PITCH + "\n\nIt was built by Asenso Ampim, who was a personal trainer for 7 years before founding it.\n\nHere is a private 7-minute walkthrough, with pricing:\n" + l.url + "\n\nIf it's a fit, you can apply in about 2 minutes here" + (o.code ? " (my referral code, " + o.code + ", is already filled in)" : "") + ":\n" + apply + disc + sign };
      case "nudge": return { subject: "Re: " + subj, body: hi + "Following up in case the walkthrough got buried. It's 7 minutes and shows what residents get and what your team sees:\n" + l.url + "\n\nNo on-site trainers or staff involvement, nothing for your team to run. Happy to answer anything." + sign };
      case "last": return { subject: "Re: " + subj, body: hi + "Last note from me on this. If you haven't had a chance yet, this 7-minute walkthrough shows exactly what your residents and your team would get:\n" + l.url + "\n\nIf resident fitness isn't a priority right now, no problem at all. The link stays up for a while if it becomes one." + sign };
      case "thanks": return { subject: "Re: " + subj, body: hi + "Thanks for taking a look. If it's a fit for " + place + ", the application takes about 2 minutes here:\n" + apply + "\n\nThe agreement comes by e-signature after that. Any question, you can ask right on the walkthrough page or just reply here." + sign };
      case "checkin": return { subject: "Re: " + subj, body: hi + "Checking in on AmenityFit for " + place + ". Happy to answer anything, or to put you in touch with Asenso, the founder, if a quick call would help.\n\nThe walkthrough again: " + l.url + sign };
      case "apply": return { subject: "Next step for " + place, body: hi + "Great talking with you. Here is the application. It takes about 2 minutes:\n" + apply + "\n\nAfter that the agreement comes by e-signature, and the AmenityFit team sets up " + place + " with you." + sign };
      case "text": return { subject: "", body: "Hi " + (l.firstName || "") + ", it's " + (o.me || "") + ". Here's the 7-minute AmenityFit walkthrough I mentioned, made for " + place + ": " + l.url + " " + disclosure(o.informal) };
      case "linkedin": return { subject: "", body: "Hi " + (l.firstName || "") + ", AmenityFit is a digital platform that gives residents personalized workouts tailored to the equipment already in your gym, with no on-site trainers or staff involvement. I made a private 7-minute walkthrough for " + place + ": " + l.url + " " + disclosure(o.informal) };
      case "call": return { subject: "", body: "\"Hi " + (l.firstName || "") + ", it's " + (o.me || "") + ". Quick one: do your residents use the gym at " + place + " much? There's an app called AmenityFit that gives residents personalized workouts built around the exact equipment already in your gym, and your team gets a monthly report on how it's used. No on-site trainers or staff involvement, and residents don't pay anything. Can I send you a brief walkthrough? It's a 7-minute video.\"\n\nIf yes: make their link, send the intro email, tap I sent it." };
    }
    return { subject: "", body: "" };
  }
  var LIBRARY = [
    ["intro", "First email", "Day 1. Their private walkthrough, and your link to apply. Add one personal line at the top before you send it."],
    ["nudge", "Follow-up", "A week after the first email, only if it was not opened."],
    ["last", "Last note", "5 days after the follow-up, only if still not opened. Then stop."],
    ["thanks", "After they watch", "A day or two after they open it. How to apply."],
    ["checkin", "Check-in", "A week after that, once."],
    ["apply", "How to apply", "When they say they're interested."],
    ["text", "Text message", "For someone you already know."],
    ["linkedin", "LinkedIn message", "Short, for a first message there."],
    ["call", "Phone or in person", "What to say, in 20 seconds."],
  ];

  // How to talk about it: Senz's own positioning, in short lines an affiliate can say out loud.
  var TALK = [
    ["Who to reach", "The property manager, general manager or asset manager of a building with a gym (apartments, condos, senior-friendly buildings) or a hotel with a fitness room. A management company with several buildings is the best find: one agreement covers all of them."],
    ["What it is", "A digital platform that gives residents personalized workouts tailored to the exact equipment already in their gym, with a coach in the app they can ask anything. No on-site trainers or staff involvement, nothing for the team to run, and residents never pay. Say this early: some managers hear 'personal trainer' and think you mean staff coming on site."],
    ["The problem it solves", "Residents want to use the gym but aren't sure what to do, and a trainer every week can get costly, so without a plan most stop going consistently. Asenso saw this firsthand in 7 years as a personal trainer in residential buildings."],
    ["Why a manager cares", "It makes the gym they already paid for get used, it's an amenity they can show on tours, and the team gets a monthly report showing how residents use it. Residents never pay anything."],
    ["For every age", "Many residents are in their 60s and 70s. The programs meet people where they are, so it is not only for the gym regulars."],
    ["Price, if asked", "One flat monthly price per building by size, the same for everyone, 10% off when paid for the year. The walkthrough shows the exact price for their building. Never offer a discount or a free trial."],
    ["Make it yours", "Before you send the first email, add one line at the top in your own words: how you know them, the building, or the area. A personal line is what gets a stranger to keep reading. Everything else can stay as it is."],
    ["The next step", "Send their private walkthrough. When they are interested, tell them to sign up with the Apply button on it: your referral code is already filled in, so the building is credited to you. Then tap Hand to Asenso with a short note on what you told them and what they need, so he knows it came from you."],
  ];
  var api = { BUILDING: BUILDING, HOTEL: HOTEL, RATE: RATE, tierFor: tierFor, portfolioPct: portfolioPct, hotelBonus: hotelBonus, estimate: estimate, plan: plan, stage: stage, mmss: mmss, email: email, disclosure: disclosure, LIBRARY: LIBRARY, DAY: DAY, TALK: TALK };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AFKit = api;
})(typeof window !== "undefined" ? window : globalThis);
