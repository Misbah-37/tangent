let strVal = "2017-05-21";
let dateLocale = "EU";

let dStr = strVal.replace(/(st|nd|rd|th)/ig, '');
let parsedDate = null;

let m = dStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
if (m) {
    let p1 = parseInt(m[1]), p2 = parseInt(m[2]), p3 = parseInt(m[3]);
    if (p3 < 100) p3 += 2000;
    if (p1 > 12 && p2 <= 12) { parsedDate = new Date(p3, p2-1, p1); }
    else if (p2 > 12 && p1 <= 12) { parsedDate = new Date(p3, p1-1, p2); }
    else if (p1 <= 12 && p2 <= 12) {
    if (dateLocale === 'EU') { parsedDate = new Date(p3, p2-1, p1); }
    else { parsedDate = new Date(p3, p1-1, p2); } 
    }
}

if (!parsedDate) {
    let d = new Date(dStr);
    if (!isNaN(d.getTime())) { parsedDate = d; }
}

if (parsedDate && !isNaN(parsedDate.getTime())) {
    let y = parsedDate.getFullYear();
    let mo = String(parsedDate.getMonth() + 1).padStart(2, '0');
    let da = String(parsedDate.getDate()).padStart(2, '0');
    
    if (dateLocale === 'EU') strVal = da + '/' + mo + '/' + y;
    else if (dateLocale === 'US') strVal = mo + '/' + da + '/' + y;
    else strVal = y + '-' + mo + '-' + da; 
}
console.log(strVal);
