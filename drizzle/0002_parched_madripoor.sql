CREATE TABLE "message_flags" (
	"message_id" text NOT NULL,
	"address" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_address_wallets_address_fk" FOREIGN KEY ("address") REFERENCES "public"."wallets"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_flags_pk" ON "message_flags" USING btree ("message_id","address");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "is_read";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "is_starred";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "is_archived";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "is_deleted";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "deleted_at";