const { useSelect, useDispatch } = wp.data;

/**
 * Hook to check if the provided post ID can be edited.
 *
 * @param {number} id An audience post ID.
 * @returns {boolean} True if user can edit audience.
 */
export const useCanEdit = id => useSelect( select => select( 'core' ).canUser( 'update', 'audiences', id ), [ id ] );

/**
 * Hook to check if audiences can be created.
 *
 * @returns {boolean} True if user can create audiences.
 */
export const useCanCreate = () => useSelect( select => select( 'core' ).canUser( 'create', 'audiences' ), [] );

/**
 * Hook to check if the provided post ID can be deleted.
 *
 * @param {number} id An audience post ID.
 * @returns {boolean} True if user can delete audience.
 */
export const useCanDelete = id => useSelect( select => select( 'core' ).canUser( 'delete', 'audiences', id ), [ id ] );

/**
 * Returns a function to updates an audience post.
 *
 * @returns {Function} Update post function.
 */
export const useUpdatePost = () => useDispatch( 'audience' ).updatePost;

/**
 * Returns a function to delete an audience post.
 *
 * @returns {Function} Delete post function.
 */
export const useDeletePost = () => useDispatch( 'audience' ).deletePost;
