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
	SetPostAction,
	SetPaginationAction,
	SetStatsAction,
	SetIsLoadingAction,
	SetIsLoadingStatsAction,
	SetIsUpdatingAction,
	State,
	StandardAction,
	StatsResult,
	RefreshStatsAction,
	QueryArgs,
	Filter,
	DiffsResult,
	SetDiffsAction,
	SetIsLoadingDiffsAction,
	Duration,
	PostUpdateObject,
} from '../util';

const API_NAMESPACE = 'accelerate/v1';
const STATS_ENDPOINT = `${ API_NAMESPACE }/stats`;
const TOP_ENDPOINT = `${API_NAMESPACE}/top`;
const DIFF_ENDPOINT = `${API_NAMESPACE}/diff`;

const POST_TYPE_ENDPOINTS = {
	broadcast: `${API_NAMESPACE}/broadcast`,
};

export const resolveSelectedDate = ( period: SelectableDate, diff: SelectableDate | null ) : Period => {
	const diffDur = moment.duration( diff as DurationInputArg1 );
	const end = moment().utc().subtract( diffDur ).endOf( 'day' );
	const dur = moment.duration( period as DurationInputArg1 );
	const start = moment( end ).utc().subtract( dur ).add( 1, 'day' ).startOf( 'day' );
	return {
		start,
		end,
	};
}

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
	isLoading: true,
	isLoadingStats: true,
	isLoadingDiffs: true,
	isUpdating: false,
	pagination: {
		total: 0,
		pages: 0,
	},
	posts: {},
	queries: {},
	stats: {},
	diffs: {},
};

interface FetchAction extends StandardAction {
	type: 'FETCH_FROM_API',
	options: APIFetchOptions,
}

interface ResponseAction extends StandardAction {
	type: 'RESPONSE_TO_JSON',
	response: Response,
}

