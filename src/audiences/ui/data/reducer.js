import { unionBy } from 'lodash';

/**
 * Sort posts by menu order then title in ascending order.
 *
 * @param {object} a The first post object to sort.
 * @param {object} b The second post object to sort.
 */
const sortPosts = ( a, b ) => {
	if ( a.menu_order < b.menu_order ) {
		return -1;
	}
	if ( a.menu_order > b.menu_order ) {
		return 1;
	}
	if ( a.title.rendered < b.title.rendered ) {
		return -1;
	}
	if ( a.title.rendered > b.title.rendered ) {
		return 1;
	}
	return 0;
};

export default function reducer( state, action ) {
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
			const posts = unionBy( action.posts, state.posts, post => post.id );
			posts.sort( sortPosts );
			return {
				...state,
				posts,
			};
		}

		case 'REMOVE_POST': {
			return {
				...state,
				pagination: {
					total: state.pagination.total - 1,
					pages: Math.floor( ( state.pagination.total - 1 ) / 20 ),
				},
				posts: state.posts.filter( post => post.id !== action.id ),
			};
		}

		case 'SET_CURRENT_POST': {
			if ( ! action.post.id ) {
				return {
					...state,
					post: {
						...action.post,
					},
				};
			}

			const posts = state.posts.map( post => {
				if ( post.id !== action.post.id ) {
					return post;
				}

				return {
					...action.post,
				};
			} );
			posts.sort( sortPosts );

			return {
				...state,
				posts,
				post: {
					...action.post,
				},
			};
		}

		case 'UPDATE_CURRENT_POST': {
			if ( ! action.post.id ) {
				return {
					...state,
					post: {
						...state.post,
						...action.post,
					},
				};
			}

			const posts = state.posts.map( post => {
				if ( post.id !== action.post.id ) {
					return post;
				}

				return {
					...post,
					...action.post,
				};
			} );
			posts.sort( sortPosts );

			return {
				...state,
				posts,
				post: {
					...state.post,
					...action.post,
				},
			};
		}

		case 'SET_IS_LOADING': {
			return {
				...state,
				isLoading: action.isLoading,
			};
		}

		case 'SET_IS_UPDATING': {
			return {
				...state,
				isUpdating: action.isUpdating,
			};
		}

		case 'SET_IS_DELETING': {
			return {
				...state,
				isDeleting: action.isDeleting,
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
			return state;
		}
	}
}
