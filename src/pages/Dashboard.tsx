import { useEffect, useState } from 'react';
import { assignmentApi } from '../services/api';
import type { SchoolShortage, AssignmentStats } from '../types';

export default function Dashboard() {
  const [shortages, setShortages] = useState<SchoolShortage[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [shortageRes, statsRes] = await Promise.all([
        assignmentApi.getSchoolShortage(),
        assignmentApi.getStatistics(),
      ]);
      setShortages(shortageRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // 통계 요약
  const totalQuota = shortages.reduce((sum, s) => sum + s.quota, 0);
  const totalCurrent = shortages.reduce((sum, s) => sum + s.current_count, 0);
  const schoolsWithVacancy = shortages.filter((s) => s.shortage < 0).length;
  const schoolsWithSurplus = shortages.filter((s) => s.shortage > 0).length;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">대시보드</h2>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">총 학교</div>
          <div className="text-3xl font-bold text-gray-800">{shortages.length}개</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">총 정원 / 현원</div>
          <div className="text-3xl font-bold text-gray-800">
            {totalQuota} / {totalCurrent}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">결원 학교</div>
          <div className="text-3xl font-bold text-red-600">{schoolsWithVacancy}개</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">과원 학교</div>
          <div className="text-3xl font-bold text-blue-600">{schoolsWithSurplus}개</div>
        </div>
      </div>

      {/* 배치 현황 */}
      {stats && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-4">배치 현황</h3>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-sm text-gray-500">전체</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.assigned}</div>
              <div className="text-sm text-gray-500">배치완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{stats.excluded}</div>
              <div className="text-sm text-gray-500">제외</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div>
              <div className="text-sm text-gray-500">미배치</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.assignment_rate}%</div>
              <div className="text-sm text-gray-500">배치율</div>
            </div>
          </div>
          {/* 프로그레스 바 */}
          <div className="mt-4 h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${stats.assignment_rate}%` }}
            />
          </div>
        </div>
      )}

      {/* 학교별 과부족 현황 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">학교별 과부족 현황</h3>
        <div className="table-container max-h-96">
          <table className="data-table">
            <thead>
              <tr>
                <th>학교명</th>
                <th className="text-right">정원</th>
                <th className="text-right">현원</th>
                <th className="text-right">과부족</th>
              </tr>
            </thead>
            <tbody>
              {shortages.map((school) => (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td className="text-right">{school.quota}</td>
                  <td className="text-right">{school.current_count}</td>
                  <td className={`text-right font-medium ${
                    school.shortage < 0 ? 'text-red-600' :
                    school.shortage > 0 ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {school.shortage > 0 ? `+${school.shortage}` : school.shortage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
