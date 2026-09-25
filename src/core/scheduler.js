import { mulberry32 } from './random.js';
import { buildReport } from './report.js';
import { canAssign } from './rules.js';
import { buildSlots, shiftMinutes } from './slots.js';
import { addAssignment, createState, deviation, removeAssignment } from './state.js';
import { computeTargets, groupExceptions } from './targets.js';

const MAX_ITERATIONS = 2000;
const EPS = 1e-9;

export function defaultSeed(config) {
  return config.year * 100 + config.month;
}

export function generateSchedule({ people, exceptions = [], config, seed = defaultSeed(config) }) {
  const slots = buildSlots(config);
  const slotById = new Map(slots.map((s) => [s.id, s]));
  const grouped = groupExceptions(exceptions);
  const targets = computeTargets(people, grouped, config);
  const state = createState(people, grouped, targets, config);
  const rng = mulberry32(seed);

  for (const slot of slots) {
    for (let seat = 0; seat < slot.required; seat++) {
      const best = pickCandidate(state, slot, rng);
      if (!best) break;
      addAssignment(state, best, slot);
    }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (tryFill(state, slots, rng)) continue;
    if (tryTransfer(state, slotById)) continue;
    if (trySwap(state, slotById)) continue;
    break;
  }

  return buildResult(state, slots, seed);
}

function pickCandidate(state, slot, rng) {
  const ranked = state.people
    .filter((person) => canAssign(state, person, slot))
    .map((person) => ({
      person,
      dev: deviation(state, person),
      count: state.shiftCounts[slot.shiftId][person],
      weekend: slot.isWeekend ? state.weekend[person] : 0,
      rand: rng(),
    }))
    .sort((a, b) => a.dev - b.dev || a.count - b.count || a.weekend - b.weekend || a.rand - b.rand);
  return ranked[0]?.person ?? null;
}

function tryFill(state, slots, rng) {
  for (const slot of slots) {
    if ((state.seats[slot.id]?.length ?? 0) >= slot.required) continue;
    const best = pickCandidate(state, slot, rng);
    if (best) {
      addAssignment(state, best, slot);
      return true;
    }
  }
  return false;
}

const hoursDelta = (h, donorDev, receiverDev) => 2 * h * (receiverDev - donorDev) + 2 * h * h;
const improves = (hd, sd) => hd < -EPS || (Math.abs(hd) <= EPS && sd < 0);

function tryTransfer(state, slotById) {
  const order = [...state.people].sort((a, b) => deviation(state, b) - deviation(state, a));
  for (const donor of order) {
    const donorDev = deviation(state, donor);
    for (let r = order.length - 1; r >= 0; r--) {
      const receiver = order[r];
      if (receiver === donor) continue;
      const receiverDev = deviation(state, receiver);
      for (const a of state.byPerson[donor]) {
        const counts = state.shiftCounts[a.shiftId];
        const hd = hoursDelta(a.minutes / 60, donorDev, receiverDev);
        const sd = 2 * (counts[receiver] - counts[donor]) + 2;
        if (!improves(hd, sd)) continue;
        const slot = slotById.get(a.slotId);
        if (!canAssign(state, receiver, slot)) continue;
        removeAssignment(state, donor, slot);
        addAssignment(state, receiver, slot);
        return true;
      }
    }
  }
  return false;
}

function trySwap(state, slotById) {
  const { people } = state;
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const A = people[i];
      const B = people[j];
      const devA = deviation(state, A);
      const devB = deviation(state, B);
      for (const a of state.byPerson[A]) {
        for (const b of state.byPerson[B]) {
          if (a.shiftId === b.shiftId) continue;
          const hd = hoursDelta((a.minutes - b.minutes) / 60, devA, devB);
          const cs = state.shiftCounts[a.shiftId];
          const ct = state.shiftCounts[b.shiftId];
          const sd = 2 * (cs[B] - cs[A]) + 2 + 2 * (ct[A] - ct[B]) + 2;
          if (!improves(hd, sd)) continue;
          const sa = slotById.get(a.slotId);
          const sb = slotById.get(b.slotId);
          if (!canAssign(state, A, sb, sa.id) || !canAssign(state, B, sa, sb.id)) continue;
          removeAssignment(state, A, sa);
          removeAssignment(state, B, sb);
          addAssignment(state, A, sb);
          addAssignment(state, B, sa);
          return true;
        }
      }
    }
  }
  return false;
}

function buildResult(state, slots, seed) {
  const { config, people } = state;
  const order = new Map(people.map((p, i) => [p, i]));
  const shiftById = new Map(config.shifts.map((s) => [s.id, s]));

  const assignments = people
    .flatMap((person) =>
      state.byPerson[person].map((a) => ({
        person,
        slotId: a.slotId,
        date: a.date,
        shiftId: a.shiftId,
        start: a.start,
        end: a.end,
        hours: a.minutes / 60,
      })),
    )
    .sort((x, y) => x.start - y.start || order.get(x.person) - order.get(y.person));

  const uncovered = slots
    .filter((s) => (state.seats[s.id]?.length ?? 0) < s.required)
    .map((s) => ({ slotId: s.id, date: s.date, shiftId: s.shiftId, required: s.required, assigned: state.seats[s.id]?.length ?? 0 }));

  const report = buildReport(state);
  const longest = Math.max(...config.shifts.map((s) => shiftMinutes(s) / 60));
  const warnings = [
    ...uncovered.map((u) => `${shiftById.get(u.shiftId).name} del ${Number(u.date.slice(8, 10))}: ${u.assigned} de ${u.required} personas`),
    ...report
      .filter((r) => Math.abs(r.diff) > longest)
      .map((r) => `${r.person}: ${r.diff > 0 ? '+' : ''}${r.diff.toFixed(1)} h respecto a la meta`),
  ];

  return { seed, assignments, uncovered, report, warnings };
}
