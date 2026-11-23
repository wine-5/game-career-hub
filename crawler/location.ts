// 会社概要などの文章から、本社・スタジオのある都道府県を読み取る

const PREFS = [
  "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島", "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
  "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
  "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口", "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
  "熊本", "大分", "宮崎", "鹿児島", "沖縄",
];

// 都道府県名を書かずに市の名前だけ書かれることが多い所
const CITY_TO_PREF: Record<string, string> = {
  札幌: "北海道", 仙台: "宮城", 横浜: "神奈川", 川崎: "神奈川", 名古屋: "愛知", 神戸: "兵庫",
  博多: "福岡", 北九州: "福岡", 渋谷区: "東京", 新宿区: "東京", 港区: "東京", 品川区: "東京", 千代田区: "東京",
  中央区: "", 目黒区: "東京", 豊島区: "東京", 中野区: "東京", 世田谷区: "東京", 江東区: "東京", 台東区: "東京",
};

const PLACE_LINE = /所在地|本社|住所|事業所|スタジオ|拠点|オフィス|支社|支店|開発室|勤務地|Studio|Office|〒/i;

/** 文章から都道府県（「東京」「北海道」のように都・府・県を付けない形）を出てきた順に返す */
export function extractPrefectures(text: string): string[] {
  const found = new Set<string>();
  for (const line of text.split("\n")) {
    if (!PLACE_LINE.test(line) && !/[都道府県]/.test(line)) continue;
    if (line.length > 200) continue;
    for (const p of PREFS) {
      const re = p === "北海道" ? /北海道/ : p === "東京" ? /東京都/ : p === "京都" ? /(?<!東)京都府|京都市/ : new RegExp(`${p}[府県]`);
      if (re.test(line)) found.add(p);
    }
    for (const [city, pref] of Object.entries(CITY_TO_PREF)) {
      if (pref && line.includes(city) && PLACE_LINE.test(line)) found.add(pref);
    }
  }
  return [...found];
}

/** 「東京都」「大阪府」「京都府」→「東京」「大阪」「京都」。「京都」「北海道」はそのまま */
export function normalizePref(p: string): string {
  const t = p.trim();
  if (t === "東京都") return "東京";
  if (t === "京都府" || t === "京都") return "京都";
  return t.replace(/[府県]$/, "");
}
