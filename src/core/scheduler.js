import { mulberry32 } from './random.js';
import { buildReport } from './report.js';
import { canAssign } from './rules.js';
import { buildSlots, shiftMinutes } from './slots.js';
import { addAssignment, createState, deviation, removeAssignment } from './state.js';
import { computeTargets, groupExceptions } from './targets.js';

const MAX_PASSES = 2000;
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

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const filled = fillPass(state, slots, rng);
    const transferred = transferPass(state, slotById);
    const swapped = swapPass(state, slotById);
    if (!filled && !transferred && !swapped) break;
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

function fillPass(state, slots, rng) {
  let changed = false;
  for (const slot of slots) {
    while ((state.seats[slot.id]?.length ?? 0) < slot.required) {
      const best = pickCandidate(state, slot, rng);
      if (!best) break;
      addAssignment(state, best, slot);
      changed = true;
    }
  }
  return changed;
}

const hoursDelta = (h, donorDev, receiverDev) => 2 * h * (receiverDev - donorDev) + 2 * h * h;
const improves = (hd, sd) => hd < -EPS || (Math.abs(hd) <= EPS && sd < 0);

function groupByShift(list) {
  const groups = new Map();
  for (const a of list) {
    if (!groups.has(a.shiftId)) groups.set(a.shiftId, []);
    groups.get(a.shiftId).push(a);
  }
  return [...groups.values()];
}

function transferPass(state, slotById) {
  let changed = false;
  const order = [...state.people].sort((a, b) => deviation(state, b) - deviation(state, a));
  for (const donor of order) {
    for (let r = order.length - 1; r >= 0; r--) {
      const receiver = order[r];
      if (receiver === donor) continue;
      for (const group of groupByShift(state.byPerson[donor])) {
        const counts = state.shiftCounts[group[0].shiftId];
        for (const a of group) {
          const hd = hoursDelta(a.minutes / 60, deviation(state, donor), deviation(state, receiver));
          const sd = 2 * (counts[receiver] - counts[donor]) + 2;
          if (!improves(hd, sd)) break;
          const slot = slotById.get(a.slotId);
          if (!canAssign(state, receiver, slot)) continue;
          removeAssignment(state, donor, slot);
          addAssignment(state, receiver, slot);
          changed = true;
        }
      }
    }
  }
  return changed;
}

function swapPass(state, slotById) {
  let changed = false;
  const { people } = state;
  const groups = new Map(people.map((p) => [p, groupByShift(state.byPerson[p])]));
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const A = people[i];
      const B = people[j];
      if (trySwapPair(state, slotById, A, B, groups.get(A), groups.get(B))) {
        groups.set(A, groupByShift(state.byPerson[A]));
        groups.set(B, groupByShift(state.byPerson[B]));
        changed = true;
      }
    }
  }
  return changed;
}

function trySwapPair(state, slotById, A, B, groupsA, groupsB) {
  const devA = deviation(state, A);
  const devB = deviation(state, B);
  for (const ga of groupsA) {
    for (const gb of groupsB) {
      const s = ga[0].shiftId;
      const t = gb[0].shiftId;
      if (s === t) continue;
      const hd = hoursDelta((ga[0].minutes - gb[0].minutes) / 60, devA, devB);
      const cs = state.shiftCounts[s];
      const ct = state.shiftCounts[t];
      const sd = 2 * (cs[B] - cs[A]) + 2 + 2 * (ct[A] - ct[B]) + 2;
      if (!improves(hd, sd)) continue;
      for (const a of ga) {
        const sa = slotById.get(a.slotId);
        for (const b of gb) {
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
