export function buildReport(state) {
  return state.people.map((person) => {
    const hours = state.minutes[person] / 60;
    const target = state.targets[person];
    const byShift = Object.fromEntries(state.config.shifts.map((s) => [s.id, state.shiftCounts[s.id][person]]));
    return {
      person,
      hours,
      target,
      diff: hours - target,
      shifts: state.byPerson[person].length,
      byShift,
      weekendShifts: state.weekend[person],
    };
  });
}
