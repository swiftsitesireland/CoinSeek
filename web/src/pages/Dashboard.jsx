import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../contexts/AuthContext'
import { logout } from '../services/authService'
import { getCoinsByUserId, deleteCoin, searchCoins } from '../services/coinService'
import CoinGrid from '../components/CoinGrid'
import AddCoinModal from '../components/AddCoinModal'

export default function Dashboard() {
  const { profile } = useAuth()
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editCoin, setEditCoin] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const loadCoins = useCallback(async () => {
    try {
      const data = search.trim() ? await searchCoins(search.trim()) : await getCoinsByUserId()
      setCoins(data)
    } catch {
      toast.error('Failed to load coins')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(loadCoins, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [loadCoins, search])

  async function handleDelete(coinId) {
    if (!window.confirm('Remove this coin from your collection?')) return
    try {
      await deleteCoin(coinId)
      setCoins(prev => prev.filter(c => c.id !== coinId))
      toast.success('Coin removed')
    } catch {
      toast.error('Failed to delete coin')
    }
  }

  function handleEdit(coin) {
    setEditCoin(coin)
    setShowAddModal(true)
  }

  function handleModalClose() {
    setShowAddModal(false)
    setEditCoin(null)
  }

  function handleCoinSaved(savedCoin, isEdit) {
    if (isEdit) {
      setCoins(prev => prev.map(c => c.id === savedCoin.id ? savedCoin : c))
      toast.success('Coin updated')
    } else {
      setCoins(prev => [savedCoin, ...prev])
      toast.success('Coin added to collection')
    }
    handleModalClose()
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      toast.error('Logout failed')
      setLoggingOut(false)
    }
  }

  const totalValue = coins.reduce((sum, c) => sum + (parseFloat(c.market_value_mid) || 0), 0)
  const countriesCount = new Set(coins.map(c => c.country).filter(Boolean)).size
  const rareCount = coins.filter(c => ['rare', 'very_rare', 'legendary'].includes(c.rarity_level)).length
  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-brand">
          <span>🪙</span> CoinSeek
        </div>
        <div className="topbar-actions">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <span className="hide-mobile">{profile?.username ?? 'Collector'}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Welcome back,{' '}
            <span style={{ color: 'var(--gold)' }}>{profile?.username ?? 'Collector'}</span>
          </h1>
          <p style={{ color: 'var(--gray-600)', marginTop: '0.25rem', fontSize: '0.9375rem' }}>
            {profile?.email}
          </p>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="label">Total Coins</div>
            <div className="value">{coins.length}</div>
            <div className="subtitle">in your collection</div>
          </div>
          <div className="stat-card">
            <div className="label">Est. Value</div>
            <div className="value">${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            <div className="subtitle">mid-market</div>
          </div>
          <div className="stat-card">
            <div className="label">Countries</div>
            <div className="value">{countriesCount}</div>
            <div className="subtitle">represented</div>
          </div>
          <div className="stat-card">
            <div className="label">Rare+</div>
            <div className="value">{rareCount}</div>
            <div className="subtitle">rare or better</div>
          </div>
        </div>

        <div className="section-header">
          <h2>My Collection</h2>
          <div className="section-controls">
            <input
              type="search"
              className="search-input"
              placeholder="Search coins…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="view-toggle">
              <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grid view">⊞</button>
              <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List view">☰</button>
            </div>
            <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => setShowAddModal(true)}>
              + Add Coin
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : (
          <CoinGrid coins={coins} view={view} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </main>

      {showAddModal && (
        <AddCoinModal coin={editCoin} onSave={handleCoinSaved} onClose={handleModalClose} />
      )}
    </div>
  )
}
