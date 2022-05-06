import ImageInput from '../components/field-image-input';

wp.hooks.addFilter( 'altis.experiments.sidebar.test.featured_images', 'altis.experiments.features.featured_images', options => ( {
	...options,

	component: ImageInput,

	/**
	 * Add/replace dispatchers available to the experiment panel.
	 *
	 * @param {Function} dispatch Dispatch function.
	 * @returns {object} Object with dispatcher callbacks.
	 */
	dispatcher: dispatch => ( {
		/**
		 * @param {*} value Value to revert to.
		 */
		revertValue: value => {
			dispatch( 'core/editor' ).editPost( {
				featured_media: value,
			} );
		},
	} ),

	/**
	 * Add/replace selectors available to the experiment panel.
	 *
	 * @param {Function} select Select function.
	 * @returns {object} Object with selector callbacks.
	 */
	selector: select => ( {
		defaultValue: select( 'core/editor' ).getEditedPostAttribute( 'featured_media' ) || '',
	} ),
} ) );
