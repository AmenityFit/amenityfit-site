import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 add_hotel_pricing_toggle.py index.html")
        sys.exit(1)

    path = sys.argv[1]
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    edits = []

    # Edit 1: insert the mode toggle above "Building size", add id to the label span
    old1 = '''    <div class="calc-card reveal reveal-d1">
      <div class="calc-top">
        <span class="calc-top-label">Building size</span>'''
    new1 = '''    <div class="calc-card reveal reveal-d1">
      <style>
        .pricing-mode-toggle{display:flex;gap:8px;margin-bottom:20px;}
        .pricing-mode-toggle .mode-btn{flex:1;padding:10px 16px;border-radius:8px;border:1px solid #d8dce3;background:#fff;color:#5c6577;font-size:14px;cursor:pointer;transition:all .15s ease;}
        .pricing-mode-toggle .mode-btn.active{border-color:#2554e8;color:#2554e8;font-weight:600;background:#f0f4ff;}
      </style>
      <div class="pricing-mode-toggle" id="pricing-mode-toggle" role="group" aria-label="Pricing type">
        <button type="button" class="mode-btn active" id="mode-btn-building" onclick="setPricingMode('building')">Buildings</button>
        <button type="button" class="mode-btn" id="mode-btn-hotel" onclick="setPricingMode('hotel')">Hotels</button>
      </div>
      <div class="calc-top">
        <span class="calc-top-label" id="calc-top-label">Building size</span>'''
    edits.append(('toggle markup + label id', old1, new1))

    # Edit 2: append a hidden hotel tier-pills block after the building one
    old2 = '''        <div class="tier-pill tier-custom" id="tp7" onclick="selectTierPill(1001)"><strong>Custom</strong><span>1,000+ units</span></div>
      </div>
    </div>
  </div>
</section>'''
    new2 = '''        <div class="tier-pill tier-custom" id="tp7" onclick="selectTierPill(1001)"><strong>Custom</strong><span>1,000+ units</span></div>
      </div>
      <div class="tier-pills" id="tier-pills-hotel" style="display:none">
        <div class="tier-pill" id="tph1" onclick="selectTierPill(50)"><strong class="tier-price" data-usd="349">$349/mo</strong><span>Up to 100 rooms</span></div>
        <div class="tier-pill" id="tph2" onclick="selectTierPill(175)"><strong class="tier-price" data-usd="699">$699/mo</strong><span>101 to 250 rooms</span></div>
        <div class="tier-pill" id="tph3" onclick="selectTierPill(375)"><strong class="tier-price" data-usd="1299">$1,299/mo</strong><span>251 to 500 rooms</span></div>
        <div class="tier-pill" id="tph4" onclick="selectTierPill(750)"><strong class="tier-price" data-usd="2199">$2,199/mo</strong><span>501 to 1,000 rooms</span></div>
        <div class="tier-pill tier-custom" id="tph5" onclick="selectTierPill(1001)"><strong>Custom</strong><span>1,000+ rooms or multi-property chain</span></div>
      </div>
    </div>
  </div>
</section>'''
    edits.append(('hidden hotel tier pills', old2, new2))

    # Edit 3: rename tiers -> buildingTiers, add hotelTiers + mode state + setPricingMode()
    old3 = '''  const tiers = [
    { max: 50,   monthly: 599,  id: 'tp1' },
    { max: 100,  monthly: 999,  id: 'tp2' },
    { max: 200,  monthly: 1499, id: 'tp3' },
    { max: 300,  monthly: 1999, id: 'tp4' },
    { max: 500,  monthly: 2799, id: 'tp5' },
    { max: 1000, monthly: 3999, id: 'tp6' },
    { max: Infinity, monthly: null, id: 'tp7' }
  ];
  let _lastTierMonthly = null;'''
    new3 = '''  const buildingTiers = [
    { max: 50,   monthly: 599,  id: 'tp1' },
    { max: 100,  monthly: 999,  id: 'tp2' },
    { max: 200,  monthly: 1499, id: 'tp3' },
    { max: 300,  monthly: 1999, id: 'tp4' },
    { max: 500,  monthly: 2799, id: 'tp5' },
    { max: 1000, monthly: 3999, id: 'tp6' },
    { max: Infinity, monthly: null, id: 'tp7' }
  ];
  const hotelTiers = [
    { max: 100,  monthly: 349,  id: 'tph1' },
    { max: 250,  monthly: 699,  id: 'tph2' },
    { max: 500,  monthly: 1299, id: 'tph3' },
    { max: 1000, monthly: 2199, id: 'tph4' },
    { max: Infinity, monthly: null, id: 'tph5' }
  ];
  let pricingMode = 'building';
  let currentTierSet = buildingTiers;
  let _lastTierMonthly = null;

  function setPricingMode(mode, isInitial) {
    pricingMode = (mode === 'hotel') ? 'hotel' : 'building';
    currentTierSet = (pricingMode === 'hotel') ? hotelTiers : buildingTiers;
    const buildingBtn = document.getElementById('mode-btn-building');
    const hotelBtn = document.getElementById('mode-btn-hotel');
    if (buildingBtn) buildingBtn.classList.toggle('active', pricingMode === 'building');
    if (hotelBtn) hotelBtn.classList.toggle('active', pricingMode === 'hotel');
    const label = document.getElementById('calc-top-label');
    if (label) label.textContent = pricingMode === 'hotel' ? 'Hotel size' : 'Building size';
    const buildingPills = document.getElementById('tier-pills');
    const hotelPills = document.getElementById('tier-pills-hotel');
    if (buildingPills) buildingPills.style.display = pricingMode === 'hotel' ? 'none' : '';
    if (hotelPills) hotelPills.style.display = pricingMode === 'hotel' ? '' : 'none';
    const customUnitsInput = document.getElementById('custom-units');
    if (customUnitsInput) customUnitsInput.placeholder = pricingMode === 'hotel' ? 'Enter exact room count' : 'Enter exact unit count';
    const customRes = document.getElementById('custom-result');
    if (customRes) customRes.innerHTML = '';
    if (customUnitsInput) customUnitsInput.value = '';
    _lastTierMonthly = null;
    const slider = document.getElementById('unit-slider');
    updateCalc(slider ? slider.value : 100);
    if (!isInitial) {
      const params = new URLSearchParams(window.location.search);
      if (pricingMode === 'hotel') { params.set('type', 'hotel'); } else { params.delete('type'); }
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
      window.history.replaceState(null, '', newUrl);
    }
  }'''
    edits.append(('buildingTiers/hotelTiers + setPricingMode()', old3, new3))

    # Edit 4: updateCalc - use currentTierSet instead of tiers, and swap the unit word
    old4 = '''  function updateCalc(val) {
    val = parseInt(val);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 100000) val = 100000;
    document.getElementById('unit-display').textContent = val + ' units';
    let tier = null;
    for (let i = 0; i < tiers.length; i++) {
      if (val <= tiers[i].max) { tier = tiers[i]; break; }
    }
    if (!tier) tier = tiers[tiers.length - 1];
    tiers.forEach(function(t) {
      const el = document.getElementById(t.id);
      if (el) el.classList.remove('active');
    });'''
    new4 = '''  function updateCalc(val) {
    val = parseInt(val);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 100000) val = 100000;
    document.getElementById('unit-display').textContent = val + (pricingMode === 'hotel' ? ' rooms' : ' units');
    let tier = null;
    for (let i = 0; i < currentTierSet.length; i++) {
      if (val <= currentTierSet[i].max) { tier = currentTierSet[i]; break; }
    }
    if (!tier) tier = currentTierSet[currentTierSet.length - 1];
    buildingTiers.concat(hotelTiers).forEach(function(t) {
      const el = document.getElementById(t.id);
      if (el) el.classList.remove('active');
    });'''
    edits.append(('updateCalc uses currentTierSet + rooms/units word', old4, new4))

    # Edit 5: calcCustom - branch pricing + wording by mode
    old5 = '''  function calcCustom() {
    const units = parseInt(document.getElementById('custom-units').value);
    const res = document.getElementById('custom-result');
    if (!units || units < 1) { res.textContent = 'Please enter a valid unit count.'; return; }
    let base, label;
    if (units <= 300) { base = 1999; label = '201 to 300 units'; }
    else if (units <= 500) { base = 2799; label = '301 to 500 units'; }
    else if (units <= 1000) { base = 3999; label = '501 to 1,000 units'; }
    else { base = null; label = 'enterprise portfolio'; }
    if (base) {
      res.innerHTML = `Estimated for ${units} units (${label}): <strong>${formatCurrency(base)}/mo</strong> &middot; <strong>${formatCurrency(base*10)}/yr</strong> billed annually. Final pricing confirmed after review.`;
    } else {
      res.innerHTML = `For a portfolio of ${units}+ units, pricing is determined after a review call. Apply below and we will follow up within 2 business days.`;
    }
  }'''
    new5 = '''  function calcCustom() {
    const units = parseInt(document.getElementById('custom-units').value);
    const res = document.getElementById('custom-result');
    const noun = pricingMode === 'hotel' ? 'rooms' : 'units';
    if (!units || units < 1) { res.textContent = 'Please enter a valid ' + noun.slice(0, -1) + ' count.'; return; }
    let base, label;
    if (pricingMode === 'hotel') {
      if (units <= 500) { base = 1299; label = '251 to 500 rooms'; }
      else if (units <= 1000) { base = 2199; label = '501 to 1,000 rooms'; }
      else { base = null; label = 'multi-property chain'; }
    } else {
      if (units <= 300) { base = 1999; label = '201 to 300 units'; }
      else if (units <= 500) { base = 2799; label = '301 to 500 units'; }
      else if (units <= 1000) { base = 3999; label = '501 to 1,000 units'; }
      else { base = null; label = 'enterprise portfolio'; }
    }
    if (base) {
      res.innerHTML = `Estimated for ${units} ${noun} (${label}): <strong>${formatCurrency(base)}/mo</strong> &middot; <strong>${formatCurrency(base*10)}/yr</strong> billed annually. Final pricing confirmed after review.`;
    } else {
      res.innerHTML = `For a portfolio of ${units}+ ${noun}, pricing is determined after a review call. Apply below and we will follow up within 2 business days.`;
    }
  }'''
    edits.append(('calcCustom branches by mode', old5, new5))

    # Edit 6: initial page load - read ?type=hotel from the URL instead of always starting on buildings
    old6 = '''  updateCalc(100);

  const slider = document.getElementById('unit-slider');'''
    new6 = '''  const initialUrlParams = new URLSearchParams(window.location.search);
  const initialPricingMode = initialUrlParams.get('type') === 'hotel' ? 'hotel' : 'building';
  setPricingMode(initialPricingMode, true);

  const slider = document.getElementById('unit-slider');'''
    edits.append(('read ?type=hotel on load', old6, new6))

    # Apply all edits with a strict count(==1) check before writing anything
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
