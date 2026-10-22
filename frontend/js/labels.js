/* Business-type-aware wording.
   The data fields are always `size` and `colour` (so the CSV and the API never change),
   but a cafe sees "Size" and "Type", a clothing shop sees "Size" and "Colour", and so on. */
(function () {
  var MAP = {
    Clothing: {
      first: 'Size', second: 'Colour', sizePh: 'Size (optional, e.g. M)', colourPh: 'Colour (optional, e.g. Black)',
      itemEg: 'Boxy T-Shirt', catEg: 'T-Shirts',
      sampleCsv: 'name,price,category,size,colour,stock\nBoxy T-Shirt,899,T-Shirts,M,Black,10\nBoxy T-Shirt,899,T-Shirts,L,Black,15\nRaw Denim Jeans,2499,Jeans,32,Indigo,8\nCrimson Hoodie,1899,Hoodies,L,Crimson,12\n'
    },
    Cafe: {
      first: 'Size', second: 'Type', sizePh: 'Size (optional, e.g. Regular)', colourPh: 'Type (optional, e.g. Hot)',
      itemEg: 'Cappuccino', catEg: 'Coffee',
      sampleCsv: 'name,price,category,size,colour,stock\nCappuccino,180,Coffee,Regular,Hot,50\nCappuccino,180,Coffee,Regular,Iced,50\nCappuccino,180,Coffee,Large,Hot,50\nVeg Sandwich,120,Snacks,,,25\nChocolate Brownie,90,Desserts,,,12\n'
    },
    Salon: {
      first: 'Option', second: 'Style', sizePh: 'Option (optional, e.g. Short hair)', colourPh: 'Style (optional, e.g. Basic)',
      itemEg: 'Haircut', catEg: 'Hair',
      sampleCsv: 'name,price,category,size,colour,stock\nHaircut,400,Hair,Short hair,Basic,100\nHaircut,400,Hair,Long hair,Basic,100\nFacial,900,Skin,,,100\n'
    },
    Electronics: {
      first: 'Model', second: 'Colour', sizePh: 'Model (optional, e.g. 128 GB)', colourPh: 'Colour (optional, e.g. Black)',
      itemEg: 'Wireless Earbuds', catEg: 'Audio',
      sampleCsv: 'name,price,category,size,colour,stock\nWireless Earbuds,1999,Audio,,Black,15\nPhone Case,299,Accessories,iPhone 15,Black,40\nPhone Case,299,Accessories,Galaxy S24,Blue,30\n'
    },
    Other: {
      first: 'Option', second: 'Variant', sizePh: 'Option (optional, e.g. Small)', colourPh: 'Variant (optional)',
      itemEg: 'Your item', catEg: 'Category',
      sampleCsv: 'name,price,category,size,colour,stock\nGift Box,999,Gifts,Small,,10\nGift Box,999,Gifts,Large,,5\nGreeting Card,99,Gifts,,,50\n'
    }
  };

  function cfg(type) { return MAP[type] || MAP.Other; }
  window.VARIANT_LABELS = cfg('Other');     // neutral wording until we know the business type

  function setAll(selector, fn) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) fn(nodes[i]);
  }

  function apply() {
    var L = window.VARIANT_LABELS;
    setAll('[data-vlabel="first"]', function (n) { n.textContent = L.first; });
    setAll('[data-vlabel="second"]', function (n) { n.textContent = L.second; });
    setAll('.variant-size', function (n) { n.placeholder = L.sizePh; });
    setAll('.variant-colour', function (n) { n.placeholder = L.colourPh; });
    setAll('[data-vph="item"]', function (n) { n.placeholder = 'e.g. ' + L.itemEg; });
    setAll('[data-vph="category"]', function (n) { n.placeholder = 'e.g. ' + L.catEg; });
    setAll('[data-vcsvnote]', function (n) {
      n.textContent = 'Column "size" holds the ' + L.first.toLowerCase() + ' and column "colour" holds the ' +
        L.second.toLowerCase() + '. Leave them blank if an item has no options.';
    });
  }
  window.applyVariantLabels = apply;

  // https://t.me/<bot>?start=<code>   ->   tg://resolve?domain=<bot>&start=<code>
  // The tg:// form opens the installed Telegram app directly, so it still works on networks that block t.me.
  window.telegramAppLink = function (url) {
    try {
      var u = new URL(url);
      if (u.hostname !== 't.me') return '';
      var bot = u.pathname.replace(/^\//, '');
      var start = u.searchParams.get('start');
      if (!bot) return '';
      return 'tg://resolve?domain=' + encodeURIComponent(bot) + (start ? '&start=' + encodeURIComponent(start) : '');
    } catch (e) { return ''; }
  };

  // Shows two ways to open a Telegram link under a button: the app, or the browser.
  window.showTelegramChoices = function (anchor, httpsLink) {
    if (!anchor || !httpsLink) return;
    var old = anchor.parentNode.querySelector('.tg-choices');
    if (old) old.remove();
    var appLink = window.telegramAppLink(httpsLink);
    var box = document.createElement('div');
    box.className = 'tg-choices';
    box.style.cssText = 'flex-basis:100%; width:100%; text-align:center; margin-top:0.5rem;';
    var hint = document.createElement('p');
    hint.style.cssText = 'font-size:0.8125rem; margin:0 0 0.5rem; color:var(--muted-rose);';
    hint.textContent = 'Choose how to open Telegram. If the browser says the site can\u2019t be reached, use the app, or open the link on your phone.';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;';
    if (appLink) {
      var a = document.createElement('a');
      a.className = 'btn btn-secondary'; a.href = appLink; a.textContent = 'Open in Telegram app';
      row.appendChild(a);
    }
    var b = document.createElement('a');
    b.className = 'btn btn-secondary'; b.href = httpsLink; b.target = '_blank'; b.rel = 'noopener';
    b.textContent = 'Open in browser';
    row.appendChild(b);
    box.appendChild(hint); box.appendChild(row);
    anchor.insertAdjacentElement('afterend', box);
  };

  function load() {
    if (!window.api || typeof window.api.getBusiness !== 'function') return;
    window.api.getBusiness().then(function (biz) {
      if (biz && biz.type) { window.VARIANT_LABELS = cfg(biz.type); apply(); }
    }).catch(function () { /* labels are cosmetic; ignore errors */ });
  }

  document.addEventListener('DOMContentLoaded', function () { apply(); load(); });
})();
