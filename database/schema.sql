-- PaySafe — Schéma relationnel (PostgreSQL)

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'PENDING_PAYMENT', 'FUNDS_ESCROWED', 'DELIVERED_TO_BUYER',
        'COMPLETED', 'RETURN_INITIATED', 'RETURNED_TO_SELLER', 'DISPUTE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'NEW_MESSAGE', 'STATUS_CHANGED', 'PAYMENT_RECEIVED', 'SYSTEM'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    fees NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING_PAYMENT',
    fedapay_transaction_id VARCHAR(100),
    fees_waived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    transaction_id INT,
    sender_id INT NOT NULL,
    message_text TEXT NOT NULL,
    attachment_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
