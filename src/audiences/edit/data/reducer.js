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
			let posts = state.posts;
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
}
