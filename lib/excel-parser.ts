import * as XLSX from 'xlsx';
import { Expense } from '@/types';

// --- HELPERS ---

const parseAmount = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Handle formats like "222,400", "- 0", " | ", or empty strings
    const clean = val.replace(/[^0-9.-]+/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export interface ParsedData {
  expenses: Partial<Expense>[];
  errors: string[];
}

// --- MAIN PARSER ---

export async function parseExcelFile(buffer: ArrayBuffer): Promise<ParsedData> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const expenses: Partial<Expense>[] = [];
  const errors: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    // FIX: Changed from < 5 to < 2 to allow smaller files like Rent Premises
    if (jsonData.length < 2) {
        console.log(`⚠️ Skipping sheet "${sheetName}" - too few rows.`);
        return;
    }

    // Check if this sheet contains SCA data by looking for project titles
    let hasSCAData = false;
    for (let i = 0; i < Math.min(20, jsonData.length); i++) {
        if (!jsonData[i] || !jsonData[i][0]) continue;
        const cellValue = jsonData[i][0].toString().toLowerCase();
        if (cellValue.includes('sub consultancy agreement') || 
            cellValue.includes('sub conssultancy agreement')) { // Handle typo
            hasSCAData = true;
            break;
        }
    }

    if (hasSCAData) {
        console.log(`📄 Parsing Sheet "${sheetName}" as MULTI-PROJECT SCA DETAILS`);
        parseMultiProjectSCASheet(jsonData, sheetName, expenses);
    } else {
        // Fallback to existing logic for other sheets (Salaries, Standard, etc.)
        const firstRowStr = JSON.stringify(jsonData[0]).toLowerCase();
        const hasMonthHeaders = jsonData[0].some((cell: any) => {
            if (typeof cell === 'string') return cell.match(/^[A-Za-z]{3}[-\s]\d{2}$/i);
            if (typeof cell === 'number' && cell > 45000 && cell < 47000) return true;
            return false;
        });
        const hasUserName = firstRowStr.includes('user name');
        
        if (hasMonthHeaders || hasUserName) {
            console.log(`📄 Parsing Sheet "${sheetName}" as SALARIES`);
            parseSalariesSheet(jsonData, sheetName, expenses);
        } else if (firstRowStr.includes('date') && (firstRowStr.includes('amount') || firstRowStr.includes('total'))) {
             console.log(`📄 Parsing Sheet "${sheetName}" as STANDARD TRANSACTION`);
             parseTransactionSheet(jsonData, sheetName, expenses);
        } else {
             console.log(`ℹ️ Skipping sheet "${sheetName}" - unrecognized format.`);
        }
    }
  });

  console.log(`✅ Total Expenses Parsed: ${expenses.length}`);
  return { expenses, errors };
}

// NEW FUNCTION: Parse Multi-Project SCA Sheet - ROBUST HEADER DETECTION
function parseMultiProjectSCASheet(sheetData: any[][], sheetName: string, expenses: Partial<Expense>[]) {
    let currentProject = '';
    let headerRowIndex = -1;

    // Iterate through all rows to find project titles and headers
    for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row || !row[0]) continue;

        const firstCell = row[0].toString().trim().toLowerCase();

        // Detect Project Title Row
        if (firstCell.includes('sub consultancy agreement') || 
            firstCell.includes('sub conssultancy agreement')) {
            
            // Set current project name
            if (firstCell.includes('jinnah') || firstCell.includes('jiap')) {
                currentProject = 'JIAP';
            } else if (firstCell.includes('atc') || firstCell.includes('tower')) {
                currentProject = 'ATC Tower & Fire Station';
            } else {
                currentProject = firstCell; // Fallback
            }
            console.log(`✅ Found Project: ${currentProject} at row ${i}`);
            
            // Look for headers in next 10 rows (increased from 5)
            headerRowIndex = -1;
            for (let j = i + 1; j < Math.min(i + 11, sheetData.length); j++) {
                if (sheetData[j] && sheetData[j][0] && sheetData[j][0].toString().toLowerCase().includes('ser')) {
                    headerRowIndex = j;
                    console.log(`✅ Found Headers for ${currentProject} at row ${j}`);
                    break;
                }
            }
            
            // Fallback: If still not found, assume headers are 2 rows after title
            if (headerRowIndex === -1) {
                const fallbackHeaderRow = i + 2;
                if (fallbackHeaderRow < sheetData.length && sheetData[fallbackHeaderRow] && sheetData[fallbackHeaderRow][0]) {
                    headerRowIndex = fallbackHeaderRow;
                    console.log(`⚠️ Using fallback headers for ${currentProject} at row ${fallbackHeaderRow}`);
                }
            }
            
            if (headerRowIndex === -1) {
                console.warn(`❌ No headers found for project ${currentProject}. Skipping.`);
                continue;
            }

            // Parse data for this project block
            parseSCABlock(sheetData, headerRowIndex, currentProject, expenses, headerRowIndex + 1);
            
            // Reset for next project
            headerRowIndex = -1;
        }
    }
}

