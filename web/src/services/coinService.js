import { supabase } from './supabase'

export async function getCoinsByUserId() {
  const { data, error } = await supabase
    .from('user_coins')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addCoin(coinData) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('user_coins')
    .insert({ ...coinData, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCoin(coinId, coinData) {
  const { data, error } = await supabase
    .from('user_coins')
    .update({ ...coinData, updated_at: new Date().toISOString() })
    .eq('id', coinId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCoin(coinId) {
  const { error } = await supabase.from('user_coins').delete().eq('id', coinId)
  if (error) throw error
}

export async function searchCoins(query) {
  const { data, error } = await supabase
    .from('user_coins')
    .select('*')
    .or(`coin_name.ilike.%${query}%,country.ilike.%${query}%`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createCollection(name, description = '', isPublic = false) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('collections')
    .insert({ name, description, is_public: isPublic, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}
