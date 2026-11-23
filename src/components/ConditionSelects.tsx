import { HOLIDAY_STEPS, OVERTIME_STEPS, SALARY_STEPS, yen, type ConditionFilter } from "../lib/conditions.ts";

/** 初任給・年間休日・平均残業で絞り込む欄（書かれていない会社は、指定した項目では外れる） */
export function ConditionSelects({ f, set }: { f: ConditionFilter; set: (patch: Partial<ConditionFilter>) => void }) {
  return (
    <>
      <label className="select">
        <span>初任給</span>
        <select value={f.salaryMin} onChange={(e) => set({ salaryMin: Number(e.target.value) })}>
          <option value={0}>指定なし</option>
          {SALARY_STEPS.map((v) => (
            <option key={v} value={v}>{yen(v)}以上</option>
          ))}
        </select>
      </label>
      <label className="select">
        <span>年間休日</span>
        <select value={f.holidaysMin} onChange={(e) => set({ holidaysMin: Number(e.target.value) })}>
          <option value={0}>指定なし</option>
          {HOLIDAY_STEPS.map((v) => (
            <option key={v} value={v}>{v}日以上</option>
          ))}
        </select>
      </label>
      <label className="select">
        <span>平均残業</span>
        <select value={f.overtimeMax} onChange={(e) => set({ overtimeMax: Number(e.target.value) })}>
          <option value={0}>指定なし</option>
          {OVERTIME_STEPS.map((v) => (
            <option key={v} value={v}>月{v}時間以下</option>
          ))}
        </select>
      </label>
    </>
  );
}
