
// --- Tab Switching Logic ---
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));

  if (tabId === 'tab-audit') {
    document.getElementById('tabBtnAudit').classList.add('active');
    document.getElementById('tab-audit').classList.add('active');
  } else {
    document.getElementById('tabBtnGen').classList.add('active');
    document.getElementById('tab-generator').classList.add('active');
    if (document.getElementById('genResultText').innerText === 'generating...') {
      generateCredential();
    }
  }
}

// --- TAB 1: Password Audit & Breach Logic ---
const passwordInput = document.getElementById('passwordInput');
let breachDebounceTimer = null;
let isBreachLookupEnabled = false,breachVersion=0,breachController=null;
function cancelBreach(){++breachVersion;clearTimeout(breachDebounceTimer);breachController?.abort();breachController=null;}
passwordInput.addEventListener('input',()=>{cancelBreach();evaluatePassword(passwordInput.value);if(isBreachLookupEnabled)resetBreachCard();else setStrictOfflineBreachCard();});
function toggleBreachLookup(){cancelBreach();isBreachLookupEnabled=document.getElementById('breachLookupToggle').checked;document.getElementById('btnCheckBreach').disabled=!isBreachLookupEnabled;document.getElementById('offlineModeTag').textContent=isBreachLookupEnabled?'Optional online check':'Local strength analysis';if(isBreachLookupEnabled)resetBreachCard();else setStrictOfflineBreachCard();}
function setStrictOfflineBreachCard() {
  const card = document.getElementById('breachCard');
  card.className = 'breach-card clean';
  document.getElementById('breachIcon').innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>';
  document.getElementById('breachTitle').innerText = 'Online breach lookup is off';
  document.getElementById('breachDesc').innerText = 'Local analysis stays in this browser. Enable the optional lookup and click Check only if you want to contact Pwned Passwords.';
}

function togglePasswordMask() {
  const input = document.getElementById('passwordInput');
  const icon = document.getElementById('eyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
}

function clearAuditInput() {
  if(passwordInput.type==='text')togglePasswordMask();
  cancelBreach();
  passwordInput.value = '';
  evaluatePassword('');
  if (isBreachLookupEnabled) resetBreachCard();
  else setStrictOfflineBreachCard();
  passwordInput.focus();
}

function evaluatePassword(pwd) {
  const scoreText = document.getElementById('meterScoreText');
  const segments = [
    document.getElementById('seg0'),
    document.getElementById('seg1'),
    document.getElementById('seg2'),
    document.getElementById('seg3'),
    document.getElementById('seg4')
  ];

  // Reset segments
  segments.forEach(seg => {
    seg.className = 'meter-segment';
  });

  if (!pwd) {
    scoreText.innerText = 'Enter Password';
    scoreText.style.color = 'var(--text-muted)';
    document.getElementById('crackOnline').innerText = 'Instant';
    document.getElementById('crackGpu').innerText = 'Instant';
    document.getElementById('crackCluster').innerText = 'Instant';
    document.getElementById('metricLength').innerText = '0 characters';
    document.getElementById('metricEntropy').innerText = '0 bits';
    document.getElementById('metricCharset').innerText = 'None';
    document.getElementById('metricPatterns').innerText = 'None';
    document.getElementById('metricTips').innerText = 'Enter a password to receive custom structural recommendations.';
    return;
  }

  // zxcvbn evaluation
  let res = null;
  if (typeof zxcvbn === 'function') {
    res = zxcvbn(pwd);
  } else {
    res = fallbackEvaluate(pwd);
  }

  const approximate=typeof zxcvbn!=='function';
  const score = res.score; // 0 to 4
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong estimate', 'Very strong estimate'];
  const colors = ['#b96157', '#b57851', '#a38c4d', '#64828c', '#68887a'];

  scoreText.innerText = labels[score]+(approximate?' (basic estimate)':'');
  scoreText.style.color = colors[score];

  for (let i = 0; i <= score; i++) {
    segments[i].classList.add(`active-${score}`);
  }

  // Crack times
  const crackTimes = res.crack_times_display || {};
  document.getElementById('crackOnline').innerText = crackTimes.online_throttling_100_per_hour || '< 1 second';
  document.getElementById('crackGpu').innerText = crackTimes.offline_slow_hashing_1e4_per_second || '< 1 second';
  document.getElementById('crackCluster').innerText = crackTimes.offline_fast_hashing_1e10_per_second || '< 1 millisecond';

  // Metrics
  document.getElementById('metricLength').innerText = `${pwd.length} character${pwd.length > 1 ? 's' : ''}`;

  // Calculate approx entropy
  let pool = 0;
  let charTypes = [];
  if (/[a-z]/.test(pwd)) { pool += 26; charTypes.push('Lower'); }
  if (/[A-Z]/.test(pwd)) { pool += 26; charTypes.push('Upper'); }
  if (/[0-9]/.test(pwd)) { pool += 10; charTypes.push('Numbers'); }
  if (/[^a-zA-Z0-9]/.test(pwd)) { pool += 33; charTypes.push('Symbols'); }

  const entropy = Math.round(pwd.length * (Math.log2(pool || 1)));
  document.getElementById('metricEntropy').innerText = /[^\x00-\x7F]/.test(pwd)?'Not estimated for non-ASCII text':`${entropy} bits (character-space model)`;
  document.getElementById('metricCharset').innerText = charTypes.join(', ') || 'None';

  // Patterns & Tips
  let patternText = 'No patterns reported';
  if (res.sequence && res.sequence.length > 0) {
    const detected = res.sequence.map(s => s.pattern).filter((v, i, a) => a.indexOf(v) === i);
    patternText = detected.join(', ');
  }
  document.getElementById('metricPatterns').innerText = patternText;

  let feedback = [];
  if (res.feedback && res.feedback.warning) feedback.push(`<strong>Warning:</strong> ${res.feedback.warning}`);
  if (res.feedback && res.feedback.suggestions && res.feedback.suggestions.length > 0) {
    feedback.push(res.feedback.suggestions.join(' '));
  }
  if (pwd.length < 12) {
    feedback.push('Use a longer, unique password or a randomly generated passphrase. Estimates depend on how an attacker guesses.');
  }
  document.getElementById('metricTips').innerHTML = feedback.join('<br>') || 'No additional pattern feedback. This estimate does not guarantee safety.';
}

function fallbackEvaluate(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd) && pwd.length >= 14) score++;
  return {
    score: Math.min(score, 4),
    crack_times_display: {
      online_throttling_100_per_hour: 'Unavailable without strength model',
      offline_fast_hashing_1e10_per_second: 'Unavailable without strength model',
      offline_slow_hashing_1e4_per_second: 'Unavailable without strength model'
    },
    sequence: [],
    feedback: { warning: '', suggestions: [] }
  };
}

