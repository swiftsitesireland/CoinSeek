import CoinCard from './CoinCard'

export default function CoinGrid({ coins, view, onEdit, onDelete }) {
  if (coins.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🪙</div>
        <h3>No coins yet</h3>
        <p>Add your first coin to start building your collection</p>
      </div>
    )
  }

  return (
    <div className={view === 'grid' ? 'coin-grid' : 'coin-list'}>
      {coins.map(coin => (
        <CoinCard
          key={coin.id}
          coin={coin}
          view={view}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
