// Developed by Sydney Edwards
function parseCalendarDate(endDate) {
  if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    const [y, m, d] = endDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(endDate);
}

function calculateDaysRemaining(endDate) {
  const now = new Date();
  const end = parseCalendarDate(endDate);
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateProgressPercent(completed, total) {
  const c = Number(completed || 0);
  const t = Number(total || 0);
  if (t <= 0) return 0;
  return Math.round((c / t) * 100);
}

function buildVelocityTrend(completedSprints, limit = 5) {
  return [...(completedSprints || [])]
    .filter((s) => s && s.completedAt)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit)
    .map((s) => ({
      id: s.id,
      name: s.name,
      completedAt: s.completedAt,
      velocityDataPoint: s.velocityDataPoint ?? 0,
      capacityTarget: s.capacityTarget ?? null
    }));
}

function getOverdueActionItems(allActionItems) {
  const now = new Date();
  return [...(allActionItems || [])]
    .filter((item) => item && item.dueDate && item.status !== "complete")
    .filter((item) => new Date(item.dueDate).getTime() < now.getTime())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

module.exports = {
  calculateDaysRemaining,
  calculateProgressPercent,
  buildVelocityTrend,
  getOverdueActionItems
};