// SHA-1 Helper via Web Crypto
async function sha1(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function setBreachCheckingState() {
  const card = document.getElementById('breachCard');
  card.className = 'breach-card neutral';
  document.getElementById('breachIcon').innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>';
  document.getElementById('breachTitle').innerText = 'Checking Pwned Passwords…';
  document.getElementById('breachDesc').innerText = 'Sending only the first five SHA-1 hash characters to Pwned Passwords; matching the response locally.';
}

function resetBreachCard() {
  const card = document.getElementById('breachCard');
  card.className = 'breach-card neutral';
  document.getElementById('breachIcon').innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  document.getElementById('breachTitle').innerText = 'Ready for an optional check';
  document.getElementById('breachDesc').innerText = 'Click Check to send a five-character hash prefix to Pwned Passwords. The full password and hash are not sent. This request is not fully anonymous.';
}

async function checkBreachAnonymously(pwd) {
  if (!isBreachLookupEnabled||!pwd||pwd!==passwordInput.value) return;
  cancelBreach();const version=breachVersion,controller=new AbortController();breachController=controller;const timeout=setTimeout(()=>controller.abort(),10000);const current=()=>version===breachVersion&&isBreachLookupEnabled&&passwordInput.value===pwd;setBreachCheckingState();
  const card = document.getElementById('breachCard');
  const icon = document.getElementById('breachIcon');
  const title = document.getElementById('breachTitle');
  const desc = document.getElementById('breachDesc');

  try {
    const fullHash = await sha1(pwd);
    if(!current())return;
    const prefix = fullHash.substring(0, 5);
    const suffix = fullHash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`,{signal:controller.signal,headers:{'Add-Padding':'true'},credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
    if (!response.ok) throw new Error('API lookup unavailable');

    const text = await response.text();
    if(!current())return;
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    if (!lines.length) throw Error('Invalid response');
    const counts = new Map();
    for (const line of lines) {
      const match = /^([A-F0-9]{35}):(\d+)$/i.exec(line);
      if (!match) throw Error('Invalid response');
      const key = match[1].toUpperCase();
      const count = Number(match[2]);
      if (!Number.isSafeInteger(count) || count < 0 || counts.has(key)) throw Error('Invalid response');
      counts.set(key, count);
    }
    const occurrences = counts.get(suffix.toUpperCase()) || 0;

    if (!current()) return;

    if (occurrences > 0) {
      card.className = 'breach-card danger';
      icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      title.innerText = `Compromised in Public Data Breaches!`;
      desc.innerHTML = `This password has appeared <strong>${occurrences.toLocaleString()} times</strong> in the Pwned Passwords dataset. Attackers maintain automated credential-stuffing bots that test this password first. <strong>Do not use it.</strong>`;
    } else {
      card.className = 'breach-card clean';
      icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>';
      title.innerText = 'No match in this response';
      desc.innerText = 'No match was found in the current Pwned Passwords response. A missing match is not proof of safety or absence from every breach.';
    }
  } catch (err) {
    if(!current())return;
    card.className = 'breach-card neutral';
    icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    title.innerText = 'Breach check unavailable';
    desc.innerText = 'The online result could not be verified. Local estimates remain available; no breach conclusion was reached.';
  }finally{clearTimeout(timeout);if(breachController===controller)breachController=null;}
}

// --- TAB 2: Generator Logic ---
let currentGenMode = 'passphrase';

// WORD_LIST is bundled locally in eff-wordlist.js.

function setGenMode(mode) {
  currentGenMode = mode;
  document.getElementById('modePassphrase').classList.toggle('active', mode === 'passphrase');
  document.getElementById('modeComplex').classList.toggle('active', mode === 'complex');
  document.getElementById('modePin').classList.toggle('active', mode === 'pin');

  document.getElementById('controlsPassphrase').style.display = mode === 'passphrase' ? 'block' : 'none';
  document.getElementById('controlsComplex').style.display = mode === 'complex' ? 'block' : 'none';
  document.getElementById('controlsPin').style.display = mode === 'pin' ? 'block' : 'none';

  generateCredential();
}

// Cryptographically unbiased integer generator using rejection sampling
function getRandomInt(max) {
  if (max <= 1) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const arr = new Uint32Array(1);
  do {
    crypto.getRandomValues(arr);
  } while (arr[0] >= limit);
  return arr[0] % max;
}

function generateCredential() {
  const out = document.getElementById('genResultText');
  let result = '',bits=0,note='';

  if (currentGenMode === 'passphrase') {
    const count = parseInt(document.getElementById('wordCountSlider').value, 10);
    const sep = document.getElementById('passphraseSep').value;
    const selectedWords = [];
    for (let i = 0; i < count; i++) {
      const idx = getRandomInt(WORD_LIST.length);
      selectedWords.push(WORD_LIST[idx]);
    }
    result = selectedWords.join(sep);bits=count*Math.log2(WORD_LIST.length);note=count+' random words from '+WORD_LIST.length.toLocaleString('en-US')+' EFF words. '+(count<6?'Below the six-word default; fewer words reduce strength.':'Keep the full randomly generated phrase.');
  } else if (currentGenMode === 'complex') {
    const length = parseInt(document.getElementById('charCountSlider').value, 10);
    const useUpper = document.getElementById('chkUpper').checked;
    const useLower = document.getElementById('chkLower').checked;
    const useNumbers = document.getElementById('chkNumbers').checked;
    const useSymbols = document.getElementById('chkSymbols').checked;

    let charset = '';
    if (useUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) charset += '0123456789';
    if (useSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (document.getElementById('chkExcludeAmbiguous').checked) charset=charset.replace(/[l1IO0]/g,'');
    if (!charset){out.textContent='';document.getElementById('generatorStrength').textContent='Select at least one allowed character set.';document.getElementById('copyBtnText').textContent='Select a character set';return;}document.getElementById('copyBtnText').textContent='Copy';

    const charArray = [];
    for (let i = 0; i < length; i++) {
      const idx = getRandomInt(charset.length);
      charArray.push(charset[idx]);
    }
    result = charArray.join('');bits=length*Math.log2(charset.length);note='Selected sets define allowed characters; each selected set is not guaranteed to appear.';
  } else if (currentGenMode === 'pin') {
    const length = parseInt(document.getElementById('pinCountSlider').value, 10);
    const pinDigits = [];
    for (let i = 0; i < length; i++) {
      pinDigits.push(getRandomInt(10));
    }
    result = pinDigits.join('');bits=length*Math.log2(10);note='Numeric PINs have limited strength and are not a substitute for an account password.';
  }

  document.getElementById('copyBtnText').textContent='Copy';
  out.innerText = result;document.getElementById('generatorStrength').textContent=bits.toFixed(1)+' random-choice bits (uniform generation). '+note;
}

async function copyGeneratedCredential(){const text=document.getElementById('genResultText').textContent;if(!text||text==='generating...')return;try{await navigator.clipboard.writeText(text);document.getElementById('copyBtnText').textContent='Copied!';}catch(e){document.getElementById('copyBtnText').textContent='Copy failed - select text';}}
// Initial state
generateCredential();toggleBreachLookup();window.addEventListener('pagehide',cancelBreach);
