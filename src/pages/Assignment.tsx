import { useEffect, useState } from 'react';
import { assignmentApi } from '../services/api';
import type { AssignmentStats, AssignmentResult, InternalTransfer, SchoolShortage } from '../types';

export default function Assignment() {
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [shortages, setShortages] = useState<SchoolShortage[]>([]);
  const [unassigned, setUnassigned] = useState<InternalTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<AssignmentResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, shortageRes, unassignedRes] = await Promise.all([
        assignmentApi.getStatistics(),
        assignmentApi.getSchoolShortage(),
        assignmentApi.getUnassigned(),
      ]);
      setStats(statsRes.data);
      setShortages(shortageRes.data);
      setUnassigned(unassignedRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!confirm('자동 배치를 실행하시겠습니까?\n1희망 → 2희망 → 3희망 순서로 배치됩니다.')) return;
    setProcessing(true);
    try {
      const res = await assignmentApi.auto();
      setLastResult(res.data);
      loadData();
    } catch (error) {
      console.error('자동 배치 실패:', error);
      alert('자동 배치 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRoundAssign = async (round: number) => {
    const roundName = round === 1 ? '1희망' : round === 2 ? '2희망' : '3희망';
    if (!confirm(`${roundName} 배치를 실행하시겠습니까?`)) return;
    setProcessing(true);
    try {
      const res = await assignmentApi.round(round);
      alert(`${roundName} 배치 완료: ${res.data.assigned}명 배치됨`);
      loadData();
    } catch (error) {
      console.error('배치 실패:', error);
      alert('배치 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('모든 배치를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    setProcessing(true);
    try {
      await assignmentApi.reset();
      setLastResult(null);
      loadData();
    } catch (error) {
      console.error('초기화 실패:', error);
      alert('초기화 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckExclusion = async () => {
    setProcessing(true);
    try {
      await assignmentApi.checkExclusion();
      loadData();
      alert('제외 대상 확인 완료');
    } catch (error) {
      console.error('제외 확인 실패:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // 과부족 요약
  const schoolsWithVacancy = shortages.filter((s) => s.shortage < 0);
  const schoolsWithSurplus = shortages.filter((s) => s.shortage > 0);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">배치 관리</h2>

      {/* 배치 통계 */}
      {stats && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">배치 현황</h3>
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-sm text-gray-500">전체</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats.assigned}</div>
              <div className="text-sm text-gray-500">배치완료</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{stats.unassigned}</div>
              <div className="text-sm text-gray-500">미배치</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-400">{stats.excluded}</div>
              <div className="text-sm text-gray-500">제외</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats.assignment_rate}%</div>
              <div className="text-sm text-gray-500">배치율</div>
            </div>
          </div>
          {/* 프로그레스 바 */}
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${stats.assignment_rate}%` }}
            />
          </div>
        </div>
      )}

      {/* 배치 실행 버튼 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">배치 실행</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAutoAssign}
            disabled={processing}
            className="btn btn-primary"
          >
            {processing ? '처리 중...' : '자동 배치 (1→2→3희망)'}
          </button>
          <div className="border-l border-gray-300 mx-2" />
          <button
            onClick={() => handleRoundAssign(1)}
            disabled={processing}
            className="btn btn-secondary"
          >
            1희망 배치
          </button>
          <button
            onClick={() => handleRoundAssign(2)}
            disabled={processing}
            className="btn btn-secondary"
          >
            2희망 배치
          </button>
          <button
            onClick={() => handleRoundAssign(3)}
            disabled={processing}
            className="btn btn-secondary"
          >
            3희망 배치
          </button>
          <div className="border-l border-gray-300 mx-2" />
          <button
            onClick={handleCheckExclusion}
            disabled={processing}
            className="btn btn-secondary"
          >
            제외 대상 확인
          </button>
          <button
            onClick={handleReset}
            disabled={processing}
            className="btn btn-danger"
          >
            배치 초기화
          </button>
        </div>
      </div>

      {/* 배치 결과 */}
      {lastResult && (
        <div className="card mb-6 bg-green-50 border-green-200">
          <h3 className="text-lg font-semibold mb-3 text-green-800">배치 결과</h3>
          <p className="text-green-700 mb-3">{lastResult.message}</p>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{lastResult.results['1희망']}</div>
              <div className="text-sm text-gray-600">1희망 배치</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{lastResult.results['2희망']}</div>
              <div className="text-sm text-gray-600">2희망 배치</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{lastResult.results['3희망']}</div>
              <div className="text-sm text-gray-600">3희망 배치</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{lastResult.total_assigned}</div>
              <div className="text-sm text-gray-600">총 배치</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* 학교별 과부족 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            결원 학교 ({schoolsWithVacancy.length})
          </h3>
          <div className="table-container max-h-64">
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
                {schoolsWithVacancy.map((school) => (
                  <tr key={school.id}>
                    <td>{school.name}</td>
                    <td className="text-right">{school.quota}</td>
                    <td className="text-right">{school.current_count}</td>
                    <td className="text-right font-medium text-red-600">
                      {school.shortage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 미배치 교사 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            미배치 교사 ({unassigned.length})
          </h3>
          <div className="table-container max-h-64">
            <table className="data-table">
              <thead>
                <tr>
                  <th>현소속</th>
                  <th>교사명</th>
                  <th>희망순위</th>
                  <th className="text-right">총점</th>
                </tr>
              </thead>
              <tbody>
                {unassigned.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-4">
                      미배치 교사가 없습니다.
                    </td>
                  </tr>
                ) : (
                  unassigned.map((t) => (
                    <tr key={t.id}>
                      <td>{t.current_school_name}</td>
                      <td className="font-medium">{t.teacher_name}</td>
                      <td>{t.preference_round}</td>
                      <td className="text-right">{t.total_score}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 과원 학교 */}
      {schoolsWithSurplus.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold mb-4">
            과원 학교 ({schoolsWithSurplus.length})
          </h3>
          <div className="table-container max-h-48">
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
                {schoolsWithSurplus.map((school) => (
                  <tr key={school.id}>
                    <td>{school.name}</td>
                    <td className="text-right">{school.quota}</td>
                    <td className="text-right">{school.current_count}</td>
                    <td className="text-right font-medium text-blue-600">
                      +{school.shortage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
