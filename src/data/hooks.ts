import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { Post, PostUpdateObject } from '../util';

interface UsePostReturn {
	post: Post,
	onUpdatePost: ( post: PostUpdateObject ) => void,
	isUpdating: boolean,
}

/**
 * Use
 * @param id Post ID
 * @returns {UsePostReturn}
 */
export const usePost = ( id: number ) : UsePostReturn => {
	const post: Post = useSelect( ( select ) => select( 'accelerate' ).getPost( id ), [ id ] );

	const { updatePost } = useDispatch( 'accelerate' );
	const onUpdatePost = useCallback( ( post: PostUpdateObject ) => updatePost( post ), [ id ] );

	const isUpdating = useSelect( select => select( 'accelerate' ).getIsUpdating<boolean>() )

	return {
		post,
		onUpdatePost,
		isUpdating,
	};
};
