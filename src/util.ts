import { Moment } from 'moment';

export type InitialData = {
	postTypes: {
		singular_label: string,
		label: string,
		name: string,
	}[],
	tracking: {
		opt_in: boolean,
	},
	user: {
		id?: number,
		name: string,
		canViewAnalytics?: boolean,
		canViewInsights?: boolean,
	},
	welcomed: boolean,
	version: string,
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

export interface DiffsResult {
	[ k: string ]: HistogramDiff,
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

export type HistogramDiff = {
	previous: {
		uniques: number,
		by_date: {
			index: number,
			count: number,
		}[],
	},
	current: {
		uniques: number,
		by_date: {
			index: number,
			count: number,
		}[],
	},
}

export interface State {
	posts: {
		[ k: string ]: Post[]
	},
	stats: {
		[ k: string ]: StatsResult,
	},
	diffs: {
		[ k: string ]: {
			[ k: string ]: HistogramDiff,
		}
	},
	isLoading: boolean,
	isLoadingStats: boolean,
	isLoadingDiffs: boolean,
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

export interface SetDiffsAction extends StandardAction {
	type: 'SET_DIFFS',
	diffs: {
		[ k: string ]: DiffsResult,
	},
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

export interface SetIsLoadingDiffsAction extends StandardAction {
	type: 'SET_IS_LOADING_DIFFS',
	isLoading: State['isLoadingDiffs'],
}

export interface SetPaginationAction extends StandardAction {
	type: 'SET_PAGINATION',
	total: number,
	pages: number,
}

export type Action = SetPostsAction | SetStatsAction | SetIsLoadingAction
					| SetIsLoadingStatsAction | SetPaginationAction
					| RefreshStatsAction | SetDiffsAction | SetIsLoadingDiffsAction;

export interface BlockFillProps {
	data?: StatsResult,
	onUpdateFilter( callback: ( filter: Filter ) => Filter ): void,
}

/**
 * Convert a number into a short string representation eg 3k.
 *
 * @param {number} metric The metric to get a condensed version of.
 * @param {string} suffix The unit or suffix to append.
 * @returns {string} The metric compacted for display.
 */
 export const compactMetric = ( metric : number, suffix : string = '' ) => {
	if ( isNaN( metric ) ) {
		return '0';
	}

	// Infinity can happen with percentage calculations.
	if ( ! isFinite( metric ) ) {
		return '';
	}

	let volumeSuffix = '';
	let value = metric;
	const positiveMetric = metric < 0 ? metric * -1 : metric;

	// Thousands.
	if ( positiveMetric >= 1000 ) {
		volumeSuffix = 'k';
		value = metric / 1000;
	}

	// Millions.
	if ( positiveMetric >= 1000000 ) {
		volumeSuffix = 'M';
		value = metric / 1000000;
	}

	// Below 10 we use a fixed single decimal point eg. 2.3k, 1.4M.
	if ( value < 10 && value > -10 ) {
		value = ! Number.isInteger( value ) ? parseFloat( value.toFixed( 1 ) ) : value;
	} else {
		value = Math.round( value );
	}

	return `${ value }${ volumeSuffix }${ suffix }`;
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

/**
 * Track a user action/event to Segment
 *
 * @param {string} module Module where the action happens.
 * @param {string} action Action name.
 * @param {object} parameters Additional details/parameters of the action.
 *
 * @returns void;
 */
export function trackEvent( module: string, action: string, parameters: { [ k: string ]: any } = {} ) {
	if ( window.analytics ) {
		window.analytics.track( `${ module } - ${ action }`, parameters );
	}
}

/**
 * Pads numbers with a leading zero.
 *
 * @param value Number to pad with leading zero.
 * @returns
 */
export function padLeft( value: number ) {
	return ( '0' + value ).replace( /0(\d\d)/, '$1' );
}
