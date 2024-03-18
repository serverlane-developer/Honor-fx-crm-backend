import { Knex } from "knex";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex: Knex): Promise<void> {
	return knex.raw(`
		CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER
		LANGUAGE plpgsql
		AS
		$$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$;
	  `);
};

exports.down = function (knex: Knex) {
	return knex.raw(`
		DROP FUNCTION IF EXISTS update_timestamp() restrict;
	  `);
};
