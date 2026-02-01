import { useEffect, useState } from 'react';
import {
  internalApi,
  externalOutApi,
  externalInApi,
  settingsApi,
  assignmentApi,
  schoolApi,
} from '../services/api';
import {
  exportAssignmentList,
  exportTransferNotice,
  exportExternalTransferNotice,
  exportAppointmentLetter,
  exportInstitutionNotification,
  exportEmploymentLetter,
  exportSchoolStatus,
  exportAllSchoolStatus,
  exportAllTransferNotices,
} from '../utils/documents';
import type { InternalTransfer, ExternalOut, ExternalIn, SchoolShortage, School } from '../types';
import { ClipboardList, FileText, PenLine, Building2 } from 'lucide-react';

export default function Documents() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [internalTransfers, setInternalTransfers] = useState<InternalTransfer[]>([]);
  const [externalOut, setExternalOut] = useState<ExternalOut[]>([]);
  const [externalIn, setExternalIn] = useState<ExternalIn[]>([]);
  const [shortages, setShortages] = useState<SchoolShortage[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  // 통지서 개별 출력용
  const [showNoticeSelect, setShowNoticeSelect] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  // 통지서_타시군 개별 출력용
  const [showExternalNoticeSelect, setShowExternalNoticeSelect] = useState(false);
  const [selectedExternalOutId, setSelectedExternalOutId] = useState<number | null>(null);

  // 임명장 개별 출력용
  const [showAppointmentSelect, setShowAppointmentSelect] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);

  // 학교별현황 출력용
  const [selectedSchool, setSelectedSchool] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, internalRes, extOutRes, extInRes, shortageRes, schoolsRes] = await Promise.all([
        settingsApi.getAll(),
        internalApi.getAll(),
        externalOutApi.getAll(),
        externalInApi.getAll(),
        assignmentApi.getSchoolShortage(),
        schoolApi.getAll(),
      ]);
      setSettings(settingsRes.data);
      setInternalTransfers(internalRes.data);
      setExternalOut(extOutRes.data);
      setExternalIn(extInRes.data);
      setShortages(shortageRes.data);
      setSchools(schoolsRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 발령대장
  const handleExportAssignment = async () => {
    await exportAssignmentList(internalTransfers, externalIn, settings);
  };

  // 통지서 일괄 출력
  const handleExportAllNotices = () => {
    exportAllTransferNotices(internalTransfers, settings);
  };

  // 통지서 개별 출력
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

  // 통지서_타시군 개별 출력
  const handleExportExternalNotice = () => {
    if (!selectedExternalOutId) {
      alert('교사를 선택해주세요.');
      return;
    }
    const teacher = externalOut.find(t => t.id === selectedExternalOutId);
    if (teacher && teacher.transfer_type === '타시군') {
      exportExternalTransferNotice(teacher, settings);
    }
  };

  // 임명장 개별 출력
  const handleExportAppointment = () => {
    if (!selectedAppointmentId) {
      alert('교사를 선택해주세요.');
      return;
    }
    const internal = internalTransfers.find(t => t.id === selectedAppointmentId);
    if (internal) {
      exportAppointmentLetter(internal, settings);
      return;
    }
    const external = externalIn.find(t => t.id === selectedAppointmentId);
    if (external) {
      exportAppointmentLetter(external, settings);
    }
  };

  // 기관통보
  const handleExportInstitutionNotification = async (type: '관내' | '관외') => {
    await exportInstitutionNotification(type, internalTransfers, externalIn, settings);
  };

  // 임용서
  const handleExportEmploymentLetter = async (type: '관내' | '타시군' | '타시도' | '신규') => {
    await exportEmploymentLetter(type, internalTransfers, externalIn, settings);
  };

  // 학교별현황
  const handleExportSchoolStatus = async () => {
    if (!selectedSchool) {
      alert('학교를 선택해주세요.');
      return;
    }
    const schoolData = shortages.find(s => s.name === selectedSchool);
    await exportSchoolStatus(selectedSchool, schoolData, internalTransfers, externalOut, externalIn, settings);
  };

  // 학교별현황 전체
  const handleExportAllSchoolStatus = async () => {
    await exportAllSchoolStatus(shortages, internalTransfers, externalOut, externalIn, settings);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const assignedCount = internalTransfers.filter(t => t.assigned_school_id).length;
  const tasigunOut = externalOut.filter(t => t.transfer_type === '타시군');

  // 통지서/임명장 출력 대상
  const noticeTargets = internalTransfers.filter(t => t.assigned_school_id);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">문서 출력</h2>

      {/* 현황 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-sm text-gray-500">관내 배치</div>
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
          <div className="text-2xl font-bold text-gray-800">{schools.length}개</div>
        </div>
      </div>

      {/* 1. 발령대장 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          발령대장
        </h3>
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">발령대장</h4>
          <p className="text-sm text-gray-500 mb-3">
            관내전입 + 관외전입(타시군, 타시도, 신규) 명단 ({assignedCount + externalIn.length}명)
          </p>
          <button onClick={handleExportAssignment} className="btn btn-primary">
            Excel 다운로드
          </button>
        </div>
      </div>

      {/* 2. 통지서 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          통지서
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* 관내 통지서 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">통지서 (관내전보)</h4>
            <p className="text-sm text-gray-500 mb-3">관내 전보 대상자 ({noticeTargets.length}명)</p>
            <div className="flex gap-2">
              <button onClick={handleExportAllNotices} className="btn btn-primary">
                일괄 출력 (PDF)
              </button>
              <button
                onClick={() => setShowNoticeSelect(!showNoticeSelect)}
                className="btn btn-secondary"
              >
                개별 출력
              </button>
            </div>
          </div>

          {/* 타시군 통지서 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">통지서 (타시군전출)</h4>
            <p className="text-sm text-gray-500 mb-3">타시군 전출 대상자 ({tasigunOut.length}명)</p>
            <button
              onClick={() => setShowExternalNoticeSelect(!showExternalNoticeSelect)}
              className="btn btn-secondary"
            >
              개별 출력
            </button>
          </div>
        </div>

        {/* 관내 통지서 개별 선택 */}
        {showNoticeSelect && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  교사 선택 (관내)
                </label>
                <select
                  className="select"
                  value={selectedTeacherId || ''}
                  onChange={(e) => setSelectedTeacherId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">선택하세요</option>
                  {noticeTargets.map(t => (
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

        {/* 타시군 통지서 개별 선택 */}
        {showExternalNoticeSelect && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  교사 선택 (타시군전출)
                </label>
                <select
                  className="select"
                  value={selectedExternalOutId || ''}
                  onChange={(e) => setSelectedExternalOutId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">선택하세요</option>
                  {tasigunOut.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.teacher_name} ({t.school_name} → {t.destination})
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleExportExternalNotice} className="btn btn-success">
                통지서 출력
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. 임명장 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">🎖️ 임명장</h3>
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">임명장 출력</h4>
          <p className="text-sm text-gray-500 mb-3">개인별 임명장 (PDF)</p>
          <button
            onClick={() => setShowAppointmentSelect(!showAppointmentSelect)}
            className="btn btn-secondary"
          >
            개별 출력
          </button>
        </div>

        {showAppointmentSelect && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  교사 선택
                </label>
                <select
                  className="select"
                  value={selectedAppointmentId || ''}
                  onChange={(e) => setSelectedAppointmentId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">선택하세요</option>
                  <optgroup label="관내 전보">
                    {noticeTargets.map(t => (
                      <option key={`internal-${t.id}`} value={t.id}>
                        {t.teacher_name} → {t.assigned_school_name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="관외 전입">
                    {externalIn.map(t => (
                      <option key={`external-${t.id}`} value={t.id}>
                        {t.teacher_name} ({t.transfer_type}) → {t.assigned_school_name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <button onClick={handleExportAppointment} className="btn btn-success">
                임명장 출력
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. 기관통보 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">📨 기관통보</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">기관통보 (관내)</h4>
            <p className="text-sm text-gray-500 mb-3">관내 전입 명단 ({assignedCount}명)</p>
            <button onClick={() => handleExportInstitutionNotification('관내')} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">기관통보 (관외)</h4>
            <p className="text-sm text-gray-500 mb-3">관외 전입 명단 ({externalIn.length}명)</p>
            <button onClick={() => handleExportInstitutionNotification('관외')} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 5. 임용서 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PenLine className="w-5 h-5" />
          임용서
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">임용서 (관내)</h4>
            <p className="text-sm text-gray-500 mb-3">관내 전입 ({assignedCount}명)</p>
            <button onClick={() => handleExportEmploymentLetter('관내')} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">임용서 (타시군)</h4>
            <p className="text-sm text-gray-500 mb-3">
              타시군 전입 ({externalIn.filter(t => t.transfer_type === '타시군').length}명)
            </p>
            <button onClick={() => handleExportEmploymentLetter('타시군')} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">임용서 (타시도)</h4>
            <p className="text-sm text-gray-500 mb-3">
              타시도 전입 ({externalIn.filter(t => t.transfer_type === '타시도').length}명)
            </p>
            <button onClick={() => handleExportEmploymentLetter('타시도')} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">임용서 (신규)</h4>
            <p className="text-sm text-gray-500 mb-3">
              신규 임용 ({externalIn.filter(t => t.transfer_type === '신규').length}명)
            </p>
            <button onClick={() => handleExportEmploymentLetter('신규')} className="btn btn-primary">
              Excel 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 6. 학교별현황 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          학교별 현황
        </h3>

        {/* 학교 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">학교 선택</label>
          <select
            className="select w-64"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
          >
            <option value="">학교를 선택하세요</option>
            {schools.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 선택한 학교 미리보기 */}
        {selectedSchool && (() => {
          const schoolData = shortages.find(s => s.name === selectedSchool);
          const 관내전출 = internalTransfers.filter(t => t.current_school_name === selectedSchool && t.assigned_school_id);
          const 관외전출 = externalOut.filter(t => t.school_name === selectedSchool);
          const 관내전입 = internalTransfers.filter(t => t.assigned_school_name === selectedSchool);
          const 관외전입 = externalIn.filter(t => t.assigned_school_name === selectedSchool);

          const 관내전출수 = 관내전출.filter(t => !t.note?.includes('휴직') && !t.note?.includes('파견')).length;
          const 관외전출수 = 관외전출.filter(t => !t.separate_quota).length;
          const 관내전입수 = 관내전입.filter(t => !t.note?.includes('휴직') && !t.note?.includes('파견')).length;
          const 관외전입수 = 관외전입.filter(t => !t.separate_quota).length;

          return (
            <div className="border rounded-lg overflow-hidden mb-4">
              {/* 제목 */}
              <div className="bg-white p-4 text-center">
                <h4 className="text-xl font-bold">학교별 현황</h4>
                <p className="text-right text-sm mt-2">{schools.find(s => s.name === selectedSchool)?.full_name || selectedSchool}</p>
              </div>

              {/* 상단 테이블 */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">정원</th>
                    <th className="border p-2">현원</th>
                    <th className="border p-2">결원</th>
                    <th className="border p-2">충원</th>
                    <th className="border p-2">전출</th>
                    <th className="border p-2">전입</th>
                    <th className="border p-2">과부족</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2 text-center">{schoolData?.quota || 0}</td>
                    <td className="border p-2 text-center">{schoolData?.current_count || 0}</td>
                    <td className="border p-2 text-center">0</td>
                    <td className="border p-2 text-center">0</td>
                    <td className="border p-2 text-center">{관내전출수 + 관외전출수}</td>
                    <td className="border p-2 text-center">{관내전입수 + 관외전입수}</td>
                    <td className="border p-2 text-center">{schoolData?.shortage || 0}</td>
                  </tr>
                </tbody>
              </table>

              {/* 명단 테이블 */}
              <table className="w-full border-collapse text-sm mt-2">
                <thead>
                  <tr className="bg-orange-100">
                    <th className="border p-2" colSpan={2}>구분</th>
                    <th className="border p-2">명단</th>
                    <th className="border p-2 w-16">계</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2 text-center" colSpan={2}>결원</td>
                    <td className="border p-2"></td>
                    <td className="border p-2 text-center"></td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-center" colSpan={2}>충원</td>
                    <td className="border p-2"></td>
                    <td className="border p-2 text-center"></td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-center" rowSpan={2}>전출</td>
                    <td className="border p-2 text-center">관내</td>
                    <td className="border p-2">{관내전출.map(t => `${t.teacher_name}(${t.assigned_school_name})`).join(', ')}</td>
                    <td className="border p-2 text-center">{관내전출수 || ''}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-center">관외</td>
                    <td className="border p-2">{관외전출.map(t => `${t.teacher_name}(${t.destination})`).join(', ')}</td>
                    <td className="border p-2 text-center">{관외전출수 || ''}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-center" rowSpan={2}>전입</td>
                    <td className="border p-2 text-center">관내</td>
                    <td className="border p-2">{관내전입.map(t => `${t.teacher_name}(${t.current_school_name})`).join(', ')}</td>
                    <td className="border p-2 text-center">{관내전입수 || ''}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-center">관외</td>
                    <td className="border p-2">{관외전입.map(t => `${t.teacher_name}(${t.origin_school})`).join(', ')}</td>
                    <td className="border p-2 text-center">{관외전입수 || ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={handleExportSchoolStatus}
            className="btn btn-primary"
            disabled={!selectedSchool}
          >
            선택 학교 다운로드
          </button>
          <button onClick={handleExportAllSchoolStatus} className="btn btn-secondary">
            전체 학교 다운로드 ({shortages.length}개교)
          </button>
        </div>
      </div>

      {/* 안내 */}
      <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <strong>참고:</strong> 원본 엑셀 파일의 출력물관리 시트와 동일한 구조로 문서를 출력합니다.
        PDF 문서는 기본 폰트를 사용하며, 한글이 깨지는 경우 Excel 문서를 활용하세요.
      </div>
    </div>
  );
}
