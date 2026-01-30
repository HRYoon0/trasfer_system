import { useEffect, useState } from 'react';
import { vacancyApi, supplementApi, schoolApi, settingsApi } from '../services/api';
import type { VacancyItem, School } from '../types';

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [supplements, setSupplements] = useState<VacancyItem[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [vacancyTypes, setVacancyTypes] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vacancy' | 'supplement'>('vacancy');

  // 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    type_code: '',
    school_id: 0,
    teacher_name: '',
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vacancyRes, supplementRes, schoolRes, typesRes] = await Promise.all([
        vacancyApi.getAll(),
        supplementApi.getAll(),
        schoolApi.getAll(),
        settingsApi.getVacancyTypes(),
      ]);
      setVacancies(vacancyRes.data);
      setSupplements(supplementRes.data);
      setSchools(schoolRes.data);
      setVacancyTypes(typesRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newItem.type_code || !newItem.school_id || !newItem.teacher_name) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }
    try {
      if (activeTab === 'vacancy') {
        await vacancyApi.create(newItem);
      } else {
        await supplementApi.create(newItem);
      }
      setNewItem({ type_code: '', school_id: 0, teacher_name: '', note: '' });
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error('추가 실패:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      if (activeTab === 'vacancy') {
        await vacancyApi.delete(id);
      } else {
        await supplementApi.delete(id);
      }
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const currentData = activeTab === 'vacancy' ? vacancies : supplements;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">결원/충원 관리</h2>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('vacancy')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'vacancy'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          결원 ({vacancies.length})
        </button>
        <button
          onClick={() => setActiveTab('supplement')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'supplement'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          충원 ({supplements.length})
        </button>
      </div>

      {/* 추가 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          + {activeTab === 'vacancy' ? '결원' : '충원'} 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">
            새 {activeTab === 'vacancy' ? '결원' : '충원'} 추가
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <select
              className="select"
              value={newItem.type_code}
              onChange={(e) => setNewItem({ ...newItem, type_code: e.target.value })}
            >
              <option value="">유형 선택</option>
              {vacancyTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={newItem.school_id}
              onChange={(e) => setNewItem({ ...newItem, school_id: parseInt(e.target.value) || 0 })}
            >
              <option value="0">학교 선택</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="교사명"
              className="input"
              value={newItem.teacher_name}
              onChange={(e) => setNewItem({ ...newItem, teacher_name: e.target.value })}
            />
            <input
              type="text"
              placeholder="비고"
              className="input"
              value={newItem.note}
              onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="btn btn-success">저장</button>
            <button onClick={() => setShowAddForm(false)} className="btn btn-secondary">취소</button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>유형</th>
                <th>학교</th>
                <th>교사명</th>
                <th>비고</th>
                <th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    {activeTab === 'vacancy' ? '결원' : '충원'} 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                currentData.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.type_name || item.type_code}</td>
                    <td>{item.school_name}</td>
                    <td className="font-medium">{item.teacher_name}</td>
                    <td className="text-gray-500">{item.note}</td>
                    <td className="text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        총 {currentData.length}건
      </div>
    </div>
  );
}
