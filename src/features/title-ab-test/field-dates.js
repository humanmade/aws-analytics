import React, { Fragment } from 'react';

const { TimePicker } = wp.components;
const { withSelect, withDispatch } = wp.data;
const { compose } = wp.compose;
const { __ } = wp.i18n;

export const DateRange = props => {
	const {
		description,
		label,
		setTime,
		time
	} = props;

	return (
		<Fragment>
			<div className="hm-analytics-test-titles-label">
				<label>{label}</label>
			</div>
			<TimePicker
				currentTime={new Date( time ).toISOString().replace(/\.\d+Z$/, 'Z')}
				onChange={value => setTime(value)}
			/>
			{description && <p className="description">{description}</p>}
		</Fragment>
	);
};

export const DateRangeWithData = compose(
	withSelect((select, props) => {
		const time = select('core/editor')
			.getEditedPostAttribute('meta')[`_hm_analytics_test_titles_${props.name}`];
		return {
			time: time || props.defaultValue || Date.now(),
		};
	}),
	withDispatch((dispatch, props) => {
		return {
			setTime: time => {
				dispatch('core/editor').editPost({
					meta: {
						[`_hm_analytics_test_titles_${props.name}`]: new Date( time ).getTime(),
					}
				} );
			},
		};
	})
)(DateRange);

export default DateRangeWithData;
