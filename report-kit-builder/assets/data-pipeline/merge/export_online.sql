SELECT date::date AS d, date_end::date AS de, round(cool_usage::numeric,2) AS cool, round(elec_usage::numeric,2) AS elec, days, src FROM mfg_merged_daily ORDER BY date;
