(function(window, $){
  'use strict';
  window.App = window.App || {};

  const Util = window.App.Util;
  const Store = window.App.Store;

  const App = window.App;

  // App state
  App.state = {
    categories: [],
    query: '',
    sort: 'recent'
  };

  // Initialize events and data
  App.init = function init(){
    const data = Store.load();
    App.state.categories = data.categories || [];

    // Keyboard: focus search with '/'
    $(document).on('keydown', function(e){
      if (e.key === '/' && !$(e.target).is('input, textarea')) {
        e.preventDefault();
        $('#search').trigger('focus');
      }
      if (e.key === 'Escape') {
        closeModals();
      }
    });

    // Toolbar actions
    $('#btnAdd').on('click', function(){ openCategoryModal(); });
    $('#btnExport').on('click', function(){ doExport(); });
    $('#importFile').on('change', function(){ doImport(this); });
    $('#search').on('input', function(){ App.state.query = $(this).val().toLowerCase(); App.render(); });
    $('#sort').on('change', function(){ App.state.sort = $(this).val(); App.render(); });
    $('#btnClearFilters').on('click', function(){ App.state.query=''; $('#search').val(''); App.state.sort='recent'; $('#sort').val('recent'); App.render(); });

    // Category modal
    $(document).on('click', '[data-close-cat]', function(){ closeCategoryModal(); });
    $('#categoryForm').on('submit', function(e){ e.preventDefault(); submitCategoryForm(); });

    // Ledger modal
    $(document).on('click', '[data-close-ledger]', function(){ closeLedgerModal(); });
    $('#txForm').on('submit', function(e){ e.preventDefault(); submitTxForm(); });

    // Delegated actions on category cards
    $('#categoryList')
      .on('click', '[data-action="edit"]', function(){ const id = $(this).closest('[data-id]').data('id'); editCategory(id); })
      .on('click', '[data-action="delete"]', function(){ const id = $(this).closest('[data-id]').data('id'); deleteCategory(id); })
      .on('click', '[data-action="ledger"]', function(){ const id = $(this).closest('[data-id]').data('id'); openLedger(id); })
      .on('click', '[data-action="deposit"]', function(){ quickTx($(this), 'deposit'); })
      .on('click', '[data-action="withdraw"]', function(){ quickTx($(this), 'withdraw'); });

    // Render color picker once
    renderColorPicker();
  };

  // Render UI
  App.render = function render(){
    try {
      const cats = getFilteredSorted();
      renderStats();
      renderOverallChart();
      const $list = $('#categoryList').empty();
      if (cats.length === 0) {
        $list.append($("<div class='sm:col-span-2 lg:col-span-3 text-center text-slate-500 py-16'>No categories match. Try adding one or clearing filters.</div>"));
        return;
      }
      cats.forEach(c => $list.append(renderCategoryCard(c)));
    } catch (e) {
      console.error('Render failed', e);
    }
  };

  // Helpers: filtering and sorting
  function getFilteredSorted(){
    const q = App.state.query;
    let arr = App.state.categories.slice();
    if (q) arr = arr.filter(c => c.name.toLowerCase().includes(q));
    const sort = App.state.sort;
    arr.forEach(c => c._progress = Util.percent(c.saved, c.target));
    switch (sort) {
      case 'name-asc': arr.sort((a,b)=>a.name.localeCompare(b.name)); break;
      case 'name-desc': arr.sort((a,b)=>b.name.localeCompare(a.name)); break;
      case 'progress-desc': arr.sort((a,b)=>b._progress - a._progress); break;
      case 'progress-asc': arr.sort((a,b)=>a._progress - b._progress); break;
      case 'target-desc': arr.sort((a,b)=>b.target - a.target); break;
      case 'target-asc': arr.sort((a,b)=>a.target - b.target); break;
      default: // recent
        arr.sort((a,b)=> (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    }
    return arr;
  }

  function renderStats(){
    const totals = App.state.categories.reduce((acc, c)=>{ acc.saved += c.saved||0; acc.target += c.target||0; return acc; }, {saved:0, target:0});
    const pct = totals.target > 0 ? Math.round((totals.saved / totals.target) * 100) : 0;
    $('#statSaved').text(Util.formatCurrency(totals.saved));
    $('#statTargets').text(Util.formatCurrency(totals.target));
    $('#statOverall').text(pct + '%');
  }

  function renderOverallChart(){
    const totals = App.state.categories.reduce((acc, c)=>{ acc.saved += c.saved||0; acc.target += c.target||0; return acc; }, {saved:0, target:0});
    const pct = totals.target > 0 ? Util.clamp(Math.round((totals.saved/totals.target)*100), 0, 100) : 0;
    const color = '#2563eb';
    $('#overallPct').text(pct + '%');
    const svg = donutSVG(pct, color);
    $('#overallChart').html(svg);
  }

  function donutSVG(pct, color){
    const radius = 52; const C = 2*Math.PI*radius; const dash = (C * pct) / 100; const gap = C - dash;
    const svg = `
      <svg viewBox="0 0 120 120" class="w-full h-full" aria-hidden="true">
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="12"></circle>
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${dash} ${gap}" transform="rotate(-90 60 60)"></circle>
      </svg>`;
    return svg;
  }

  function renderCategoryCard(cat){
    const pct = cat.target > 0 ? Util.clamp(Math.round((cat.saved / cat.target) * 100), 0, 100) : 0;
    const projected = Util.projectDate(cat.saved, cat.target, cat.monthly || 0);
    const svg = donutSVG(pct, cat.color || '#2563eb');
    const $el = $(`
      <article class="card p-5" data-id="${cat.id}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="h-3 w-3 rounded-full" style="background:${cat.color}"></span>
            <h3 class="font-semibold text-lg leading-tight">${escapeHtml(cat.name)}</h3>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-secondary" data-action="ledger" title="View ledger">Ledger</button>
            <button class="btn-secondary" data-action="edit" title="Edit">Edit</button>
            <button class="btn-danger" data-action="delete" title="Delete">Delete</button>
          </div>
        </div>
        <div class="mt-4 flex items-center gap-4">
          <div class="relative w-28 h-28">${svg}
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="font-bold">${pct}%</div>
                <div class="text-[10px] text-slate-500">funded</div>
              </div>
            </div>
          </div>
          <div class="flex-1">
            <div class="h-2.5 rounded-full bg-slate-200">
              <div class="h-2.5 rounded-full transition-all" style="width:${pct}%; background:${cat.color}"></div>
            </div>
            <div class="mt-2 text-sm text-slate-600 flex items-center justify-between">
              <span><strong>${Util.formatCurrency(cat.saved)}</strong> saved</span>
              <span>of <strong>${Util.formatCurrency(cat.target)}</strong> target</span>
            </div>
            <div class="mt-1 text-xs text-slate-500">
              ${cat.monthly ? `Contributing ${Util.formatCurrency(cat.monthly)} / mo` : 'No monthly contribution set'}
              ${projected ? ` • Est. done by ${projected}` : ''}
            </div>
            ${cat.notes ? `<div class="mt-2 text-xs text-slate-500">${escapeHtml(cat.notes)}</div>` : ''}
          </div>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="flex items-center gap-2">
            <label for="amount-${cat.id}" class="sr-only">Amount</label>
            <input id="amount-${cat.id}" class="input" placeholder="Amount" inputmode="decimal">
          </div>
          <button class="btn-primary" data-action="deposit">Quick deposit</button>
          <button class="btn-secondary" data-action="withdraw">Withdraw</button>
        </div>
      </article>
    `);
    return $el;
  }

  function renderColorPicker(){
    const $wrap = $('#colorPick').empty();
    Util.palette.forEach((hex, idx) => {
      const id = 'color-' + idx;
      const $opt = $(`
        <label class="inline-flex items-center mr-2 mb-2 cursor-pointer select-none">
          <input type="radio" name="catColor" value="${hex}" class="sr-only">
          <span class="h-7 w-7 rounded-full ring-2 ring-transparent focus-visible:ring-blue-300" style="background:${hex}" tabindex="0" role="button" aria-label="Color ${hex}"></span>
        </label>
      `);
      $opt.on('keydown', 'span', function(e){ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); $opt.find('input').prop('checked', true).trigger('change'); } });
      $opt.on('click', function(){ $opt.find('input').prop('checked', true).trigger('change'); });
      $wrap.append($opt);
    });
  }

  // Category form handlers
  function openCategoryModal(editCat){
    $('#catId').val(editCat ? editCat.id : '');
    $('#catTitle').text(editCat ? 'Edit Category' : 'New Category');
    $('#catName').val(editCat ? editCat.name : '');
    $('#catTarget').val(editCat ? String(editCat.target) : '');
    $('#catMonthly').val(editCat ? String(editCat.monthly || '') : '');
    $('#catNotes').val(editCat ? (editCat.notes || '') : '');

    // set color selection
    const color = editCat ? editCat.color : Util.palette[0];
    $('#colorPick input[type=radio]').each(function(){
      const v = $(this).val();
      $(this).prop('checked', v === color);
    });

    $('#categoryModal').removeClass('hidden');
    setTimeout(()=> $('#catName').trigger('focus'), 10);
  }
  function closeCategoryModal(){ $('#categoryModal').addClass('hidden'); }

  function submitCategoryForm(){
    const id = $('#catId').val();
    const name = String($('#catName').val() || '').trim();
    const target = Util.parseCurrency($('#catTarget').val());
    const monthly = Util.parseCurrency($('#catMonthly').val());
    const color = $('#colorPick input[type=radio]:checked').val() || Util.palette[0];
    const notes = String($('#catNotes').val() || '').trim();

    if (!name) return toast('Name is required');
    if (!(target > 0)) return toast('Target must be greater than 0');
    if (monthly < 0) return toast('Monthly cannot be negative');

    if (id) {
      const idx = App.state.categories.findIndex(c => c.id === id);
      if (idx >= 0) {
        const cat = App.state.categories[idx];
        cat.name = name; cat.target = target; cat.monthly = monthly || 0; cat.color = color; cat.notes = notes; cat.updatedAt = Date.now();
      }
      toast('Category updated');
    } else {
      const cat = { id: Util.uid(), name, target, saved: 0, monthly: monthly || 0, color, notes, createdAt: Date.now(), updatedAt: Date.now(), transactions: [] };
      App.state.categories.push(cat);
      toast('Category added');
    }
    persist();
    closeCategoryModal();
    App.render();
  }

  function editCategory(id){
    const cat = App.state.categories.find(c => c.id === id);
    if (!cat) return;
    openCategoryModal(cat);
  }

  function deleteCategory(id){
    const cat = App.state.categories.find(c => c.id === id);
    if (!cat) return;
    const ok = window.confirm(`Delete category "${cat.name}"? This removes its ledger.`);
    if (!ok) return;
    App.state.categories = App.state.categories.filter(c => c.id !== id);
    persist();
    App.render();
    toast('Category deleted');
  }

  function quickTx($btn, type){
    const id = $btn.closest('[data-id]').data('id');
    const $card = $btn.closest('[data-id]');
    const $input = $card.find('input[id^=amount-]');
    const amount = Util.parseCurrency($input.val());
    if (!(amount > 0)) return toast('Enter a valid amount');
    addTransaction(id, type, amount, 'Quick entry', Util.todayISO());
    $input.val('');
  }

  function openLedger(id){
    const cat = App.state.categories.find(c => c.id === id);
    if (!cat) return;
    $('#txCatId').val(cat.id);
    $('#ledgerCatName').text(cat.name);
    $('#txDate').val(Util.todayISO());
    renderTxTable(cat);
    $('#ledgerModal').removeClass('hidden');
  }
  function closeLedgerModal(){ $('#ledgerModal').addClass('hidden'); }

  function submitTxForm(){
    const id = $('#txCatId').val();
    const type = $('#txType').val();
    const amount = Util.parseCurrency($('#txAmount').val());
    const date = $('#txDate').val() || Util.todayISO();
    const note = $('#txNote').val();
    if (!(amount > 0)) return toast('Enter a valid amount');
    addTransaction(id, type, amount, note, date);
    $('#txAmount').val(''); $('#txNote').val('');
  }

  function renderTxTable(cat){
    const $tbody = $('#txTable').empty();
    if (!cat.transactions || !cat.transactions.length) {
      $tbody.append($(`<tr><td class='py-3 text-slate-500' colspan='5'>No transactions yet</td></tr>`));
      return;
    }
    const rows = cat.transactions.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
    rows.forEach(tx => {
      const $tr = $(`
        <tr>
          <td class="py-2 pr-6" data-label="Date">${Util.fmtDate(tx.date)}</td>
          <td class="py-2 pr-6" data-label="Type">${tx.type}</td>
          <td class="py-2 pr-6" data-label="Amount">${Util.formatCurrency(tx.amount)}</td>
          <td class="py-2 pr-6" data-label="Note">${escapeHtml(tx.note || '')}</td>
          <td class="py-2 pr-2 text-right" data-label="Actions"><button class="btn-secondary" data-txdel="${tx.id}" data-cid="${cat.id}">Remove</button></td>
        </tr>
      `);
      $tbody.append($tr);
    });
    // Remove tx
    $('#txTable [data-txdel]').off('click').on('click', function(){
      const txId = $(this).data('txdel');
      const cid = $(this).data('cid');
      removeTransaction(cid, txId);
    });
  }

  function addTransaction(catId, type, amount, note, dateISO){
    const cat = App.state.categories.find(c => c.id === catId);
    if (!cat) return;
    const tx = { id: Util.uid(), type, amount, date: dateISO || Util.todayISO(), note: note || '' };
    if (type === 'withdraw' && (cat.saved - amount) < 0) {
      return toast('Cannot withdraw more than saved');
    }
    cat.transactions = cat.transactions || [];
    cat.transactions.push(tx);
    cat.saved = Util.clamp((cat.saved || 0) + (type === 'deposit' ? amount : -amount), 0, Number.MAX_SAFE_INTEGER);
    cat.updatedAt = Date.now();
    persist();
    App.render();
    toast(type === 'deposit' ? 'Deposit added' : 'Withdrawal recorded');
    const current = $('#txCatId').val();
    if (current === catId) renderTxTable(cat);
  }

  function removeTransaction(catId, txId){
    const cat = App.state.categories.find(c => c.id === catId);
    if (!cat) return;
    const tx = cat.transactions.find(t => t.id === txId);
    if (!tx) return;
    const ok = window.confirm('Remove this transaction?');
    if (!ok) return;
    // Reverse effect
    cat.saved += (tx.type === 'deposit' ? -tx.amount : tx.amount);
    cat.saved = Util.clamp(cat.saved, 0, Number.MAX_SAFE_INTEGER);
    cat.transactions = cat.transactions.filter(t => t.id !== txId);
    cat.updatedAt = Date.now();
    persist();
    App.render();
    const current = $('#txCatId').val();
    if (current === catId) renderTxTable(cat);
    toast('Transaction removed');
  }

  // Persistence shortcut
  function persist(){ Store.save({ categories: App.state.categories }); }

  // Toast
  let toastTimer = null;
  function toast(msg){
    const $t = $('#toast');
    $t.find('div').text(msg);
    $t.addClass('show').removeClass('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> $t.removeClass('show').addClass('hidden'), 1800);
  }

  function closeModals(){ closeCategoryModal(); closeLedgerModal(); }

  // Export/Import
  function doExport(){
    const data = Store.export();
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'harbor-sinking-funds.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=> URL.revokeObjectURL(url), 0);
    toast('Exported');
  }
  function doImport(input){
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      const ok = Store.import(reader.result);
      if (ok) {
        App.state.categories = Store.load().categories;
        App.render();
        toast('Import complete');
      } else { toast('Import failed'); }
      $(input).val('');
    };
    reader.readAsText(file);
  }

  // Escape HTML helper for safe rendering
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]); });
  }

  // Expose some methods for external calls if needed
  App.openCategoryModal = openCategoryModal;
  App.editCategory = editCategory;
  App.addTransaction = addTransaction;
  App.donutSVG = donutSVG;

})(window, jQuery);
