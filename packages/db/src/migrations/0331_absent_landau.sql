CREATE TABLE "user_locale_preference_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_locale_preference_events_locale_check" CHECK ("user_locale_preference_events"."locale" in ('pt-BR', 'en'))
);
--> statement-breakpoint
CREATE TABLE "user_locale_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_locale_preferences_locale_check" CHECK ("user_locale_preferences"."locale" in ('pt-BR', 'en'))
);
--> statement-breakpoint
ALTER TABLE "user_locale_preference_events" ADD CONSTRAINT "user_locale_preference_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locale_preferences" ADD CONSTRAINT "user_locale_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_locale_preference_events_user_created_idx" ON "user_locale_preference_events" USING btree ("user_id","created_at");