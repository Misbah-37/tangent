/* Decimal arithmetic: half-up monetary rounding, then sum displayed lines. */
window.TangentInvoice=(()=>{
  const codes={'$':'USD','€':'EUR','£':'GBP','¥':'JPY','CA$':'CAD','AU$':'AUD','₹':'INR','CHF':'CHF'};
  const precision=currency=>new Intl.NumberFormat('en',{style:'currency',currency:codes[currency]||'USD'}).resolvedOptions().maximumFractionDigits;
  function decimal(value){const text=String(value).trim();if(!/^\d+(?:\.\d{0,6})?$/.test(text)||Number(text)>1000000000000)throw Error('Use nonnegative numbers up to 1 trillion with at most 6 decimal places.');const [a,b='']=text.split('.');return {n:BigInt(a+b),d:10n**BigInt(b.length)};}
  const round=(n,d)=>(n+d/2n)/d;
  function calculate(items,discount,tax,currency){const digits=precision(currency),scale=10n**BigInt(digits);const lines=items.map(item=>{const qty=decimal(item.qty),rate=decimal(item.rate),unit=round(rate.n*scale,rate.d);return {unit,amount:round(qty.n*unit,qty.d)};});const subtotal=lines.reduce((sum,line)=>sum+line.amount,0n);const pct=value=>{const p=decimal(value);if(p.n>100n*p.d)throw Error('Tax and discount must be between 0 and 100 percent.');return p;};const d=pct(discount),t=pct(tax),discountAmount=round(subtotal*d.n,d.d*100n),taxable=subtotal-discountAmount,taxAmount=round(taxable*t.n,t.d*100n),total=taxable+taxAmount;if(total>1000000000000000n)throw Error('Invoice total exceeds the supported amount.');return {digits,lines,subtotal,discountAmount,taxAmount,total};}
  function format(units,digits,currency){const s=units.toString().padStart(digits+1,'0');return currency+(digits?s.slice(0,-digits)+'.'+s.slice(-digits):s);}
  return {calculate,format,precision};
})();
