import ExcelJS from 'exceljs';
import type { InternalTransfer, SchoolShortage, ExternalOut, ExternalIn } from '../types';

// 학교명을 기관명으로 변환 (원본 VBA의 출력물기관명 함수)
function getOfficialSchoolName(shortName: string): string {
  if (!shortName) return '';
  if (shortName.includes('초등학교') || shortName.includes('분교')) {
    return shortName;
  }
  return `${shortName}초등학교`;
}

// 템플릿 로드 헬퍼 함수
async function loadTemplate(templatePath: string): Promise<ExcelJS.Workbook> {
  const response = await fetch(templatePath);
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

// 파일 다운로드 헬퍼 함수
async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// =====================================================
// 1. 발령대장 - 원본 템플릿 기반 (양산 발령자만 = 전입)
// =====================================================
export async function exportAssignmentList(
  internalTransfers: InternalTransfer[],
  externalIn: ExternalIn[],
  settings: Record<string, string>
) {
  const workbook = await loadTemplate('/templates/assignment_list_template.xlsx');
  const worksheet = workbook.getWorksheet('발령대장');
  if (!worksheet) throw new Error('발령대장 시트를 찾을 수 없습니다.');

  const appointmentDate = settings.appointment_date || '2025.3.1';
  const issuer = settings.issuer || '경상남도양산교육지원청교육장';

  // 데이터 준비 (양산으로 발령나는 사람 = 전입)
  interface DataRow {
    소속: string;
    성명: string;
    발령사항: string;
    정렬키: number;
  }

  const dataRows: DataRow[] = [];

  // 관내 전입 (관내 전보로 배치된 교사)
  const assignedInternal = internalTransfers.filter(t => t.assigned_school_id);
  assignedInternal.forEach(t => {
    dataRows.push({
      소속: getOfficialSchoolName(t.current_school_name || ''),
      성명: t.teacher_name,
      발령사항: `${getOfficialSchoolName(t.assigned_school_name || '')} 근무를 명함.`,
      정렬키: 1,
    });
  });

  // 관외 전입 (타시군, 타시도, 신규)
  externalIn.forEach(t => {
    let 소속 = '';
    let 정렬키 = 2;

    if (t.transfer_type === '신규') {
      소속 = '신규';
      정렬키 = 4;
    } else if (t.transfer_type === '타시도') {
      소속 = t.origin_school?.includes('분교') ? t.origin_school : `${t.origin_school || ''}초등학교`;
      정렬키 = 3;
    } else {
      // 타시군
      소속 = t.origin_school?.includes('분교') ? t.origin_school : `${t.origin_school || ''}초등학교`;
      정렬키 = 2;
    }

    dataRows.push({
      소속,
      성명: t.teacher_name,
      발령사항: `${getOfficialSchoolName(t.assigned_school_name || '')} 근무를 명함.`,
      정렬키,
    });
  });

  // 정렬
  dataRows.sort((a, b) => a.정렬키 - b.정렬키);

  // 데이터 행 작성 (4행부터)
  const dataStartRow = 4;
  dataRows.forEach((data, i) => {
    const rowNum = dataStartRow + i;
    const row = worksheet.getRow(rowNum);

    row.getCell('B').value = i + 1;  // 순번
    row.getCell('C').value = appointmentDate;
    row.getCell('D').value = data.소속;
    row.getCell('E').value = '교사';
    row.getCell('F').value = data.성명;
    row.getCell('G').value = data.발령사항;
    row.getCell('H').value = issuer;
  });

  // 여백 행
  if (dataRows.length > 0) {
    const emptyRow = worksheet.getRow(dataStartRow + dataRows.length);
    emptyRow.getCell('D').value = '- 이하 여백 -';
  }

  await downloadWorkbook(workbook, `발령대장_${settings.transfer_year || '2025'}.xlsx`);
}

// =====================================================
// 2. 통지서 (관내 전보) - 원본 템플릿 기반
// =====================================================
export async function exportTransferNotice(
  transfer: InternalTransfer,
  settings: Record<string, string>
) {
  const workbook = await loadTemplate('/templates/notice_template.xlsx');
  const worksheet = workbook.getWorksheet('통지서');
  if (!worksheet) throw new Error('통지서 시트를 찾을 수 없습니다.');

  const appointmentDate = settings.appointment_date || '2025년 3월 1일';

  // 데이터 채우기
  worksheet.getCell('D4').value = getOfficialSchoolName(transfer.current_school_name || '');
  worksheet.getCell('E5').value = '교사';
  worksheet.getCell('G5').value = transfer.teacher_name;
  worksheet.getCell('C9').value = `${getOfficialSchoolName(transfer.assigned_school_name || '')} 근무를 명함.`;
  worksheet.getCell('B11').value = appointmentDate;

  await downloadWorkbook(workbook, `통지서_${transfer.teacher_name}.xlsx`);
}

// =====================================================
// 3. 통지서_타시군전출 - 원본 템플릿 기반
// =====================================================
export async function exportExternalTransferNotice(
  transfer: ExternalOut,
  settings: Record<string, string>
) {
  const workbook = await loadTemplate('/templates/notice_external_template.xlsx');
  const worksheet = workbook.getWorksheet('통지서_타시군전출');
  if (!worksheet) throw new Error('통지서_타시군전출 시트를 찾을 수 없습니다.');

  const appointmentDate = settings.appointment_date || '2025년 3월 1일';

  // 데이터 채우기 (원본 구조에 맞게)
  worksheet.getCell('D4').value = getOfficialSchoolName(transfer.school_name || '');
  worksheet.getCell('E5').value = '교사';
  worksheet.getCell('G5').value = transfer.teacher_name;
  worksheet.getCell('C9').value = `${transfer.destination || ''}교육장이 지정하는 초등학교 근무를 명함.`;
  worksheet.getCell('B11').value = appointmentDate;

  await downloadWorkbook(workbook, `통지서_타시군_${transfer.teacher_name}.xlsx`);
}

// =====================================================
// 4. 임명장 - 원본 템플릿 기반
// =====================================================
export async function exportAppointmentLetter(
  transfer: InternalTransfer | ExternalIn,
  settings: Record<string, string>
) {
  const workbook = await loadTemplate('/templates/appointment_template.xlsx');
  const worksheet = workbook.getWorksheet('임명장');
  if (!worksheet) throw new Error('임명장 시트를 찾을 수 없습니다.');

  const appointmentDate = settings.appointment_date || '2025년 3월 1일';
  const assignedSchool = 'assigned_school_name' in transfer ? transfer.assigned_school_name : '';

  // 원본 구조에 맞게 데이터 채우기 (임명장 템플릿 구조 확인 필요)
  worksheet.getCell('F4').value = '교사';
  worksheet.getCell('F5').value = transfer.teacher_name;
  worksheet.getCell('C8').value = `${getOfficialSchoolName(assignedSchool || '')} 교사에 임함.`;
  worksheet.getCell('C10').value = `${getOfficialSchoolName(assignedSchool || '')} 근무를 명함.`;
  worksheet.getCell('C12').value = appointmentDate;

  await downloadWorkbook(workbook, `임명장_${transfer.teacher_name}.xlsx`);
}

// =====================================================
// 5. 기관통보 - 원본 템플릿 기반
// =====================================================
export async function exportInstitutionNotification(
  type: '관내' | '관외',
  internalTransfers: InternalTransfer[],
  externalIn: ExternalIn[],
  settings: Record<string, string>
) {
  const workbook = await loadTemplate('/templates/institution_notification_template.xlsx');
  const worksheet = workbook.getWorksheet('기관통보');
  if (!worksheet) throw new Error('기관통보 시트를 찾을 수 없습니다.');

  const appointmentDate = settings.appointment_date || '2025.3.1';

  // 제목 업데이트
  worksheet.getCell('B1').value = `${appointmentDate}자 교육공무원 인사발령`;

  // 데이터 준비
  interface NotificationRow {
    성명: string;
    직위: string;
    기관: string;
    직급: string;
    부서: string;
    임용일자: string;
  }

  const dataRows: NotificationRow[] = [];

  if (type === '관내') {
    const assignedInternal = internalTransfers.filter(t => t.assigned_school_id);
    assignedInternal.forEach(t => {
      dataRows.push({
        성명: t.teacher_name,
        직위: '교사',
        기관: `${getOfficialSchoolName(t.assigned_school_name || '')} 근무를 명함.`,
        직급: '교사',
        부서: getOfficialSchoolName(t.current_school_name || ''),
        임용일자: appointmentDate,
      });
    });
  } else {
    externalIn.forEach(t => {
      let 부서 = '';
      if (t.transfer_type === '신규') {
        부서 = '신규';
      } else {
        부서 = t.origin_school?.includes('분교') ? t.origin_school : `${t.origin_school || ''}초등학교`;
      }

      dataRows.push({
        성명: t.teacher_name,
        직위: '교사',
        기관: `${getOfficialSchoolName(t.assigned_school_name || '')} 근무를 명함.`,
        직급: '교사',
        부서,
        임용일자: appointmentDate,
      });
    });
  }

  // 데이터 행 작성 (4행부터)
  const dataStartRow = 4;
  dataRows.forEach((data, i) => {
    const rowNum = dataStartRow + i;
    const row = worksheet.getRow(rowNum);

    row.getCell('B').value = i + 1;
    row.getCell('C').value = data.성명;
    row.getCell('D').value = data.직위;
    row.getCell('E').value = data.기관;
    row.getCell('F').value = data.직급;
    row.getCell('G').value = data.부서;
    row.getCell('H').value = data.임용일자;
  });

  // 여백 행
  if (dataRows.length > 0) {
    const emptyRow = worksheet.getRow(dataStartRow + dataRows.length);
    emptyRow.getCell('E').value = '- 이하 여백 -';
  }

  await downloadWorkbook(workbook, `기관통보_${type}_${settings.transfer_year || '2025'}.xlsx`);
}

// =====================================================
// 6. 임용서 - 원본 템플릿 기반
// =====================================================
export async function exportEmploymentLetter(
  type: '관내' | '타시군' | '타시도' | '신규',
  internalTransfers: InternalTransfer[],
  externalIn: ExternalIn[],
  settings: Record<string, string>
) {
  const workbook = await loadTemplate('/templates/employment_letter_template.xlsx');
  const worksheet = workbook.getWorksheet('임용서');
  if (!worksheet) throw new Error('임용서 시트를 찾을 수 없습니다.');

  const appointmentDate = settings.appointment_date || '2025.3.1';

  // 데이터 준비
  interface EmploymentRow {
    성명: string;
    직급1: string;
    성별: string;
    부서1: string;
    직급2: string;
    부서2: string;
    발령일자: string;
  }

  const dataRows: EmploymentRow[] = [];

  if (type === '관내') {
    const assignedInternal = internalTransfers.filter(t => t.assigned_school_id);
    assignedInternal.forEach(t => {
      dataRows.push({
        성명: t.teacher_name,
        직급1: '교사',
        성별: t.gender || '',
        부서1: `${getOfficialSchoolName(t.assigned_school_name || '')} 근무를 명함.`,
        직급2: '교사',
        부서2: getOfficialSchoolName(t.current_school_name || ''),
        발령일자: appointmentDate,
      });
    });
  } else {
    const filtered = externalIn.filter(t => t.transfer_type === type);
    filtered.forEach(t => {
      let 부서2 = '';
      if (t.transfer_type === '신규') {
        부서2 = '신규';
      } else {
        부서2 = t.origin_school?.includes('분교') ? t.origin_school : `${t.origin_school || ''}초등학교`;
      }

      dataRows.push({
        성명: t.teacher_name,
        직급1: '교사',
        성별: t.gender || '',
        부서1: `${getOfficialSchoolName(t.assigned_school_name || '')} 근무를 명함.`,
        직급2: '교사',
        부서2,
        발령일자: appointmentDate,
      });
    });
  }

  // 데이터 행 작성 (9행부터)
  const dataStartRow = 9;
  dataRows.forEach((data, i) => {
    const rowNum = dataStartRow + i;
    const row = worksheet.getRow(rowNum);

    row.getCell('B').value = i + 1;
    row.getCell('C').value = data.성명;
    row.getCell('D').value = data.직급1;
    row.getCell('E').value = data.성별;
    row.getCell('F').value = data.부서1;
    row.getCell('G').value = data.직급2;
    row.getCell('H').value = data.부서2;
    row.getCell('I').value = data.발령일자;
  });

  // 여백 행
  if (dataRows.length > 0) {
    const emptyRow = worksheet.getRow(dataStartRow + dataRows.length);
    emptyRow.getCell('D').value = '- 이하 여백 -';
  }

  await downloadWorkbook(workbook, `임용서_${type}_${settings.transfer_year || '2025'}.xlsx`);
}

// =====================================================
// 7. 학교별현황 - 원본 템플릿 기반
// =====================================================
export async function exportSchoolStatus(
  schoolName: string,
  schoolData: SchoolShortage | undefined,
  internalTransfers: InternalTransfer[],
  externalOut: ExternalOut[],
  externalIn: ExternalIn[],
  settings: Record<string, string>
) {
  const workbook = await loadTemplate('/templates/school_status_template.xlsx');
  const worksheet = workbook.getWorksheet('학교별현황');
  if (!worksheet) throw new Error('학교별현황 시트를 찾을 수 없습니다.');

  // 데이터 계산
  const 관내전출 = internalTransfers.filter(t => t.current_school_name === schoolName && t.assigned_school_id);
  const 관내전출명단 = 관내전출.map(t => `${t.teacher_name}(${t.assigned_school_name})`).join(' ');
  const 관내전출수 = 관내전출.filter(t => !t.note?.includes('휴직') && !t.note?.includes('파견')).length;

  const 관외전출 = externalOut.filter(t => t.school_name === schoolName);
  const 관외전출명단 = 관외전출.map(t => `${t.teacher_name}(${t.destination})`).join(' ');
  const 관외전출수 = 관외전출.filter(t => !t.separate_quota).length;

  const 관내전입 = internalTransfers.filter(t => t.assigned_school_name === schoolName);
  const 관내전입명단 = 관내전입.map(t => `${t.teacher_name}(${t.current_school_name})`).join(' ');
  const 관내전입수 = 관내전입.filter(t => !t.note?.includes('휴직') && !t.note?.includes('파견')).length;

  const 관외전입 = externalIn.filter(t => t.assigned_school_name === schoolName);
  const 관외전입명단 = 관외전입.map(t => `${t.teacher_name}(${t.origin_school})`).join(' ');
  const 관외전입수 = 관외전입.filter(t => !t.separate_quota).length;

  // 데이터 채우기
  worksheet.getCell('B3').value = schoolName;
  worksheet.getCell('B7').value = getOfficialSchoolName(schoolName);

  worksheet.getCell('B10').value = schoolData?.quota || 0;
  worksheet.getCell('C10').value = schoolData?.current_count || 0;
  worksheet.getCell('D10').value = 0;
  worksheet.getCell('E10').value = 0;
  worksheet.getCell('F10').value = 관내전출수 + 관외전출수;
  worksheet.getCell('G10').value = 관내전입수 + 관외전입수;
  worksheet.getCell('H10').value = schoolData?.shortage || 0;

  worksheet.getCell('D13').value = '';
  worksheet.getCell('H13').value = 0;
  worksheet.getCell('D14').value = '';
  worksheet.getCell('H14').value = 0;
  worksheet.getCell('D15').value = 관내전출명단;
  worksheet.getCell('H15').value = 관내전출수 || '';
  worksheet.getCell('D16').value = 관외전출명단;
  worksheet.getCell('H16').value = 관외전출수 || '';
  worksheet.getCell('D17').value = 관내전입명단;
  worksheet.getCell('H17').value = 관내전입수 || '';
  worksheet.getCell('D18').value = 관외전입명단;
  worksheet.getCell('H18').value = 관외전입수 || '';

  await downloadWorkbook(workbook, `학교별현황_${schoolName}_${settings.transfer_year || '2025'}.xlsx`);
}

// =====================================================
// 7-2. 학교별현황 전체 출력 - 원본 템플릿 기반
// =====================================================
export async function exportAllSchoolStatus(
  shortages: SchoolShortage[],
  internalTransfers: InternalTransfer[],
  externalOut: ExternalOut[],
  externalIn: ExternalIn[],
  settings: Record<string, string>
) {
  const templateResponse = await fetch('/templates/school_status_template.xlsx');
  const templateBuffer = await templateResponse.arrayBuffer();

  const workbook = new ExcelJS.Workbook();

  for (const school of shortages) {
    const templateWorkbook = new ExcelJS.Workbook();
    await templateWorkbook.xlsx.load(templateBuffer);
    const templateSheet = templateWorkbook.getWorksheet('학교별현황');
    if (!templateSheet) continue;

    const sheetName = school.name.substring(0, 31);
    const ws = workbook.addWorksheet(sheetName);

    // 열 너비 복사
    templateSheet.columns.forEach((col, i) => {
      if (col.width) ws.getColumn(i + 1).width = col.width;
    });

    // 행/셀 복사
    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > 20) return;
      const newRow = ws.getRow(rowNumber);
      newRow.height = row.height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        newCell.value = cell.value;
        newCell.style = JSON.parse(JSON.stringify(cell.style));
      });
    });

    // 병합 셀 복사
    templateSheet.model.merges?.forEach((merge: string) => {
      try { ws.mergeCells(merge); } catch { /* ignore */ }
    });

    // 데이터 계산
    const 관내전출 = internalTransfers.filter(t => t.current_school_name === school.name && t.assigned_school_id);
    const 관내전출명단 = 관내전출.map(t => `${t.teacher_name}(${t.assigned_school_name})`).join(' ');
    const 관내전출수 = 관내전출.filter(t => !t.note?.includes('휴직') && !t.note?.includes('파견')).length;

    const 관외전출 = externalOut.filter(t => t.school_name === school.name);
    const 관외전출명단 = 관외전출.map(t => `${t.teacher_name}(${t.destination})`).join(' ');
    const 관외전출수 = 관외전출.filter(t => !t.separate_quota).length;

    const 관내전입 = internalTransfers.filter(t => t.assigned_school_name === school.name);
    const 관내전입명단 = 관내전입.map(t => `${t.teacher_name}(${t.current_school_name})`).join(' ');
    const 관내전입수 = 관내전입.filter(t => !t.note?.includes('휴직') && !t.note?.includes('파견')).length;

    const 관외전입 = externalIn.filter(t => t.assigned_school_name === school.name);
    const 관외전입명단 = 관외전입.map(t => `${t.teacher_name}(${t.origin_school})`).join(' ');
    const 관외전입수 = 관외전입.filter(t => !t.separate_quota).length;

    // 데이터 채우기
    ws.getCell('B3').value = school.name;
    ws.getCell('B7').value = getOfficialSchoolName(school.name);
    ws.getCell('B10').value = school.quota || 0;
    ws.getCell('C10').value = school.current_count || 0;
    ws.getCell('D10').value = 0;
    ws.getCell('E10').value = 0;
    ws.getCell('F10').value = 관내전출수 + 관외전출수;
    ws.getCell('G10').value = 관내전입수 + 관외전입수;
    ws.getCell('H10').value = school.shortage || 0;
    ws.getCell('D13').value = '';
    ws.getCell('H13').value = 0;
    ws.getCell('D14').value = '';
    ws.getCell('H14').value = 0;
    ws.getCell('D15').value = 관내전출명단;
    ws.getCell('H15').value = 관내전출수 || '';
    ws.getCell('D16').value = 관외전출명단;
    ws.getCell('H16').value = 관외전출수 || '';
    ws.getCell('D17').value = 관내전입명단;
    ws.getCell('H17').value = 관내전입수 || '';
    ws.getCell('D18').value = 관외전입명단;
    ws.getCell('H18').value = 관외전입수 || '';
  }

  await downloadWorkbook(workbook, `학교별현황_전체_${settings.transfer_year || '2025'}.xlsx`);
}

