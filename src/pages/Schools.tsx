import { useEffect, useState } from 'react';
import { schoolApi } from '../services/api';
import type { School } from '../types';

export default function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<School>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', full_name: '', quota: 0, display_order: 0 });

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const res = await schoolApi.getAll();
      setSchools(res.data);
    } catch (error) {
      console.error('학교 목록 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (school: School) => {
    setEditingId(school.id);
    setEditForm({ ...school });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await schoolApi.update(editingId, editForm);
      setEditingId(null);
      loadSchools();
    } catch (error) {
      console.error('학교 수정 실패:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await schoolApi.delete(id);
      loadSchools();
    } catch (error) {
      console.error('학교 삭제 실패:', error);
    }
  };

  const handleAdd = async () => {
    try {
      await schoolApi.create(newSchool);
      setNewSchool({ name: '', full_name: '', quota: 0, display_order: 0 });
      setShowAddForm(false);
      loadSchools();
    } catch (error) {
      console.error('학교 추가 실패:', error);
    }
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">학교 관리</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          + 학교 추가
        </button>
      </div>

      {/* 학교 추가 폼 */}
      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">새 학교 추가</h3>
          <div className="grid grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="학교명 (약칭)"
              className="input"
              value={newSchool.name}
              onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="전체 학교명"
              className="input"
              value={newSchool.full_name}
              onChange={(e) => setNewSchool({ ...newSchool, full_name: e.target.value })}
            />
            <input
              type="number"
              placeholder="정원"
              className="input"
              value={newSchool.quota}
              onChange={(e) => setNewSchool({ ...newSchool, quota: parseInt(e.target.value) || 0 })}
            />
            <input
              type="number"
              placeholder="표시순서"
              className="input"
              value={newSchool.display_order}
              onChange={(e) => setNewSchool({ ...newSchool, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="btn btn-success">저장</button>
            <button onClick={() => setShowAddForm(false)} className="btn btn-secondary">취소</button>
          </div>
        </div>
      )}

      {/* 학교 목록 */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>순서</th>
                <th>학교명</th>
                <th>전체명</th>
                <th className="text-right">정원</th>
                <th className="text-right">현원</th>
                <th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => (
                <tr key={school.id}>
                  {editingId === school.id ? (
                    <>
                      <td>
                        <input
                          type="number"
                          className="input w-16"
                          value={editForm.display_order ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || 0 })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input"
                          value={editForm.name ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input"
                          value={editForm.full_name ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input w-20"
                          value={editForm.quota ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, quota: parseInt(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="text-right">{school.current_count}</td>
                      <td className="text-center">
                        <button onClick={handleSave} className="btn btn-success btn-sm mr-2">저장</button>
                        <button onClick={handleCancel} className="btn btn-secondary btn-sm">취소</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{school.display_order}</td>
                      <td className="font-medium">{school.name}</td>
                      <td className="text-gray-500">{school.full_name}</td>
                      <td className="text-right">{school.quota}</td>
                      <td className="text-right">{school.current_count}</td>
                      <td className="text-center">
                        <button
                          onClick={() => handleEdit(school)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(school.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        총 {schools.length}개 학교
      </div>
    </div>
  );
}
