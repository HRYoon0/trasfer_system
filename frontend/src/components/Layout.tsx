import { NavLink, Outlet } from 'react-router-dom';

const menuItems = [
  { path: '/', label: '대시보드', icon: '📊' },
  { path: '/statistics', label: '통계표', icon: '📈' },
  { path: '/data-entry', label: '자료입력', icon: '📝' },
  { path: '/schools', label: '학교관리', icon: '🏫' },
  { path: '/vacancies', label: '결원/충원/관외전출', icon: '📋' },
  { path: '/priority', label: '우선/유예/과원', icon: '⭐' },
  { path: '/internal', label: '관내전출입', icon: '🔄' },
  { path: '/external-in', label: '관외전입', icon: '📥' },
  { path: '/documents', label: '문서출력', icon: '🖨️' },
  { path: '/settings', label: '설정', icon: '⚙️' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 사이드바 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">교원 전보 관리</h1>
          <p className="text-sm text-gray-500 mt-1">양산교육지원청</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
          v1.0.0
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