// Helper: Parse one SCA block with explicit start row
function parseSCABlock(sheetData: any[][], headerRowIndex: number, projectName: string, expenses: Partial<Expense>[], startDataRow: number) {
    const headers = sheetData[headerRowIndex].map((h: any) => h?.toString().toLowerCase().trim());
    
    console.log(`Headers for ${projectName}:`, headers); // Debug log

    // Map Column Indices with ULTRA ROBUST Matching
    const companyIdx = headers.findIndex(h => h && h.includes('company'));
    const descIdx = headers.findIndex(h => h && h.includes('description'));
    const exclusiveIdx = headers.findIndex(h => h && (h.includes('exclsve') || h.includes('exclusive')));
    const taxIdx = headers.findIndex(h => h && (h.includes('tax 15%') || h.includes('add tax')));
    const grossIdx = headers.findIndex(h => h && (h.includes('gross amount') || h.includes('total gross')));
    const totalPaidIdx = headers.findIndex(h => h && (h.includes('total invoices paid') || h.includes('paid till yet')));
    const balanceIdx = headers.findIndex(h => h && (h.includes('remain balance') || h.includes('balance amount')));
    const commentsIdx = headers.findIndex(h => h && (h.includes('coments') || h.includes('comments')));

    // Dynamically find ALL "Inv" columns
    const invIndices: number[] = [];
    headers.forEach((h, index) => {
        if (h && h.trim().match(/^inv\s*\d*$/)) {
            invIndices.push(index);
        }
    });

    console.log(`Parsing SCA Block for ${projectName}. Inv Columns: ${invIndices.length}`);
    console.log(`Column Indices -> Company:${companyIdx}, Desc:${descIdx}, Gross:${grossIdx}, Paid:${totalPaidIdx}, Bal:${balanceIdx}`);

    // If Company column not found, use index 1 as fallback
    const finalCompanyIdx = companyIdx !== -1 ? companyIdx : 1;

    // Start from specified data row
    for (let i = startDataRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        
        // Stop if we hit Grand Total or another project title
        if (row && row[0]) {
            const firstCell = row[0].toString().toLowerCase();
            if (firstCell.includes('grand total') || 
                firstCell.includes('sub consultancy') || 
                firstCell.includes('total sca paid')) {
                break;
            }
        }

        if (!row || !row[finalCompanyIdx]) continue;
        
        const companyName = row[finalCompanyIdx]?.toString().trim();
        if (!companyName || companyName.toLowerCase() === 'ser') continue;

        const description = descIdx !== -1 && row[descIdx] ? row[descIdx].toString().trim() : '';
        const exclusiveAmt = exclusiveIdx !== -1 ? parseAmount(row[exclusiveIdx]) : 0;
        const taxAmt = taxIdx !== -1 ? parseAmount(row[taxIdx]) : 0;
        const grossAmt = grossIdx !== -1 ? parseAmount(row[grossIdx]) : 0;
        
        let calculatedInvSum = 0;
        const invValues: number[] = [];
        invIndices.forEach(idx => {
            const val = parseAmount(row[idx]);
            calculatedInvSum += val;
            invValues.push(val);
        });

        const totalPaidFromCol = totalPaidIdx !== -1 ? parseAmount(row[totalPaidIdx]) : calculatedInvSum;
        const balance = balanceIdx !== -1 ? parseAmount(row[balanceIdx]) : (grossAmt - totalPaidFromCol);
        const comments = commentsIdx !== -1 && row[commentsIdx] ? row[commentsIdx].toString().trim() : '';

        // Construct metadata string to store in Description FOR PARSING LATER
        const paymentMeta = `EXCL:${exclusiveAmt}|TAX:${taxAmt}|PAID:${totalPaidFromCol}|BAL:${balance}|INVS:[${invValues.join(',')}]|NOTE:${comments}`;
        const fullDescription = `${description} [${paymentMeta}]`.trim();

        expenses.push({
            date: new Date().toISOString().split('T')[0],
            project_id: projectName,
            category: companyName,
            sub_category: 'SCA',
            description: fullDescription,
            amount: grossAmt,
            payment_mode: 'Bank' // CHANGED FROM 'SCA Contract' TO 'Bank' TO MATCH DB CONSTRAINT
        });
    }
}

