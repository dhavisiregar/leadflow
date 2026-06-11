# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o leadflow ./cmd/server

# ── Run stage ─────────────────────────────────────────────────────────────────
FROM alpine:3.19
WORKDIR /app

COPY --from=builder /app/leadflow .
COPY .env.example .env

EXPOSE 8080
CMD ["./leadflow"]
