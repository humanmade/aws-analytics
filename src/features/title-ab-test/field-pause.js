import React, { Fragment } from 'react';

const { ToggleControl } = wp.components;
const { withSelect, withDispatch } = wp.data;
const { compose } = wp.compose;
const { __ } = wp.i18n;

export const PauseField = props => {
	const { paused, setPaused } = props;

	return (
		<Fragment>
			<ToggleControl
				label={__('Pause')}
				onChange={checked => setPaused(checked)}
				help={paused ? __('Tests are currently paused.') : __('Tests are running.')}
				checked={paused}
			/>
		</Fragment>
	);
};

export const PauseFieldWithData = compose(
	withSelect(select => {
		const paused = select('core/editor')
			.getEditedPostAttribute('meta')['_hm_analytics_test_titles_paused'];
		return {
			paused: paused ? 1 : 0,
		};
	}),
	withDispatch(dispatch => {
		return {
			setPaused: paused => {
				dispatch('core/editor').editPost({
					meta: {
						_hm_analytics_test_titles_paused: paused ? 1 : 0
					}
				} );
			}
		};
	})
)(PauseField);

export default PauseFieldWithData;
