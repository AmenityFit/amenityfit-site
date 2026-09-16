import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 add_tax_form_card.py affiliate-dashboard.html")
        sys.exit(1)

    path = sys.argv[1]
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    edits = []

    # Edit 1: insert the tax-form card right after the Payout Account card
    old1 = '''  <div class="checklist-card" id="connect-card" style="display:none;">
    <h2>Payout Account</h2>
    <p id="connect-not-started" style="font-size:13px;color:var(--muted);margin-bottom:14px;display:none;">Connect a bank account with Stripe to receive your commission payouts. This takes a few minutes and is handled entirely by Stripe, not AmenityFit directly.</p>
    <p id="connect-pending" style="font-size:13px;color:var(--muted);margin-bottom:14px;display:none;">Your Stripe account is set up but still finishing verification. This can take a little time, check back soon.</p>
    <p id="connect-done" style="font-size:13px;color:var(--success);margin-bottom:14px;display:none;">Your payout account is connected and verified. Commission payouts are sent here automatically.</p>
    <button class="copy-btn" id="connect-btn" onclick="handleConnectPayout()" style="display:none;">Connect Bank Account</button>
  </div>

  <div class="referral-card">'''
    new1 = '''  <div class="checklist-card" id="connect-card" style="display:none;">
    <h2>Payout Account</h2>
    <p id="connect-not-started" style="font-size:13px;color:var(--muted);margin-bottom:14px;display:none;">Connect a bank account with Stripe to receive your commission payouts. This takes a few minutes and is handled entirely by Stripe, not AmenityFit directly.</p>
    <p id="connect-pending" style="font-size:13px;color:var(--muted);margin-bottom:14px;display:none;">Your Stripe account is set up but still finishing verification. This can take a little time, check back soon.</p>
    <p id="connect-done" style="font-size:13px;color:var(--success);margin-bottom:14px;display:none;">Your payout account is connected and verified. Commission payouts are sent here automatically.</p>
    <button class="copy-btn" id="connect-btn" onclick="handleConnectPayout()" style="display:none;">Connect Bank Account</button>
  </div>

  <div class="checklist-card" id="tax-form-card" style="display:none;">
    <h2>Tax Information</h2>
    <p id="tax-form-done" style="font-size:13px;color:var(--success);margin-bottom:14px;display:none;"></p>
    <div id="tax-form-wrap">
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;">Required before your first payout. Submitted directly and securely to Stripe.</p>
      <div class="form-group"><label>Legal Name</label><input type="text" id="tf-legal-name" placeholder="As shown on your tax documents" /></div>
      <div class="form-group"><label>Address Line 1</label><input type="text" id="tf-address1" placeholder="Street address" /></div>
      <div class="form-group"><label>Address Line 2 <span style="font-weight:300;color:var(--muted);">(optional)</span></label><input type="text" id="tf-address2" placeholder="Apt, suite, etc." /></div>
      <div class="form-group"><label>City</label><input type="text" id="tf-city" placeholder="City" /></div>
      <div class="form-group"><label>State / Region <span style="font-weight:300;color:var(--muted);">(optional)</span></label><input type="text" id="tf-state" placeholder="State or region" /></div>
      <div class="form-group"><label>Postal Code</label><input type="text" id="tf-postal" placeholder="Postal code" /></div>
      <div class="form-group" id="tf-us-only" style="display:none;">
        <label>SSN or EIN</label>
        <input type="text" id="tf-id-number" placeholder="XXX-XX-XXXX" />
      </div>
      <div class="form-group" id="tf-intl-only" style="display:none;">
        <label>Date of Birth</label>
        <input type="date" id="tf-dob" />
      </div>
      <div class="form-group" id="tf-intl-only-2" style="display:none;">
        <label>Foreign Tax ID <span style="font-weight:300;color:var(--muted);">(optional, only if claiming a tax treaty benefit)</span></label>
        <input type="text" id="tf-foreign-tax-id" placeholder="If applicable" />
      </div>
      <div class="form-group"><label>Typed Signature</label><input type="text" id="tf-signature" placeholder="Type your full legal name to sign" /></div>
      <div style="display:flex;align-items:flex-start;gap:8px;margin:14px 0;">
        <input type="checkbox" id="tf-certify" style="margin-top:3px;" />
        <label for="tf-certify" style="font-size:12px;color:var(--muted);line-height:1.4;">Under penalties of perjury, I certify that the information provided is true, correct, and complete, and that I am the person named above.</label>
      </div>
      <button class="copy-btn" id="tf-submit-btn" onclick="handleSubmitTaxForm()">Submit Tax Information</button>
    </div>
  </div>

  <div class="referral-card">'''
    edits.append(('tax form card HTML', old1, new1))

    # Edit 2: add the submit handler and field-branching function right
    # after the existing handleConnectPayout function
    old2 = '''  window.handleConnectPayout = async function() {
    const btn = document.getElementById('connect-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Loading...';
    try {
      const user = auth.currentUser;
      if (!user) { window.location.href = 'affiliate-login.html'; return; }
      const idToken = await user.getIdToken();
      const resp = await fetch('https://us-central1-amenityfit-31276.cloudfunctions.net/createAffiliateOnboardingLink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) {
        throw new Error(data.error || 'Failed to start Stripe onboarding.');
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert(err.message || 'Something went wrong starting the payout connection. Please try again.');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };'''
    new2 = '''  window.handleConnectPayout = async function() {
    const btn = document.getElementById('connect-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Loading...';
    try {
      const user = auth.currentUser;
      if (!user) { window.location.href = 'affiliate-login.html'; return; }
      const idToken = await user.getIdToken();
      const resp = await fetch('https://us-central1-amenityfit-31276.cloudfunctions.net/createAffiliateOnboardingLink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) {
        throw new Error(data.error || 'Failed to start Stripe onboarding.');
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert(err.message || 'Something went wrong starting the payout connection. Please try again.');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };

  function renderTaxForm(country) {
    window.currentAffiliateCountry = country;
    document.getElementById('tf-us-only').style.display = country === 'US' ? 'block' : 'none';
    document.getElementById('tf-intl-only').style.display = country === 'US' ? 'none' : 'block';
    document.getElementById('tf-intl-only-2').style.display = country === 'US' ? 'none' : 'block';
  }

  window.handleSubmitTaxForm = async function() {
    const btn = document.getElementById('tf-submit-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const user = auth.currentUser;
      if (!user) { window.location.href = 'affiliate-login.html'; return; }
      const idToken = await user.getIdToken();
      const payload = {
        idToken,
        legalName: document.getElementById('tf-legal-name').value.trim(),
        addressLine1: document.getElementById('tf-address1').value.trim(),
        addressLine2: document.getElementById('tf-address2').value.trim(),
        city: document.getElementById('tf-city').value.trim(),
        state: document.getElementById('tf-state').value.trim(),
        postalCode: document.getElementById('tf-postal').value.trim(),
        signature: document.getElementById('tf-signature').value.trim(),
        certifyChecked: document.getElementById('tf-certify').checked,
      };
      if (window.currentAffiliateCountry === 'US') {
        payload.idNumber = document.getElementById('tf-id-number').value.trim();
      } else {
        payload.dateOfBirth = document.getElementById('tf-dob').value;
        payload.foreignTaxId = document.getElementById('tf-foreign-tax-id').value.trim();
      }
      const resp = await fetch('https://us-central1-amenityfit-31276.cloudfunctions.net/submitAffiliateTaxForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to submit tax information.');
      location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Something went wrong submitting your tax information. Please try again.');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };'''
    edits.append(('submit handler + field-branching function', old2, new2))

    # Edit 3: show/hide the card based on stripeConnectAccountId + taxFormCompletedAt
    old3 = '''        } else {
          document.getElementById('connect-not-started').style.display = 'block';
          document.getElementById('connect-btn').style.display = 'inline-block';
        }
      }'''
    new3 = '''        } else {
          document.getElementById('connect-not-started').style.display = 'block';
          document.getElementById('connect-btn').style.display = 'inline-block';
        }

        if (affiliate.stripeConnectAccountId) {
          document.getElementById('tax-form-card').style.display = 'block';
          if (affiliate.taxFormCompletedAt) {
            document.getElementById('tax-form-wrap').style.display = 'none';
            const doneEl = document.getElementById('tax-form-done');
            doneEl.style.display = 'block';
            doneEl.textContent = (affiliate.taxFormType || 'Tax form') + ' on file' + (affiliate.taxFormIdLast4 ? (' \\u00b7 ending in ' + affiliate.taxFormIdLast4) : '') + '.';
          } else {
            renderTaxForm(affiliate.country);
          }
        }
      }'''
    edits.append(('show/hide logic in onAuthStateChanged', old3, new3))

    for label, old, new in edits:
        count = content.count(old)
        if count != 1:
            print(f"ABORTED before writing: '{label}' matched {count} times (expected exactly 1). No changes were made to the file.")
            sys.exit(1)

    for label, old, new in edits:
        content = content.replace(old, new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Applied {len(edits)} edits successfully to {path}")
    for label, _, _ in edits:
        print(f"  - {label}")

if __name__ == '__main__':
    main()
