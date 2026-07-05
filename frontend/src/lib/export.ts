export function downloadCSV(data: Record<string, any>[], filename: string) {
  if (!data || !data.length) return;

  // Extract headers
  const headers = Object.keys(data[0]);

  // Build CSV string
  const csvRows = [];
  
  // Add headers row
  csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const strVal = val === null || val === undefined ? '' : String(val);
      // Escape quotes and wrap in quotes
      return `"${strVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  // Create a link and trigger download
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
