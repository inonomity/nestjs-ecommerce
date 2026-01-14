/**
 * Generates an order number in format: CP-YYYYMMDD-XXXXX
 * where XXXXX is a random alphanumeric string
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `CP-${dateStr}-${randomStr}`;
}

/**
 * Generates a quote reference in format: QT-XXXXXXXXXX
 */
export function generateQuoteReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 10; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `QT-${randomStr}`;
}
