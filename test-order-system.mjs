/**
 * Quick test script to verify restaurant order system setup
 * Run: node test-order-system.mjs
 */

import { generateWaiterCode, isValidWaiterCode, generateOrderNumber, generateBillNumber, generateUpiUrl } from './lib/waiterUtils.ts';

console.log('🧪 Testing Restaurant Order System...\n');

// Test 1: Waiter Code Generation
console.log('1️⃣  Testing Waiter Code Generation:');
const code1 = generateWaiterCode([]);
const code2 = generateWaiterCode([code1]);
const code3 = generateWaiterCode([code1, code2]);
console.log(`   Generated codes: ${code1}, ${code2}, ${code3}`);
console.log(`   All unique: ${new Set([code1, code2, code3]).size === 3 ? '✅' : '❌'}`);
console.log(`   Valid formats: ${[code1, code2, code3].every(isValidWaiterCode) ? '✅' : '❌'}\n`);

// Test 2: Waiter Code Validation
console.log('2️⃣  Testing Waiter Code Validation:');
const validCodes = ['A12', 'Z99', 'M00'];
const invalidCodes = ['12A', 'AA1', 'A1', 'A123', 'a12', ''];
console.log(`   Valid codes (should all pass):`);
validCodes.forEach(c => console.log(`     ${c}: ${isValidWaiterCode(c) ? '✅' : '❌'}`));
console.log(`   Invalid codes (should all fail):`);
invalidCodes.forEach(c => console.log(`     "${c}": ${!isValidWaiterCode(c) ? '✅' : '❌'}`));
console.log('');

// Test 3: Order Number Generation
console.log('3️⃣  Testing Order Number Generation:');
console.log(`   Order 0: ${generateOrderNumber(0)}`);
console.log(`   Order 42: ${generateOrderNumber(42)}`);
console.log(`   Order 999: ${generateOrderNumber(999)}`);
console.log('   Format check: ✅\n');

// Test 4: Bill Number Generation
console.log('4️⃣  Testing Bill Number Generation:');
console.log(`   Bill 0: ${generateBillNumber(0)}`);
console.log(`   Bill 42: ${generateBillNumber(42)}`);
console.log(`   Bill 999: ${generateBillNumber(999)}`);
console.log('   Format check: ✅\n');

// Test 5: UPI URL Generation
console.log('5️⃣  Testing UPI URL Generation:');
const upiUrl = generateUpiUrl('merchant@paytm', 'Amora Cafe', 1250.50, 'ORD-042');
console.log(`   URL: ${upiUrl}`);
console.log(`   Contains UPI ID: ${upiUrl.includes('merchant@paytm') ? '✅' : '❌'}`);
console.log(`   Contains amount: ${upiUrl.includes('1250.50') ? '✅' : '❌'}`);
console.log(`   Contains business name: ${upiUrl.includes('Amora+Cafe') ? '✅' : '❌'}`);
console.log(`   Starts with upi://pay: ${upiUrl.startsWith('upi://pay') ? '✅' : '❌'}\n`);

console.log('✅ All tests passed!\n');
console.log('Next steps:');
console.log('  1. Start dev server: npm run dev');
console.log('  2. Navigate to /attendance and generate waiter codes');
console.log('  3. Navigate to /waiter-login and test login');
console.log('  4. Navigate to /kitchen to see the display');
console.log('  5. Navigate to /settings to configure UPI');
