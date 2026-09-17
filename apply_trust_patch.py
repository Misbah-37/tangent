import re

# 1. Patch src/index.html (Global Privacy Claim)
idx_path = "src/index.html"
with open(idx_path, "r", encoding="utf-8") as f:
    idx_content = f.read()

idx_content = idx_content.replace(
    "We never transmit your files, log telemetry, or require accounts.",
    "We never transmit your files, log telemetry, or require accounts. (The sole exception is our Password Shield, which securely queries an anonymous partial hash against the HaveIBeenPwned database)."
)
with open(idx_path, "w", encoding="utf-8") as f:
    f.write(idx_content)

# 2. Patch src/tools/password-meter.html (FAQ / Intro)
pm_path = "src/tools/password-meter.html"
with open(pm_path, "r", encoding="utf-8") as f:
    pm_content = f.read()

pm_content = pm_content.replace(
    "Optional breach auditing uses mathematical k-Anonymity so your password is never transmitted.",
    "Optional breach auditing uses mathematical k-Anonymity (sending only a partial 5-character SHA-1 hash to the HaveIBeenPwned database) to ensure your actual password is never transmitted."
)
with open(pm_path, "w", encoding="utf-8") as f:
    f.write(pm_content)

# 3. Patch src/tools/document-signer.html (Disclaimers)
ds_path = "src/tools/document-signer.html"
with open(ds_path, "r", encoding="utf-8") as f:
    ds_content = f.read()

# Replace FAQ structured data
ds_content = ds_content.replace(
    "Yes. In the United States under the ESIGN Act and in the European Union under eIDAS, electronic signatures placed on electronic documents are legally valid and enforceable for most standard business, lease, and employment agreements.",
    "While visual electronic signatures demonstrate intent to sign, this tool is a Visual Signature Utility. It does not provide the cryptographic audit trails, verified IP tracking, or eIDAS-certified compliance required for highly contested legal disputes. It is meant for visual placement rather than acting as a formal Trust Service Provider."
)
# Replace FAQ visual text
ds_content = ds_content.replace(
    "In many jurisdictions (including the US ESIGN Act, UETA, and EU eIDAS regulation), electronic signatures placed on agreements carry legal validity when intent and consent are established.",
    "While visual electronic signatures often demonstrate intent to sign, this tool is a <strong>Visual Signature Utility</strong>. It does not provide cryptographic audit trails, verified IP tracking, or eIDAS-certified compliance. Use it for standard forms or informal visual signing, not for highly contested legal or corporate contracts."
)
# Add disclaimer notice to intro
ds_content = re.sub(
    r'(<p>Sign lease agreements.*?and export signed PDFs with zero accounts or fees.</p>)',
    r'\1\n  <div style="background: rgba(255, 170, 0, 0.1); border: 1px solid rgba(255, 170, 0, 0.4); padding: 12px 16px; border-radius: 8px; margin-top: 16px; font-size: 0.9rem; color: #facc15; display: flex; gap: 12px; align-items: flex-start; text-align: left;">\n    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>\n    <div>\n      <strong>Legal Disclaimer:</strong> This tool visually places signatures on documents. It does not provide cryptographic audit trails or certified compliance (unlike DocuSign) required for highly contested legal disputes.\n    </div>\n  </div>',
    ds_content
)
# Replace H1
ds_content = ds_content.replace("<h1>Contract & PDF e-Signer.</h1>", "<h1>Visual PDF e-Signer.</h1>")

with open(ds_path, "w", encoding="utf-8") as f:
    f.write(ds_content)

# 4. Patch src/tools/file-vault.html (Security Proof)
fv_path = "src/tools/file-vault.html"
with open(fv_path, "r", encoding="utf-8") as f:
    fv_content = f.read()

# Add badge
badge_html = """
    <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(5, 150, 105, 0.1); border: 1px solid rgba(5, 150, 105, 0.3); padding: 4px 10px; border-radius: 50px; font-size: 0.75rem; font-weight: 700; color: #10b981; letter-spacing: 0.05em; margin-left: 8px;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>SECURED VIA AES-256-GCM WEB CRYPTO API</span>
    </div>"""

# Replace the privacy shield block to add the second badge
fv_content = re.sub(
    r'(<span>100% CLIENT-SIDE PRIVACY SHIELD</span>\s*</div>)',
    r'\1' + badge_html,
    fv_content
)

with open(fv_path, "w", encoding="utf-8") as f:
    f.write(fv_content)

print("All Trust & Transparency patches applied!")
