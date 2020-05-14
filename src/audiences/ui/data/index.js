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
	fetch( options ) {
		return {
			type: 'FETCH_FROM_API',
			options,
		};
	},
};

const actionGenerators = {
	*createPost() {
		yield actions.setIsLoading( true );
		const post = yield actions.fetch( {
			path: 'wp/v2/audiences',
			method: 'POST',
			data: {
				status: 'draft',
			},
		} );
		yield actions.setCurrentPost( post );
		return actions.setIsLoading( false );
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
		yield actions.setCurrentPost( updatedPost );
		return actions.setIsUpdating( false );
	},
	*deletePost( id ) {
		yield actions.setIsDeleting( true );
		yield actions.fetch( {
			path: `wp/v2/audiences/${ id }`,
			method: 'DELETE',
		} );
		yield actions.removePost( id );
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
			histogram: new Array( 28 ).fill( { count: 1 } ), // Build empty histrogram data.
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
		return actions.addEstimate( audience, estimate );
	},
	*getPost( id ) {
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
		const posts = yield actions.fetch( {
			path: addQueryArgs( 'wp/v2/audiences', {
				context: 'edit',
				per_page: 30,
				page,
				search,
				status,
			} ),
		} );
		yield actions.addPosts( posts );
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
