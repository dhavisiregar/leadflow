package model

type PlanLimits struct {
	MaxLeads          int  // -1 = unlimited
	MaxUsers          int  // -1 = unlimited
	CSVExport         bool
	EmailNotif        bool
	APIAccess         bool
	Analytics         bool
	WinLossAnalytics  bool
	CustomStages      bool
	LeadScoring       bool
	StaleAlertPerUser bool
	Leaderboard       bool
	RevenueForecast   bool
	CustomBranding    bool
	ZapierWebhook     bool
	PrioritySupport   bool
}

var Limits = map[Plan]PlanLimits{
	PlanFree: {
		MaxLeads: 10,
		MaxUsers: 1,
	},
	PlanStarter: {
		MaxLeads:   500,
		MaxUsers:   3,
		CSVExport:  true,
		EmailNotif: true,
	},
	PlanPro: {
		MaxLeads:         -1,
		MaxUsers:         10,
		CSVExport:        true,
		EmailNotif:       true,
		APIAccess:        true,
		Analytics:        true,
		WinLossAnalytics: true,
		CustomStages:     true,
		LeadScoring:      true,
	},
	PlanTeam: {
		MaxLeads:          -1,
		MaxUsers:          -1,
		CSVExport:         true,
		EmailNotif:        true,
		APIAccess:         true,
		Analytics:         true,
		WinLossAnalytics:  true,
		CustomStages:      true,
		LeadScoring:       true,
		StaleAlertPerUser: true,
		Leaderboard:       true,
		RevenueForecast:   true,
		CustomBranding:    true,
		ZapierWebhook:     true,
		PrioritySupport:   true,
	},
}

func (t *Tenant) CanAddLead() bool {
	l := Limits[t.Plan]
	return l.MaxLeads == -1 || t.LeadsCount < l.MaxLeads
}

func (t *Tenant) CanAddUser(currentCount int) bool {
	l := Limits[t.Plan]
	return l.MaxUsers == -1 || currentCount < l.MaxUsers
}

func (t *Tenant) HasFeature(check func(PlanLimits) bool) bool {
	return check(Limits[t.Plan])
}
