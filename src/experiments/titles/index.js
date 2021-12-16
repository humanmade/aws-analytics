wp.hooks.addAction( 'altis.experiments.registry.loaded', 'altis.experiments.features.titles', registry => {
	registry.update( 'titles', {
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
					title: value,
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
			defaultValue: select( 'core/editor' ).getEditedPostAttribute( 'title' ) || '',
		} ),
	} );
} );
