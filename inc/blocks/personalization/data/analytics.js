/**
 * Altis Analytics data store.
 */

const { apiFetch } = wp;
const { registerStore } = wp.data;
const { addQueryArgs } = wp.url;

const initialState = {
	views: {},
	isLoading: false,
};

const reducer = function reducer( state, action ) {
	switch ( action.type ) {
		case 'ADD_VIEWS': {
			const key = `${ action.clientId }${ action.postId ? `-${ action.postId }` : '' }`;
			return {
				...state,
				views: {
					...state.views,
					[ key ]: action.views,
				},
			};
		}

		case 'REMOVE_VIEWS': {
			const key = `${ action.clientId }${ action.postId ? `-${ action.postId }` : '' }`;
			const { [ key ]: deletedItem, ...newState } = state;
			return newState;
		}

		case 'SET_IS_LOADING': {
			return {
				...state,
				isLoading: action.isLoading,
			};
		}

		default: {
			return state;
		}
	}
};

const controls = {
	FETCH_FROM_API( action ) {
		return apiFetch( action.options );
	},
	RESPONSE_TO_JSON( action ) {
		return action.response.json();
	},
};

const actions = {
	addViews( clientId, postId, views ) {
		return {
			type: 'ADD_VIEWS',
			clientId,
			postId,
			views,
		};
	},
	removeViews( clientId, postId ) {
		return {
			type: 'REMOVE_VIEWS',
			clientId,
			postId,
		};
	},
	setIsLoading( isLoading ) {
		return {
			type: 'SET_IS_LOADING',
			isLoading,
		};
	},
	fetch( options ) {
		return {
			type: 'FETCH_FROM_API',
			options,
		};
	},
	json( response ) {
		return {
			type: 'RESPONSE_TO_JSON',
			response,
		};
	},
};

const selectors = {
	getViews( state, clientId, postId = null ) {
		return state.views[ `${ clientId }${ postId ? `-${ postId }` : '' }` ] || false;
	},
	getIsLoading( state ) {
		return state.isLoading;
	},
};

const resolvers = {
	*getViews( clientId, postId = null ) {
		yield actions.setIsLoading( true );
		const response = yield actions.fetch( {
			path: addQueryArgs( `analytics/v1/xbs/${ clientId }/views`, {
				post_id: postId,
			} ),
		} );
		yield actions.addViews( clientId, postId, response );
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
