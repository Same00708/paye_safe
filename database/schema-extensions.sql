CREATE TABLE IF NOT EXISTS otp_sessions (
    phone_number VARCHAR(20) PRIMARY KEY,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'login',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE otp_sessions ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) NOT NULL DEFAULT 'login';
ALTER TABLE otp_sessions ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE TABLE IF NOT EXISTS payment_events (
    event_id SERIAL PRIMARY KEY,
    transaction_id INT,
    fedapay_event_id VARCHAR(100),
    event_type VARCHAR(80) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_transaction ON messages(transaction_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id, status);
