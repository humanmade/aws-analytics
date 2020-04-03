import {
	defaultAudience,
	defaultPost,
} from './defaults';
import reducer from './reducer';

const { apiFetch } = wp;
const { registerStore } = wp.data;

const initialState = {
	estimates: {},
	fields: [],
	pagination: {},
	post: defaultPost,
	posts: [],
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
	setPost( post ) {
		return {
			type: 'SET_POST',
			post,
		};
	},
	fetch( options ) {
		return {
			type: 'FETCH_FROM_API',
			options,
		};
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
	getPost( state ) {
		return state.post;
	},
	getPosts( state ) {
		return state.posts;
	},
};

const resolvers = {
	* getFields() {
		const fields = yield actions.fetch( {
			path: 'analytics/v1/audiences/fields',
		} );
		return actions.setFields( fields );
	},
	* getEstimate( audience ) {
		const audienceQuery = encodeURIComponent( JSON.stringify( audience ) );
		const estimate = yield actions.fetch( {
			path: `analytics/v1/audiences/estimate?audience=${ audienceQuery }`,
		} );
		return actions.addEstimate( audience, estimate );
	},
	* getPost( id ) {
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
		return actions.setPost( post );
	},
	* getPosts( page = 1, search = '' ) {
		const posts = yield actions.fetch( {
			path: `wp/v2/audiences?context=edit&page=${ page }&search=${ search }`,
		} );
		return actions.addPosts( posts );
	},
};

export const store = registerStore( 'audience', {
	actions,
	controls,
	initialState,
	reducer,
	resolvers,
	selectors,
} );
