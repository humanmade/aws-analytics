import { unionBy } from 'lodash';

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
			return {
				...state,
				posts: unionBy( [ state.posts, action.posts ], post => post.id ),
			};
		}
		case 'SET_POST': {
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

			return {
				...state,
				posts,
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
}