// 2. Parse Salaries Sheet (Wide Format) - DYNAMIC COLUMN DETECTION
function parseSalariesSheet(sheetData: any[][], sheetName: string, expenses: Partial<Expense>[]) {
    const headerRowIndex = 0;
    const headerRow = sheetData[headerRowIndex]; 
    
    // Dynamically find column indices based on header names
    let userNameIdx = -1;
    let fullNameIdx = -1;
    let positionIdx = -1;
    let projectIdx = -1;
    let joiningDateIdx = -1;
    
    headerRow.forEach((cell: any, idx: number) => {
        if (typeof cell !== 'string') return;
        const lowerCell = cell.toLowerCase().trim();
        
        if (lowerCell.includes('user name') || lowerCell === 'emp id' || lowerCell === 'employee id') {
            userNameIdx = idx;
        } else if (lowerCell.includes('full name') || lowerCell.includes('name')) {
            fullNameIdx = idx;
        } else if (lowerCell.includes('position') || lowerCell.includes('designation')) {
            positionIdx = idx;
        } else if (lowerCell.includes('project')) {
            projectIdx = idx;
        } else if (lowerCell.includes('joining date') || lowerCell.includes('join date')) {
            joiningDateIdx = idx;
        }
    });

    console.log(`Salaries Columns Detected -> User:${userNameIdx}, Full:${fullNameIdx}, Pos:${positionIdx}, Proj:${projectIdx}, Join:${joiningDateIdx}`);

    // Find Month Columns (Dec-24, Jan-25, etc. or numeric dates)
    const monthIndices: { index: number, month: string, year: string }[] = [];
    headerRow.forEach((cell: any, idx: number) => {
        if (typeof cell === 'string') {
            const cleanCell = cell.trim();
            const match = cleanCell.match(/^([A-Za-z]{3})[-\s](\d{2})$/i);
            if (match) {
                const mon = match[1].charAt(0).toUpperCase() + match[1].slice(1, 3).toLowerCase();
                monthIndices.push({ index: idx, month: mon, year: `20${match[2]}` });
            }
        } else if (typeof cell === 'number' && cell > 45000 && cell < 47000) {
            const date = new Date(Math.round((cell - 25569) * 86400 * 1000));
            const mon = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear().toString();
            monthIndices.push({ index: idx, month: mon, year: year });
        }
    });

    if (monthIndices.length === 0) {
        console.warn("No month columns found in salaries sheet.");
        return;
    }

    // Start from row 1 (skip header)
    for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row) continue;
        
        // Use dynamic indices, fallback to adjacent cells if needed
        const userName = userNameIdx !== -1 ? row[userNameIdx] : (fullNameIdx !== -1 ? row[fullNameIdx] : '');
        const fullName = fullNameIdx !== -1 ? row[fullNameIdx] : (userNameIdx !== -1 ? row[userNameIdx] : '');
        const position = positionIdx !== -1 ? row[positionIdx] : '';
        const projectRaw = projectIdx !== -1 ? row[projectIdx] : (sheetName.includes('JIAP') ? 'JIAP' : 'ATC');
        
        // Skip empty rows
        if (!fullName && !userName) continue;

        const projectName = projectRaw ? projectRaw.toString().trim() : 'Unknown Project';

        monthIndices.forEach(({ index, month, year }) => {
            const amount = parseAmount(row[index]);
            if (amount > 0) {
                const dateStr = `${year}-${getMonthNumber(month)}-01`;
                
                expenses.push({
                    date: dateStr,
                    category: 'Payroll Salaries',
                    sub_category: 'Salary',
                    description: `Salary for ${fullName || userName} (${month} ${year})`,
                    amount: amount,
                    project_id: projectName,
                    payment_mode: 'Bank',
                    // Store extra details for preview only (not saved to DB unless columns exist)
                    user_name: userName || 'N/A',
                    full_name: fullName || 'N/A',
                    position: position || 'N/A'
                });
            }
        });
    }
}

