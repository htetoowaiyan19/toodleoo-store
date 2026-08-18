import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { AuthContext } from '../../utils/authContext'

function normalizeProfile(data) {
  if (!data) return null
  return {
    ...data,
    displayName: data.display_name,
    walletBalance: data.wallet_balance ?? 0,
    contactMethods: data.contact_methods || [],
    role: data.role || 'customer',
    subscriptionTier: data.subscription_tier || 'free',
    subscriptionBilling: data.subscription_billing || null,
    subscriptionExpiresAt: data.subscription_expires_at || null,
    subscriptionAutoRenew: Boolean(data.subscription_auto_renew ?? true),
    subscriptionStartedAt: data.subscription_started_at || null,
  }
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return normalizeProfile(data)
}


export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const user = session?.user || null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null)
      return undefined
    }

    let active = true
    fetchProfile(user.id).then((nextProfile) => {
      if (active) setProfile(nextProfile)
    })

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload?.new) {
            setProfile(normalizeProfile(payload.new))
          }
        },
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user])

  const refreshProfile = async () => {
    if (!user) return
    const nextProfile = await fetchProfile(user.id)
    setProfile(nextProfile)
  }

  const updateProfile = async (updates) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single()

    if (error) throw error
    if (data) {
      const nextProfile = {
        ...data,
        displayName: data.display_name,
        walletBalance: data.wallet_balance,
        contactMethods: data.contact_methods || [],
      }
      setProfile(nextProfile)
      return nextProfile
    }
    return null
  }

  const value = useMemo(
    () => ({
      isAdmin: ['owner', 'staff'].includes(profile?.role),
      isOwner: profile?.role === 'owner',
      loading,
      profile,
      refreshProfile,
      updateProfile,

      signInWithGoogle: async () => {

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })
        if (error) throw error
        return data
      },
      signInWithPassword: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        return data
      },
      signOutUser: () => supabase.auth.signOut(),
      signUpWithPassword: async ({ displayName, email, password }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (error) throw error
        return data
      },
      user,
    }),
    [loading, profile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
