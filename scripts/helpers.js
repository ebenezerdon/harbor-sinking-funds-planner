(function(window){
  'use strict';
  window.App = window.App || {};

  const Util = {
    currency: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
    formatCurrency(n){
      const safe = isFinite(n) ? n : 0;
      return this.currency.format(safe);
    },
    parseCurrency(s){
      if (typeof s === 'number') return s;
      if (!s) return 0;
      const cleaned = String(s).replace(/[^0-9.-]/g, '');
      const n = parseFloat(cleaned);
      return isFinite(n) ? n : 0;
    },
    clamp(n, min, max){ return Math.min(Math.max(n, min), max); },
    percent(part, whole){ if (whole <= 0) return 0; return Math.round((part / whole) * 100); },
    uid(){
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
      return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    },
    todayISO(){ return new Date().toISOString().slice(0,10); },
    fmtDate(d){ try { const dt = (d instanceof Date) ? d : new Date(d); return dt.toLocaleDateString(); } catch(e){ return ''; } },
    addMonths(date, months){ const d = new Date(date.getTime()); d.setMonth(d.getMonth() + months); return d; },
    projectDate(saved, target, monthly){
      const remaining = Math.max(target - saved, 0);
      if (monthly <= 0 || remaining <= 0) return null;
      const months = Math.ceil(remaining / monthly);
      const when = Util.addMonths(new Date(), months);
      return Util.fmtDate(when);
    },
    palette: [
      '#2563eb', // blue-600
      '#f59e0b', // amber-500
      '#f43f5e', // rose-500
      '#0891b2', // cyan-600
      '#475569', // slate-600
      '#ea580c', // orange-600
      '#0284c7', // sky-600
      '#52525b'  // zinc-600
    ]
  };

  const Store = {
    KEY: 'sinkingfunds:v1',
    load(){
      try {
        const raw = window.localStorage.getItem(this.KEY);
        if (!raw) {
          const sample = {
            categories: [
              { id: Util.uid(), name: 'Vacation', target: 3000, saved: 1200, monthly: 250, color: Util.palette[0], notes: 'Flights and stay', createdAt: Date.now(), updatedAt: Date.now(), transactions: [
                { id: Util.uid(), type: 'deposit', amount: 500, date: Util.todayISO(), note: 'Initial' },
                { id: Util.uid(), type: 'deposit', amount: 700, date: Util.todayISO(), note: 'Bonus' }
              ] },
              { id: Util.uid(), name: 'Car Maintenance', target: 1200, saved: 350, monthly: 100, color: Util.palette[1], notes: '', createdAt: Date.now(), updatedAt: Date.now(), transactions: [
                { id: Util.uid(), type: 'deposit', amount: 200, date: Util.todayISO(), note: '' },
                { id: Util.uid(), type: 'deposit', amount: 150, date: Util.todayISO(), note: '' }
              ] }
            ]
          };
          this.save(sample);
          return sample;
        }
        const data = JSON.parse(raw);
        if (!data.categories) data.categories = [];
        return data;
      } catch (e) {
        console.error('Failed to load data', e);
        return { categories: [] };
      }
    },
    save(data){
      try {
        window.localStorage.setItem(this.KEY, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to save data', e);
      }
    },
    export(){
      try { return JSON.stringify(this.load(), null, 2); } catch(e){ return '{}'; }
    },
    import(json){
      try {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        if (!data || !Array.isArray(data.categories)) throw new Error('Invalid data');
        this.save({ categories: data.categories });
        return true;
      } catch(e){
        console.error('Import failed', e);
        return false;
      }
    },
    clear(){ window.localStorage.removeItem(this.KEY); }
  };

  window.App.Util = Util;
  window.App.Store = Store;
})(window);
