import React, { Fragment } from 'react';

const { ToggleControl } = wp.components;
const { withSelect, withDispatch } = wp.data;
const { compose } = wp.compose;
const { __ } = wp.i18n;

export const PauseField = props => {
	const { paused, setPaused, published } = props;

	// Only published posts can be unpaused.
	if ( ! published ) {
		return null;
	}

	return (
		<Fragment>
			<ToggleControl
				label={__('Paused')}
				onChange={checked => setPaused(checked)}
				checked={paused}
			/>
		</Fragment>
	);
};

export const PauseFieldWithData = compose(
	withSelect(select => {
		const paused = select('core/editor')
			.getEditedPostAttribute('meta')['_hm_analytics_test_titles_paused'] || 'true';
		const status = select('core/editor').getCurrentPostAttribute('status');
		return {
			published: status === 'publish',
			paused: paused !== 'false',
		};
	}),
	withDispatch(dispatch => {
		return {
			setPaused: paused => {
				console.log(paused ? 'true' : 'false')
				dispatch('core/editor').editPost({
					meta: {
						_hm_analytics_test_titles_paused: paused ? 'true' : 'false',
					}
				} );
			}
		};
	})
)(PauseField);

export default PauseFieldWithData;
