import { useEffect, useState, useMemo } from 'react';
import { externalInApi, schoolApi } from '../services/api';
import type { ExternalIn, School } from '../types';

interface BulkRow {
  transfer_type: string;
  origin_school: string;
  teacher_name: string;
  gender: string;
  birth_date: string;
  assigned_school_id: number | '';
  separate_quota: string;
  note: string;
}

const emptyRow = (): BulkRow => ({
  transfer_type: '타시군',
  origin_school: '',
  teacher_name: '',
  gender: '',
  birth_date: '',
  assigned_school_id: '',
  separate_quota: '',
  note: '',
});

export default function ExternalInPage() {
  const [inList, setInList] = useState<ExternalIn[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [sortType, setSortType] = useState<'order' | 'name'>('order');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExternalIn>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inRes, schoolRes] = await Promise.all([
        externalInApi.getAll(),
        schoolApi.getAll(),
      ]);
      setInList(inRes.data);
      setSchools(schoolRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 학교 가나다순 정렬
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [schools]);

  // 목록 정렬 (VBA: 학교명순 = display_order 기준)
  const sortedInList = useMemo(() => {
    const list = [...inList];
    if (sortType === 'order') {
      const schoolOrderMap = new Map(schools.map(s => [s.id, s.display_order ?? 999]));
      return list.sort((a, b) => {
        const orderA = schoolOrderMap.get(a.assigned_school_id ?? 0) ?? 999;
        const orderB = schoolOrderMap.get(b.assigned_school_id ?? 0) ?? 999;
        return orderA - orderB;
      });
    } else {
      return list.sort((a, b) => (a.assigned_school_name || '').localeCompare(b.assigned_school_name || '', 'ko'));
    }
  }, [inList, schools, sortType]);

  // 대량 입력 행 업데이트
  const updateBulkRow = (index: number, field: keyof BulkRow, value: string | number) => {
    const newRows = [...bulkRows];
    if (field === 'assigned_school_id') {
      newRows[index][field] = value === '' ? '' : Number(value);
    } else {
      newRows[index][field] = value as string;
    }
    setBulkRows(newRows);

    // 마지막 행에 입력하면 새 행 추가
    if (index === bulkRows.length - 1 && value !== '') {
      setBulkRows([...newRows, emptyRow()]);
    }
  };

  // 대량 입력 저장
  const handleBulkSave = async () => {
    const validRows = bulkRows.filter(row => row.teacher_name.trim());
    if (validRows.length === 0) {
      alert('입력할 데이터가 없습니다.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      try {
        await externalInApi.create({
          transfer_type: row.transfer_type || '타시군',
          origin_school: row.origin_school || undefined,
          teacher_name: row.teacher_name,
          gender: row.gender || undefined,
          birth_date: row.birth_date || undefined,
          assigned_school_id: row.assigned_school_id ? Number(row.assigned_school_id) : null,
          separate_quota: row.separate_quota || undefined,
          note: row.note || undefined,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    alert(`${successCount}건 추가 완료${failCount > 0 ? `, ${failCount}건 실패` : ''}`);
    setBulkRows([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
    setShowBulkForm(false);
    loadData();
  };

  // 수정 기능
  const handleEdit = (item: ExternalIn) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await externalInApi.update(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      loadData();
    } catch (error) {
      console.error('수정 실패:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteIn = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await externalInApi.delete(id);
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">관외전입 관리</h2>
        <button
          onClick={() => setShowBulkForm(!showBulkForm)}
          className={`px-4 py-2 rounded-lg ${showBulkForm ? 'bg-gray-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
        >
          {showBulkForm ? '입력 닫기' : '+ 관외전입 추가'}
        </button>
      </div>

      {/* 엑셀 스타일 대량 입력 폼 */}
      {showBulkForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-3">관외전입 추가</h3>
          <p className="text-sm text-gray-500 mb-3">엑셀처럼 직접 입력하세요. Tab키로 다음 칸 이동</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-center w-12">순</th>
                  <th className="border px-2 py-1 text-center w-24">구분</th>
                  <th className="border px-2 py-1 text-center">현임교(원소속)</th>
                  <th className="border px-2 py-1 text-center w-28">성명</th>
                  <th className="border px-2 py-1 text-center w-16">성별</th>
                  <th className="border px-2 py-1 text-center w-28">생년월일</th>
                  <th className="border px-2 py-1 text-center">배정학교</th>
                  <th className="border px-2 py-1 text-center w-24">별도정원</th>
                  <th className="border px-2 py-1 text-center">비고</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 text-center text-gray-400 text-sm">{idx + 1}</td>
                    <td className="border p-0">
                      <select
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                        value={row.transfer_type}
                        onChange={(e) => updateBulkRow(idx, 'transfer_type', e.target.value)}
                      >
                        <option value="타시군">타시군</option>
                        <option value="타시도">타시도</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="원소속 학교"
                        value={row.origin_school}
                        onChange={(e) => updateBulkRow(idx, 'origin_school', e.target.value)}
                      />
                    </td>
                    <td className="border p-0">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="성명"
                        value={row.teacher_name}
                        onChange={(e) => updateBulkRow(idx, 'teacher_name', e.target.value)}
                      />
                    </td>
                    <td className="border p-0">
                      <select
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                        value={row.gender}
                        onChange={(e) => updateBulkRow(idx, 'gender', e.target.value)}
                      >
                        <option value="">-</option>
                        <option value="남">남</option>
                        <option value="여">여</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 border-0 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="YYYY.MM.DD"
                        value={row.birth_date}
                        onChange={(e) => updateBulkRow(idx, 'birth_date', e.target.value)}
                      />
                    </td>
                    <td className="border p-0">
                      <select
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                        value={row.assigned_school_id}
                        onChange={(e) => updateBulkRow(idx, 'assigned_school_id', e.target.value)}
                      >
                        <option value="">배정학교 선택</option>
                        {sortedSchools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-0">
                      <select
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                        value={row.separate_quota}
                        onChange={(e) => updateBulkRow(idx, 'separate_quota', e.target.value)}
                      >
                        <option value="">-</option>
                        <option value="휴직">휴직</option>
                        <option value="파견">파견</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="비고"
                        value={row.note}
                        onChange={(e) => updateBulkRow(idx, 'note', e.target.value)}
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

      {/* 정렬 버튼 */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setSortType('order')}
          className={`px-3 py-1.5 rounded text-sm ${sortType === 'order' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          학교순
        </button>
        <button
          onClick={() => setSortType('name')}
          className={`px-3 py-1.5 rounded text-sm ${sortType === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          가나다순
        </button>
      </div>

      {/* 목록 */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">순</th>
                <th className="w-20 text-center">구분</th>
                <th className="text-center">현임교</th>
                <th className="w-24 text-center">성명</th>
                <th className="w-14 text-center">성별</th>
                <th className="w-24 text-center">생년월일</th>
                <th className="text-center">배정학교</th>
                <th className="w-24 text-center">별도정원</th>
                <th className="text-center">비고</th>
                <th className="text-center w-24">관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedInList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center text-gray-500 py-8">
                    관외전입 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedInList.map((item, index) => (
                  <tr key={item.id}>
                    {editingId === item.id ? (
                      <>
                        <td className="text-center">{index + 1}</td>
                        <td>
                          <select
                            className="input w-full"
                            value={editForm.transfer_type ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, transfer_type: e.target.value })}
                          >
                            <option value="타시군">타시군</option>
                            <option value="타시도">타시도</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input w-full"
                            value={editForm.origin_school ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, origin_school: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input w-full"
                            value={editForm.teacher_name ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, teacher_name: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            className="input w-full"
                            value={editForm.gender ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          >
                            <option value="">-</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input w-full text-center"
                            placeholder="YYYY.MM.DD"
                            value={(editForm as any).birth_date ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value } as any)}
                          />
                        </td>
                        <td>
                          <select
                            className="input w-full"
                            value={editForm.assigned_school_id ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, assigned_school_id: e.target.value ? parseInt(e.target.value) : null })}
                          >
                            <option value="">배정학교 선택</option>
                            {sortedSchools.map((school) => (
                              <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="input w-full"
                            value={editForm.separate_quota ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, separate_quota: e.target.value })}
                          >
                            <option value="">-</option>
                            <option value="휴직">휴직</option>
                            <option value="파견">파견</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input w-full"
                            value={editForm.note ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                          />
                        </td>
                        <td className="text-center">
                          <button onClick={handleSave} className="text-green-600 hover:text-green-800 mr-2">저장</button>
                          <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800">취소</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="text-center">{index + 1}</td>
                        <td className="text-center">{item.transfer_type}</td>
                        <td className="text-center">{item.origin_school}</td>
                        <td className="text-center font-medium">{item.teacher_name}</td>
                        <td className="text-center">{item.gender || '-'}</td>
                        <td className="text-center">{(item as any).birth_date || '-'}</td>
                        <td className="text-center">{item.assigned_school_name || '-'}</td>
                        <td className="text-center">{item.separate_quota || '-'}</td>
                        <td className="text-center text-gray-500">{item.note}</td>
                        <td className="text-center">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteIn(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        총 {sortedInList.length}건
      </div>
    </div>
  );
}
