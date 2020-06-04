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
	FETCH_FROM_API( action ) {
		return apiFetch( action.options );
	},
	RESPONSE_TO_JSON( action ) {
		return action.response.json();
	},
};

const actions = {
	setFields( fields ) {
		return {
			type: 'SET_FIELDS',
			fields,
		};
	},
	addPosts( posts ) {
		return {
			type: 'ADD_POSTS',
			posts,
		};
	},
	addEstimate( audience, estimate ) {
		return {
			type: 'ADD_ESTIMATE',
			audience,
			estimate,
		};
	},
	removePost( id ) {
		return {
			type: 'REMOVE_POST',
			id,
		};
	},
	setCurrentPost( post ) {
		return {
			type: 'SET_CURRENT_POST',
			post,
		};
	},
	updateCurrentPost( post ) {
		return {
			type: 'UPDATE_CURRENT_POST',
			post,
		};
	},
	setIsLoading( isLoading ) {
		return {
			type: 'SET_IS_LOADING',
			isLoading,
		};
	},
	setIsUpdating( isUpdating ) {
		return {
			type: 'SET_IS_UPDATING',
			isUpdating,
		};
	},
	setIsDeleting( isDeleting ) {
		return {
			type: 'SET_IS_DELETING',
			isDeleting,
		};
	},
	setPagination( total, pages ) {
		return {
			type: 'SET_PAGINATION',
			total,
			pages,
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

const actionGenerators = {
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
	getFields( state ) {
		return state.fields;
	},
	getEstimate( state, audience ) {
		const key = JSON.stringify( audience );
		return state.estimates[ key ] || {
			count: 0,
			total: 0,
			histogram: new Array( 28 ).fill( { count: 1 } ), // Build empty histogram data.
		};
	},
	getPost( state, id ) {
		return state.posts.find( post => post.id === id );
	},
	getCurrentPost( state ) {
		return state.post;
	},
	getPosts( state ) {
		return state.posts;
	},
	getPagination( state ) {
		return state.pagination;
	},
	getIsLoading( state ) {
		return state.isLoading;
	},
	getIsUpdating( state ) {
		return state.isUpdating;
	},
	getIsDeleting( state ) {
		return state.isDeleting;
	},
};

const resolvers = {
	*getFields() {
		const fields = yield actions.fetch( {
			path: 'analytics/v1/audiences/fields',
		} );
		return actions.setFields( fields );
	},
	*getEstimate( audience ) {
		const audienceQuery = encodeURIComponent( JSON.stringify( audience ) );
		const estimate = yield actions.fetch( {
			path: `analytics/v1/audiences/estimate?audience=${ audienceQuery }`,
		} );
		estimate.histogram = estimate.histogram || new Array( 28 ).fill( { count: 1 } );
		return actions.addEstimate( audience, estimate );
	},
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
