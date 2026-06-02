const RARITY_CLASS = {
  common: 'rarity-common',
  uncommon: 'rarity-uncommon',
  rare: 'rarity-rare',
  very_rare: 'rarity-very_rare',
  legendary: 'rarity-legendary',
}

function formatRarity(r) {
  return r?.replace('_', ' ') ?? ''
}

function formatValue(coin) {
  if (coin.market_value_mid) return `$${parseFloat(coin.market_value_mid).toFixed(2)}`
  if (coin.market_value_low) return `~$${parseFloat(coin.market_value_low).toFixed(2)}`
  return 'Value unknown'
}

export default function CoinCard({ coin, view, onEdit, onDelete }) {
  const value = formatValue(coin)
  const rarityClass = RARITY_CLASS[coin.rarity_level] ?? 'rarity-common'

  if (view === 'list') {
    return (
      <div className="coin-list-item">
        <div className="coin-list-thumb">
          {coin.photo_url ? <img src={coin.photo_url} alt={coin.coin_name} /> : '🪙'}
        </div>
        <div className="coin-list-info">
          <div className="name">{coin.coin_name}</div>
          <div className="meta">
            {coin.country}
            {coin.year_minted ? ` · ${coin.year_minted}` : ''}
            {coin.condition ? ` · ${coin.condition}` : ''}
          </div>
        </div>
        {coin.rarity_level && (
          <span className={`coin-rarity-badge coin-list-badge ${rarityClass}`}>
            {formatRarity(coin.rarity_level)}
          </span>
        )}
        <div className="coin-list-value">{value}</div>
        <div className="coin-list-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(coin)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(coin.id)}>Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div className="coin-card">
      <div className="coin-card-image">
        {coin.photo_url ? <img src={coin.photo_url} alt={coin.coin_name} /> : '🪙'}
        {coin.rarity_level && (
          <span className={`coin-rarity-badge ${rarityClass}`}>
            {formatRarity(coin.rarity_level)}
          </span>
        )}
      </div>
      <div className="coin-card-body">
        <div className="coin-card-name">{coin.coin_name}</div>
        <div className="coin-card-meta">
          <span>{coin.country}</span>
          {coin.year_minted && <span>{coin.year_minted}</span>}
          {coin.condition && <span>{coin.condition}</span>}
        </div>
        <div className="coin-card-value">{value}</div>
        <div className="coin-card-actions">
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onEdit(coin)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(coin.id)}>Delete</button>
        </div>
      </div>
    </div>
  )
}
