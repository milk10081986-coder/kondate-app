import { MenuItem } from './repertoire';

export interface DayPlan {
  date: string; // YYYY-MM-DD
  isNightShift: boolean;
  main: MenuItem | null;     // 主食（肉/魚/丼/麺）
  side: MenuItem | null;     // 副菜
  soup: MenuItem | null;     // お汁
  kids: MenuItem | null;     // 子どものご飯
}

export type WeekPlan = DayPlan[];

// ランダムに1つ選ぶ
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 連続して同じメニューにならないようにする
function pickUniqueFrom<T extends { id: string }>(arr: T[], excludeIds: string[]): T {
  const available = arr.filter(item => !excludeIds.includes(item.id));
  if (available.length === 0) return pickRandom(arr);
  return pickRandom(available);
}

export function generateWeekPlan(
  allItems: MenuItem[],
  nightShiftDates: string[],
  startDate: Date
): WeekPlan {
  const mainCategories = ['meat', 'fish', 'noodle'];
  const donburiItems = allItems.filter(i => i.category === 'donburi');
  const sideItems = allItems.filter(i => i.category === 'side');
  const soupItems = allItems.filter(i => i.category === 'soup');
  const kidsItems = allItems.filter(i => i.category === 'kids');

  const plan: WeekPlan = [];
  const usedMainIds: string[] = [];
  const usedSideIds: string[] = [];
  const usedSoupIds: string[] = [];
  const usedKidsIds: string[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = formatDate(date);
    const isNightShift = nightShiftDates.includes(dateStr);

    let mainItem: MenuItem | null = null;

    if (isNightShift) {
      // 夜勤の日は丼アの
      mainItem = pickUniqueFrom(donburiItems, usedMainIds);
    } else {
      // 通常日：肉・魚・麺をバランスよく
      const dayOfWeek = i % 3;
      let categoryItems: MenuItem[];
      if (dayOfWeek === 0) {
        categoryItems = allItems.filter(i => i.category === 'meat');
      } else if (dayOfWeek === 1) {
        categoryItems = allItems.filter(i => i.category === 'fish');
      } else {
        // 麺か丼かランダム
        const useMeat = Math.random() > 0.5;
        categoryItems = allItems.filter(i =>
          i.category === (useMeat ? 'noodle' : 'meat')
        );
      }
      mainItem = pickUniqueFrom(categoryItems, usedMainIds);
    }

    if (mainItem) usedMainIds.push(mainItem.id);

    const sideItem = pickUniqueFrom(sideItems, usedSideIds);
    usedSideIds.push(sideItem.id);
    if (usedSideIds.length > 4) usedSideIds.shift();

    const soupItem = pickUniqueFrom(soupItems, usedSoupIds);
    usedSoupIds.push(soupItem.id);
    if (usedSoupIds.length > 3) usedSoupIds.shift();

    const kidsItem = pickUniqueFrom(kidsItems, usedKidsIds);
    usedKidsIds.push(kidsItem.id);
    if (usedKidsIds.length > 4) usedKidsIds.shift();

    plan.push({
      date: dateStr,
      isNightShift,
      main: mainItem,
      side: sideItem,
      soup: soupItem,
      kids: kidsItem,
    });
  }

  return plan;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=日, 1=月 ...
  const diff = day === 0 ? -6 : 1 - day; // 月曜始まり
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function generateShoppingList(plan: WeekPlan): Record<string, string[]> {
  const allIngredients: string[] = [];

  plan.forEach(day => {
    [day.main, day.side, day.soup, day.kids].forEach(item => {
      if (item) {
        allIngredients.push(...item.ingredients);
      }
    });
  });

  // 重複を除去してカヅゴリ分け
  const unique = [...new Set(allIngredients)];

  const categories: Record<string, string[]> = {
    '肉・魚': [],
    '野菜': [],
    '調味料・その他': [],
    '乾物・加工品': [],
  };

  const meatFish = ['鶏', '豚', '牛', 'サチ', '鮭', '白身魚', 'ぉび', 'タラ', 'ひき肉', 'バラ肉', 'ロース', 'ささみ'];
  const veggies = ['玉ねぎ', 'にんじん', 'じゃがいも', 'キャベツ', 'ブロッコリー', 'ほうれん草', 'トマト', 'きゅうり', 'レタス', 'ピーマン', 'もやし', 'にら', 'ねぎ', '長ねぎ', 'しらじ', 'かぼちゃ', 'みょうが', 'マッシュルーム', 'さつまいも'];
  const dried = ['醤油', '味噌', 'みりん', '砂糖', '塩', '片栗粉', '小麦粉', 'パン粉', 'ごま油', 'オリーブオイル', 'サラダ油', 'バター', '出汁', 'コンソメ', 'ケチャップ', 'マヨネーズ', '酢', '豆板醤', '甜麺醤', 'タコスシーズニング', 'サルサソース', 'ウスターソース', '天ぷら�H', '塩こしょう', '鶏がらスープの素'];

  unique.forEach(ing => {
    if (meatFish.some(k => ing.includes(k))) {
      categories['肉・魚'].push(ing);
    } else if (veggies.some(k => ing.includes(k))) {
      categories['野菜'].push(ing);
    } else if (dried.some(k => ing.includes(k))) {
      categories['調味料・その他'].push(ing);
    } else {
      categories['乾物・加工品'].push(ing);
    }
  });

  // 空のカテゴリを除去
  Object.keys(categories).forEach(key => {
    if (categories[key].length === 0) delete categories[key];
  });

  return categories;
}