// 3. Parse Standard Transaction Sheets (Rent, etc.) - ULTRA ROBUST VERSION
function parseTransactionSheet(sheetData: any[][], sheetName: string, expenses: Partial<Expense>[]) {
    let headerRowIndex = 0; // Default to 0 if not found
    
    // Look for headers in first 5 rows
    for(let i=0; i<5; i++) {
        if (!sheetData[i]) continue;
        const rowStr = JSON.stringify(sheetData[i]).toLowerCase();
        
        // Flexible check: must have something like 'date' AND something like 'amount'
        if ((rowStr.includes('date')) && 
            (rowStr.includes('amount') || rowStr.includes('total') || rowStr.includes('debit'))) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = sheetData[headerRowIndex].map((h: any) => h?.toString().toLowerCase().trim());
    console.log("🔍 Standard Headers Detected:", headers); // Debug log
    
    // Flexible Index Finding with Fallbacks
    // Try to find Date column
    let dateIdx = headers.findIndex(h => h && (h.includes('date')));
    
    // Try to find Amount column
    let amtIdx = headers.findIndex(h => h && (h.includes('amount') || h.includes('total') || h.includes('debit') || h.includes('payment')));
    
    // Try to find Project Column (Handle "Project Name" or "Project")
    let projIdx = headers.findIndex(h => h && (h.includes('project') || h.includes('project name')));

    // Try to find Category/Description
    let catIdx = headers.findIndex(h => h && (h.includes('category') || h.includes('particulars') || h.includes('account')));
    let descIdx = headers.findIndex(h => h && (h.includes('description') || h.includes('narration') || h.includes('remarks') || h.includes('particulars')));

    // Fallbacks if critical columns are missing
    if (dateIdx === -1) {
        // Assume first column is date if it looks like one
        if(sheetData[headerRowIndex+1] && !isNaN(Date.parse(sheetData[headerRowIndex+1][0]))) {
             dateIdx = 0;
        } else {
             console.error(`❌ Missing Date column in sheet "${sheetName}". Headers:`, headers);
             return;
        }
    }
    
    if (amtIdx === -1) {
         console.error(`❌ Missing Amount column in sheet "${sheetName}". Headers:`, headers);
         return;
    }

    for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row[dateIdx]) continue;
        
        const amount = parseAmount(row[amtIdx]);
        if (amount === 0) continue;

        // Determine Project Name
        let projectName = sheetName; // Default to sheet name
        if (projIdx !== -1 && row[projIdx]) {
            projectName = row[projIdx].toString().trim();
        }

        // Handle Category/Description overlap
        let category = 'Other';
        let description = '';
        
        if (catIdx !== -1 && row[catIdx]) {
            category = row[catIdx].toString();
        } else if (descIdx !== -1 && row[descIdx]) {
             category = row[descIdx].toString().substring(0, 30); 
        }

        if (descIdx !== -1 && row[descIdx]) {
            description = row[descIdx].toString();
        } else if (catIdx !== -1 && row[catIdx]) {
             description = row[catIdx].toString();
        }

        expenses.push({
            date: parseDateSimple(row[dateIdx]),
            category: category,
            sub_category: '',
            description: description,
            amount: amount,
            project_id: projectName,
            payment_mode: 'Bank'
        });
    }
}

// 4. Generic Parser (Fallback)
function parseGenericSheet(sheetData: any[][], sheetName: string, expenses: Partial<Expense>[]) {
    let headerRowIndex = -1;
    for(let i=0; i<10; i++) {
        if(!sheetData[i]) continue;
        if(JSON.stringify(sheetData[i]).toLowerCase().includes('date') && JSON.stringify(sheetData[i]).toLowerCase().includes('amount')) {
            headerRowIndex = i;
            break;
        }
    }
    if(headerRowIndex === -1) return;

    const headers = sheetData[headerRowIndex].map((h: any) => h?.toString().toLowerCase().trim());
    const dateIdx = headers.indexOf('date');
    const descIdx = headers.findIndex(h => h && h.includes('description'));
    const amtIdx = headers.indexOf('amount');
    const projIdx = headers.findIndex(h => h && h.includes('project'));
    const catIdx = headers.findIndex(h => h && h.includes('category'));

    if (dateIdx === -1 || amtIdx === -1) return;

    for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        if(!row[dateIdx]) continue;
        const amount = parseAmount(row[amtIdx]);
        if(amount <= 0) continue;

        let projectName = sheetName;
        if (projIdx !== -1 && row[projIdx]) {
             projectName = row[projIdx].toString().trim();
        }

        expenses.push({
            date: parseDateSimple(row[dateIdx]),
            category: catIdx !== -1 ? row[catIdx] : 'Other Invoices',
            sub_category: '',
            description: row[descIdx !== -1 ? descIdx : 1],
            amount,
            project_id: projectName,
            payment_mode: 'Bank'
        });
    }
}

// Helpers
const getMonthNumber = (mon: string): string => {
    const months: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    return months[mon] || '01';
};

const parseDateSimple = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
    }
    return new Date(val).toISOString().split('T')[0];
};