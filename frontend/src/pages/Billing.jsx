import { useEffect, useState } from 'react'
import { getPlan, createPayment } from '../api'
import { Check, Zap, Loader2 } from 'lucide-react'

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    priceLabel: 'Rp 0',
    description: 'Get started for free',
    features: ['10 leads', '1 user', 'Basic pipeline'],
  },
  {
    key: 'starter',
    name: 'Starter',
    priceLabel: 'Rp 99K/mo',
    description: 'For small teams',
    features: ['500 leads', '3 users', 'CSV export', 'Email notifications'],
  },
  {
    key: 'pro',
    name: 'Pro',
    priceLabel: 'Rp 249K/mo',
    description: 'For growing businesses',
    features: ['Unlimited leads', '10 users', 'API access', 'Analytics', 'CSV export'],
    popular: true,
  },
  {
    key: 'team',
    name: 'Team',
    priceLabel: 'Rp 599K/mo',
    description: 'For large teams',
    features: ['Unlimited everything', 'Unlimited users', 'Custom stages', 'Priority support', 'API access', 'Analytics'],
  },
]

function loadSnapScript(clientKey, production) {
  return new Promise((resolve) => {
    if (window.snap) return resolve()
    const src = production
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js'
    const script = document.createElement('script')
    script.src = src
    script.setAttribute('data-client-key', clientKey)
    script.onload = resolve
    document.head.appendChild(script)
  })
}

export default function Billing() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null)

  const fetchPlan = () => getPlan().then((res) => setPlan(res.data))

  useEffect(() => {
    fetchPlan().finally(() => setLoading(false))
  }, [])

  const handleUpgrade = async (planKey) => {
    setPaying(planKey)
    try {
      const res = await createPayment(planKey)
      const { snap_token, client_key } = res.data

      await loadSnapScript(client_key, false)

      window.snap.pay(snap_token, {
        onSuccess: () => {
          fetchPlan()
          setPaying(null)
        },
        onPending: () => setPaying(null),
        onError: () => setPaying(null),
        onClose: () => setPaying(null),
      })
    } catch {
      setPaying(null)
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading...</div>

  const currentPlan = plan?.plan || 'free'
  const leadsCount = plan?.leads_count || 0
  const maxLeads = plan?.limits?.MaxLeads
  const usagePct = maxLeads > 0 ? Math.min((leadsCount / maxLeads) * 100, 100) : 0

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Billing & Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your subscription</p>
      </div>

      {/* Usage card */}
      <div className="card p-5 mb-8 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-700">Lead usage</p>
          <span className="text-xs font-semibold text-brand-600 capitalize">{currentPlan} plan</span>
        </div>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">{leadsCount}</span>
          <span className="text-xs text-gray-400">{maxLeads > 0 ? `/ ${maxLeads} leads` : '/ unlimited'}</span>
        </div>
        {maxLeads > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-400' : 'bg-brand-500'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((p) => {
          const isCurrent = p.key === currentPlan
          const isUpgrade = PLANS.findIndex(x => x.key === p.key) > PLANS.findIndex(x => x.key === currentPlan)
          const isLoading = paying === p.key

          return (
            <div
              key={p.key}
              className={`card p-5 flex flex-col relative ${p.popular ? 'ring-2 ring-brand-500' : ''} ${isCurrent ? 'bg-brand-50 border-brand-200' : ''}`}
            >
              {p.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                <p className="text-xl font-bold text-gray-900 mt-3">{p.priceLabel}</p>
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check size={12} className="text-brand-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button className="btn-secondary text-xs w-full" disabled>Current plan</button>
              ) : isUpgrade ? (
                <button
                  className="btn-primary text-xs w-full flex items-center justify-center gap-1.5"
                  onClick={() => handleUpgrade(p.key)}
                  disabled={!!paying}
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  {isLoading ? 'Processing...' : 'Upgrade'}
                </button>
              ) : (
                <button className="btn-secondary text-xs w-full" disabled>Downgrade</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
