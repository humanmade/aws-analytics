import React, { Fragment } from 'react';

const { DatePicker } = wp.components;
const { withSelect, withDispatch } = wp.data;
const { compose } = wp.compose;
const { __ } = wp.i18n;

export const DateRange = props => {
	const { endTime, setEndTime } = props;

	return (
		<Fragment>
			<div className="hm-anlaytics-test-titles-label">
				<label>{__('End date')}</label>
			</div>
			<DatePicker
				currentDate={new Date( endTime ).toISOString()}
				onChange={value => setEndTime(value)}
			/>
			<p className="description">{__('The tests will not run past this date.')}</p>
		</Fragment>
	);
};

export const DateRangeWithData = compose(
	withSelect(select => {
		const endTime = select('core/editor')
			.getEditedPostAttribute('meta')['_hm_analytics_test_titles_end_time'];
		return {
			endTime: endTime || Date.now() + (30 * 24 * 60 * 60 * 1000),
		};
	}),
	withDispatch(dispatch => {
		return {
			setEndTime: time => {
				dispatch('core/editor').editPost({
					meta: {
						_hm_analytics_test_titles_end_time: new Date( time ).getTime(),
					}
				} );
			}
		};
	})
)(DateRange);

export default DateRangeWithData;
