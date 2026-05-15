import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_MENU_ITEMS, MenuItem, getCategoryLabel, getCategoryColor } from '../lib/repertoire';
import {
  DayPlan,
  WeekPlan,
  generateWeekPlan,
  generateShoppingList,
  formatDate,
  getWeekStart,
} from '../lib/planGenerator';

const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];
const DAY_NAMES_FULL = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];

type TabType = 'week' | 'shopping' | 'repertoire' | 'calendar';

export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [weekPlan, setWeekPlan] = useState<WeekPlan>([]);
  const [nightShiftDates, setNightShiftDates] = useState<string[]>([]);
  const [weekStartDate, setWeekStartDate] = useState<Date>(getWeekStart(new Date()));
  const [activeTab, setActiveTab] = useState<TabType>('week');
  const [editingDay, setEditingDay] = useState<{ dayIndex: number; field: 'main' | 'side' | 'soup' | 'kids' } | null>(null);
  const [showAddRepertoire, setShowAddRepertoire] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('meat');
  const [newItemIngredients, setNewItemIngredients] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // LocalStorageから読み込み
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('menuItems');
      if (savedItems) setMenuItems(JSON.parse(savedItems));

      const savedNightShifts = localStorage.getItem('nightShiftDates');
      if (savedNightShifts) setNightShiftDates(JSON.parse(savedNightShifts));

      const savedPlan = localStorage.getItem('weekPlan');
      const savedStart = localStorage.getItem('weekStartDate');
      if (savedPlan && savedStart) {
        const start = new Date(savedStart);
        const today = new Date();
        // 今週のプランなら再利用
        const currentStart = getWeekStart(today);
        if (formatDate(start) === formatDate(currentStart)) {
          setWeekPlan(JSON.parse(savedPlan));
          setWeekStartDate(start);
          return;
        }
      }
    } catch (e) {}
  }, []);

  // 週間プラン生成
  const generatePlan = useCallback((items: MenuItem[], nightShifts: string[], startDate: Date) => {
    const plan = generateWeekPlan(items, nightShifts, startDate);
    setWeekPlan(plan);
    localStorage.setItem('weekPlan', JSON.stringify(plan));
    localStorage.setItem('weekStartDate', startDate.toISOString());
  }, []);

  // 初回 or プランが空なら生成
  useEffect(() => {
    if (weekPlan.length === 0 && menuItems.length > 0) {
      generatePlan(menuItems, nightShiftDates, weekStartDate);
    }
  }, [menuItems, nightShiftDates, weekStartDate, weekPlan.length, generatePlan]);

  // 夜勤日保存
  useEffect(() => {
    localStorage.setItem('nightShiftDates', JSON.stringify(nightShiftDates));
  }, [nightShiftDates]);

  // メニューアイテム保存
  useEffect(() => {
    localStorage.setItem('menuItems', JSON.stringify(menuItems));
  }, [menuItems]);

  // 夜勤トグル
  const toggleNightShift = (dateStr: string) => {
    setNightShiftDates(prev => {
      const next = prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr];
      // プランを再生成
      const updated = generateWeekPlan(menuItems, next, weekStartDate);
      setWeekPlan(updated);
      localStorage.setItem('weekPlan', JSON.stringify(updated));
      localStorage.setItem('nightShiftDates', JSON.stringify(next));
      return next;
    });
  };

  // メニュー手動変更
  const changeMenuItem = (dayIndex: number, field: 'main' | 'side' | 'soup' | 'kids', newItem: MenuItem) => {
    setWeekPlan(prev => {
      const next = [...prev];
      next[dayIndex] = { ...next[dayIndex], [field]: newItem };
      localStorage.setItem('weekPlan', JSON.stringify(next));
      return next;
    });
    setEditingDay(null);
  };

  // レパートリー追加
  const addRepertoireItem = () => {
    if (!newItemName.trim()) return;
    const ingredients = newItemIngredients.split('、').map(s => s.trim()).filter(Boolean);
    if (ingredients.length === 0) ingredients.push(newItemName);
    const newItem: MenuItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory as any,
      ingredients,
    };
    const updated = [...menuItems, newItem];
    setMenuItems(updated);
    setNewItemName('');
    setNewItemIngredients('');
    setShowAddRepertoire(false);
  };

  // レパートリー削除
  const deleteRepertoireItem = (id: string) => {
    if (DEFAULT_MENU_ITEMS.some(i => i.id === id)) return; // デフォルトは���除不可
    setMenuItems(prev => prev.filter(i => i.id !== id));
  };

  // カレンダー月の夜勤トグル
  const toggleCalendarNightShift = (dateStr: string) => {
    setNightShiftDates(prev => {
      const next = prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr];
      localStorage.setItem('nightShiftDates', JSON.stringify(next));
      return next;
    });
  };

  // 今週プラン再生成
  const regeneratePlan = () => {
    generatePlan(menuItems, nightShiftDates, weekStartDate);
  };

  // 週切り替え
  const changeWeek = (delta: number) => {
    const newStart = new Date(weekStartDate);
    newStart.setDate(newStart.getDate() + delta * 7);
    setWeekStartDate(newStart);
    generatePlan(menuItems, nightShiftDates, newStart);
  };

  const today = formatDate(new Date());
  const shoppingList = generateShoppingList(weekPlan);

  // 選択肢フィルター（editingDayのfieldに合わせる）
  const getEditOptions = (): MenuItem[] => {
    if (!editingDay) return [];
    const { field, dayIndex } = editingDay;
    const day = weekPlan[dayIndex];
    if (field === 'main') {
      if (day.isNightShift) return menuItems.filter(i => i.category === 'donburi');
      return menuItems.filter(i => ['meat', 'fish', 'donburi', 'noodle'].includes(i.category));
    }
    if (field === 'side') return menuItems.filter(i => i.category === 'side');
    if (field === 'soup') return menuItems.filter(i => i.category === 'soup');
    if (field === 'kids') return menuItems.filter(i => i.category === 'kids');
    return [];
  };

  // カレンダー生成
   const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 月曜始まり
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 pt-12 pb-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">��️</span>
            <h1 className="text-xl font-bold tracking-wider">menu</h1>
          </div>
          {activeTab === 'week' && (
            <button
              onClick={regeneratePlan}
              className="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-full font-medium active:scale-95 transition-transform"
            >
              🔄 作り更分
            </button>
          )}
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="flex">
          {(([
            { id: 'week', label: '📅 週献立' },
            { id: 'shopping', label: '🛙 買い物 ' },
            { id: 'calendar', label: '🌛 夜勤' },
            { id: 'repertoire', label: '📝 レパートリー' },
          ] as { id: TabType; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="pb-24">
        {/* Week tab */}
        {activeTab === 'week' && (
          <div className="p-4 space-y-3">
            {/* Week navigation */}
            <div className="flex items-center justify-between text-sm text-gray-600 bg-white rounded-xl p-3 shadow-sm">
              <button onClick={() => changeWeek(-1)} className="p-2 active:scale-95 transition-transform">◀</button>
              <span className="font-medium">
                {weekStartDate.getMonth() + 1}月{weekStartDate.getDate()}日（月）〜
              </span>
              <button onClick={() => changeWeek(1)} className="p-2 active:scale-95 transition-transform">▶</button>
            </div>

            {weekPlan.map((day, i) => {
              const date = new Date(weekStartDate);
              date.setDate(weekStartDate.getDate() + i);
              const dateStr = formatDate(date);
              const isToday = dateStr === today;
              const isSat = i === 5;
              const isSun = i === 6;

              return (
                <div
                  key={dateStr}
                  className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${
                    isToday ? 'border-gray-900 border-2' : 'border-gray-100'
                  }`}
                >
                  {/* Day header */}
                  <div className={`px-4 py-2.5 flex items-center justify-between ${
                    day.isNightShift ? 'bg-indigo-900' : isToday ? 'bg-gray-900' : 'bg-gray-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold text-white`}>
                        {date.getMonth() + 1}/{date.getDate()}
                      </span>
                      <span className={`text-sm font-bold ${
                        isSun ? 'text-red-300' : isSat ? 'text-blue-300' : 'text-gray-300'
                      }`}>
                        ({DAY_NAMES[i]})
                      </span>
                      {isToday && <span className="text-xs bg-white text-gray-900 px-2 py-0.5 rounded-full font-bold">今日</span>}
                      {day.isNightShift && <span className="text-sm">🌛</span>}
                    </div>
                    <button
                      onClick={() => toggleNightShift(dateStr)}
                      className={`text-xs px-2 py-1 rounded-full transition-all active:scale-95 ${
                        day.isNightShift
                          ? 'bg-indigo-400 text-white'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {day.isNightShift ? '🌛 夜勤' : '+ 夜勤'}
                    </button>
                  </div>

                  {/* Menu items */}
                  <div className="p-3 grid grid-cols-2 gap-2">
                    {([
                      { field: 'main' as const, label: '主食', item: day.main },
                      { field: 'side' as const, label: '副菜', item: day.side },
                      { field: 'soup' as const, label: 'お汁', item: day.soup },
                      { field: 'kids' as const, label: '子ども', item: day.kids },
                    ]).map(({ field, label, item }) => (
                      <button
                        key={field}
                        onClick={() => setEditingDay({ dayIndex: i, field })}
                        className={`text-left p-2 rounded-xl border text-xs active:scale-95 transition-transform ${
                          item ? getCategoryColor(item.category) : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}
                      >
                        <div className="text-gray-500 text-xs mb-0.5">{label}</div>
                        <div className="font-medium text-sm">{item?.name ?? '冪芨定'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Shopping tab */}
        {activeTab === 'shopping' && (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-1">今週の買い物リスヸ</h2>
              <p className="text-xs text-gray-500">
                {weekStartDate.getMonth() + 1}月{weekStartDate.getDate()}日〜7日間分
              </p>
            </div>
            {Object.entries(shoppingList).map(([category, items]) => (
              <div key={category} className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-1">
                  <span>{
                    category === '肉・魚' ? '🥩' :
                    category === '野菜' ? '🥬' :
                    category === '調味料・その他' ? '🧂 ' : '🥫	'
                  }</span>
                  {category}
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map(item => (
                    <ShoppingItem key={item} name={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Calendar tab */}
        {activeTab === 'calendar' && (
          <div className="p-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                  className="p-2 active:scale-95 transition-transform"
                >
                  ◀
                </button>
                <span className="font-bold">
                  {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}�
                </span>
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                  className="p-2 active:scale-95 transition-transform"
                >
                  ▶
                </button>
              </div>
              <div className="grid grid-cols-7 text-center border-b border-gray-100">
                {['月', '火', '水', '木', '金', '土', '日'].map((d, i) => (
                  <div key={d} className={`py-2 text-xs font-bold ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-600'}`}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getCalendarDays().map((date, idx) => {
                  if (!date) return <div key={idx} className="aspect-square" />;
                  const dateStr = formatDate(date);
                  const isNightShift = nightShiftDates.includes(dateStr);
                  const isToday = dateStr === today;
                  const dow = idx % 7;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleCalendarNightShift(dateStr)}
                      className={`aspect-square flex flex-col items-center justify-center text-sm relative active:scale-95 transition-transform ${
                        isNightShift ? 'bg-indigo-100' : ''
                      }`}
                    >
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                        isToday ? 'bg-gray-900 text-white' :
                        isNightShift ? 'text-indigo-700' :
                        dow === 5 ? 'text-blue-500' :
                        dow === 6 ? 'text-red-500' :
                        'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </span>
                      {isNightShift && <span className="text-xs leading-none">🌛</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              タップで🌛夜勤をタップしだけます
            </p>
            <p className="text-xs text-gray-500 text-center">
              夜勤の日は自動嚄に丼ものになります
            </p>
          </div>
        )}

        {/* Repertoire tab */}
        {activeTab === 'repertoire' && (
          <div className="p-4 space-y-4">
            <button
              onClick={() => setShowAddRepertoire(true)}
              className="w-full bg-gray-900 text-white py-3 rounded-2xl font-medium active:scale-95 transition-transform"
            >
              ＋ 新しいレシピ゚辽加
            </button>

            {(['meat', 'fish', 'donburi', 'noodle', 'kids', 'side', 'soup'] as const).map(cat => {
              const items = menuItems.filter(i => i.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-bold text-gray-700 text-sm">{getCategoryLabel(cat)}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.map(item => (
                      <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{item.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-48">
                            {item.ingredients.join('・')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://cookpad.com/search/${encodeURIComponent(item.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-1 rounded-lg active:scale-95 transition-transform"
                          >
                            レシピ
                          </a>
                          {!DEFAULT_MENU_ITEMS.some(d => d.id === item.id) && (
                            <button
                              onClick={() => deleteRepertoireItem(item.id)}
                              className="text-xs text-red-400 px-2 py-1 rounded-lg active:scale-95 transition-transform"
                            >
                             削除
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Menu edit modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setEditingDay(null)}>
          <div
            className="bg-white w-full rounded-t-3xl max-h-[75vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">
                {editingDay.field === 'main' ? '主食' :
                 editingDay.field === 'side' ? '副菜' :
                 editingDay.field === 'soup' ? 'お汁' : '子どものご飯'}
                を選ぶ
              </h3>
              <button onClick={() => setEditingDay(null)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {getEditOptions().map(item => (
                <button
                  key={item.id}
                  onClick={() => changeMenuItem(editingDay.dayIndex, editingDay.field, item)}
                  className={`p-3 rounded-xl border text-left active:scale-95 transition-transform ${getCategoryColor(item.category)}`}
                >
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs mt-0.5 opacity-70 truncate">{getCategoryLabel(item.category)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add repertoire modal */}
      {showAddRepertoire && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setShowAddRepertoire(false)}>
          <div
            className="bg-white w-full rounded-t-3xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">新しいレシピを追加</h3>
              <button onClick={() => setShowAddRepertoire(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">料理名</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="例：チャーバン"
                  className="w-jull mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">カテゴリ</label>
                <select
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white"
                >
                  <option value="meat">🍖 肉料理</option>
                  <option value="fish">🐟)�k料理</option>
                  <option value="donburi">🍚 丼アの</option>
                  <option value="noodle">🍜 麺類></option>
                  <option value="kids">👶 子どア のご飯</option>
                  <option value="side">🥗 副菜</option>
                  <option value="soup">🍲 お汁</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">食材（読点＊で区切る）</label>
                <input
                  type="text"
                  value={newItemIngredients}
                  onChange={e => setNewItemIngredients(e.target.value)}
                  placeholder="例：ご飯！醤油＂料理＂ 醤油"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <button
                onClick={addRepertoireItem}
                disabled={!newItemName.trim()}
                className="w-full bg-gray-900 text-white py-3 rounded-2xl font-medium disabled:opacity-40 active:scale-95 transition-transform"
              >
                追加すむ
              </button>
            </div>
            <div className="h-8" />
          </div>
        </div>
      )}
    </div>
  );
}

function ShoppingItem({ name }: { name: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <button
      onClick={() => setChecked(v => !v)}
      className={`flex items-center gap-2 p-2 rounded-xl text-left active:scale-95 transition-all ${
        checked ? 'bg-gray-50 text-gray-400' : 'bg-gray-50 text-gray-700'
      }`}
    >
      <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center text-xs ${
        checked ? 'bg-gray-400 border-gray-400 text-white' : 'border-gray-300'
      }`}>
        {checked && '✓'}
      </span>
      <span className={`text-xs font-medium ${checked ? 'line-through' : ''}`}>{name}</span>
    </button>
  );
}
