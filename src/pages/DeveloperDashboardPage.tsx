import React, { useEffect, useState, useMemo } from 'react';
import { developerApi, DeveloperMerchantSummary } from '../services/developerApi';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { safeSessionStorage } from '../utils/safeStorage';
import { SeyyoLogo } from '../components/common/SeyyoLogo';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  ExternalLink,
  Users,
  CheckCircle2,
  Star,
  Sparkles,
  Lock,
  ArrowRight,
  LogOut,
  Building2,
  Tag,
  Gift,
  ArrowLeft,
} from 'lucide-react';

export const DeveloperDashboardPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [accessKeyInput, setAccessKeyInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Merchant state
  const [merchants, setMerchants] = useState<DeveloperMerchantSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Verify session on mount
  useEffect(() => {
    const token = safeSessionStorage.getItem('seyo_developer_token');
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    developerApi
      .verifySession(token)
      .then(res => {
        if (res.authenticated) {
          setIsAuthenticated(true);
          loadMerchants(token);
        } else {
          safeSessionStorage.removeItem('seyo_developer_token');
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        safeSessionStorage.removeItem('seyo_developer_token');
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  const loadMerchants = async (token?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await developerApi.getMerchants(token);
      setMerchants(res.merchants || []);
    } catch (err: any) {
      if (err.status === 401) {
        setIsAuthenticated(false);
        safeSessionStorage.removeItem('seyo_developer_token');
      } else {
        setLoadError(err.message || 'Unable to load developer overview. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadMerchants();
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKeyInput.trim()) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await developerApi.authenticate(accessKeyInput.trim());
      if (res.success && res.token) {
        safeSessionStorage.setItem('seyo_developer_token', res.token);
        setIsAuthenticated(true);
        loadMerchants(res.token);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid developer access key. Access denied.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await developerApi.logout();
    setIsAuthenticated(false);
    setMerchants([]);
  };

  // Derive unique categories dynamically from actual merchant data
  const categories = useMemo(() => {
    const set = new Set<string>();
    merchants.forEach(m => {
      if (m.category && m.category.trim()) {
        set.add(m.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [merchants]);

  // Combined client-side search and category filtering
  const filteredMerchants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return merchants.filter(m => {
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' ||
        (m.category && m.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [merchants, searchQuery, selectedCategory]);

  // Tier color styling helper
  const getTierBadge = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === 'combined') {
      return 'bg-[#0e7c66] text-white';
    }
    if (t === 'spin') {
      return 'bg-amber-100 text-amber-900 border border-amber-200';
    }
    if (t === 'loyalty') {
      return 'bg-blue-100 text-blue-900 border border-blue-200';
    }
    if (t === 'review') {
      return 'bg-purple-100 text-purple-900 border border-purple-200';
    }
    return 'bg-[#e2f1ec] text-[#0e7c66]';
  };

  // 1. Initial Auth Check Spinner
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#f1f3f2] flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-[#0e7c66] animate-spin mb-3" />
        <p className="text-xs font-semibold text-[#6a787e]">Verifying developer authorization...</p>
      </div>
    );
  }

  // 2. Developer Access Gate (Authentication Screen)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f1f3f2] flex flex-col items-center justify-center p-4 font-sans text-left">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#e2e7e6] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#f1f3f2] pb-4">
            <div className="flex items-center gap-2.5">
              <SeyyoLogo className="w-10 h-10 shadow-xs" />
              <div>
                <span className="font-black text-lg tracking-tight text-[#10181c] block">
                  seyyo Developer
                </span>
                <span className="text-[10px] font-bold text-[#0e7c66] uppercase tracking-widest leading-none">
                  Admin Gateway
                </span>
              </div>
            </div>
            <a href="/" className="text-xs text-[#6a787e] hover:text-[#10181c] flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </a>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-[#10181c]">Restricted Overview</h2>
            <p className="text-xs text-[#6a787e]">
              Enter the seyyo developer access key to inspect network merchants and performance analytics.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Developer Access Key"
              type="password"
              placeholder="Enter master developer key"
              value={accessKeyInput}
              onChange={e => setAccessKeyInput(e.target.value)}
              helperText="Protected developer overview session (24h TTL)"
              required
              autoFocus
            />

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-medium text-red-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isAuthenticating}
              className="gap-2 shadow-md cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Authenticate Developer</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            
          </form>
        </div>
      </div>
    );
  }

  // 3. Authenticated Developer Overview Dashboard
  return (
    <div className="min-h-screen bg-[#f1f3f2] text-[#10181c] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <header className="bg-white rounded-3xl border border-[#e2e7e6] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3">
            <SeyyoLogo className="w-12 h-12 shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-[#10181c]">
                  seyyo Developer
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#e2f1ec] text-[#0e7c66]">
                  Admin Mode
                </span>
              </div>
              <p className="text-xs font-semibold text-[#6a787e] mt-0.5">
                Network Overview
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Total Clients Counter Badge */}
            <div className="px-3.5 py-2 rounded-2xl bg-[#f8faf9] border border-[#e2e7e6] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0e7c66]" />
              <span className="text-xs font-bold text-[#10181c]">
                {merchants.length} Total Client{merchants.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>

            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </header>

        {/* Search & Category Filter Bar */}
        <div className="bg-white rounded-3xl border border-[#e2e7e6] p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between text-left">
          {/* Centered Search field */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-[#6a787e] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] text-xs font-medium text-[#10181c] placeholder:text-[#6a787e] focus:outline-none focus:ring-2 focus:ring-[#0e7c66] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6a787e] hover:text-[#10181c]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills / Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold text-[#6a787e] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#0e7c66]" />
              Category:
            </span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-[#f8faf9] rounded-2xl border border-[#e2e7e6] text-xs font-bold text-[#10181c] focus:outline-none focus:ring-2 focus:ring-[#0e7c66] cursor-pointer"
            >
              <option value="all">All Categories ({merchants.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-3xl border border-[#e2e7e6] p-12 text-center shadow-xs space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0e7c66] animate-spin mx-auto" />
            <p className="text-sm font-bold text-[#10181c]">Loading network overview...</p>
            <p className="text-xs text-[#6a787e]">Aggregating merchant performance and guest metrics</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && loadError && (
          <div className="bg-white rounded-3xl border border-red-200 p-10 text-center shadow-xs space-y-3">
            <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
            <h3 className="text-base font-bold text-red-950">Unable to load developer overview</h3>
            <p className="text-xs text-red-700 max-w-sm mx-auto">{loadError}</p>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => loadMerchants()}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Empty State: No Registered Merchants */}
        {!isLoading && !loadError && merchants.length === 0 && (
          <div className="bg-white rounded-3xl border border-[#e2e7e6] p-12 text-center shadow-xs space-y-3">
            <Building2 className="w-10 h-10 text-[#6a787e] mx-auto" />
            <h3 className="text-base font-bold text-[#10181c]">No clients registered yet.</h3>
            <p className="text-xs text-[#6a787e] max-w-xs mx-auto">
              New merchant subscriptions created via the SEYYO landing page will automatically appear here.
            </p>
          </div>
        )}

        {/* Empty State: Filter Returned No Matches */}
        {!isLoading && !loadError && merchants.length > 0 && filteredMerchants.length === 0 && (
          <div className="bg-white rounded-3xl border border-[#e2e7e6] p-12 text-center shadow-xs space-y-3">
            <Search className="w-10 h-10 text-[#6a787e] mx-auto" />
            <h3 className="text-base font-bold text-[#10181c]">No clients found.</h3>
            <p className="text-xs text-[#6a787e]">
              No businesses matched your search query or selected category.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Reset Search Filters
              </Button>
            </div>
          </div>
        )}

        {/* Merchant Cards Grid (3 cols desktop, 2 cols tablet, 1 col mobile) */}
        {!isLoading && !loadError && filteredMerchants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {filteredMerchants.map(merchant => (
              <div
                key={merchant.id}
                className="bg-white rounded-3xl border border-[#e2e7e6] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      {merchant.logoUrl ? (
                        <img
                          src={merchant.logoUrl}
                          alt={merchant.name}
                          className="w-11 h-11 rounded-2xl object-cover border border-[#e2e7e6]"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs"
                          style={{
                            backgroundColor: merchant.accentColor ? `${merchant.accentColor}15` : '#e2f1ec',
                          }}
                        >
                          {merchant.logoEmoji || '🏪'}
                        </div>
                      )}
                      <div>
                        <h2 className="font-extrabold text-base text-[#10181c] leading-tight truncate max-w-[170px]" title={merchant.name}>
                          {merchant.name}
                        </h2>
                        <p className="text-xs text-[#6a787e] capitalize">
                          {merchant.category || 'Retail'}
                          {merchant.city ? ` • ${merchant.city}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Tier Badge */}
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${getTierBadge(
                        merchant.tier
                      )}`}
                    >
                      {merchant.tier}
                    </span>
                  </div>

                  {/* Active Offer Status Tag */}
                  <div className="pt-2">
                    {merchant.offer.active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e2f1ec] text-[#0e7c66] text-[11px] font-bold">
                        <Sparkles className="w-3 h-3" />
                        Active Offer: {merchant.offer.title || 'Live'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f1f3f2] text-[#6a787e] text-[11px] font-semibold">
                        No Active Offer
                      </span>
                    )}
                  </div>
                </div>

                {/* Merchant Statistics (Guests, Claimed, Reviews) */}
                <div className="grid grid-cols-3 gap-2 bg-[#f8faf9] p-3 rounded-2xl border border-[#e2e7e6]/70">
                  {/* Total Guests */}
                  <div className="text-center space-y-0.5">
                    <div className="flex items-center justify-center gap-1 text-[#6a787e]">
                      <Users className="w-3 h-3 text-[#0e7c66]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Guests
                      </span>
                    </div>
                    <span className="text-lg font-black text-[#10181c] font-mono block">
                      {merchant.stats.totalGuests}
                    </span>
                  </div>

                  {/* Claimed */}
                  <div className="text-center space-y-0.5 border-x border-[#e2e7e6]">
                    <div className="flex items-center justify-center gap-1 text-[#6a787e]">
                      <CheckCircle2 className="w-3 h-3 text-[#0e7c66]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Claimed
                      </span>
                    </div>
                    <span className="text-lg font-black text-[#10181c] font-mono block">
                      {merchant.stats.claimedUsers}
                    </span>
                  </div>

                  {/* Reviews */}
                  <div className="text-center space-y-0.5">
                    <div className="flex items-center justify-center gap-1 text-[#6a787e]">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Reviews
                      </span>
                    </div>
                    <span className="text-lg font-black text-[#10181c] font-mono block">
                      {merchant.stats.totalReviews}
                    </span>
                  </div>
                </div>

                {/* Card Footer: Station Link */}
                <div className="flex items-center justify-between pt-1 border-t border-[#f1f3f2] text-xs">
                  <span className="font-mono text-[11px] text-[#6a787e] truncate max-w-[150px]">
                    /c/{merchant.slug}
                  </span>

                  <a
                    href={`/c/${merchant.slug}/v`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-xs text-[#0e7c66] hover:text-[#0a6252] transition-colors"
                  >
                    <span>View Station</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Footer info */}
        <footer className="text-center text-xs text-[#6a787e] pt-6">
          <p>© {new Date().getFullYear()} seyyo Platform • Developer & Admin Console</p>
        </footer>
      </div>
    </div>
  );
};
