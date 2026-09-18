import SunCalc from 'suncalc';
SunCalc.addTime(-4, 'blueHourMorningEnd', 'blueHourStart');
export function localDate(instant, timezone) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant));
}
export function solarTimes(date, place, timezone) {
  // Anchor to local solar noon rather than the visitor's timezone or UTC midnight.
  const anchor = Date.parse(`${date}T12:00:00Z`) - place.longitude / 15 * 3600000;
  let times = SunCalc.getTimes(new Date(anchor), place.latitude, place.longitude);
  if (Number.isFinite(times.solarNoon?.getTime()) && localDate(times.solarNoon,timezone)!==date) {
    const direction = localDate(times.solarNoon,timezone)<date ? 1 : -1;
    times = SunCalc.getTimes(new Date(anchor + direction*86400000),place.latitude,place.longitude);
  }
  const iso = value => value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null;
  return {goldenStart:iso(times.goldenHour),goldenEnd:iso(times.blueHourStart),blueStart:iso(times.blueHourStart),blueEnd:iso(times.dusk)};
}
export function solarClock(instant, timezone, date) {
  if (!instant) return 'Not reached';
  const clock = new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(instant));
  return clock + (date && localDate(instant,timezone)!==date ? ` (${localDate(instant,timezone)})` : '');
}
export function solarWindow(start,end,timezone,date) {
  return start && end ? `${solarClock(start,timezone,date)} – ${solarClock(end,timezone,date)}` : 'No complete interval';
}
