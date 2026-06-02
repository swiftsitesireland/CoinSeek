import { useState } from 'react'
import { addCoin, updateCoin } from '../services/coinService'

const RARITIES = ['common', 'uncommon', 'rare', 'very_rare', 'legendary']
const CONDITIONS = ['Poor', 'Fair', 'Good', 'Very Good', 'Fine', 'Very Fine', 'Extremely Fine', 'Uncirculated', 'Mint State']

const DEFAULT_FORM = {
  coin_name: '', country: '', year_minted: '', denomination: '',
  metal_composition: '', mint_mark: '', weight: '', rarity_level: 'common',
  market_value_low: '', market_value_mid: '', market_value_high: '',
  condition: '', photo_url: '', notes: '', acquired_date: '', purchase_price: '',
}

function coinToForm(coin) {
  return {
    ...DEFAULT_FORM,
    ...coin,
    year_minted: coin.year_minted?.toString() ?? '',
    market_value_low: coin.market_value_low?.toString() ?? '',
    market_value_mid: coin.market_value_mid?.toString() ?? '',
    market_value_high: coin.market_value_high?.toString() ?? '',
    purchase_price: coin.purchase_price?.toString() ?? '',
    acquired_date: coin.acquired_date ?? '',
    photo_url: coin.photo_url ?? '',
    notes: coin.notes ?? '',
  }
}

function toPayload(form) {
  return {
    ...form,
    year_minted: form.year_minted ? parseInt(form.year_minted) : null,
    market_value_low: form.market_value_low ? parseFloat(form.market_value_low) : null,
    market_value_mid: form.market_value_mid ? parseFloat(form.market_value_mid) : null,
    market_value_high: form.market_value_high ? parseFloat(form.market_value_high) : null,
    purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
    acquired_date: form.acquired_date || null,
    photo_url: form.photo_url || null,
    notes: form.notes || null,
    denomination: form.denomination || null,
    metal_composition: form.metal_composition || null,
    mint_mark: form.mint_mark || null,
    weight: form.weight || null,
    condition: form.condition || null,
  }
}

export default function AddCoinModal({ coin, onSave, onClose }) {
  const isEdit = !!coin
  const [form, setForm] = useState(isEdit ? coinToForm(coin) : DEFAULT_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm(p => ({ ...p, [field]: value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.coin_name.trim()) errs.coin_name = 'Coin name is required'
    if (!form.country.trim()) errs.country = 'Country is required'
    if (form.year_minted) {
      const y = parseInt(form.year_minted)
      if (isNaN(y) || y < 1 || y > new Date().getFullYear() + 1) errs.year_minted = 'Invalid year'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const payload = toPayload(form)
      const saved = isEdit ? await updateCoin(coin.id, payload) : await addCoin(payload)
      onSave(saved, isEdit)
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save coin' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Coin' : 'Add Coin to Collection'}</h3>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.submit && (
              <div className="error-banner" style={{ marginBottom: '1rem' }}>
                <span>⚠</span> {errors.submit}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Coin Name *</label>
                <input
                  className={`form-input ${errors.coin_name ? 'error' : ''}`}
                  placeholder="e.g. Morgan Dollar"
                  value={form.coin_name}
                  onChange={e => set('coin_name', e.target.value)}
                />
                {errors.coin_name && <div className="field-error">{errors.coin_name}</div>}
              </div>
              <div className="form-group">
                <label>Country *</label>
                <input
                  className={`form-input ${errors.country ? 'error' : ''}`}
                  placeholder="e.g. United States"
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                />
                {errors.country && <div className="field-error">{errors.country}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Year Minted</label>
                <input
                  className={`form-input ${errors.year_minted ? 'error' : ''}`}
                  type="number" placeholder="e.g. 1921"
                  value={form.year_minted}
                  onChange={e => set('year_minted', e.target.value)}
                />
                {errors.year_minted && <div className="field-error">{errors.year_minted}</div>}
              </div>
              <div className="form-group">
                <label>Denomination</label>
                <input className="form-input" placeholder="e.g. $1, 1 Penny" value={form.denomination} onChange={e => set('denomination', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Condition</label>
                <select className="form-select" value={form.condition} onChange={e => set('condition', e.target.value)}>
                  <option value="">Select condition</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Rarity</label>
                <select className="form-select" value={form.rarity_level} onChange={e => set('rarity_level', e.target.value)}>
                  {RARITIES.map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Metal Composition</label>
                <input className="form-input" placeholder="e.g. 90% Silver, 10% Copper" value={form.metal_composition} onChange={e => set('metal_composition', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Mint Mark</label>
                <input className="form-input" placeholder="e.g. S, D, CC" value={form.mint_mark} onChange={e => set('mint_mark', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Weight</label>
                <input className="form-input" placeholder="e.g. 26.73g" value={form.weight} onChange={e => set('weight', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Photo URL</label>
                <input className="form-input" type="url" placeholder="https://..." value={form.photo_url} onChange={e => set('photo_url', e.target.value)} />
              </div>
            </div>

            <hr className="section-divider" />
            <p className="section-label">Market Value</p>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="form-group">
                <label>Low ($)</label>
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00" value={form.market_value_low} onChange={e => set('market_value_low', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Mid ($)</label>
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00" value={form.market_value_mid} onChange={e => set('market_value_mid', e.target.value)} />
              </div>
              <div className="form-group">
                <label>High ($)</label>
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00" value={form.market_value_high} onChange={e => set('market_value_high', e.target.value)} />
              </div>
            </div>

            <hr className="section-divider" />
            <p className="section-label">Acquisition</p>
            <div className="form-row">
              <div className="form-group">
                <label>Date Acquired</label>
                <input className="form-input" type="date" value={form.acquired_date} onChange={e => set('acquired_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Purchase Price ($)</label>
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea className="form-textarea" placeholder="Any additional details about this coin..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto', minWidth: 120 }} disabled={loading}>
              {loading ? <><div className="spinner" /> Saving...</> : isEdit ? 'Save Changes' : 'Add Coin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
