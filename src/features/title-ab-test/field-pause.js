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
				label={paused ? __('Unpause') : __('Pause')}
				onChange={checked => setPaused(checked)}
				checked={paused}
			/>
		</Fragment>
	);
};

export const PauseFieldWithData = compose(
	withSelect(select => {
		const paused = select('core/editor')
			.getEditedPostAttribute('ab_tests').titles.paused;
		const status = select('core/editor').getCurrentPostAttribute('status');
		return {
			published: status === 'publish',
			paused: paused,
		};
	}),
	withDispatch(dispatch => {
		return {
			setPaused: paused => {
				dispatch('core/editor').editPost({
					ab_tests: {
						titles: {
							paused: paused
						}
					}
				} );
			}
		};
	})
)(PauseField);

export default PauseFieldWithData;
