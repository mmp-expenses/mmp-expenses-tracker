import * as XLSX from 'xlsx';

export interface ParsedCategory {
  name: string;
}

export async function parseCategoryFile(buffer: ArrayBuffer): Promise<{ categories: ParsedCategory[], errors: string[] }> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const categories: ParsedCategory[] = [];
  const errors: string[] = [];

  // Assume first sheet contains categories
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  if (jsonData.length < 2) {
    return { categories: [], errors: ['File is empty or invalid format.'] };
  }

  // Find Header Row (Look for 'Name' or 'Category')
  let headerRowIndex = -1;
  for(let i=0; i<5; i++) {
      const rowStr = JSON.stringify(jsonData[i]).toLowerCase();
      if(rowStr.includes('name') || rowStr.includes('category')) {
          headerRowIndex = i;
          break;
      }
  }

  if (headerRowIndex === -1) {
      // Fallback: Assume first row is header
      headerRowIndex = 0;
  }

  const headers = jsonData[headerRowIndex].map((h: any) => h?.toString().toLowerCase().trim());
  
  // Find column index for Name/Category
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('category'));
  
  if (nameIdx === -1) {
      errors.push("Could not find 'Name' or 'Category' column in Excel.");
      return { categories: [], errors };
  }

  // Parse Rows
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rawName = row[nameIdx];
      
      if (!rawName) continue; // Skip empty rows

      const name = rawName.toString().trim();
      
      if (name) {
          categories.push({ name });
      }
  }

  return { categories, errors };
}