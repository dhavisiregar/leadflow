package handler

import "regexp"

// Shared shapes for the leads/contacts CSV import handlers.

type ImportRowError struct {
	Row    int    `json:"row"`
	Reason string `json:"reason"`
}

type ImportSummary struct {
	Imported int              `json:"imported"`
	Skipped  int              `json:"skipped"`
	Failed   int              `json:"failed"`
	Errors   []ImportRowError `json:"errors"`
}

var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func isValidEmail(email string) bool {
	return emailRegex.MatchString(email)
}
