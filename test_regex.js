const rawText = 
Bharti Airtel Limited
payment receipt
Thank you for choosing airtel service. Here is the payment receipt.
Receipt No. 7497363092616876032
Customer Name
Customer Number
Order Number 7497362936939167744
Line of Business Airtel Xstream Fiber
Payment type Bill payment | Recharging
Payment date & time 24/08/2026 12:15 AM
Payment mode UPI
Paid amount ₹ 589.00
LCO_DSL 019413899783_dsl ₹ 589.00
Terms and Conditions
1. The above amount is inclusive of applicable Taxes.
;

const allAmounts = [...rawText.matchAll(/(?:[\$\£\€\¥\₹]|rs\.?|inr)?\s*(\d{1,7}[\.,]\s*\d{2})(?!\d)/gi)];
let maxAmt = 0;
let matchedCurrency = '';

allAmounts.forEach(m => {
    const val = parseFloat(m[1].replace(',', '.').replace(/\s+/g, ''));
    if (val > maxAmt) {
        maxAmt = val;
        matchedCurrency = m[0].replace(/[\d\.,\s]/g, '');
    }
});

let finalAmount = 'Not Found';
if (maxAmt > 0) {
    if (!matchedCurrency && rawText.includes('₹')) matchedCurrency = '₹';
    finalAmount = matchedCurrency + maxAmt.toFixed(2);
}

const numDateRegex = /\d{1,2}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{2,4}/;
const numDateMatch = rawText.match(numDateRegex);
let finalDate = numDateMatch ? numDateMatch[0].replace(/\s+/g, '') : 'Not Found';

console.log('Total:', finalAmount);
console.log('Date:', finalDate);
