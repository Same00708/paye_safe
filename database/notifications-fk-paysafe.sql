ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paysafe_users') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES paysafe_users(user_id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_transaction_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_transaction_id_fkey
      FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
