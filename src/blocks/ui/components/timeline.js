import React from 'react';
import styled from 'styled-components';

const { __ } = wp.i18n;

/**
 * Calculates the current date as a percentage between the start and end.
 *
 * @param {Date} start Start date for range.
 * @param {Date} end End date for range.
 * @returns {number} Percentage between start and end dates.
 */
const getOffset = ( start, end ) => {
	return Math.max( 0, Math.min( 100, ( ( Date.now() - start.getTime() ) / ( end.getTime() - start.getTime() ) ) * 100 ) );
};

const StyledTimeline = styled.div`
	margin: 0 0 40px;
	padding: 10px 0;
	position: relative;
	border-bottom: 4px solid rgba(67, 108, 255, .1);

	h3 {
		margin-top: 0;
	}

	.altis-analytics-timeline__date {
		position: absolute;
		margin: 10px 0 0;
		padding: 0;
		&:before {
			content: '';
			display: block;
			border-radius: 100px;
			width: 10px;
			height: 10px;
			background: rgba(67, 108, 255, 1);
			position: absolute;
			top: -13px;
		}

		&--start {
			left: 0;
			top: 100%;
			text-align: left;
			&:before {
				left: -1px;
			}
		}

		&--end {
			right: 0;
			top: 100%;
			text-align: right;
			&:before {
				right: -1px;
			}
		}

		&--now {
			overflow: visible;
			width: ${ props => getOffset( props.start, props.end ) }%;
			border-bottom: 4px solid rgba(67, 108, 255, 1);
			text-align: right;
			bottom: -4px;
			padding-bottom: 4px;
			&:before {
				top: auto;
				bottom: -7px;
				right: -1px;
			}

			.altis-analytics-timeline__text {
				margin-right: -2.2rem;
			}
		}
	}
`;

/**
 * Timeline component for A/B tests.
 *
 * @param {object} props Component props.
 * @param {Date} props.end Test end date.
 * @param {Date} props.start Test start date.
 * @returns {React.ReactNode} Timeline component.
 */
const Timeline = ( {
	end,
	start,
} ) => {
	const hasStarted = start <= new Date();
	const hasEnded = end <= new Date();
	return (
		<StyledTimeline className="altis-analytics-timeline" end={ end } start={ start }>
			<h3>{ __( 'Timeline', 'altis-analytics' ) }</h3>
			<p className="altis-analytics-timeline__date altis-analytics-timeline__date--start">
				<span>{ hasStarted ? __( 'Started', 'altis-analytics' ) : __( 'Starts', 'altis-analytics' ) }:</span>
				{ ' ' }
				<strong>{ moment( start ).format( 'MMM D, YYYY' ) }</strong>
			</p>
			<p className="altis-analytics-timeline__date altis-analytics-timeline__date--end">
				<span>{ hasEnded ? __( 'Ended', 'altis-analytics' ) : __( 'Ends', 'altis-analytics' ) }:</span>
				{ ' ' }
				<strong>{ moment( end ).format( 'MMM D, YYYY' ) }</strong>
			</p>
			<p className="altis-analytics-timeline__date altis-analytics-timeline__date--now">
				{ hasStarted && ! hasEnded && (
					<>
						<span className="screen-reader-text">{ __( 'Current date', 'altis-analytics' ) }</span>
						<span className="altis-analytics-timeline__text">{ moment().format( 'MMM D, YYYY' ) }</span>
					</>
				) }
			</p>
		</StyledTimeline>
	);
};

export default Timeline;
