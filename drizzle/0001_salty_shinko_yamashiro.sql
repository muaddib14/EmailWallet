CREATE TABLE "drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_address" text NOT NULL,
	"to_raw" text DEFAULT '' NOT NULL,
	"subject_ciphertext" text DEFAULT '' NOT NULL,
	"body_ciphertext" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_owner_address_wallets_address_fk" FOREIGN KEY ("owner_address") REFERENCES "public"."wallets"("address") ON DELETE cascade ON UPDATE no action;