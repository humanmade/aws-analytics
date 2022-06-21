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
 * @param {object} props.ranges The date ranges in days to choose from.
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
						checked={ value === range.value }
						id={ `altis-analytics-date-range-${ range.value }` }
						name="altis-analytics-date-range"
						type="radio"
						value={ range.value }
						onChange={ e => {
							e.target.checked && onSetRange( range.value );
							analytics.track(
								'filter',
								{
									location: location,
									filter_type: 'date_range',
									filter_value: range.value,
								}
							);
						} }
					/>
					<label htmlFor={ `altis-analytics-date-range-${ range.value }` }>
						{ __( range.label, 'altis-analytics' ) }
					</label>
				</>
			) ) }
		</Form>
	);
}
