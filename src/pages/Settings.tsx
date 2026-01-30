import { useEffect, useState } from 'react';
import { settingsApi, schoolApi } from '../services/api';
import type { School } from '../types';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSchoolInput, setBulkSchoolInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, schoolsRes] = await Promise.all([
        settingsApi.getAll(),
        schoolApi.getAll(),
      ]);
      setSettings(settingsRes.data);
      setSchools(schoolsRes.data);
    } catch (error) {
      console.error('설정 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update(settings);
      alert('설정이 저장되었습니다.');
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleInit = async () => {
    if (!confirm('기본 설정으로 초기화하시겠습니까?')) return;
    try {
      await settingsApi.init();
      loadData();
    } catch (error) {
      console.error('초기화 실패:', error);
    }
  };

  const handleResetAll = async () => {
    if (!confirm('모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    if (!confirm('정말로 모든 데이터를 삭제하시겠습니까?')) return;
    try {
      await settingsApi.resetAll();
      loadData();
      alert('모든 데이터가 초기화되었습니다.');
    } catch (error) {
      console.error('전체 초기화 실패:', error);
    }
  };

  const handleBulkSchoolAdd = async () => {
    const lines = bulkSchoolInput.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      alert('학교 목록을 입력해주세요.');
      return;
    }

    const schoolsToAdd = lines.map((line, index) => {
      const parts = line.split('\t');
      return {
        name: parts[0]?.trim() || '',
        full_name: parts[1]?.trim() || parts[0]?.trim() || '',
        quota: parseInt(parts[2]) || 0,
        display_order: index + 1,
      };
    }).filter(s => s.name);

    if (schoolsToAdd.length === 0) {
      alert('유효한 학교 데이터가 없습니다.');
      return;
    }

    try {
      await schoolApi.createBulk(schoolsToAdd);
      setBulkSchoolInput('');
      setShowBulkInput(false);
      loadData();
      alert(`${schoolsToAdd.length}개 학교가 추가되었습니다.`);
    } catch (error) {
      console.error('학교 일괄 추가 실패:', error);
      alert('학교 추가에 실패했습니다.');
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">설정</h2>

      {/* 기본 설정 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">기본 설정</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              교육청명
            </label>
            <input
              type="text"
              className="input"
              value={settings.office_name || ''}
              onChange={(e) => updateSetting('office_name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전보 연도
            </label>
            <input
              type="text"
              className="input"
              value={settings.transfer_year || ''}
              onChange={(e) => updateSetting('transfer_year', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              발령일자
            </label>
            <input
              type="date"
              className="input"
              value={settings.appointment_date || ''}
              onChange={(e) => updateSetting('appointment_date', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학교급
            </label>
            <select
              className="select"
              value={settings.school_level || ''}
              onChange={(e) => updateSetting('school_level', e.target.value)}
            >
              <option value="">선택</option>
              <option value="초등학교">초등학교</option>
              <option value="중학교">중학교</option>
              <option value="고등학교">고등학교</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? '저장 중...' : '설정 저장'}
          </button>
          <button onClick={handleInit} className="btn btn-secondary">
            기본값 복원
          </button>
        </div>
      </div>

      {/* 벽지학교 설정 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">벽지/통합학교 설정</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            벽지/통합학교 목록 (쉼표로 구분)
          </label>
          <textarea
            className="input h-24"
            placeholder="예: 벽지초, 통합초, 분교초"
            value={settings.remote_schools || ''}
            onChange={(e) => updateSetting('remote_schools', e.target.value)}
          />
          <p className="text-sm text-gray-500 mt-1">
            벽지/통합학교는 배치 시 특별 처리됩니다.
          </p>
        </div>
      </div>

      {/* 학교 일괄 등록 */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">학교 일괄 등록</h3>
          <button
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="btn btn-secondary"
          >
            {showBulkInput ? '닫기' : '일괄 등록'}
          </button>
        </div>

        {showBulkInput && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                학교 목록 (탭으로 구분: 약칭 [탭] 전체명 [탭] 정원)
              </label>
              <textarea
                className="input h-48 font-mono text-sm"
                placeholder={`예시:\n양산초\t양산초등학교\t30\n물금초\t물금초등학교\t25\n...`}
                value={bulkSchoolInput}
                onChange={(e) => setBulkSchoolInput(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                엑셀에서 복사하여 붙여넣기 하세요. 각 줄에 학교 하나씩 입력합니다.
              </p>
            </div>
            <button onClick={handleBulkSchoolAdd} className="btn btn-success">
              학교 일괄 추가
            </button>
          </>
        )}

        <div className="mt-4 text-sm text-gray-600">
          현재 등록된 학교: {schools.length}개
        </div>
      </div>

      {/* 결원 유형 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">결원/충원 유형 코드</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              결원 유형 (코드:이름, 줄바꿈 구분)
            </label>
            <textarea
              className="input h-32 font-mono text-sm"
              placeholder={`예시:\n승진:승진\n관외전출:관외전출\n교환:교환\n파견:파견`}
              value={settings.vacancy_types || ''}
              onChange={(e) => updateSetting('vacancy_types', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              충원 유형 (코드:이름, 줄바꿈 구분)
            </label>
            <textarea
              className="input h-32 font-mono text-sm"
              placeholder={`예시:\n신규:신규임용\n복직:복직\n관외전입:관외전입`}
              value={settings.supplement_types || ''}
              onChange={(e) => updateSetting('supplement_types', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 위험 영역 */}
      <div className="card border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold mb-4 text-red-800">위험 영역</h3>
        <p className="text-sm text-red-700 mb-4">
          아래 작업은 되돌릴 수 없습니다. 신중하게 실행하세요.
        </p>
        <button onClick={handleResetAll} className="btn btn-danger">
          모든 데이터 초기화
        </button>
      </div>
    </div>
  );
}
