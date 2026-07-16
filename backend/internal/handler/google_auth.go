package handler

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const googleCertsURL = "https://www.googleapis.com/oauth2/v3/certs"

type googleJWK struct {
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type googleJWKSet struct {
	Keys []googleJWK `json:"keys"`
}

var (
	googleKeysMu     sync.Mutex
	googleKeysCache  map[string]*rsa.PublicKey
	googleKeysExpiry time.Time
)

// fetchGoogleKeys returns Google's current signing keys, refetching once the
// short-lived local cache expires (keys rotate infrequently).
func fetchGoogleKeys() (map[string]*rsa.PublicKey, error) {
	googleKeysMu.Lock()
	defer googleKeysMu.Unlock()

	if googleKeysCache != nil && time.Now().Before(googleKeysExpiry) {
		return googleKeysCache, nil
	}

	resp, err := http.Get(googleCertsURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var set googleJWKSet
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return nil, err
	}

	keys := make(map[string]*rsa.PublicKey, len(set.Keys))
	for _, k := range set.Keys {
		nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
		if err != nil {
			continue
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
		if err != nil {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{
			N: new(big.Int).SetBytes(nBytes),
			E: int(new(big.Int).SetBytes(eBytes).Int64()),
		}
	}

	googleKeysCache = keys
	googleKeysExpiry = time.Now().Add(1 * time.Hour)
	return keys, nil
}

// GoogleClaims are the fields we need out of a Google ID token.
type GoogleClaims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	jwt.RegisteredClaims
}

// verifyGoogleIDToken validates the signature, issuer, audience and
// expiry of a Google Identity Services ID token and returns its claims.
func verifyGoogleIDToken(idToken, clientID string) (*GoogleClaims, error) {
	if clientID == "" {
		return nil, fmt.Errorf("google sign-in is not configured")
	}

	keys, err := fetchGoogleKeys()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch google keys: %w", err)
	}

	claims := &GoogleClaims{}
	token, err := jwt.ParseWithClaims(idToken, claims, func(t *jwt.Token) (interface{}, error) {
		kid, ok := t.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("missing kid header")
		}
		key, ok := keys[kid]
		if !ok {
			return nil, fmt.Errorf("unknown signing key")
		}
		return key, nil
	}, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid google token: %w", err)
	}

	validAudience := false
	for _, aud := range claims.Audience {
		if aud == clientID {
			validAudience = true
			break
		}
	}
	if !validAudience {
		return nil, fmt.Errorf("token audience mismatch")
	}

	if claims.Issuer != "accounts.google.com" && claims.Issuer != "https://accounts.google.com" {
		return nil, fmt.Errorf("invalid token issuer")
	}

	if !claims.EmailVerified {
		return nil, fmt.Errorf("google email not verified")
	}

	return claims, nil
}
