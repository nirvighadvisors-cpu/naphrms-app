const fs = require('fs');
const path = require('path');

const targetFiles = [
  "src/features/timesheet/pages/employee-timesheet-page.tsx",
  "src/features/performance/pages/employee-performance-page.tsx",
  "src/features/performance/pages/admin-performance-page.tsx",
  "src/features/reports/pages/admin-reports-page.tsx",
  "src/features/onboarding/pages/onboarding-page.tsx",
  "src/features/leave/components/leave-request-form.tsx",
  "src/features/expense/pages/employee-expense-page.tsx",
  "src/features/employees/pages/employee-create-page.tsx",
  "src/features/employees/pages/employee-edit-page.tsx",
  "src/features/documents/pages/employee-documents-page.tsx",
  "src/features/attendance/pages/admin-attendance-page.tsx",
  "src/features/settings/pages/admin-settings-page.tsx"
];

for (const file of targetFiles) {
  const p = path.resolve(file);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Add imports if needed
  if (content.includes('type="date"') || content.includes("type='date'")) {
    if (!content.includes('DatePicker')) {
      const importPos = content.lastIndexOf('import ');
      const endOfImport = content.indexOf('\n', importPos);
      content = content.slice(0, endOfImport + 1) + "import { DatePicker } from '@/components/ui/date-picker';\nimport { Controller } from 'react-hook-form';\n" + content.slice(endOfImport + 1);
    }
  }

  const regex1 = /<Input\s+type="date"\s+\{\.\.\.([a-zA-Z0-9_]+)\.register\(['"`]([^'"`]+)['"`]\)\}(.*?)\/>/g;
  content = content.replace(regex1, (match, formName, fieldName, extraProps) => {
    changed = true;
    let cn = "";
    const classMatch = extraProps.match(/className=(["'][^"']+["'])/);
    if (classMatch) {
        cn = ` className=${classMatch[1]}`;
    }
    return `<Controller control={${formName}.control} name="${fieldName}" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange}${cn} />} />`;
  });

  const regex2 = /<Input\s+type="date"\s+\{\.\.\.field\}(.*?)\/>/g;
  content = content.replace(regex2, (match, extraProps) => {
    changed = true;
    let cn = "";
    const classMatch = extraProps.match(/className=(["'][^"']+["'])/);
    if (classMatch) {
        cn = ` className=${classMatch[1]}`;
    }
    return `<DatePicker value={field.value} onChange={field.onChange}${cn} />`;
  });

  if (changed) {
    const lines = content.split('\n');
    const uniqueLines = [];
    const seenImports = new Set();
    for (const line of lines) {
      if (line.trim().startsWith('import { Controller } from \'react-hook-form\'')) {
        if (!seenImports.has('Controller')) {
          seenImports.add('Controller');
          uniqueLines.push(line);
        }
      } else {
        uniqueLines.push(line);
      }
    }
    content = uniqueLines.join('\n');
    fs.writeFileSync(p, content, 'utf8');
    console.log('Updated ' + file);
  }
}
