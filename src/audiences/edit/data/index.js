import {
	defaultAudience,
	defaultPost,
} from './defaults';

const { apiFetch } = wp;
const { registerStore } = wp.data;

const INITIAL_STATE = {
	posts: [],
	pagination: {},
	fields: [],
	estimates: {},
	post: defaultPost,
};

// Hydrate from server side.
if ( window.Altis.Analytics.Audiences.Fields ) {
	INITIAL_STATE.fields = window.Altis.Analytics.Audiences.Fields;
}
if ( window.Altis.Analytics.Audiences.Current ) {
	INITIAL_STATE.posts.push( window.Altis.Analytics.Audiences.Current );
	INITIAL_STATE.post = window.Altis.Analytics.Audiences.Current;
}

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

export const store = registerStore( 'audience', {
	initialState: INITIAL_STATE,
	reducer( state, action ) {
		switch ( action.type ) {
			case 'SET_FIELDS': {
				return {
					...state,
					fields: action.fields,
				};
			}
			case 'ADD_ESTIMATE': {
				const key = JSON.stringify( action.audience );
				if ( state.estimates[ key ] ) {
					return state;
				}
				return {
					...state,
					estimates: {
						...state.estimates,
						[ key ]: action.estimate,
					},
				};
			}
			case 'ADD_POSTS': {
				const posts = state.posts.slice();
				action.posts.forEach( post => {
					if ( ! posts.filter( existing => post.id === existing.id ).length ) {
						posts.push( post );
					}
				} );
				if ( state.posts.length === posts.length ) {
					return state;
				}
				return {
					...state,
					posts,
				};
			}
			case 'SET_POST': {
				let posts = state.posts.slice();
				if ( action.post.id ) {
					posts = posts.map( post => {
						if ( post.id === action.post.id ) {
							post = {
								...post,
								...action.post,
							};
						}
						return post;
					} );
				}
				return {
					...state,
					posts: action.post.id ? posts : state.posts,
					post: {
						...state.post,
						...action.post,
					},
				};
			}
			default: {
				return state;
			}
		}
	},
	actions,
	selectors: {
		getFields( state ) {
			return state.fields;
		},
		getEstimate( state, audience ) {
			const key = JSON.stringify( audience );
			return state.estimates[ key ] || {
				count: 0,
				total: 0,
				histogram: [].fill( { count: 0 }, 0, 27 ), // Build empty histrogram data.
			};
		},
		getPost( state ) {
			return state.post;
		},
		getPosts( state ) {
			return state.posts;
		},
	},
	controls: {
		FETCH_FROM_API( action ) {
			return apiFetch( action.options );
		},
	},
	resolvers: {
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
	},
} );
