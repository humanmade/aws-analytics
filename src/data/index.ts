import apiFetch, { APIFetchOptions } from '@wordpress/api-fetch';
import { createReduxStore } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';
import moment, { DurationInputArg1 } from 'moment';

import reducer from './reducer';
import {
	Period,
	Post,
	SelectableDate,
	SetPostsAction,
	SetPaginationAction,
	SetStatsAction,
	SetIsLoadingAction,
	SetIsLoadingStatsAction,
	State,
	StandardAction,
	StatsResult,
	RefreshStatsAction,
	Filter,
} from '../util';

const STATS_ENDPOINT = 'accelerate/v1/stats';
const TOP_ENDPOINT = 'accelerate/v1/top';

export const resolveSelectedDate = ( period: SelectableDate, diff: SelectableDate | null ) : Period => {
	const diffDur = moment.duration( diff as DurationInputArg1 );
	const end = moment().utc().subtract( diffDur ).endOf( 'day' );
	const dur = moment.duration( period as DurationInputArg1 );
	const start = moment( end ).utc().subtract( dur ).endOf( 'day' );
	return {
		start,
		end,
	};
}

type QueryArgs = {
	diff?: SelectableDate,
	end?: string,
	period?: SelectableDate,
	search?: string,
	start?: string,
	type?: string,
	filter?: Filter,
};

const mapToKey = ( obj: QueryArgs ) : string => {
	return Object.entries( resolveQueryArgs( obj ) )
		.filter( ( [ k, v ] ) => [ 'start', 'end' ].indexOf( k ) === -1 )
		.map( ( [ k, v ] ) => `${ k }:${ JSON.stringify( v ) }` )
		.sort()
		.join( ';' );
};

const resolveQueryArgs = ( queryArgs: QueryArgs = {} ) : QueryArgs => {
	const { start, end } = resolveSelectedDate(
		queryArgs.period || 'P7D',
		queryArgs.diff || null,
	);

	queryArgs = Object.assign( {
		end: end.toISOString(),
		start: start.toISOString(),
	}, queryArgs );

	return queryArgs;
};

const initialState: State = {
	isLoading: false,
	isLoadingStats: false,
	pagination: {
		total: 0,
		pages: 0,
	},
	posts: {},
	stats: {},
};

interface FetchAction extends StandardAction {
	type: 'FETCH_FROM_API',
	options: APIFetchOptions,
}

interface ResponseAction extends StandardAction {
	type: 'RESPONSE_TO_JSON',
	response: Response,
}

type Responses = Post[] | StatsResult;

const controls = {
	/**
	 * @param {object} action Action object.
	 * @returns {Promise} API fetch promise.
	 */
	FETCH_FROM_API( action: FetchAction ) : Promise<Response | Responses> {
		return apiFetch( {
			credentials: 'same-origin',
			...action.options,
		} );
	},
	/**
	 * @param {object} action Fetch Promise result.
	 * @returns {Promise} Fetch response to JSON Promise.
	 */
	RESPONSE_TO_JSON( action: ResponseAction ) : Promise<Responses> {
		return action.response.json();
	},
};

const actions = {
	/**
	 * Add posts action creator.
	 *
	 * @param {Array} posts Posts to add to store.
	 * @param {string} key A query cache key for the results.
	 * @returns {object} Add posts action object.
	 */
	setPosts( posts: Post[], key: string ) : SetPostsAction {
		return {
			type: 'SET_POSTS',
			posts,
			key,
		};
	},
	/**
	 * Add stats action creator.
	 *
	 * @param {Array} stats Posts to add to store.
	 * @param {string} key A query cache key for the results.
	 * @returns {object} Add stats action object.
	 */
	setStats( stats: StatsResult, key: string ) : SetStatsAction {
		return {
			type: 'SET_STATS',
			stats,
			key,
		};
	},
	/**
	 * Refresh stats action creator.
	 *
	 * @returns {object} Refresh stats action.
	 */
	refreshStats() : RefreshStatsAction {
		return {
			type: 'REFRESH_STATS',
		};
	},
	/**
	 * Set is loading action creator.
	 *
	 * @param {boolean} isLoading True if UI is loading.
	 * @returns {object} Set loading action object.
	 */
	setIsLoading( isLoading: boolean ) : SetIsLoadingAction {
		return {
			type: 'SET_IS_LOADING',
			isLoading,
		};
	},
	/**
	 * Set is loading action creator.
	 *
	 * @param {boolean} isLoading True if UI is loading.
	 * @returns {object} Set loading action object.
	 */
	setIsLoadingStats( isLoading: boolean ) : SetIsLoadingStatsAction {
		return {
			type: 'SET_IS_LOADING_STATS',
			isLoading,
		};
	},
	/**
	 * Set pagination action creator.
	 *
	 * @param {number} total Total found posts.
	 * @param {number} pages Total number of pages.
	 * @returns {object} Set pagination action object.
	 */
	setPagination( total: number, pages: number ) : SetPaginationAction {
		return {
			type: 'SET_PAGINATION',
			total,
			pages,
		};
	},
	/**
	 * Fetch action creator.
	 *
	 * @param {object} options Fetch function options.
	 * @returns {object} Fetch action object.
	 */
	fetch( options: APIFetchOptions ) : FetchAction {
		return {
			type: 'FETCH_FROM_API',
			options,
		};
	},
	/**
	 * Response to JSON action creator.
	 *
	 * @param {Response} response Fetch response object.
	 * @returns {object} JSON response action object.
	 */
	json( response: Response ) : ResponseAction {
		return {
			type: 'RESPONSE_TO_JSON',
			response,
		};
	},
};

