/**
 * Waiter ID Generator and Utilities
 * Format: [A-Z][0-9][0-9] (e.g., A12, B07, Z99)
 */

/**
 * Generate a unique waiter code
 * @param existingCodes - Array of already used codes to avoid duplicates
 * @returns A unique waiter code in format A12
 */
export function generateWaiterCode(existingCodes: string[] = []): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const maxAttempts = 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random letter
    const letter = letters[Math.floor(Math.random() * letters.length)];
    
    // Generate random 2-digit number (00-99)
    const number = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    const code = `${letter}${number}`;
    
    // Check if code already exists
    if (!existingCodes.includes(code)) {
      return code;
    }
  }
  
  // Fallback: sequential generation if random failed
  for (let i = 0; i < 26; i++) {
    const letter = letters[i];
    for (let num = 0; num < 100; num++) {
      const code = `${letter}${num.toString().padStart(2, '0')}`;
      if (!existingCodes.includes(code)) {
        return code;
      }
    }
  }
  
  // This should never happen unless all 2600 codes are used
  throw new Error('All waiter codes exhausted');
}

/**
 * Validate waiter code format
 * @param code - Waiter code to validate
 * @returns true if code matches format [A-Z][0-9][0-9]
 */
export function isValidWaiterCode(code: string): boolean {
  return /^[A-Z][0-9]{2}$/.test(code);
}

/**
 * Format order number
 * @param orderCount - Current order count
 * @returns Formatted order number (e.g., ORD-001)
 */
export function generateOrderNumber(orderCount: number): string {
  return `ORD-${(orderCount + 1).toString().padStart(3, '0')}`;
}

/**
 * Format bill number
 * @param billCount - Current bill count
 * @returns Formatted bill number (e.g., BILL-001)
 */
export function generateBillNumber(billCount: number): string {
  return `BILL-${(billCount + 1).toString().padStart(3, '0')}`;
}

/**
 * Generate UPI payment URL (BHIM UPI compatible)
 * Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
 * @param upiId - UPI ID (e.g., merchant@paytm)
 * @param businessName - Business name
 * @param amount - Amount in INR
 * @param orderId - Order/Bill ID for reference
 * @returns UPI payment URL
 */
export function generateUpiUrl(
  upiId: string,
  businessName: string,
  amount: number,
  orderId?: string
): string {
  // Build BHIM UPI compliant URL
  const params = new URLSearchParams();
  params.set('pa', upiId); // Payee VPA
  params.set('pn', businessName); // Payee Name
  params.set('am', amount.toFixed(2)); // Amount
  params.set('cu', 'INR'); // Currency
  
  if (orderId) {
    params.set('tn', `Payment for ${orderId}`); // Transaction Note
  }
  
  return `upi://pay?${params.toString()}`;
}

/**
 * Validate UPI ID format
 * @param upiId - UPI ID to validate
 * @returns true if valid UPI ID format
 */
export function validateUpiId(upiId: string): boolean {
  // UPI ID format: username@provider
  const upiRegex = /^[\w.-]+@[\w.-]+$/;
  return upiRegex.test(upiId);
}
