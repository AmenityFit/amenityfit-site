import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 add_hotel_pricing_colors.py index.html")
        sys.exit(1)

    path = sys.argv[1]
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    edits = []

    # Edit 1: give the calc-card a stable id so JS can toggle a mode class on it
    old1 = '''    <div class="calc-card reveal reveal-d1">'''
    new1 = '''    <div class="calc-card reveal reveal-d1" id="pricing-calc-card">'''
    edits.append(('add id to calc-card', old1, new1))

    # Edit 2: replace the placeholder blue toggle-button color with real
    # building blue / hotel orange, and add the color-flip rules for the
    # slider thumb, unit-count number, save badge, and active tier-pill box
    old2 = '''      <style>
        .pricing-mode-toggle{display:flex;gap:8px;margin-bottom:20px;}
        .pricing-mode-toggle .mode-btn{flex:1;padding:10px 16px;border-radius:8px;border:1px solid #d8dce3;background:#fff;color:#5c6577;font-size:14px;cursor:pointer;transition:all .15s ease;}
        .pricing-mode-toggle .mode-btn.active{border-color:#2554e8;color:#2554e8;font-weight:600;background:#f0f4ff;}
      </style>'''
    new2 = '''      <style>
        .pricing-mode-toggle{display:flex;gap:8px;margin-bottom:20px;}
        .pricing-mode-toggle .mode-btn{flex:1;padding:10px 16px;border-radius:8px;border:1px solid #d8dce3;background:#fff;color:#5c6577;font-size:14px;cursor:pointer;transition:all .15s ease;}
        #mode-btn-building.active{border-color:var(--primary);color:var(--primary);font-weight:600;background:rgba(30,95,190,0.08);}
        #mode-btn-hotel.active{border-color:var(--hotel-primary);color:var(--hotel-primary);font-weight:600;background:rgba(254,108,45,0.08);}
        .calc-card.mode-hotel .calc-unit-display{color:var(--hotel-primary);}
        .calc-card.mode-hotel input[type="range"]::-webkit-slider-thumb{background:var(--hotel-primary);box-shadow:0 2px 10px rgba(254,108,45,0.4);}
        .calc-card.mode-hotel .calc-save{background:rgba(254,108,45,0.1);color:var(--hotel-primary);}
        .calc-card.mode-hotel .tier-pill.active{border-color:var(--hotel-primary);background:rgba(254,108,45,0.05);}
        .calc-card.mode-hotel .tier-pill:hover{border-color:var(--hotel-accent);background:rgba(255,143,90,0.06);}
      </style>'''
    edits.append(('real color rules for both modes', old2, new2))

    # Edit 3: toggle the mode-hotel class on the calc-card inside setPricingMode()
    old3 = '''    if (buildingBtn) buildingBtn.classList.toggle('active', pricingMode === 'building');
    if (hotelBtn) hotelBtn.classList.toggle('active', pricingMode === 'hotel');'''
    new3 = '''    if (buildingBtn) buildingBtn.classList.toggle('active', pricingMode === 'building');
    if (hotelBtn) hotelBtn.classList.toggle('active', pricingMode === 'hotel');
    const calcCard = document.getElementById('pricing-calc-card');
    if (calcCard) calcCard.classList.toggle('mode-hotel', pricingMode === 'hotel');'''
    edits.append(('apply mode-hotel class in setPricingMode()', old3, new3))

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
