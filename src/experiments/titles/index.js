import { registerExperiment } from '../experiment';

import Field from './field';

const { __ } = wp.i18n;

registerExperiment( {
	id: 'titles',
	title: __( 'Post titles', 'altis.analytics' ),
	component: Field,

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
