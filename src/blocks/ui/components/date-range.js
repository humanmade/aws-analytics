import React from 'react';
import styled from 'styled-components';

const { __, sprintf } = wp.i18n;

const Form = styled.form`
	label {
		cursor: pointer;
		border: 1px solid transparent;
		border-radius: 100px;
		padding: 1px 8px;
		margin-right: 2px;
	}

	input {
		visibility: hidden;
		position: absolute;
	}

	input:checked + label {
		border-color: rgba(0,0,0,.3);
		font-weight: bold;
	}
`;

/**
 * Date Range picker component.
 *
 * @param {object} props Component props.
 * @param {number} props.value The current range.
 * @param {number[]} props.ranges The date ranges in days to choose from.
 * @param {Function} props.onSetRange Callback for value changed.
 * @param {string} props.location The location of the date range.
 * @returns {React.ReactNode} The date range picker component.
 */
export default function DateRange( { value, ranges, onSetRange, location } ) {
	return (
		<Form className="altis-analytics-date-range">
			{ ranges.map( range => (
				<>
					<input
						checked={ value === range }
						id={ `altis-analytics-date-range-${ range }` }
						name="altis-analytics-date-range"
						type="radio"
						value={ range }
						onChange={ e => {
							e.target.checked && onSetRange( range );
							analytics.track(
								__( 'filter', 'altis-analytics' ),
								{
									location: __( location, 'altis-analytics' ),
									filter_type: __( 'date range', 'altis-analytics' ),
									filter_value: range,
								}
							);
						} }
					/>
					<label htmlFor={ `altis-analytics-date-range-${ range }` }>
						{ sprintf( __( '%d days', 'altis-analytics' ), range ) }
					</label>
				</>
			) ) }
		</Form>
	);
}