type Responses = Post[] | StatsResult | DiffsResult;

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
	 * Update a post entry.
	 *
	 * @param post Updated post entry.
	 * @returns {object} Update post action object.
	 */
	setPost( post: Post ) : SetPostAction {
		return {
			type: 'SET_POST',
			post
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
	 * Add stats action creator.
	 *
	 * @param {Array} diffs Post diffs to add to store.
	 * @param {string} key A query cache key for the results.
	 * @returns {object} Add stats action object.
	 */
	setDiffs( diffs: DiffsResult, period: Duration ) : SetDiffsAction {
		return {
			type: 'SET_DIFFS',
			diffs: {
				[ period ]: diffs,
			},
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
	 * Set is loading action creator.
	 *
	 * @param {boolean} isLoading True if UI is loading.
	 * @returns {object} Set loading action object.
	 */
	setIsLoadingDiffs( isLoading: boolean ) : SetIsLoadingDiffsAction {
		return {
			type: 'SET_IS_LOADING_DIFFS',
			isLoading,
		};
	},
	/**
	 * Set is updating action creator.
	 *
	 * @param {boolean} isUpdating True if UI is updating data.
	 * @returns {object} Set updating action object.
	 */
	setIsUpdating( isUpdating: boolean ) : SetIsUpdatingAction {
		return {
			type: 'SET_IS_UPDATING',
			isUpdating,
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

const actionGenerators = {
	/**
	 * Create post generator.
	 *
	 * @param {object} post Post object.
	 * @returns {object} Action objects.
	 */
	*createPost ( post:PostUpdateObject ) {
		yield actions.setIsUpdating( true );

		const response: object = yield actions.fetch( {
			path: `accelerate/v1/broadcast`,
			method: 'POST',
			data: post,
		} );

		if ( !response ) {
			return;
		}

		const queryArgs = resolveQueryArgs( {
			blocks: [ post.id ],
			type: post.type,
		} );

		const result: Response = yield actions.fetch( {
			path: addQueryArgs( TOP_ENDPOINT, queryArgs ),
			headers: {
				'Access-Control-Expose-Headers': 'X-WP-Total, X-WP-TotalPages',
			},
			parse: false,
		} );

		if ( !result ) {
			return;
		}

		const posts: Post[] = yield actions.json( result );

		yield actions.setPost( posts[ 0 ] );
		return actions.setIsUpdating( false );
	},

	/**
	 * Update post action generator.
	 *
	 * @param {Post} post Post object.
	 * @returns {object} Action objects.
	 */
	*updatePost ( post: PostUpdateObject ) {
		if ( !post.id ) {
			return;
		}
		yield actions.setIsUpdating( true );

		const response: object = yield actions.fetch( {
			path: `accelerate/v1/broadcast/${post.id}`,
			method: 'PATCH',
			data: post,
		} );

		if ( !response ) {
			return;
		}

		const queryArgs = resolveQueryArgs( {
			blocks: [ post.id ],
			type: post.type,
		} );

		const result: Response = yield actions.fetch( {
			path: addQueryArgs( TOP_ENDPOINT, queryArgs ),
			headers: {
				'Access-Control-Expose-Headers': 'X-WP-Total, X-WP-TotalPages',
			},
			parse: false,
		} );

		if ( ! result ) {
			return;
		}

		const posts: Post[] = yield actions.json( result );

		yield actions.setPost( posts[0] );
		return actions.setIsUpdating( false );
	},
}

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
		const postIds = state.queries[ mapToKey( queryArgs ) ] || [];
		return postIds.map( id => state.posts[ id ] || null );
	},
	/**
	 * Get a post.
	 *
	 * @param {object} state  The redux store state.
	 * @param {number} id     The post ID.
	 * @returns {Post | null} The requested post object.
	 */
	getPost( state: State, id: number ) {
		return state.posts[ id ] || null;
	},
	/**
	 * Get all post diffs.
	 *
	 * @param {object} state The redux store state.
	 * @param {object} queryArgs The query args object.
	 * @returns {object} List of all available post diffs.
	 */
	getDiffs( state: State, queryArgs: QueryArgs = {} ) {
		return state.diffs[ queryArgs?.period as string || 'P7D' ] || {};
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
	/**
	 * Get loading status.
	 *
	 * @param {object} state The redux store state.
	 * @returns {boolean} True if currently loading.
	 */
	getIsLoadingDiffs( state: State ) {
		return state.isLoadingDiffs;
	},
	/**
	 * Get loading status.
	 *
	 * @param {object} state The redux store state.
	 * @returns {boolean} True if currently loading.
	 */
	getIsUpdating ( state: State ) {
		return state.isUpdating;
	},
};

const resolvers = {
	/**
	 * Resolve request for multiple posts.
	 *
	 * @param {object} queryArgs Query args to pass to the REST API query. Possible parameters include context, per_page, page, search or status.
	 * @returns {object} Action objects.
	 */
	*getPosts( queryArgs: QueryArgs = {}, isMainQuery = true ) {
		if ( isMainQuery ) {
			yield actions.setIsLoading( true );
		}

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

		if ( isMainQuery ) {
			yield actions.setPagination(
				parseInt( response.headers.get( 'x-wp-total' ) || '0', 10 ),
				parseInt( response.headers.get( 'x-wp-totalpages' ) || '0', 10 )
			);
			return actions.setIsLoading( false );
		} else {
			return posts;
		}
	},
	*getPost ( id: number, type: string ) {
		const queryArgs = resolveQueryArgs( {
			blocks: [ id ],
			type: type,
		} );

		const result: Response = yield actions.fetch( {
			path: addQueryArgs( TOP_ENDPOINT, queryArgs ),
			headers: {
				'Access-Control-Expose-Headers': 'X-WP-Total, X-WP-TotalPages',
			},
			parse: false,
		} );

		if ( ! result ) {
			return;
		}

		const posts: Post[] = yield actions.json( result );
		return posts[0];
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
	/**
	 * Resolve request for diffs.
	 *
	 * @param {object} queryArgs Arguments for the diffs request.
	 * @returns {object} Action objects.
	 */
	 *getDiffs( queryArgs: QueryArgs = {} ) {
		yield actions.setIsLoadingDiffs( true );

		queryArgs = resolveQueryArgs( queryArgs );

		const diffs: DiffsResult = yield actions.fetch( {
			path: addQueryArgs( DIFF_ENDPOINT, queryArgs ),
		} );

		yield actions.setDiffs( diffs || {}, queryArgs?.period as Duration || 'P7D' );
		return actions.setIsLoadingDiffs( false );
	},
};

export const store = createReduxStore( 'accelerate', {
	actions: {
		...actions,
		...actionGenerators,
	},
	controls,
	initialState,
	reducer,
	resolvers,
	selectors,
} );
