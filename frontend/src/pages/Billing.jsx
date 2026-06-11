import { useEffect, useState } from 'react'
import { getPlan, createPayment, verifyPayment, downgradePlan } from '../api'
import { Check, Zap, Loader2, AlertTriangle, Minus } from 'lucide-react'

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    priceLabel: 'Rp 0',
    priceSub: 'forever',
    description: 'Coba LeadFlow gratis',
    features: [
      { text: '10 leads', included: true },
      { text: '1 user', included: true },
      { text: 'Basic kanban (5 stages)', included: true },
      { text: 'Contact management', included: true },
      { text: 'Activity log', included: true },
      { text: 'Deal aging indicator', included: true },
      { text: 'Win/loss reason', included: true },
      { text: 'Tasks', included: false },
      { text: 'Lead detail page', included: false },
      { text: 'Reports', included: false },
      { text: 'CSV export', included: false },
      { text: 'Email alerts', included: false },
      { text: 'API access', included: false },
    ],
    note: 'LeadFlow branding',
  },
  {
    key: 'starter',
    name: 'Starter',
    priceLabel: 'Rp 99K',
    priceSub: '/bulan',
    description: 'Untuk tim kecil',
    includes: 'Semua di Free, plus:',
    features: [
      { text: '500 leads', included: true },
      { text: '3 users', included: true },
      { text: 'Lead detail page', included: true },
      { text: 'Tasks (max 50 aktif)', included: true },
      { text: 'CSV export', included: true },
      { text: 'Stale lead email alerts', included: true },
      { text: 'Reports', included: false },
      { text: 'Custom stages', included: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    priceLabel: 'Rp 249K',
    priceSub: '/bulan',
    description: 'Untuk bisnis yang berkembang',
    includes: 'Semua di Starter, plus:',
    popular: true,
    features: [
      { text: 'Unlimited leads', included: true },
      { text: '10 users', included: true },
      { text: 'Reports (full analytics)', included: true },
      { text: 'Unlimited tasks', included: true },
      { text: 'Win/loss analytics chart', included: true },
      { text: 'Dashboard analytics', included: true },
      { text: 'Custom pipeline stages', included: true },
      { text: 'API access', included: true },
      { text: 'Lead scoring', included: true },
    ],
  },
  {
    key: 'team',
    name: 'Team',
    priceLabel: 'Rp 599K',
    priceSub: '/bulan',
    description: 'Untuk tim besar',
    includes: 'Semua di Pro, plus:',
    features: [
      { text: 'Unlimited leads & users', included: true },
      { text: 'Stale alerts per user', included: true },
      { text: 'Leaderboard', included: true },
      { text: 'Revenue forecast', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Custom branding', included: true },
      { text: 'Zapier webhook', included: true },
    ],
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
  const [confirmDowngrade, setConfirmDowngrade] = useState(null)
  const [downgrading, setDowngrading] = useState(false)
  const [error, setError] = useState('')

  const fetchPlan = () => getPlan().then((res) => setPlan(res.data))

  useEffect(() => {
    fetchPlan().finally(() => setLoading(false))
  }, [])

  const handleDowngrade = async () => {
    if (!confirmDowngrade) return
    setDowngrading(true)
    setError('')
    try {
      await downgradePlan(confirmDowngrade)
      await fetchPlan()
      setConfirmDowngrade(null)
    } catch (err) {
      const msg = err.response?.data?.message
      if (msg === 'leads exceed new plan limit') {
        const d = err.response.data
        setError(`Kamu punya ${d.leads} leads, melebihi batas ${d.plan_limit} leads di plan ini. Hapus beberapa leads dulu.`)
      } else {
        setError(msg || 'Gagal downgrade plan')
      }
      setConfirmDowngrade(null)
    } finally {
      setDowngrading(false)
    }
  }

  const handleUpgrade = async (planKey) => {
    setPaying(planKey)
    try {
      const res = await createPayment(planKey)
      const { snap_token, client_key } = res.data

      await loadSnapScript(client_key, false)

      window.snap.pay(snap_token, {
        onSuccess: async () => {
          try {
            await verifyPayment(res.data.order_id)
          } catch {}
          await fetchPlan()
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

  if (loading) return <div className="p-8 text-sm text-gray-400 dark:text-gray-500">Loading...</div>

  const currentPlan = plan?.plan || 'free'
  const leadsCount = plan?.leads_count || 0
  const maxLeads = plan?.limits?.MaxLeads
  const usagePct = maxLeads > 0 ? Math.min((leadsCount / maxLeads) * 100, 100) : 0
  const currentIdx = PLANS.findIndex((x) => x.key === currentPlan)

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Billing & Plan</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola langganan kamu</p>
      </div>

      {/* Usage card */}
      <div className="card p-5 mb-8 w-full max-w-xs">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Lead usage</p>
          <span className="text-xs font-semibold text-brand-600 capitalize">{currentPlan} plan</span>
        </div>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{leadsCount}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{maxLeads > 0 ? `/ ${maxLeads} leads` : '/ unlimited'}</span>
        </div>
        {maxLeads > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-400' : 'bg-brand-500'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((p, idx) => {
          const isCurrent = p.key === currentPlan
          const isUpgrade = idx > currentIdx
          const isLoading = paying === p.key

          return (
            <div
              key={p.key}
              className={`card p-5 flex flex-col relative ${p.popular ? 'ring-2 ring-brand-500' : ''} ${isCurrent ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-700' : ''}`}
            >
              {p.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  Most popular
                </span>
              )}

              {/* Header */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.description}</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{p.priceLabel}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{p.priceSub}</span>
                </div>
              </div>

              {/* Includes note */}
              {p.includes && (
                <p className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide mb-2">{p.includes}</p>
              )}

              {/* Features */}
              <ul className="space-y-1.5 flex-1 mb-5">
                {p.features.map((f) => (
                  <li key={f.text} className={`flex items-center gap-2 text-xs ${f.included ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                    {f.included
                      ? <Check size={11} className="text-brand-500 flex-shrink-0" />
                      : <Minus size={11} className="flex-shrink-0" />
                    }
                    {f.text}
                  </li>
                ))}
                {p.note && (
                  <li className="text-[10px] italic text-gray-400 dark:text-gray-500 pl-[19px] mt-1">{p.note}</li>
                )}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <button className="btn-secondary text-xs w-full" disabled>Plan aktif</button>
              ) : isUpgrade ? (
                <button
                  className="btn-primary text-xs w-full flex items-center justify-center gap-1.5"
                  onClick={() => handleUpgrade(p.key)}
                  disabled={!!paying}
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  {isLoading ? 'Memproses...' : 'Upgrade'}
                </button>
              ) : (
                <button
                  className="btn-secondary text-xs w-full"
                  onClick={() => { setError(''); setConfirmDowngrade(p.key) }}
                  disabled={!!paying || downgrading}
                >
                  Downgrade
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Downgrade confirmation modal */}
      {confirmDowngrade && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Downgrade ke {PLANS.find(p => p.key === confirmDowngrade)?.name}?</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Fitur yang tidak tersedia di plan ini akan dinonaktifkan. Aksi ini berlaku segera.
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 text-xs" onClick={() => setConfirmDowngrade(null)}>Batal</button>
              <button
                className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                onClick={handleDowngrade}
                disabled={downgrading}
              >
                {downgrading ? 'Memproses...' : 'Ya, downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
