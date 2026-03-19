export function formatDate(dateValue: string): string {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleDateString();
}
