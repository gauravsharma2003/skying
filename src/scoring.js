const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function skyBackground(quality) {
  if (!quality) return {src:'/assets/evening-sky.webp', situation:'neutral'};
  if (quality.precip >= 35 || quality.low >= 65 || quality.total >= 85) return {src:'/assets/sky-overcast-v1.webp', situation:'overcast'};
  if (quality.score >= 63 || (quality.high >= 20 && quality.high <= 80 && quality.low < 55)) return {src:'/assets/sky-vivid-v1.webp', situation:'vivid'};
  if (quality.total <= 22 || quality.high < 18) return {src:'/assets/sky-clear-v1.webp', situation:'clear'};
  return {src:'/assets/evening-sky.webp', situation:'neutral'};
}

function scoreCloud(x) {
  if (x <= 15) return 20 + (x / 15) * 35;
  if (x < 30) return 55 + ((x - 15) / 15) * 35;
  if (x <= 70) return 100;
  if (x <= 85) return 100 - (x - 70) * 3;
  return Math.max(0, 55 - (x - 85) * 3.67);
}

export function evaluate(hourly, sunset) {
  if (!sunset || !hourly?.time?.length) return null;
  const target = new Date(sunset + 'Z');
  const indices = hourly.time
    .map((time, index) => ({ index, diff: Math.abs(new Date(time + 'Z').getTime() - target.getTime()) / 60000 }))
    .filter(({ diff }) => diff <= 90);

  const weighted = (field) => {
    let value = 0;
    let weight = 0;
    for (const { index, diff } of indices) {
      const currentWeight = Math.max(0.15, 1 - diff / 100);
      const raw = hourly[field]?.[index];
      const currentValue = raw == null ? NaN : Number(raw);
      if (Number.isFinite(currentValue)) {
        value += currentValue * currentWeight;
        weight += currentWeight;
      }
    }
    return weight ? value / weight : NaN;
  };

  const high = weighted('cloud_cover_high');
  const mid = weighted('cloud_cover_mid');
  const low = weighted('cloud_cover_low');
  const total = weighted('cloud_cover');
  const vis = weighted('visibility') / 1000;
  const precip = weighted('precipitation_probability');
  const humidity = weighted('relative_humidity_2m');
  if (![high,mid,low,total,vis,precip,humidity].every(Number.isFinite)) return null;
  const upper = clamp(high * 0.72 + mid * 0.28);
  const horizonScore = clamp(100 - (low * 1.7 + Math.max(0, total - 80) * 0.4));
  const visibilityScore = vis >= 20 ? 100 : vis >= 12 ? 90 : vis >= 8 ? 78 : vis >= 5 ? 58 : 30;
  const precipScore = precip <= 5 ? 100 : precip <= 15 ? 85 : precip <= 30 ? 65 : precip <= 50 ? 35 : 10;
  const humidityScore = humidity <= 55 ? 100 : humidity <= 70 ? 88 : humidity <= 80 ? 68 : humidity <= 90 ? 45 : 25;
  let score = Math.round(scoreCloud(upper) * 0.34 + horizonScore * 0.3 + visibilityScore * 0.14 + precipScore * 0.12 + humidityScore * 0.1);
  if (total >= 92 || (total <= 8 && upper < 20)) score -= 12;
  score = clamp(score);

  const verdict = score >= 90 ? 'Exceptional' : score >= 78 ? 'Excellent' : score >= 63 ? 'Good' : score >= 45 ? 'Average' : 'Poor';
  const reasons = [
    upper >= 30 && upper <= 70 ? `Upper cloud ${Math.round(upper)}%. Strong canvas.` : upper < 30 ? `Upper cloud ${Math.round(upper)}%. Little colour.` : `Upper cloud ${Math.round(upper)}%. Too heavy.`,
    horizonScore >= 80 ? 'Horizon clear.' : 'Low cloud on the horizon.',
    vis >= 12 ? `Visibility ${vis.toFixed(0)} km.` : `Visibility ${vis.toFixed(1)} km. Muted.`
  ];
  return { score, verdict, high, mid, low, total, vis, precip, humidity, horizonScore, reasons };
}
