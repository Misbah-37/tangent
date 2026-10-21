
  // Academic Templates
  const TEMPLATES = {
    imrad: `# Neural Resonance Dynamics in High-Dimensional Embedding Spaces

**Jane Doe**, Ph.D.
*Department of Computer Science & Applied Mathematics, RunTangent Institute*
\`j.doe@tangent.local\`

---

### Abstract
We investigate the emergence of topological solitons within deep transformer projection manifolds. Through rigorous perturbation bounds, we demonstrate that gradient variance collapses under orthogonal projection constraints. Our experimental results yield a 28% reduction in latency with bounded error rates.

---

## 1. Introduction
Recent advancements in representation learning have highlighted the importance of geometric regularization. When projecting continuous embeddings into discrete sub-manifolds, preserving Riemannian metric distances is paramount.

Let $\\mathcal{M}$ denote a smooth $d$-dimensional Riemannian manifold with metric tensor $g$. The geodesic distance $d_g(x, y)$ between points $x, y \\in \\mathcal{M}$ satisfies:

$$d_g(x, y) = \\inf_{\\gamma} \\int_{0}^{1} \\sqrt{g_{\\gamma(t)}(\\dot{\\gamma}(t), \\dot{\\gamma}(t))} \\, dt$$

## 2. Methodology & Formal Bounds
Consider an empirical dataset $\\mathcal{D} = \\{x_i\\}_{i=1}^N \\subset \\mathbb{R}^D$. We formulate our objective as an energy minimization problem over the parameter space $\\Theta$:

$$\\mathcal{L}(\\Theta) = \\frac{1}{N} \\sum_{i=1}^{N} \\|f_\\Theta(x_i) - x_i\\|^2_2 + \\lambda \\operatorname{Tr}(K_{\\Theta})$$

Where $K_\\Theta$ is the empirical covariance matrix.

### Theorem 1 (Variance Contraction)
*Under standard Lipschitz continuity with constant $L < 1$, the asymptotic eigenvalue distribution converges to:*

$$\\lim_{N \\to \\infty} \\lambda_{\\max}(K_\\Theta) \\le \\frac{L^2}{1 - L^2} \\sigma_0^2$$

## 3. Empirical Results

| Model Architecture | Latency (ms) | Top-1 Accuracy | Parameter Count |
| :--- | :--- | :--- | :--- |
| Baseline Transformer | 42.6 | 84.2% | 110M |
| Sparse Manifold Attention | 31.4 | 85.1% | 88M |
| **Resonant Projection (Ours)** | **24.2** | **86.4%** | **74M** |

## 4. Discussion & Concluding Remarks
The mathematical framework presented provides deterministic guarantees for neural representation stability. Future work will investigate non-Euclidean hyperbolic extensions.

---

### References
1. Cover, T. M., & Thomas, J. A. (2006). *Elements of Information Theory*. Wiley-Interscience.
2. Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press.
3. Vaswani, A., et al. (2017). *Attention Is All You Need*. NeurIPS 2017.
`,

    rfc: `# RFC-0084: Zero-Knowledge Ephemeral Session Transport

- **Author**: Platform Architecture Working Group
- **Status**: Proposed Standard
- **Category**: Security & Infrastructure
- **Date**: 2026-09-15

---

## 1. Summary
This RFC specifies an end-to-end authenticated, client-side session transport protocol utilizing ephemeral Curve25519 key agreements and AES-256-GCM authenticated encryption.

## 2. Protocol Architecture

\`\`\`
Client (Alice)                              Key Gateway (Bob)
   |                                                |
   |---- 1. ClientHello (EphemPublicKey_A) -------->|
   |<--- 2. ServerHello (EphemPublicKey_B, Nonce) --|
   |                                                |
   |==== [Derive Shared Secret S = ECDH(A, B)] =====|
   |                                                |
   |---- 3. Encrypted Payload (AES-256-GCM) ------->|
\`\`\`

## 3. Cryptographic Specification
Key derivation employs HKDF-SHA256 with an empty salt:

$$K = \\operatorname{HKDF-Expand}(\\operatorname{HKDF-Extract}(\\text{salt}, \\text{ECDH}(d_A, Q_B)), \\text{"tangent-v1"}, 32)$$

### Invariant Checks
- Nonces MUST NEVER be reused under the same session key.
- Key rotation MUST trigger every $2^{16}$ packets or after 600 seconds.
`,

    math: `# Derivation of Gaussian Integrals & Fourier Transforms

**Lecture Notes in Applied Analysis**

---

## 1. The Classical Gaussian Integral
We evaluate the improper integral:

$$I = \\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx$$

By considering the square $I^2$ in the Cartesian plane and converting to polar coordinates $(r, \\theta)$:

$$I^2 = \\left( \\int_{-\\infty}^{\\infty} e^{-x^2} dx \\right) \\left( \\int_{-\\infty}^{\\infty} e^{-y^2} dy \\right) = \\int_{-\\infty}^{\\infty} \\int_{-\\infty}^{\\infty} e^{-(x^2 + y^2)} \\, dx \\, dy$$

Transforming to polar coordinates with Jacobian $J = r$:

$$I^2 = \\int_{0}^{2\\pi} \\int_{0}^{\\infty} e^{-r^2} r \\, dr \\, d\\theta = 2\\pi \\left[ -\\frac{1}{2} e^{-r^2} \\right]_0^\\infty = \\pi$$

Hence, taking the positive square root:

$$I = \\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}$$

---

## 2. Continuous Fourier Transform
The forward Fourier transform of $f(t) \\in L^1(\\mathbb{R})$ is defined as:

$$\\hat{f}(\\omega) = \\mathcal{F}\\{f(t)\\} = \\int_{-\\infty}^{\\infty} f(t) e^{-i\\omega t} \\, dt$$

With the inverse transform:

$$f(t) = \\frac{1}{2\\pi} \\int_{-\\infty}^{\\infty} \\hat{f}(\\omega) e^{i\\omega t} \\, d\\omega$$
`,

    blank: `# Untitled Document

Start writing your academic paper or technical note here...
`
  };

  const editor = document.getElementById('markdownInput');
  const preview = document.getElementById('previewOutput');
  const templateSelect = document.getElementById('templateSelect');
  const loadTemplateBtn = document.getElementById('loadTemplateBtn');
  const themeSelect = document.getElementById('themeSelect');
  const printPdfBtn = document.getElementById('printPdfBtn');
  const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
  const downloadMdBtn = document.getElementById('downloadMdBtn');
  const copyMarkdownBtn = document.getElementById('copyMarkdownBtn');
  const copyMdText = document.getElementById('copyMdText');

  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');
  const readTimeEl = document.getElementById('readTime');
  const mathCountEl = document.getElementById('mathCount');

  let draftHandle=null;
  const markdownStatus=TangentStudio.status(editor,'markdownStatus');
  const safeConfig={USE_PROFILES:{html:true,mathMl:true},FORBID_TAGS:['script','style','iframe','object','embed','img','video','audio','source','form','input','button','textarea','link','meta','base','svg'],FORBID_ATTR:['src','srcset','background','id','name']};
  const rawConfig={...safeConfig,FORBID_ATTR:[...safeConfig.FORBID_ATTR,'style','class']};
  function mathToken(src,name){for(const [left,right,display] of [['$$','$$',true],['\\[','\\]',true],['\\(','\\)',false],['$','$',false]]){if(!src.startsWith(left))continue;let end=src.indexOf(right,left.length);while(end>=0&&src[end-1]==='\\')end=src.indexOf(right,end+right.length);if(end<0)return;const text=src.slice(left.length,end);if(!text.trim()||(!display&&text.includes('\n')))return;return {type:name,raw:src.slice(0,end+right.length),text,display};}}
  const mathRenderer=token=>katex.renderToString(token.text,{displayMode:token.display,throwOnError:false,trust:false,maxExpand:1000});
  // Configure Marked
  marked.use({gfm:true,breaks:true,renderer:{html(value){return DOMPurify.sanitize(typeof value==='string'?value:value.raw,rawConfig);},image(href,title,text){return '<span>'+TangentStudio.escape('[Image omitted: '+(text||'image')+']')+'</span>';}},extensions:[
    {name:'tangentMathBlock',level:'block',start:src=>src.search(/\$\$|\\\[/),tokenizer(src){const token=mathToken(src,'tangentMathBlock');return token?.display?token:undefined;},renderer:mathRenderer},
    {name:'tangentMathInline',level:'inline',start:src=>src.search(/\$|\\[([]/),tokenizer(src){return mathToken(src,'tangentMathInline');},renderer:mathRenderer}
  ]});
  function renderDocument(){
    if(editor.value.length>500000){markdownStatus.textContent='Use at most 500,000 characters. Reduce the document before exporting.';printPdfBtn.disabled=downloadHtmlBtn.disabled=true;return;}
    try{preview.innerHTML=DOMPurify.sanitize(marked.parse(editor.value),safeConfig);preview.querySelectorAll('a').forEach(a=>{const href=a.getAttribute('href')||'';if(!/^(https?:|mailto:|#)/i.test(href))a.removeAttribute('href');a.rel='noopener noreferrer';});markdownStatus.textContent='Active HTML and automatic remote images are omitted. Review formatting before exporting.';printPdfBtn.disabled=downloadHtmlBtn.disabled=false;updateStats(editor.value);draftHandle?.changed();}
    catch(error){markdownStatus.textContent='Could not render this document: '+error.message;printPdfBtn.disabled=downloadHtmlBtn.disabled=true;}
  }

  function updateStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readingTime = Math.ceil(words / 200);
    const mathMatches = preview.querySelectorAll('.katex').length;

    wordCountEl.textContent = words.toLocaleString();
    charCountEl.textContent = chars.toLocaleString();
    readTimeEl.textContent = `${readingTime} min`;
    mathCountEl.textContent = mathMatches.toString();
  }

  // Load Template
  loadTemplateBtn.addEventListener('click', () => {
    const tName = templateSelect.value;
    if(editor.value.trim()&&!window.confirm('Replace the current document with this template?'))return;
    if (TEMPLATES[tName]) {
      editor.value = TEMPLATES[tName];
      renderDocument();
    }
  });

  // Theme Switcher
  themeSelect.addEventListener('change', (e) => {
    preview.className = 'preview-content ' + e.target.value;draftHandle?.changed();
  });

  // Tab Indentation Support
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      renderDocument();
    }
  });

  // Real-time Input
  editor.addEventListener('input', renderDocument);

  // Print / PDF
  let printOriginalParent, printNextSibling, pdfPrintTable;

  window.addEventListener('beforeprint', () => {
    const content = document.getElementById('previewOutput');
    if (!content || document.getElementById('pdfPrintTable')) return;

    printOriginalParent = content.parentNode;
    printNextSibling = content.nextSibling;

    pdfPrintTable = document.createElement('table');
    pdfPrintTable.id = 'pdfPrintTable';
    pdfPrintTable.style.width = '100%';
    pdfPrintTable.style.border = 'none';
    pdfPrintTable.style.borderCollapse = 'collapse';
    pdfPrintTable.style.margin = '0';
    pdfPrintTable.style.padding = '0';

    // Academic 1-inch top margin
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><td><div style="height: 2.54cm;"></div></td></tr>';

    // Academic 1-inch bottom margin
    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = '<tr><td><div style="height: 2.54cm;"></div></td></tr>';

    const tbody = document.createElement('tbody');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.style.padding = '0';

    tr.appendChild(td);
    tbody.appendChild(tr);
    pdfPrintTable.appendChild(thead);
    pdfPrintTable.appendChild(tbody);
    pdfPrintTable.appendChild(tfoot);

    // Move the actual document content into the print table structure
    td.appendChild(content);
    document.body.appendChild(pdfPrintTable);
  });

  window.addEventListener('afterprint', () => {
    const content = document.getElementById('previewOutput');
    if (!content || !pdfPrintTable) return;

    // Restore DOM to original app state
    if (printNextSibling) {
      printOriginalParent.insertBefore(content, printNextSibling);
    } else {
      printOriginalParent.appendChild(content);
    }
    document.body.removeChild(pdfPrintTable);pdfPrintTable=null;
  });

  printPdfBtn.addEventListener('click', () => {
    window.print();
  });

  // Download HTML
  downloadHtmlBtn.addEventListener('click', () => {
    if(downloadHtmlBtn.disabled)return;
    const font=getComputedStyle(preview).fontFamily;
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Academic Document - RunTangent</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; base-uri 'none'; form-action 'none'">
<style>${TangentKatexExportCSS}
  body {
    max-width: 860px;
    margin: 40px auto;
    padding: 0 24px;
    font-family: ${font};
    line-height: 1.75;
    color: #1a202c;
    background: #ffffff;
  }
  h1 { font-size: 2.2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
  h2 { font-size: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
  th { background: #f1f5f9; }
  blockquote { border-left: 4px solid #3b82f6; background: #f8fafc; padding: 12px 20px; margin: 16px 0; }
  pre { background: #f3f4f6; color: #111827; padding: 16px; border-radius: 8px; overflow-x: auto; }</style>
</head>
<body>
${DOMPurify.sanitize(preview.innerHTML,safeConfig)}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'academic-document.html';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
      if(window.TangentToast) window.TangentToast.show("Export successful!");
  });

  // Download Markdown
  downloadMdBtn.addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'academic-document.md';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
      if(window.TangentToast) window.TangentToast.show("Export successful!");
  });

  // Copy Markdown
  copyMarkdownBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(editor.value); if(window.TangentToast) window.TangentToast.show("Copied to clipboard!");
      copyMdText.textContent = "Copied!";
      setTimeout(() => { copyMdText.textContent = "Copy Markdown"; }, 2000);
    } catch (err) {
      copyMdText.textContent = "Failed";
    }
  });

  // Initial Load with IMRAD research paper template
  editor.value = TEMPLATES.imrad;
  draftHandle=TangentStudio.draft('tangent_markdown_draft_v1',loadTemplateBtn,()=>({text:editor.value,theme:themeSelect.value}),data=>{if(!data||typeof data.text!=='string'||data.text.length>500000||!['theme-academic','theme-modern','theme-mono'].includes(data.theme))throw Error('Invalid Markdown draft');editor.value=data.text;themeSelect.value=data.theme;preview.className='preview-content '+data.theme;});
  renderDocument();
