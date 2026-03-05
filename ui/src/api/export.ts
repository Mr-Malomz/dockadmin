import { rawRequest } from './client';

export async function exportTable(tableName: string, format: string = 'csv') {
    const res = await rawRequest(
        `/export/${encodeURIComponent(tableName)}?format=${format}`
    );

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Export failed');
    }

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}.${format}`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
