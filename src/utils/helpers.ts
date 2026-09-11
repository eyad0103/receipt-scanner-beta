export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.95) return 'text-emerald-600 dark:text-emerald-400';
  if (confidence >= 0.85) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.95) return 'High confidence';
  if (confidence >= 0.85) return 'Medium confidence';
  return 'Low confidence';
}

export function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/milk|bread|egg|banana|avocado|yogurt|cheese|chicken|beef|fish|fruit|vegetable|organic/i.test(n)) return 'Groceries';
  if (/coffee|latte|muffin|tea|juice|sandwich|burger|pizza|taco|burrito|salad|sushi|steak|pasta|soup|beer|wine|water|soda|juice|cola/i.test(n)) return 'Food & Drink';
  if (/usb|cable|adapter|headphone|earphone|charger|speaker|mouse|keyboard|screen|protector/i.test(n)) return 'Electronics';
  if (/notebook|pen|paper|folder|stapler|tape|scissors|printer|ink|toner/i.test(n)) return 'Office';
  if (/shirt|pants|shoes|socks|jacket|hat|scarf|belt|watch|sunglasses/i.test(n)) return 'Clothing';
  if (/soap|shampoo|toothpaste|towel|detergent|cleaner|sponge|trash/i.test(n)) return 'Household';
  return 'Other';
}

export const CATEGORY_COLORS = [
  'var(--color-brand-500)',
  'var(--color-emerald-500)',
  'var(--color-amber-500)',
  'var(--color-rose-500)',
  '#da77f2',
  '#ff8787',
];

export const BUSINESS = {
  name: 'ReceiptFlow Ltd.',
  address: '123 Innovation Drive, Suite 400, San Francisco, CA 94105',
  email: 'privacy@receiptflow.app',
  legalEmail: 'legal@receiptflow.app',
  phone: '+1 (415) 555-0123',
  dpo: 'Data Protection Officer, ReceiptFlow Ltd.',
  jurisdiction: 'State of California, United States',
  lastUpdated: 'September 6, 2026',
};