// =====================================================
// 통지서 일괄 출력 (Excel)
// =====================================================
export async function exportAllTransferNotices(
  transfers: InternalTransfer[],
  settings: Record<string, string>
) {
  const assignedTransfers = transfers.filter(t => t.assigned_school_id);
  if (assignedTransfers.length === 0) {
    alert('배치된 교사가 없습니다.');
    return;
  }

  const templateResponse = await fetch('/templates/notice_template.xlsx');
  const templateBuffer = await templateResponse.arrayBuffer();
  const appointmentDate = settings.appointment_date || '2025년 3월 1일';

  const workbook = new ExcelJS.Workbook();

  for (const transfer of assignedTransfers) {
    const templateWorkbook = new ExcelJS.Workbook();
    await templateWorkbook.xlsx.load(templateBuffer);
    const templateSheet = templateWorkbook.getWorksheet('통지서');
    if (!templateSheet) continue;

    const sheetName = transfer.teacher_name.substring(0, 31);
    const ws = workbook.addWorksheet(sheetName);

    // 열 너비 복사
    templateSheet.columns.forEach((col, i) => {
      if (col.width) ws.getColumn(i + 1).width = col.width;
    });

    // 행/셀 복사
    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = ws.getRow(rowNumber);
      newRow.height = row.height;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        newCell.value = cell.value;
        newCell.style = JSON.parse(JSON.stringify(cell.style));
      });
    });

    // 병합 셀 복사
    templateSheet.model.merges?.forEach((merge: string) => {
      try { ws.mergeCells(merge); } catch { /* ignore */ }
    });

    // 데이터 채우기
    ws.getCell('D4').value = getOfficialSchoolName(transfer.current_school_name || '');
    ws.getCell('E5').value = '교사';
    ws.getCell('G5').value = transfer.teacher_name;
    ws.getCell('C9').value = `${getOfficialSchoolName(transfer.assigned_school_name || '')} 근무를 명함.`;
    ws.getCell('B11').value = appointmentDate;
  }

  await downloadWorkbook(workbook, `통지서_전체_${settings.transfer_year || '2025'}.xlsx`);
}

