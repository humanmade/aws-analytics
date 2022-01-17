import { Action, Post, State } from '../util';

/**
 * Sort posts ascending order.
 *
 * @param {object} a The first post object to sort.
 * @param {object} b The second post object to sort.
 * @returns {number} Sort result value.
 */
const sortPosts = ( a: Post, b: Post ) : number => {
	// Check for errored posts.
	if ( a.error || b.error ) {
		return 0;
	}
	if ( a.views > b.views ) {
		return -1;
	}
	if ( a.views < b.views ) {
		return 1;
	}
	return 0;
};

/**
 * Reducer for the dashboard data store.
 *
 * @param {object} state The current state object.
 * @param {object} action The action used to update the store.
 * @returns {object} The updated state.
 */
export default function reducer( state: State, action: Action ) : State {
	switch ( action.type ) {

		case 'SET_POSTS': {
			return {
				...state,
				posts: {
					...state.posts,
					[ action.key ]: action.posts.sort( sortPosts ),
				},
			};
		}

		case 'SET_STATS': {
			return {
				...state,
				stats: {
					...state.stats,
					[ action.key ]: action.stats,
				},
			};
		}

		case 'REFRESH_STATS': {
			return {
				...state,
				stats: {},
			};
		}

		case 'SET_IS_LOADING': {
			return {
				...state,
				isLoading: action.isLoading,
			};
		}

		case 'SET_IS_LOADING_STATS': {
			return {
				...state,
				isLoadingStats: action.isLoading,
			};
		}

		case 'SET_PAGINATION': {
			return {
				...state,
				pagination: {
					total: action.total,
					pages: action.pages,
				},
			};
		}

		default: {
			const _type: never = action.type;
			return state;
		}
	}
}