const selectors = {
	/**
	 * Get stats.
	 *
	 * @param {object} state The redux store state.
	 * @param {object} queryArgs The query args object.
	 * @returns {Array} List of all available posts.
	 */
	getStats( state: State, queryArgs: QueryArgs = {} ) {
		return state.stats[ mapToKey( queryArgs ) ];
	},
	/**
	 * Get all posts.
	 *
	 * @param {object} state The redux store state.
	 * @param {object} queryArgs The query args object.
	 * @returns {Array} List of all available posts.
	 */
	getPosts( state: State, queryArgs: QueryArgs = {} ) {
		return state.posts[ mapToKey( queryArgs ) ] || [];
	},
	/**
	 * Get pagination data.
	 *
	 * @param {object} state The redux store state.
	 * @returns {object} Current pagination data.
	 */
	getPagination( state: State ) {
		return state.pagination;
	},
	/**
	 * Get loading status.
	 *
	 * @param {object} state The redux store state.
	 * @returns {boolean} True if currently loading.
	 */
	getIsLoading( state: State ) {
		return state.isLoading;
	},
	/**
	 * Get loading status.
	 *
	 * @param {object} state The redux store state.
	 * @returns {boolean} True if currently loading.
	 */
	getIsLoadingStats( state: State ) {
		return state.isLoadingStats;
	},
};

const resolvers = {
	/**
	 * Resolve request for multiple posts.
	 *
	 * @param {object} queryArgs Query args to pass to the REST API query. Possible parameters include context, per_page, page, search or status.
	 * @returns {object} Action objects.
	 */
	*getPosts( queryArgs: QueryArgs = {} ) {
		yield actions.setIsLoading( true );

		queryArgs = resolveQueryArgs( queryArgs );

		const response: Response = yield actions.fetch( {
			path: addQueryArgs( TOP_ENDPOINT, queryArgs ),
			headers: {
				'Access-Control-Expose-Headers': 'X-WP-Total, X-WP-TotalPages',
			},
			parse: false,
		} );
		if ( ! response ) {
			return actions.setIsLoading( false );
		}
		const posts: Post[] = yield actions.json( response );
		yield actions.setPosts( posts, mapToKey( queryArgs ) );
		yield actions.setPagination(
			parseInt( response.headers.get( 'x-wp-total' ) || '0', 10 ),
			parseInt( response.headers.get( 'x-wp-totalpages' ) || '0', 10 )
		);
		return actions.setIsLoading( false );
	},
	/**
	 * Resolve request for stats.
	 *
	 * @param {object} queryArgs Arguments for the stats request.
	 * @returns {object} Action objects.
	 */
	 *getStats( queryArgs: QueryArgs = {} ) {
		yield actions.setIsLoadingStats( true );

		queryArgs = resolveQueryArgs( queryArgs );

		const stats: StatsResult = yield actions.fetch( {
			path: addQueryArgs( STATS_ENDPOINT, queryArgs ),
		} );
		if ( ! stats ) {
			return actions.setIsLoadingStats( false );
		}
		yield actions.setStats( stats, mapToKey( queryArgs ) );
		return actions.setIsLoadingStats( false );
	},
};

export const store = createReduxStore( 'accelerate', {
	actions,
	controls,
	initialState,
	reducer,
	resolvers,
	selectors,
} );
