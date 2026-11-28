/** 新しい表示の頭。見出しと、掲載中・締切が近い・新着の数を 1 行の小さな文で出す（数字はボタンにしない） */
export function SummaryLine({ stats, lastRun, targetYear }: {
  stats: { open: number; soon: number; fresh: number };
  lastRun?: string;
  targetYear: number | null;
}) {
  const parts = [`掲載中 ${stats.open} 件`, `7日以内に締切 ${stats.soon} 件`, `今回の新着 ${stats.fresh} 件`];
  if (lastRun) parts.push(`${Number(lastRun.slice(5, 7))}/${Number(lastRun.slice(8, 10))} 更新`);
  return (
    <section className="sumline">
      <h1 className="sumline__title">
        インターン・新卒採用
        {targetYear && <small>{String(targetYear).slice(2)}卒向け</small>}
      </h1>
      <p className="sumline__text">{parts.join("・")}</p>
    </section>
  );
}
