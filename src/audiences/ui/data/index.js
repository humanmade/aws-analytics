import {
	defaultAudience,
	defaultPost,
} from './defaults';
import reducer from './reducer';

const { apiFetch } = wp;
const { registerStore } = wp.data;
const { addQueryArgs } = wp.url;

const initialState = {
	estimates: {},
	fields: [],
	pagination: {},
	post: defaultPost,
	posts: [],
	isLoading: false,
	isUpdating: false,
	isDeleting: false,
};

// Hydrate from server side.
if ( window.Altis.Analytics.Audiences.Fields ) {
	initialState.fields = window.Altis.Analytics.Audiences.Fields;
}
if ( window.Altis.Analytics.Audiences.Current ) {
	initialState.posts.push( window.Altis.Analytics.Audiences.Current );
	initialState.post = window.Altis.Analytics.Audiences.Current;
}

const controls = {
	/**
	 * @param {object} action Action object.
	 * @returns {Promise} API fetch promise.
	 */
	FETCH_FROM_API( action ) {
		return apiFetch( action.options );
	},
	/**
	 * @param {object} action Fetch Promise result.
	 * @returns {Promise} Fetch response to JSON Promise.
	 */
	RESPONSE_TO_JSON( action ) {
		return action.response.json();
	},
};

const actions = {
	/**
	 * Set fields action creator.
	 *
	 * @param {Array} fields Available audience fields.
	 * @returns {object} Fields action object.
	 */
	setFields( fields ) {
		return {
			type: 'SET_FIELDS',
			fields,
		};
	},
	/**
	 * Add posts action creator.
	 *
	 * @param {Array} posts Posts to add to store.
	 * @returns {object} Add posts action object.
	 */
	addPosts( posts ) {
		return {
			type: 'ADD_POSTS',
			posts,
		};
	},
	/**
	 * Add estimate action creator.
	 *
	 * @param {object} audience Audience config object.
	 * @param {object} estimate Audience size estimate result.
	 * @returns {object} Add estimate action object.
	 */
	addEstimate( audience, estimate ) {
		return {
			type: 'ADD_ESTIMATE',
			audience,
			estimate,
		};
	},
	/**
	 * Remove post action creator.
	 *
	 * @param {number} id ID of post to remove.
	 * @returns {object} Remove post action object.
	 */
	removePost( id ) {
		return {
			type: 'REMOVE_POST',
			id,
		};
	},
	/**
	 * Set current post action creator.
	 *
	 * @param {object} post Post object.
	 * @returns {object} Set current post action object.
	 */
	setCurrentPost( post ) {
		return {
			type: 'SET_CURRENT_POST',
			post,
		};
	},
	/**
	 * Update current post action creator.
	 *
	 * @param {object} post Post object.
	 * @returns {object} Update current post action object.
	 */
	updateCurrentPost( post ) {
		return {
			type: 'UPDATE_CURRENT_POST',
			post,
		};
	},
	/**
	 * Set is loading action creator.
	 *
	 * @param {boolean} isLoading True if UI is loading.
	 * @returns {object} Set loading action object.
	 */
	setIsLoading( isLoading ) {
		return {
			type: 'SET_IS_LOADING',
			isLoading,
		};
	},
	/**
	 * Set updating action creator.
	 *
	 * @param {boolean} isUpdating True if UI is updating.
	 * @returns {object} Set updating action object.
	 */
	setIsUpdating( isUpdating ) {
		return {
			type: 'SET_IS_UPDATING',
			isUpdating,
		};
	},
	/**
	 * Set deleting action creator.
	 *
	 * @param {boolean} isDeleting True if currently deleting an item.
	 * @returns {object} Set deleting action object.
	 */
	setIsDeleting( isDeleting ) {
		return {
			type: 'SET_IS_DELETING',
			isDeleting,
		};
	},
	/**
	 * Set pagination action creator.
	 *
	 * @param {number} total Total found posts.
	 * @param {number} pages Total number of pages.
	 * @returns {object} Set pagination action object.
	 */
	setPagination( total, pages ) {
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
	fetch( options ) {
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
	json( response ) {
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
	*createPost( post ) {
		yield actions.setIsUpdating( true );
		const newPost = yield actions.fetch( {
			path: 'wp/v2/audiences',
			method: 'POST',
			data: post,
		} );
		yield actions.addPosts( [ newPost ] );
		yield actions.updateCurrentPost( newPost );
		return actions.setIsUpdating( false );
	},
	/**
	 * update post generator.
	 *
	 * @param {object} post Post object.
	 * @returns {object} Action objects.
	 */
	*updatePost( post ) {
		if ( ! post.id ) {
			return;
		}
		yield actions.setIsUpdating( true );
		// Raw value is also required to update the title.
		if ( post.title && ! post.title.raw ) {
			post.title.raw = post.title.rendered;
		}
		const updatedPost = yield actions.fetch( {
			path: `wp/v2/audiences/${ post.id }`,
			method: 'PATCH',
			data: post,
		} );
		yield actions.updateCurrentPost( updatedPost );
		return actions.setIsUpdating( false );
	},
	/**
	 * Delete post generator.
	 *
	 * @param {number} id Post ID.
	 * @returns {object} Action objects.
	 */
	*deletePost( id ) {
		yield actions.setIsDeleting( true );
		const post = yield actions.fetch( {
			path: `wp/v2/audiences/${ id }`,
			method: 'DELETE',
		} );
		yield actions.addPosts( [ post ] );
		return actions.setIsDeleting( false );
	},
};

const selectors = {
	/**
	 * Get audiences fields.
	 *
	 * @param {object} state The redux store state.
	 * @returns {Array} Fields data.
	 */
	getFields( state ) {
		return state.fields;
	},
	/**
	 * Get estimate data.
	 *
	 * @param {object} state The redux store state.
	 * @param {object} audience Audience config.
	 * @returns {object} Estimate data.
	 */
	getEstimate( state, audience ) {
		const key = JSON.stringify( audience );
		return state.estimates[ key ] || {
			count: 0,
			total: 0,
			histogram: new Array( 28 ).fill( { count: 1 } ), // Build empty histogram data.
		};
	},
	/**
	 * Get a post by ID.
	 *
	 * @param {object} state The redux store state.
	 * @param {number} id The post ID.
	 * @returns {object} The post object.
	 */
	getPost( state, id ) {
		return state.posts.find( post => post.id === id );
	},
	/**
	 * Gets the currently selected post.
	 *
	 * @param {object} state The redux store state.
	 * @returns {object} Current post object.
	 */
	getCurrentPost( state ) {
		return state.post;
	},
	/**
	 * Get all posts.
	 *
	 * @param {object} state The redux store state.
	 * @returns {Array} List of all available posts.
	 */
	getPosts( state ) {
		return state.posts;
	},
	/**
	 * Get pagination data.
	 *
	 * @param {object} state The redux store state.
	 * @returns {object} Current pagination data.
	 */
	getPagination( state ) {
		return state.pagination;
	},
	/**
	 * Get loading status.
	 *
	 * @param {object} state The redux store state.
	 * @returns {boolean} True if currently loading.
	 */
	getIsLoading( state ) {
		return state.isLoading;
	},
	/**
	 * Get updating status.
	 *
	 * @param {object} state The redux store state.
	 * @returns {boolean} True if currently updating.
	 */
	getIsUpdating( state ) {
		return state.isUpdating;
	},
	/**
	 * Get deleting status.
	 *
	 * @param {object} state The redux store state.
	 * @returns {boolean} True if currently deleting.
	 */
	getIsDeleting( state ) {
		return state.isDeleting;
	},
};

const resolvers = {
	/**
	 * Resovle field request.
	 *
	 * @returns {object} Action objects.
	 */
	*getFields() {
		const fields = yield actions.fetch( {
			path: 'analytics/v1/audiences/fields',
		} );
		return actions.setFields( fields );
	},
	/**
	 * Resolve estimate request.
	 *
	 * @param {object} audience Audience config object.
	 * @returns {object} Action objects.
	 */
	*getEstimate( audience ) {
		const audienceQuery = encodeURIComponent( JSON.stringify( audience ) );
		const estimate = yield actions.fetch( {
			path: `analytics/v1/audiences/estimate?audience=${ audienceQuery }`,
		} );
		estimate.histogram = estimate.histogram || new Array( 28 ).fill( { count: 1 } );
		return actions.addEstimate( audience, estimate );
	},
	/**
	 * Resolve request for post.
	 *
	 * @param {number} id The post ID.
	 * @returns {object} Action objects.
	 */
	*getPost( id ) {
		if ( ! id ) {
			return;
		}
		yield actions.setIsLoading( true );
		try {
			const post = yield actions.fetch( {
				path: `wp/v2/audiences/${ id }?context=edit`,
			} );
			if ( post.status === 'auto-draft' ) {
				post.title.rendered = '';
			}
			if ( ! post.audience ) {
				post.audience = defaultAudience;
			}
			yield actions.addPosts( [ post ] );
		} catch ( error ) {
			// Add the post ID to the error response.
			yield actions.addPosts( [
				{
					id,
					error,
				},
			] );
		}
		return actions.setIsLoading( false );
	},
	/**
	 * Resolve request for current post.
	 *
	 * @param {number} id The post ID.
	 * @returns {object} Action objects.
	 */
	*getCurrentPost( id ) {
		if ( ! id ) {
			return;
		}
		yield actions.setIsLoading( true );
		const post = yield actions.fetch( {
			path: `wp/v2/audiences/${ id }?context=edit`,
		} );
		if ( post.status === 'auto-draft' ) {
			post.title.rendered = '';
		}
		if ( ! post.audience ) {
			post.audience = defaultAudience;
		}
		yield actions.addPosts( [ post ] );
		yield actions.setCurrentPost( post );
		return actions.setIsLoading( false );
	},
	/**
	 * Resolve request for multiple posts.
	 *
	 * @param {number} page Results page to get.
	 * @param {string} search Current search query.
	 * @param {string} status Post status.
	 * @returns {object} Action objects.
	 */
	*getPosts( page = 1, search = '', status = 'publish,draft' ) {
		yield actions.setIsLoading( true );
		const response = yield actions.fetch( {
			path: addQueryArgs( 'wp/v2/audiences', {
				context: 'edit',
				per_page: 20,
				page,
				search,
				status,
			} ),
			headers: {
				'Access-Control-Expose-Headers': 'X-WP-Total, X-WP-TotalPages',
			},
			parse: false,
		} );
		const posts = yield actions.json( response );
		yield actions.addPosts( posts );
		yield actions.setPagination(
			response.headers.get( 'x-wp-total' ),
			response.headers.get( 'x-wp-totalpages' )
		);
		return actions.setIsLoading( false );
	},
};

export const store = registerStore( 'audience', {
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
