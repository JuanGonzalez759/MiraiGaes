-- Requires MySQL 8.0.16+ and an existing MiraiGames schema.
-- Back up the database before applying this migration.

ALTER TABLE orders
    ADD COLUMN checkout_idempotency_key VARCHAR(255) NULL
        AFTER stripe_session_id,
    ADD COLUMN reservation_expires_at DATETIME NULL
        AFTER paid_at,
    ADD COLUMN inventory_status
        ENUM('not_reserved', 'reserved', 'committed', 'released')
        NOT NULL DEFAULT 'not_reserved'
        AFTER reservation_expires_at,
    ADD UNIQUE INDEX uq_orders_checkout_idempotency_key
        (checkout_idempotency_key),
    ADD INDEX idx_orders_reservation_cleanup
        (inventory_status, reservation_expires_at);

CREATE TABLE stripe_webhook_events (
    event_id VARCHAR(255)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    order_id BIGINT UNSIGNED NULL,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id),
    INDEX idx_stripe_webhook_events_order (order_id, processed_at),
    CONSTRAINT fk_stripe_webhook_events_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
