/**
 * Altis Analytics data store.
 */

const { apiFetch } = wp;
const { registerStore } = wp.data;
const { addQueryArgs } = wp.url;

const initialState = {
	posts: [],
	views: {},
	isLoading: false,
};

// Add API Fetch middleware to rewrite permissions lookups.
apiFetch.use( ( options, next ) => {
	if ( options.path ) {
		options.path = options.path.replace( 'wp/v2/xbs', 'analytics/v1/xbs' );
	}
	return next( options );
} );

/**
 * Experience block redux store reducer.
 *
 * @param {object} state Store state.
 * @param {object} action Action object.
 * @returns {object} Updated state.
 */
const reducer = function reducer( state, action ) {
	switch ( action.type ) {
		case 'ADD_VIEWS': {
			const key = `${ action.clientId }:${ btoa( JSON.stringify( action.args ) ) }`;
			return {
				...state,
				views: {
					...state.views,
					[ key ]: action.views,
				},
			};
		}

		case 'REMOVE_VIEWS': {
			const key = `${ action.clientId }:${ btoa( JSON.stringify( action.args ) ) }`;
			const { [ key ]: deletedItem, ...newState } = state;
			return newState;
		}

		case 'SET_IS_LOADING': {
			return {
				...state,
				isLoading: action.isLoading,
			};
		}

		case 'ADD_POST': {
			return {
				...state,
				posts: [ ...state.posts, action.post ],
			};
		}

		default: {
			return state;
		}
	}
};

const controls = {
	/**
	 * Fetch data from the API.
	 *
	 * @param {object} action Action object.
	 * @returns {Promise} API request promise.
	 */
	FETCH_FROM_API( action ) {
		return apiFetch( action.options );
	},
	/**
	 * Convert API response to JSON object.
	 *
	 * @param {object} action The action object.
	 * @param {Response} action.response Response object.
	 * @returns {object} JSON data from request.
	 */
	RESPONSE_TO_JSON( action ) {
		return action.response.json();
	},
};

const actions = {
	/**
	 * Action creator for adding block analytics data.
	 *
	 * @param {string} clientId Block client ID.
	 * @param {object} args Optional filters for the query.
	 * @param {object} views Analytics data.
	 * @returns {object} Redux action object.
	 */
	addViews( clientId, args, views ) {
		return {
			type: 'ADD_VIEWS',
			clientId,
			args,
			views,
		};
	},
	/**
	 * Action creator to remove block analytics data.
	 *
	 * @param {string} clientId The block client ID.
	 * @param {object} args Optional filters for the query.
	 * @returns {object} Redux action object.
	 */
	removeViews( clientId, args ) {
		return {
			type: 'REMOVE_VIEWS',
			clientId,
			args,
		};
	},
	/**
	 * Action creator for setting loading property.
	 *
	 * @param {boolean} isLoading True if currently loading data.
	 * @returns {object} Redux action object.
	 */
	setIsLoading( isLoading ) {
		return {
			type: 'SET_IS_LOADING',
			isLoading,
		};
	},
	/**
	 * Action creator for adding a post to the store.
	 *
	 * @param {object} post A post object.
	 * @returns {object} Action creator object.
	 */
	addPost( post ) {
		return {
			type: 'ADD_POST',
			post,
		};
	},
	/**
	 * Action creator for fetching API data.
	 *
	 * @param {object} options API fetch function options object.
	 * @returns {object} Redux action object.
	 */
	fetch( options ) {
		return {
			type: 'FETCH_FROM_API',
			options,
		};
	},
	/**
	 * Action creator for converting Response object to JSON.
	 *
	 * @param {Reponse} response Response object.
	 * @returns {object} Redux action object.
	 */
	json( response ) {
		return {
			type: 'RESPONSE_TO_JSON',
			response,
		};
	},
};

const selectors = {
	/**
	 * Get analytics data for a block.
	 *
	 * @param {object} state Redux store state.
	 * @param {string} clientId Block client ID.
	 * @param {object} args Optional args to scope views data to.
	 * @returns {object|boolean} Object of analytics data or false on failure.
	 */
	getViews( state, clientId, args = null ) {
		return state.views[ `${ clientId }:${ btoa( JSON.stringify( args ) ) }` ] || false;
	},
	/**
	 * Get loading state for anlaytics data.
	 *
	 * @param {object} state Redux store state.
	 * @returns {boolean} True if data is currently loading.
	 */
	getIsLoading( state ) {
		return state.isLoading;
	},
	/**
	 * Get an XB post from the store.
	 *
	 * @param {object} state The current store state.
	 * @param {string} clientId The block's client ID.
	 * @returns {?object} Post object or null.
	 */
	getPost( state, clientId ) {
		return state.posts.find( post => post.slug === clientId ) || null;
	},
};

const resolvers = {
	/**
	 * Fetch block analytics data from API.
	 *
	 * @param {string} clientId The block ID.
	 * @param {?object} args Optional args for filtering the data.
	 * @returns {object} Redux action object(s).
	 */
	*getViews( clientId, args = null ) {
		yield actions.setIsLoading( true );
		let path = `analytics/v1/xbs/${ clientId }/views`;
		if ( args ) {
			path = addQueryArgs( path, args );
		}
		const response = yield actions.fetch( {
			path,
		} );
		yield actions.addViews( clientId, args, response );
		return actions.setIsLoading( false );
	},
	/**
	 * Get an experience block post.
	 *
	 * @param {string} clientId The block client ID.
	 * @returns {object} Redux action objects.
	 */
	*getPost( clientId ) {
		yield actions.setIsLoading( true );
		const response = yield actions.fetch( {
			path: `analytics/v1/xbs/${ clientId }`,
		} );
		yield actions.addPost( response );
		return actions.setIsLoading( false );
	},
};

export const store = registerStore( 'analytics/xbs', {
	actions,
	controls,
	initialState,
	reducer,
	resolvers,
	selectors,
} );
