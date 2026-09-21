import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ShoppingBag, Users, Truck, X } from 'lucide-react';
import api from '../../api/client';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose ? onClose() : null;
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        if (res.data.success) {
          setResults(res.data.data);
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Type SKU, product title, order number, customer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 text-sm bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="ml-2 px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400">
              Searching central ERP database...
            </div>
          )}

          {!loading && !results && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type at least 2 characters to search across products, orders, and contacts.
            </div>
          )}

          {!loading && results && (
            <>
              {/* Products & Variants */}
              {(results.products?.length > 0 || results.variants?.length > 0) && (
                <div className="py-2">
                  <div className="px-3 pb-1.5 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Package className="w-3 h-3" /> Products & Variants
                  </div>
                  {results.products.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => handleSelect('/products')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                    >
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                        <span className="ml-2 text-slate-400">SKU: {p.sku}</span>
                      </div>
                      <span className="text-xs font-bold text-primary-600">₹{p.sellingPrice}</span>
                    </button>
                  ))}
                  {results.variants.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => handleSelect('/inventory')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                    >
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{v.productId?.name}</span>
                        <span className="ml-2 text-slate-400 font-mono text-[11px]">{v.sku} ({v.color}/{v.size})</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Orders */}
              {results.orders?.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-1.5 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <ShoppingBag className="w-3 h-3" /> Orders
                  </div>
                  {results.orders.map((o) => (
                    <button
                      key={o._id}
                      onClick={() => handleSelect('/orders')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                    >
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">#{o.orderNumber}</span>
                        <span className="ml-2 text-slate-400">{o.customerSnapshot?.name} ({o.source})</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">₹{o.total}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Customers & Suppliers */}
              {results.customers?.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-1.5 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Customers
                  </div>
                  {results.customers.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => handleSelect('/customers')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                    >
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                        <span className="ml-2 text-slate-400">{c.phone}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
