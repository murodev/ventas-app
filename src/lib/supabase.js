import { createClient } from '@supabase/supabase-js'

// 👉 Reemplazá estos valores con los tuyos desde supabase.com > Project Settings > API
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://TU-PROYECTO.supabase.co'
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'TU-ANON-KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper: obtiene sesión actual
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Helper: obtiene usuario con su rol
export const getUserWithRole = async () => {
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase
    .from('usuarios_roles')
    .select('rol')
    .eq('user_id', session.user.id)
    .single()
  return { ...session.user, rol: data?.rol || 'vendedor' }
}
