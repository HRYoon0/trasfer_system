import { useEffect, useState } from 'react';
import {
  internalApi,
  externalOutApi,
  externalInApi,
  settingsApi,
  assignmentApi,
} from '../services/api';
import {
  exportAssignmentList,
  exportAssignmentListPDF,
  exportSchoolShortage,
  exportInternalTransferList,
  exportExternalOutList,
  exportExternalInList,
  exportAllTransferNotices,
  exportTransferNotice,
  exportComprehensiveReport,
} from '../utils/documents';
import type { InternalTransfer, ExternalOut, ExternalIn, SchoolShortage } from '../types';

export default function Documents() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [internalTransfers, setInternalTransfers] = useState<InternalTransfer[]>([]);
  const [externalOut, setExternalOut] = useState<ExternalOut[]>([]);
  const [externalIn, setExternalIn] = useState<ExternalIn[]>([]);
  const [shortages, setShortages] = useState<SchoolShortage[]>([]);

  // 개별 통지서 출력용
  const [showIndividualSelect, setShowIndividualSelect] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, internalRes, extOutRes, extInRes, shortageRes] = await Promise.all([
        settingsApi.getAll(),
        internalApi.getAll(),
        externalOutApi.getAll(),
        externalInApi.getAll(),
        assignmentApi.getSchoolShortage(),
      ]);
      setSettings(settingsRes.data);
      setInternalTransfers(internalRes.data);
      setExternalOut(extOutRes.data);
      setExternalIn(extInRes.data);
      setShortages(shortageRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAssignmentExcel = () => {
    exportAssignmentList(internalTransfers, settings);
  };

  const handleExportAssignmentPDF = () => {
    exportAssignmentListPDF(internalTransfers, settings);
  };

  const handleExportShortage = () => {
    exportSchoolShortage(shortages, settings);
  };

  const handleExportInternal = () => {
    exportInternalTransferList(internalTransfers, settings);
  };

  const handleExportExternalOut = () => {
    exportExternalOutList(externalOut, settings);
  };

  const handleExportExternalIn = () => {
    exportExternalInList(externalIn, settings);
  };

  const handleExportAllNotices = () => {
    exportAllTransferNotices(internalTransfers, settings);
  };

  const handleExportIndividualNotice = () => {
    if (!selectedTeacherId) {
      alert('교사를 선택해주세요.');
      return;
    }
    const teacher = internalTransfers.find(t => t.id === selectedTeacherId);
    if (teacher) {
      exportTransferNotice(teacher, settings);
    }
  };

  const handleExportComprehensive = () => {
    exportComprehensiveReport(
      {
        schools: shortages,
        internalTransfers,
        externalOut,
        externalIn,
      },
      settings
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const assignedCount = internalTransfers.filter(t => t.assigned_school_id).length;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">문서 출력</h2>

      {/* 현황 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-sm text-gray-500">배치 완료</div>
          <div className="text-2xl font-bold text-green-600">{assignedCount}명</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-gray-500">관외전출</div>
          <div className="text-2xl font-bold text-orange-600">{externalOut.length}명</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-gray-500">관외전입</div>
          <div className="text-2xl font-bold text-blue-600">{externalIn.length}명</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-gray-500">학교 수</div>
          <div className="text-2xl font-bold text-gray-800">{shortages.length}개</div>
        </div>
      </div>

      {/* 발령 문서 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">발령 문서</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">발령대장</h4>
            <p className="text-sm text-gray-500 mb-3">배치 완료된 교사 목록 ({assignedCount}명)</p>
            <div className="flex gap-2">
              <button onClick={handleExportAssignmentExcel} className="btn btn-primary">
                Excel 다운로드
              </button>
              <button onClick={handleExportAssignmentPDF} className="btn btn-secondary">
                PDF 다운로드
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">전보 통지서</h4>
            <p className="text-sm text-gray-500 mb-3">개인별 전보 통지서 (PDF)</p>
            <div className="flex gap-2">
              <button onClick={handleExportAllNotices} className="btn btn-primary">
                일괄 출력 (전체)
              </button>
              <button
                onClick={() => setShowIndividualSelect(!showIndividualSelect)}
                className="btn btn-secondary"
              >
                개별 출력
              </button>
            </div>
          </div>
        </div>

        {/* 개별 통지서 선택 */}
        {showIndividualSelect && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  교사 선택
                </label>
                <select
                  className="select"
                  value={selectedTeacherId || ''}
                  onChange={(e) => setSelectedTeacherId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">선택하세요</option>
                  {internalTransfers
                    .filter(t => t.assigned_school_id)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.teacher_name} ({t.current_school_name} → {t.assigned_school_name})
                      </option>
                    ))}
                </select>
              </div>
              <button onClick={handleExportIndividualNotice} className="btn btn-success">
                통지서 출력
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 명부 출력 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">명부 출력 (Excel)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">관내전출입 명부</h4>
            <p className="text-sm text-gray-500 mb-3">전체 관내전출입 현황 ({internalTransfers.length}명)</p>
            <button onClick={handleExportInternal} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">학교별 과부족 현황</h4>
            <p className="text-sm text-gray-500 mb-3">학교별 정원/현원 현황 ({shortages.length}개교)</p>
            <button onClick={handleExportShortage} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">관외전출 명부</h4>
            <p className="text-sm text-gray-500 mb-3">관외전출 현황 ({externalOut.length}명)</p>
            <button onClick={handleExportExternalOut} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">관외전입 명부</h4>
            <p className="text-sm text-gray-500 mb-3">관외전입 현황 ({externalIn.length}명)</p>
            <button onClick={handleExportExternalIn} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 종합 보고서 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">종합 보고서</h3>
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">전보 종합 현황표</h4>
          <p className="text-sm text-gray-500 mb-3">
            학교별 현황, 관내전출입, 관외전출, 관외전입을 포함한 종합 보고서
          </p>
          <button onClick={handleExportComprehensive} className="btn btn-success">
            종합 보고서 다운로드 (Excel)
          </button>
        </div>
      </div>

      {/* 안내 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <strong>참고:</strong> PDF 문서는 기본 폰트를 사용합니다.
        한글이 깨지는 경우 Excel 문서를 사용하시거나, 출력 후 수정하세요.
      </div>
    </div>
  );
}
