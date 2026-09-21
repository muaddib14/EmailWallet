CREATE TABLE "payment_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"tx_hash" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipts_message_idx" ON "payment_receipts" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_receipts_tx_idx" ON "payment_receipts" USING btree ("tx_hash");