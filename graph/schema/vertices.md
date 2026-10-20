# Graph schema (Cosmos DB Gremlin API — production target)
Labels: Player, Club, Manager, Competition, Country, Season
Player props: id, common_name, nationality, position, kevin_bacon_score, degree_centrality, community_id
Club props: id, name, city, primary_colour | Manager props: id, full_name, nationality
Edges: PLAYED_FOR (season_start/end, appearances), COACHED_BY (season_start/end), MANAGED (derived), RIVAL_OF (rivalry_name, intensity), REPRESENTS, COMPETES_IN
Local demo runs the same schema in-memory (src/graph/universe.py) so judges need no Azure account.
