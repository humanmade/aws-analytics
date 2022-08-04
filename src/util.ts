import { Moment } from 'moment';

export type InitialData = {
	postTypes: {
		label: string,
		name: string,
	}[],
	tracking: {
		opt_in: boolean,
	},
	user: {
		id?: number,
		name: string,
	},
	welcomed: boolean,
}

export interface StatGroup {
	[ k: string ]: number,
}

export interface LiftStats {
	views: number,
	conversions: number,
	fallback: {
		views: number,
		conversions: number,
	},
	personalized: {
		views: number,
		conversions: number,
	},
}

export interface GroupedStatistics {
	summary: {
		views: number,
		visitors: number,
		search: StatGroup,
		lift?: LiftStats,
	},
	by_browser: StatGroup,
	by_country: StatGroup,
	by_device: StatGroup,
	by_os: StatGroup,
	by_referer: StatGroup,
	by_user: StatGroup,
	by_url: StatGroup,
	by_search_term: StatGroup,
}

export interface IntervalStat {
	views: number,
	visitors: number,
}

export interface IntervalStats {
	[ k: string ]: IntervalStat,
}

export interface StatsResult {
	by_interval: IntervalStats,
	stats: GroupedStatistics,
}

export interface Period {
	start: Moment,
	end: Moment,
}

export type Duration = 'P7D' | 'P14D' | 'P30D' | 'P60D' | 'P90D' | 'P1M';
export type SelectableDate = Period | Duration;

export interface Filter {
	path?: string,
	time?: number,
}

export type Post = {
	id: number,
	slug: string,
	type: {
		name: string,
		label: string,
	},
	author: {
		ID: number,
		name: string,
		avatar: string,
	},
	title: string,
	url: string | null,
	editUrl: string | null,
	views: number,
	lift: LiftStats | null,
	[ k: string ]: any,
}

export interface State {
	posts: {
		[ k: string ]: Post[]
	},
	stats: {
		[ k: string ]: StatsResult,
	},
	isLoading: boolean,
	isLoadingStats: boolean,
	pagination: {
		total: number,
		pages: number,
	}
}

export interface StandardAction {
	type: string,
}

export interface SetPostsAction extends StandardAction {
	type: 'SET_POSTS',
	posts: Post[],
	key: string,
}
export interface SetStatsAction extends StandardAction {
	type: 'SET_STATS',
	stats: StatsResult,
	key: string,
}

export interface RefreshStatsAction extends StandardAction {
	type: 'REFRESH_STATS',
}

export interface SetIsLoadingAction extends StandardAction {
	type: 'SET_IS_LOADING',
	isLoading: State['isLoading'],
}

export interface SetIsLoadingStatsAction extends StandardAction {
	type: 'SET_IS_LOADING_STATS',
	isLoading: State['isLoadingStats'],
}

export interface SetPaginationAction extends StandardAction {
	type: 'SET_PAGINATION',
	total: number,
	pages: number,
}

export type Action = SetPostsAction | SetStatsAction | SetIsLoadingAction
					| SetIsLoadingStatsAction | SetPaginationAction
					| RefreshStatsAction;

export interface BlockFillProps {
	data?: StatsResult,
	onUpdateFilter( callback: ( filter: Filter ) => Filter ): void,
}

/**
 * Convert a number into a short string representation eg 3k.
 *
 * @param {number} metric The metric to get a condensed version of.
 * @returns {string} The metric compacted for display.
 */
export const compactMetric = ( metric: number ) : string => {
	if ( isNaN( metric ) ) {
		return '0';
	}

	// Infinity can happen with percentage calculations.
	if ( ! isFinite( metric ) ) {
		return metric >= 0 ? '∞%' : '-∞%';
	}

	let suffix = '';
	let value = metric;

	// Assume percentage.
	if ( ! Number.isInteger( metric ) ) {
		suffix = '%';
		value = Math.round( value );
		return `${ value }${ suffix }`;
	}

	// Thousands.
	if ( metric >= 1000 ) {
		suffix = 'k';
		value = metric / 1000;
	}

	// Millions.
	if ( metric >= 1000000 ) {
		suffix = 'M';
		value = metric / 1000000;
	}

	// Below 10 we use a fixed single decimal point eg. 2.3k, 1.4M.
	if ( value < 10 && value > 0 ) {
		value = ! Number.isInteger( value ) ? parseFloat( value.toFixed( 1 ) ) : value;
	} else {
		value = Math.round( value );
	}

	return `${ value }${ suffix }`;
};

export const getConversionRate = ( conversions: number, views: number ) => conversions / views * 100;

export const getLift = ( current: number, previous: number ) => ( ( current - previous ) / previous ) * 100;

export const getConversionRateLift = (
	fallback: LiftStats['fallback'],
	personalized: LiftStats['personalized'],
) => {
	const fallbackRate = getConversionRate( fallback.conversions, fallback.views );
	const personalizedRate = getConversionRate( personalized.conversions, personalized.views );
	return getLift( personalizedRate, fallbackRate );
};
