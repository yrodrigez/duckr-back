import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js";
import environment from "../environment.ts";
import { DatabaseConfigurationError } from "../../domain/errors/database-errors.ts";

export interface DatabaseConfig {
	supabaseUrl: string;
	supabaseKey: string;
}

export type DatabaseClient = SupabaseClient;
export class DatabaseClientFactory {
	private static instance: DatabaseClient;
	private constructor() {}

	private static getConfig(): DatabaseConfig {
		const { supabaseUrl, supabaseKey } = environment();
		if (!supabaseUrl || !supabaseKey) {
			throw new DatabaseConfigurationError(
				`Supabase environment variables are not set missing ${
					!supabaseUrl ? "SUPABASE_URL" : ""
				} ${!supabaseKey ? "SUPABASE_KEY" : ""}`,
			);
		}
		return {
			supabaseUrl,
			supabaseKey,
		};
	}

	static getInstance(): DatabaseClient {
		if (!this.instance) {
			const config = DatabaseClientFactory.getConfig();
			this.instance = createClient(
				config.supabaseUrl,
				config.supabaseKey,
			);

			return this.instance;
		}
	}
}
