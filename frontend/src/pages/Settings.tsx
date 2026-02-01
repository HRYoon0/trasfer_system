import { useEffect, useState } from 'react';
import { settingsApi } from '../services/api';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const settingsRes = await settingsApi.getAll();
      setSettings(settingsRes.data);
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
