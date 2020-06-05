const { useSelect, useDispatch } = wp.data;

/**
 * Hook to check if the provided post ID can be edited.
 *
 * @param {Number} id An audience post ID.
 */
export const useCanEdit = id => useSelect( select => select( 'core' ).canUser( 'update', 'audiences', id ), [ id ] );

/**
 * Hook to check if audiences can be created.
 */
export const useCanCreate = () => useSelect( select => select( 'core' ).canUser( 'create', 'audiences' ), [] );

/**
 * Hook to check if the provided post ID can be deleted.
 *
 * @param {Number} id An audience post ID.
 */
export const useCanDelete = id => useSelect( select => select( 'core' ).canUser( 'delete', 'audiences', id ), [ id ] );

/**
 * Returns a function to updates an audience post.
 */
export const useUpdatePost = () => useDispatch( 'audience' ).updatePost;

/**
 * Returns a function to delete an audience post.
 */
export const useDeletePost = () => useDispatch( 'audience' ).deletePost;
