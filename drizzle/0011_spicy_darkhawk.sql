CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"blob_url" text NOT NULL,
	"size_bytes" text NOT NULL,
	"mime" text NOT NULL,
	"filename_ct" text NOT NULL,
	"filename_nonce" text NOT NULL,
	"wrapped_key" text NOT NULL,
	"wrap_nonce" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_blob_idx" ON "attachments" USING btree ("blob_url");