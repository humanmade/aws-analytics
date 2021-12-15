import { registerExperiment } from '../experiment';

import TextInput from '../components/field-text-input';

const { __ } = wp.i18n;

registerExperiment( {
	id: 'titles',
	title: __( 'Post titles', 'altis.analytics' ),
	singleTitle: __( 'Title', 'altis-analytics' ),
	component: TextInput,

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
