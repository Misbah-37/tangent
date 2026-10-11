/* Receipt fields are suggestions; ambiguous values require review. */
window.TangentReceipt = (()=>{
  const numericDate=/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{2,4})\b/g;
  const textDate=/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi;
  function money(number){let s=number.replace(/\s/g,'');const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');if(comma>=0&&dot>=0){const decimal=comma>dot?',':'.';s=s.replace(decimal===','?/\./g:/,/g,'').replace(decimal,'.');}else if(comma>=0){s=/,\d{1,2}$/.test(s)?s.replace(/,/g,(m,offset)=>offset===comma?'.':''):(/^[-]?\d{1,3}(?:,\d{3})+$/.test(s)?s.replace(/,/g,''):'invalid');}else if(dot>=0&& !/\.\d{1,2}$/.test(s)){if(!/^[-]?\d{1,3}(?:\.\d{3})+$/.test(s))return null;s=s.replace(/\./g,'');}const n=Number(s);return Number.isFinite(n)?n:null;}
  function parse(text){const dates=[...text.matchAll(numericDate),...text.matchAll(textDate)].map(m=>m[0]);const candidates=[];
    for(const line of text.split(/\r?\n/)){const labelled=/\b(?:grand\s+total|amount\s+due|balance\s+due|total\s+due|total)\b/i.test(line)&&! /\b(?:sub\s*total|subtotal|tax|cash|tendered|change|discount|savings)\b/i.test(line);const clean=line.replace(numericDate,' ').replace(textDate,' ');
      for(const m of clean.matchAll(/([$\u00a3\u20ac\u00a5\u20b9]|\b(?:USD|EUR|GBP|INR|Rs)\.?\s*)?\s*(-?\d+(?:[.,]\d+)*)(?!\d)/gi)){if(!m[1]&&!labelled)continue;const value=money(m[2]);if(value===null)continue;const currency=(m[1]||'').trim().replace(/\.$/,'');const strong=/\b(?:grand\s+total|amount\s+due|balance\s+due|total\s+due)\b/i.test(line);candidates.push({value,currency,rank:labelled?(strong?3:2):0});}}
    const rank=Math.max(0,...candidates.map(c=>c.rank)),best=candidates.filter(c=>c.rank===rank);const distinct=[...new Map(best.map(c=>[`${c.currency}|${c.value}`,c])).values()];const chosen=distinct.length===1?distinct[0]:null;
    return {total:chosen?`${chosen.currency}${chosen.value.toFixed(2)}`:'',date:[...new Set(dates)].length===1?dates[0].replace(/\s*([/.-])\s*/g,'$1'):'',text,warning:!chosen?'Could not determine one total. Review the text and enter the total.':rank===0?'Unlabelled amount detected. Confirm the total before copying.':'Review the suggested total and date before copying.'};
  }
  return {parse};
})();
