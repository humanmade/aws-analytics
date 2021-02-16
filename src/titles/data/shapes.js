export const DEFAULT_TEST = {
	end_time: Date.now() + ( 30 * 24 * 60 * 60 * 1000 ),
	paused: true,
	results: {
		aggs: [],
		variants: [],
		winner: false,
		winning: false,
	},
	start_time: Date.now(),
	started: false,
	traffic_percentage: 35,
};
