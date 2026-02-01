import { useRef, useState } from 'react';
import {
  schoolApi,
  vacancyApi,
  supplementApi,
  externalOutApi,
} from '../services/api';
import {
  downloadDataTemplate,
  parseDataTemplate,
} from '../utils/documents';
import type { School } from '../types';

export default function DataEntry() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 템플릿 다운로드
  const handleDownloadTemplate = async () => {
    await downloadDataTemplate();
  };

  // 템플릿 업로드 처리
  const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('템플릿 파일을 업로드하면 기존 데이터가 추가됩니다.\n계속하시겠습니까?')) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const result = await parseDataTemplate(file);

      let successCount = { schools: 0, vacancies: 0, supplements: 0, externalOuts: 0 };
      let errorMessages: string[] = [];

      // 1. 학교 데이터 저장
      for (const school of result.schools) {
        try {
          await schoolApi.create({
            name: school.name,
            full_name: school.name + '초등학교',
            quota: school.quota,
            display_order: school.code,
            male_count: school.maleCount,
            female_count: school.femaleCount,
            current_count: school.maleCount + school.femaleCount,
          });
          successCount.schools++;
        } catch (err: any) {
          if (!err.message?.includes('duplicate')) {
            errorMessages.push(`학교 "${school.name}": 저장 실패`);
          }
        }
      }

      // 학교 목록 다시 로드 (ID 매핑용)
      const schoolsRes = await schoolApi.getAll();
      const schoolMap = new Map(schoolsRes.data.map((s: School) => [s.name, s.id]));
      const findSchoolId = (name: string): number | null => {
        if (!name) return null;
        const n = name.trim();
        if (schoolMap.has(n)) return schoolMap.get(n)!;
        if (schoolMap.has(n + '초등학교')) return schoolMap.get(n + '초등학교')!;
        if (schoolMap.has(n + '초')) return schoolMap.get(n + '초')!;
        // 약칭 매칭
        for (const [schoolName, id] of schoolMap) {
          if (schoolName.replace('초등학교', '').replace('초', '') === n) return id;
        }
        return null;
      };

      // 2. 결원 데이터 저장
      for (const v of result.vacancies) {
        const schoolId = findSchoolId(v.school);
        if (!schoolId) {
          errorMessages.push(`결원 "${v.name}": 학교 "${v.school}" 찾을 수 없음`);
          continue;
        }
        try {
          await vacancyApi.create({
            school_id: schoolId,
            type_code: v.type,
            teacher_name: v.name,
            gender: v.gender || undefined,
            birth_date: v.birth || undefined,
            note: v.note || undefined,
          });
          successCount.vacancies++;
        } catch (err) {
          errorMessages.push(`결원 "${v.name}": 저장 실패`);
        }
      }

      // 3. 충원 데이터 저장
      for (const s of result.supplements) {
        const schoolId = findSchoolId(s.school);
        if (!schoolId) {
          errorMessages.push(`충원 "${s.name}": 학교 "${s.school}" 찾을 수 없음`);
          continue;
        }
        try {
          await supplementApi.create({
            school_id: schoolId,
            type_code: s.type,
            teacher_name: s.name,
            gender: s.gender || undefined,
            birth_date: s.birth || undefined,
            note: s.note || undefined,
          });
          successCount.supplements++;
        } catch (err) {
          errorMessages.push(`충원 "${s.name}": 저장 실패`);
        }
      }

      // 4. 관외전출 데이터 저장
      for (const ext of result.externalOuts) {
        const schoolId = findSchoolId(ext.school);
        if (!schoolId) {
          errorMessages.push(`관외전출 "${ext.name}": 학교 "${ext.school}" 찾을 수 없음`);
          continue;
        }
        try {
          // transfer_type 검증 (타시도, 타시군만 허용)
          const transferType = ext.type === '타시도' || ext.type === '타시군' ? ext.type : '타시군';
          await externalOutApi.create({
            school_id: schoolId,
            teacher_name: ext.name,
            gender: ext.gender || null,
            birth_date: ext.birth || null,
            transfer_type: transferType,
            destination: ext.destination || null,
            separate_quota: ext.separate || null,
            note: ext.note || null,
          });
          successCount.externalOuts++;
        } catch (err: any) {
          const errMsg = err?.message || err?.toString() || '알 수 없는 오류';
          errorMessages.push(`관외전출 "${ext.name}": ${errMsg}`);
          console.error('관외전출 저장 오류:', ext, err);
        }
      }

      // 결과 메시지
      let message = `업로드 완료!\n\n`;
      message += `학교: ${successCount.schools}개\n`;
      message += `결원: ${successCount.vacancies}건\n`;
      message += `충원: ${successCount.supplements}건\n`;
      message += `관외전출: ${successCount.externalOuts}건`;

      if (errorMessages.length > 0) {
        message += `\n\n오류 (${errorMessages.length}건):\n`;
        message += errorMessages.slice(0, 10).join('\n');
        if (errorMessages.length > 10) {
          message += `\n... 외 ${errorMessages.length - 10}건`;
        }
      }

      alert(message);
    } catch (error) {
      console.error('템플릿 업로드 실패:', error);
      alert('템플릿 파일을 읽는 중 오류가 발생했습니다.\n파일 형식을 확인해주세요.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">자료 입력</h2>

      {/* 숨겨진 파일 입력 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadTemplate}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {/* 자료 입력 템플릿 */}
      <div className="card mb-6 border-2 border-blue-300 bg-blue-50">
        <h3 className="text-lg font-semibold mb-4">📥 자료 입력 템플릿</h3>
        <p className="text-sm text-gray-600 mb-4">
          학교관리, 결원, 충원, 관외전출 자료를 한 번에 입력할 수 있습니다.
          템플릿을 다운로드하여 작성 후 업로드하세요.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-white">
            <h4 className="font-medium mb-2">1. 템플릿 다운로드</h4>
            <p className="text-sm text-gray-500 mb-3">
              4개 시트 포함 (학교관리, 결원, 충원, 관외전출)
            </p>
            <button onClick={handleDownloadTemplate} className="btn btn-primary">
              템플릿 다운로드
            </button>
          </div>
          <div className="border rounded-lg p-4 bg-white">
            <h4 className="font-medium mb-2">2. 작성 후 업로드</h4>
            <p className="text-sm text-gray-500 mb-3">
              작성한 템플릿을 업로드하면 자료가 등록됩니다
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-success"
            >
              {uploading ? '업로드 중...' : '템플릿 업로드'}
            </button>
          </div>
        </div>
      </div>

      {/* 사용 안내 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📌 사용 안내</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">1.</span>
            <p><strong>1정현원</strong> 시트에 학교 정보를 입력합니다. (학교명, 정원 등)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">2.</span>
            <p><strong>2결원</strong> 시트에 결원 사유를 입력합니다. (퇴직, 승진 등)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">3.</span>
            <p><strong>3충원</strong> 시트에 충원 사유를 입력합니다. (정원증, 학급증 등)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">4.</span>
            <p><strong>4관외전출</strong> 시트에 관외전출자를 입력합니다. (타시군, 타시도)</p>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800">
              <strong>💡 TIP:</strong> 결원/충원/관외전출 시트의 <strong>현임교</strong> 열은
              드롭다운에서 1정현원에 입력한 학교를 선택할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
