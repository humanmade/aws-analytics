import React from 'react';
import styled from 'styled-components';

const { __, sprintf } = wp.i18n;

const Form = styled.form`

`;

/**
 * Date Range picker component.
 *
 * @param {object} props Component props.
 * @param {number} props.value The current range.
 * @param {number[]} props.ranges The date ranges in days to choose from.
 * @param {Function} props.onSetRange Callback for value changed.
 * @returns {React.ReactNode} The date range picker component.
 */
export default function DateRange( { value, ranges, onSetRange } ) {
	return (
		<Form className="altis-analytics-date-range">
			{ ranges.map( range => (
				<label>
					<input
						checked={ value === range }
						name="altis-analytics-date-range"
						type="radio"
						value={ range }
						onChange={ e => {
							e.target.checked && onSetRange( range );
						} }
					/>
					{ sprintf( __( '%d days', 'altis-analytics' ), range ) }
				</label>
			) ) }
		</Form>
	);
}