// =====================================================
// 8. 통계표 - 원본 스크린샷과 동일한 단순 구조
// =====================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportStatistics(
  statistics: any[],
  totals: any
) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('통계표');

  // 열 너비 설정
  const colWidths = [4, 6, 6, 5, 5, 6, 5, 5, 5, 5, 5, 6, 5, 6, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 4, 4, 5, 5];
  colWidths.forEach((w, i) => ws.getColumn(i + 1).width = w);

  // 테두리 스타일
  const border = { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } };

  // 1행 - 제목
  ws.mergeCells('A1:AE1');
  ws.getCell('A1').value = '관내 전보 현황 통계표';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  // 3행 - 대분류 헤더
  ws.getCell('A3').value = '학교\n코드'; ws.mergeCells('A3:A4');
  ws.getCell('B3').value = '학교명'; ws.mergeCells('B3:B4');
  ws.getCell('C3').value = '현원'; ws.mergeCells('C3:C4');
  ws.getCell('D3').value = '정원'; ws.mergeCells('D3:D4');
  ws.getCell('E3').value = '과부족'; ws.mergeCells('E3:E4');
  ws.getCell('F3').value = '결원'; ws.mergeCells('F3:N3');
  ws.getCell('O3').value = '충원'; ws.mergeCells('O3:Q3');
  ws.getCell('R3').value = '전출'; ws.mergeCells('R3:U3');
  ws.getCell('V3').value = '전입'; ws.mergeCells('V3:Z3');
  ws.getCell('AA3').value = '현재\n과부족'; ws.mergeCells('AA3:AA4');
  ws.getCell('AB3').value = '남여성비'; ws.mergeCells('AB3:AE3');

  // 4행 - 세부 항목 헤더
  const headers4 = ['', '', '', '', '', '정퇴', '명퇴', '면직', '승진', '전직', '타시도\n복귀', '기타', '별도\n정원', '계', '별도정원\n해제', '기타', '계', '타시도', '타시군', '관내', '계', '관내', '타시군', '타시도', '신규', '계', '', '남', '여', '남%', '여%'];
  headers4.forEach((h, i) => { if (h && i >= 5) ws.getCell(4, i + 1).value = h; });

  // 헤더 스타일 (3-4행)
  for (let r = 3; r <= 4; r++) {
    for (let c = 1; c <= 31; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = border;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    }
  }
  // 결원 색상 (노랑)
  for (let c = 6; c <= 14; c++) { ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; ws.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; }
  // 충원 색상 (초록)
  for (let c = 15; c <= 17; c++) { ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; ws.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; }
  // 전출 색상 (빨강)
  for (let c = 18; c <= 21; c++) { ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CCCC' } }; ws.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CCCC' } }; }
  // 전입 색상 (파랑)
  for (let c = 22; c <= 26; c++) { ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCFE2F3' } }; ws.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCFE2F3' } }; }
  // 현재과부족 색상 (회색)
  ws.getCell(3, 27).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; ws.getCell(4, 27).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  // 남여성비 색상 (주황)
  for (let c = 28; c <= 31; c++) { ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE5CD' } }; ws.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE5CD' } }; }

  ws.getRow(3).height = 30;
  ws.getRow(4).height = 30;

  // 데이터 입력 함수
  const v = (val: number | undefined) => (val === 0 || val === undefined) ? 0 : val;
  const writeRow = (rowNum: number, data: any, isTotalRow = false) => {
    const row = ws.getRow(rowNum);
    const values = [
      isTotalRow ? '계' : data.code,
      isTotalRow ? statistics.length : data.name,
      v(data.currentCount), v(data.quota), v(data.shortage),
      v(data.vacRetire), v(data.vacEarly), v(data.vacDismiss), v(data.vacPromote), v(data.vacTransfer), v(data.vacReturn), v(data.vacOther), v(data.vacSep), v(data.vacTotal),
      v(data.supRelease), v(data.supOther), v(data.supTotal),
      v(data.outCity), v(data.outDistrict), v(data.outInternal), v(data.outTotal),
      v(data.inInternal), v(data.inDistrict), v(data.inCity), v(data.inNew), v(data.inTotal),
      v(data.currentShortage),
      v(data.male), v(data.female), v(data.maleRatio), v(data.femaleRatio)
    ];
    values.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.font = { size: 9, bold: isTotalRow };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = border;
      if (isTotalRow) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
    });
  };

  // 5행 - 합계
  writeRow(5, totals, true);

  // 6행부터 - 학교별 데이터
  statistics.forEach((stat: any, i: number) => writeRow(6 + i, stat));

  const year = new Date().getFullYear();
  await downloadWorkbook(workbook, `통계표_${year}.xlsx`);
}

