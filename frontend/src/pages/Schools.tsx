import { useEffect, useState, useMemo } from 'react';
import { schoolApi } from '../services/api';
import type { School } from '../types';

interface BulkRow {
  name: string;
  male: number | '';
  female: number | '';
  quota: number | '';
}

const emptyRow = (): BulkRow => ({ name: '', male: '', female: '', quota: '' });

export default function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<School>>({});
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);

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

  // 학교명 가나다순 정렬
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [schools]);

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

  // 대량 입력 행 업데이트
  const updateBulkRow = (index: number, field: keyof BulkRow, value: string | number) => {
    const newRows = [...bulkRows];
    if (field === 'name') {
      newRows[index][field] = value as string;
    } else {
      newRows[index][field] = value === '' ? '' : Number(value);
    }
    setBulkRows(newRows);

    // 마지막 행에 입력하면 새 행 추가
    if (index === bulkRows.length - 1 && value !== '') {
      setBulkRows([...newRows, emptyRow()]);
    }
  };

  // 대량 입력 저장
  const handleBulkSave = async () => {
    const validRows = bulkRows.filter(row => row.name.trim());
    if (validRows.length === 0) {
      alert('입력할 학교가 없습니다.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      const fullName = row.name.includes('초등학교') ? row.name : `${row.name}초등학교`;
      const maleCount = row.male || 0;
      const femaleCount = row.female || 0;
      try {
        await schoolApi.create({
          name: row.name,
          full_name: fullName,
          quota: row.quota || 0,
          current_count: maleCount + femaleCount,
          male_count: maleCount,
          female_count: femaleCount,
          display_order: 0,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    alert(`${successCount}개 학교 추가 완료${failCount > 0 ? `, ${failCount}개 실패` : ''}`);
    setBulkRows([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
    setShowBulkForm(false);
    loadSchools();
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
          onClick={() => setShowBulkForm(!showBulkForm)}
          className={`px-4 py-2 rounded-lg ${showBulkForm ? 'bg-gray-500 text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}
        >
          {showBulkForm ? '입력 닫기' : '+ 학교 추가'}
        </button>
      </div>

      {/* 엑셀 스타일 대량 입력 폼 */}
      {showBulkForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-3">학교 추가</h3>
          <p className="text-sm text-gray-500 mb-3">엑셀처럼 직접 입력하세요. Tab키로 다음 칸 이동</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th rowSpan={2} className="border px-2 py-1 text-center w-12">학교<br/>코드</th>
                  <th rowSpan={2} className="border px-2 py-1 text-center">학교명</th>
                  <th colSpan={3} className="border px-2 py-1 text-center bg-blue-100">현원</th>
                  <th rowSpan={2} className="border px-2 py-1 text-center w-20 bg-red-100">정원</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1 text-center w-16 bg-blue-50">남</th>
                  <th className="border px-2 py-1 text-center w-16 bg-blue-50">여</th>
                  <th className="border px-2 py-1 text-center w-16 bg-blue-50">계</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 text-center text-gray-400 text-sm">{idx + 1}</td>
                    <td className="border p-0">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="학교명"
                        value={row.name}
                        onChange={(e) => updateBulkRow(idx, 'name', e.target.value)}
                      />
                    </td>
                    <td className="border p-0 bg-blue-50">
                      <input
                        type="number"
                        className="w-full px-2 py-1.5 border-0 text-center bg-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0"
                        value={row.male}
                        onChange={(e) => updateBulkRow(idx, 'male', e.target.value)}
                      />
                    </td>
                    <td className="border p-0 bg-blue-50">
                      <input
                        type="number"
                        className="w-full px-2 py-1.5 border-0 text-center bg-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0"
                        value={row.female}
                        onChange={(e) => updateBulkRow(idx, 'female', e.target.value)}
                      />
                    </td>
                    <td className="border px-2 py-1.5 text-center bg-blue-100 font-medium">
                      {(row.male || 0) + (row.female || 0) || ''}
                    </td>
                    <td className="border p-0 bg-red-50">
                      <input
                        type="number"
                        className="w-full px-2 py-1.5 border-0 text-center bg-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0"
                        value={row.quota}
                        onChange={(e) => updateBulkRow(idx, 'quota', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleBulkSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              저장
            </button>
            <button onClick={() => { setShowBulkForm(false); setBulkRows([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 학교 목록 */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th rowSpan={2} className="w-16 whitespace-nowrap">번호</th>
                <th rowSpan={2}>학교명</th>
                <th colSpan={3} className="text-center bg-blue-50">현원</th>
                <th rowSpan={2} className="text-center w-16 bg-red-50">정원</th>
                <th rowSpan={2} className="text-center w-16">과부족</th>
                <th rowSpan={2} className="text-center w-24">관리</th>
              </tr>
              <tr>
                <th className="text-center w-14 bg-blue-50">남</th>
                <th className="text-center w-14 bg-blue-50">여</th>
                <th className="text-center w-14 bg-blue-100">계</th>
              </tr>
            </thead>
            <tbody>
              {sortedSchools.map((school, idx) => (
                <tr key={school.id}>
                  {editingId === school.id ? (
                    <>
                      <td className="text-center">{idx + 1}</td>
                      <td style={{ minWidth: '120px' }}>
                        <input
                          type="text"
                          className="w-full border border-yellow-400 rounded"
                          style={{ padding: '6px 8px', backgroundColor: '#fefce8', height: '32px' }}
                          value={editForm.name ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </td>
                      <td className="bg-blue-50" style={{ minWidth: '80px' }}>
                        <input
                          type="number"
                          className="text-center border border-yellow-400 rounded"
                          style={{ padding: '6px 8px', backgroundColor: '#fefce8', height: '32px', width: '70px' }}
                          value={editForm.male_count ?? 0}
                          onChange={(e) => {
                            const male = parseInt(e.target.value) || 0;
                            setEditForm({ ...editForm, male_count: male, current_count: male + (editForm.female_count || 0) });
                          }}
                        />
                      </td>
                      <td className="bg-blue-50" style={{ minWidth: '80px' }}>
                        <input
                          type="number"
                          className="text-center border border-yellow-400 rounded"
                          style={{ padding: '6px 8px', backgroundColor: '#fefce8', height: '32px', width: '70px' }}
                          value={editForm.female_count ?? 0}
                          onChange={(e) => {
                            const female = parseInt(e.target.value) || 0;
                            setEditForm({ ...editForm, female_count: female, current_count: (editForm.male_count || 0) + female });
                          }}
                        />
                      </td>
                      <td className="text-center bg-blue-100 font-medium">{(editForm.male_count || 0) + (editForm.female_count || 0)}</td>
                      <td className="bg-red-50" style={{ minWidth: '80px' }}>
                        <input
                          type="number"
                          className="text-center border border-yellow-400 rounded"
                          style={{ padding: '6px 8px', backgroundColor: '#fefce8', height: '32px', width: '70px' }}
                          value={editForm.quota ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, quota: parseInt(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="text-center font-bold">{(editForm.current_count || 0) - (editForm.quota || 0)}</td>
                      <td className="text-center whitespace-nowrap">
                        <button onClick={handleSave} className="text-green-600 hover:text-green-800 mr-2">저장</button>
                        <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800">취소</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-center">{idx + 1}</td>
                      <td className="font-medium">{school.name}</td>
                      <td className="text-center bg-blue-50">{school.male_count || 0}</td>
                      <td className="text-center bg-blue-50">{school.female_count || 0}</td>
                      <td className="text-center bg-blue-100 font-medium">{school.current_count}</td>
                      <td className="text-center bg-red-50">{school.quota}</td>
                      <td className={`text-center font-bold ${(school.current_count - school.quota) < 0 ? 'text-red-600' : (school.current_count - school.quota) > 0 ? 'text-blue-600' : ''}`}>
                        {school.current_count - school.quota}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => handleEdit(school)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
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
        총 {schools.length}개 학교 • 학교명 가나다순 자동 정렬
      </div>
    </div>
  );
}
