import React, { Fragment } from 'react';

const { RangeControl } = wp.components;
const { withSelect, withDispatch } = wp.data;
const { compose } = wp.compose;
const { __ } = wp.i18n;

export const TrafficPercentage = props => {
	const { percentage, setPercentage } = props;

	return (
		<Fragment>
			<RangeControl
				label={__('Traffic Percentage')}
				value={percentage}
				onChange={value => setPercentage(value)}
				help={__('This is the amount of traffic that will be shown one of the variants.')}
				min={0}
				max={100}
			/>
		</Fragment>
	);
};

export const TrafficPercentageWithData = compose(
	withSelect(select => {
		const percentage = select('core/editor')
			.getEditedPostAttribute('meta')['_hm_analytics_test_titles_traffic_percentage'];
		return {
			percentage: parseFloat( percentage || 35 ),
		};
	}),
	withDispatch(dispatch => {
		return {
			setPercentage: percentage => {
				dispatch('core/editor').editPost({
					meta: {
						_hm_analytics_test_titles_traffic_percentage: parseFloat( percentage ),
					}
				} );
			}
		};
	})
)(TrafficPercentage);

export default TrafficPercentageWithData;