// =====================================================
// 자료 입력 템플릿 다운로드 (원본 엑셀에서 추출한 템플릿 사용)
// =====================================================
export async function downloadDataTemplate() {
  // 원본에서 추출한 템플릿 파일 로드
  const workbook = await loadTemplate('/templates/data_entry_template.xlsx');

  // 기존 데이터 삭제 (순번과 수식 열은 유지)
  const clearSheetData = (sheetName: string, dataStartRow: number, cols: string[]) => {
    const ws = workbook.getWorksheet(sheetName);
    if (!ws) return;

    for (let row = dataStartRow; row <= 200; row++) {
      cols.forEach(col => {
        const cell = ws.getCell(`${col}${row}`);
        const hasFormula = cell.formula ||
          (cell.value && typeof cell.value === 'object' && 'formula' in cell.value);
        if (!hasFormula) {
          cell.value = null;
        }
      });
    }
  };

  // 1정현원 시트: 5행부터
  clearSheetData('1정현원', 5, ['C', 'D', 'E', 'G']);

  // 2결원 시트: 3행부터
  clearSheetData('2결원', 3, ['B', 'C', 'D', 'E', 'F', 'G']);

  // 3충원 시트: 3행부터
  clearSheetData('3충원', 3, ['B', 'C', 'D', 'E', 'F', 'G']);

  // 4관외전출 시트: 3행부터
  clearSheetData('4관외전출', 3, ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);

  // 현임교 열에 드롭다운 추가 + 순번 설정
  const sheetsWithDropdown = ['2결원', '3충원', '4관외전출'];
  for (const sheetName of sheetsWithDropdown) {
    const ws = workbook.getWorksheet(sheetName);
    if (!ws) continue;

    // A열 너비 설정
    ws.getColumn('A').width = 6;

    for (let row = 3; row <= 102; row++) {
      // A열: 순번 명시적으로 재설정
      ws.getCell(`A${row}`).value = row - 2;

      // C열: 현임교 드롭다운
      ws.getCell(`C${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ["OFFSET('1정현원'!$C$5,0,0,COUNTA('1정현원'!$C$5:$C$104),1)"],
      };
    }
  }

  await downloadWorkbook(workbook, '자료입력_템플릿.xlsx');
}

// 템플릿 파싱 결과 타입
export interface TemplateParseResult {
  schools: { code: number; name: string; maleCount: number; femaleCount: number; quota: number }[];
  vacancies: { type: string; school: string; name: string; gender: string; birth: string; note: string }[];
  supplements: { type: string; school: string; name: string; gender: string; birth: string; note: string }[];
  externalOuts: { type: string; school: string; name: string; gender: string; birth: string; destination: string; separate: string; note: string }[];
}

// 템플릿 파싱 (원본 엑셀과 동일한 구조)
export async function parseDataTemplate(file: File): Promise<TemplateParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const result: TemplateParseResult = {
    schools: [],
    vacancies: [],
    supplements: [],
    externalOuts: [],
  };

  // 1정현원 시트 파싱 (5행부터 데이터, B:코드, C:학교명, D:남, E:여, G:정원)
  const wsSchool = workbook.getWorksheet('1정현원') || workbook.getWorksheet('학교관리');
  if (wsSchool) {
    wsSchool.eachRow((row, rowNum) => {
      if (rowNum <= 4) return; // 헤더(1-4행) 스킵
      const code = row.getCell(2).value; // B열: 학교코드
      const name = row.getCell(3).value?.toString().trim(); // C열: 학교명
      const maleCount = row.getCell(4).value; // D열: 현원 남
      const femaleCount = row.getCell(5).value; // E열: 현원 여
      const quota = row.getCell(7).value; // G열: 정원
      if (name && name !== '(학교명 입력)') {
        result.schools.push({
          code: typeof code === 'number' ? code : parseInt(code?.toString() || '0') || rowNum - 4,
          name,
          maleCount: typeof maleCount === 'number' ? maleCount : parseInt(maleCount?.toString() || '0') || 0,
          femaleCount: typeof femaleCount === 'number' ? femaleCount : parseInt(femaleCount?.toString() || '0') || 0,
          quota: typeof quota === 'number' ? quota : parseInt(quota?.toString() || '0') || 0,
        });
      }
    });
  }

  // 2결원 시트 파싱 (3행부터 데이터)
  const wsVacancy = workbook.getWorksheet('2결원') || workbook.getWorksheet('결원');
  if (wsVacancy) {
    wsVacancy.eachRow((row, rowNum) => {
      if (rowNum <= 2) return; // 제목(1행), 헤더(2행) 스킵
      const type = row.getCell(2).value?.toString().trim(); // B열: 구분
      const school = row.getCell(3).value?.toString().trim(); // C열: 현임교
      const name = row.getCell(4).value?.toString().trim(); // D열: 성명
      if (type && school && name) {
        result.vacancies.push({
          type,
          school,
          name,
          gender: row.getCell(5).value?.toString().trim() || '', // E열
          birth: row.getCell(6).value?.toString().trim() || '', // F열
          note: row.getCell(7).value?.toString().trim() || '', // G열
        });
      }
    });
  }

  // 3충원 시트 파싱 (3행부터 데이터)
  const wsSupplement = workbook.getWorksheet('3충원') || workbook.getWorksheet('충원');
  if (wsSupplement) {
    wsSupplement.eachRow((row, rowNum) => {
      if (rowNum <= 2) return;
      const type = row.getCell(2).value?.toString().trim();
      const school = row.getCell(3).value?.toString().trim();
      const name = row.getCell(4).value?.toString().trim();
      if (type && school && name) {
        result.supplements.push({
          type,
          school,
          name,
          gender: row.getCell(5).value?.toString().trim() || '',
          birth: row.getCell(6).value?.toString().trim() || '',
          note: row.getCell(7).value?.toString().trim() || '',
        });
      }
    });
  }

  // 4관외전출 시트 파싱 (3행부터 데이터)
  const wsExternalOut = workbook.getWorksheet('4관외전출') || workbook.getWorksheet('관외전출');
  if (wsExternalOut) {
    wsExternalOut.eachRow((row, rowNum) => {
      if (rowNum <= 2) return;
      const type = row.getCell(2).value?.toString().trim(); // B열: 구분
      const school = row.getCell(3).value?.toString().trim(); // C열: 현임교
      const name = row.getCell(4).value?.toString().trim(); // D열: 성명
      if (type && school && name) {
        result.externalOuts.push({
          type,
          school,
          name,
          gender: row.getCell(5).value?.toString().trim() || '', // E열
          birth: row.getCell(6).value?.toString().trim() || '', // F열
          destination: row.getCell(7).value?.toString().trim() || '', // G열
          separate: row.getCell(8).value?.toString().trim() || '', // H열
          note: row.getCell(9).value?.toString().trim() || '', // I열
        });
      }
    });
  }

  return result;
}

// =====================================================
// 입력자료 다운로드 (템플릿에 데이터 채워서 다운로드)
// =====================================================
export async function downloadDataWithTemplate(
  schools: any[],
  vacancies: any[],
  supplements: any[],
  externalOuts: any[]
) {
  // 원본 템플릿 파일 로드
  const workbook = await loadTemplate('/templates/data_entry_template.xlsx');

  // 1정현원 시트: 5행부터, B:코드, C:학교명, D:남, E:여, G:정원
  const wsSchool = workbook.getWorksheet('1정현원');
  if (wsSchool) {
    // 정렬
    const sortedSchools = [...schools].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    sortedSchools.forEach((s, i) => {
      const row = i + 5; // 5행부터
      wsSchool.getCell(`B${row}`).value = s.display_order || s.id;
      wsSchool.getCell(`C${row}`).value = s.name;
      wsSchool.getCell(`D${row}`).value = s.male_count || 0;
      wsSchool.getCell(`E${row}`).value = s.female_count || 0;
      wsSchool.getCell(`G${row}`).value = s.quota || 0;
    });
  }

  // 2결원 시트: 3행부터, A:순, B:구분, C:현임교, D:성명, E:성별, F:생년월일, G:비고
  const wsVacancy = workbook.getWorksheet('2결원');
  if (wsVacancy) {
    vacancies.forEach((v, i) => {
      const row = i + 3;
      wsVacancy.getCell(`A${row}`).value = i + 1;
      wsVacancy.getCell(`B${row}`).value = v.type_name || v.type_code || '';
      wsVacancy.getCell(`C${row}`).value = v.school_name || '';
      wsVacancy.getCell(`D${row}`).value = v.teacher_name || '';
      wsVacancy.getCell(`E${row}`).value = v.gender || '';
      wsVacancy.getCell(`F${row}`).value = v.birth_date || '';
      wsVacancy.getCell(`G${row}`).value = v.note || '';
    });
  }

  // 3충원 시트: 3행부터, A:순, B:구분, C:현임교, D:성명, E:성별, F:생년월일, G:비고
  const wsSupplement = workbook.getWorksheet('3충원');
  if (wsSupplement) {
    supplements.forEach((s, i) => {
      const row = i + 3;
      wsSupplement.getCell(`A${row}`).value = i + 1;
      wsSupplement.getCell(`B${row}`).value = s.type_name || s.type_code || '';
      wsSupplement.getCell(`C${row}`).value = s.school_name || '';
      wsSupplement.getCell(`D${row}`).value = s.teacher_name || '';
      wsSupplement.getCell(`E${row}`).value = s.gender || '';
      wsSupplement.getCell(`F${row}`).value = s.birth_date || '';
      wsSupplement.getCell(`G${row}`).value = s.note || '';
    });
  }

  // 4관외전출 시트: 3행부터, A:순, B:구분, C:현임교, D:성명, E:성별, F:생년월일, G:전출지, H:별도정원, I:비고
  const wsExternalOut = workbook.getWorksheet('4관외전출');
  if (wsExternalOut) {
    externalOuts.forEach((e, i) => {
      const row = i + 3;
      wsExternalOut.getCell(`A${row}`).value = i + 1;
      wsExternalOut.getCell(`B${row}`).value = e.transfer_type || '';
      wsExternalOut.getCell(`C${row}`).value = e.school_name || '';
      wsExternalOut.getCell(`D${row}`).value = e.teacher_name || '';
      wsExternalOut.getCell(`E${row}`).value = e.gender || '';
      wsExternalOut.getCell(`F${row}`).value = e.birth_date || '';
      wsExternalOut.getCell(`G${row}`).value = e.destination || '';
      wsExternalOut.getCell(`H${row}`).value = e.separate_quota || '';
      wsExternalOut.getCell(`I${row}`).value = e.note || '';
    });
  }

  await downloadWorkbook(workbook, `자료입력_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`);
}
