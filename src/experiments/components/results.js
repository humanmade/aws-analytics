import React, { Fragment } from 'react';

import {
	getLetter,
	getDateString,
	getDurationString,
} from '../../utils';
import { getTestsRegistry } from '../data/registry';
import withTestData from '../data/with-test-data';

import {
	Button,
	CenteredButton,
	Notice,
	PanelRow,
	PercentageChange,
	StyledResults,
	Variant,
} from '.';

const { __ } = wp.i18n;

/**
 * A/B test results display component.
 *
 * @param {React.ComponentProps} props The results component props.
 * @returns {React.ReactNode} The test results display.
 */
export const Results = props => {
	const {
		testId,
		test = {},
		values = [],
		resetTest,
		revertValue,
	} = props;
	const {
		results,
		end_time: endTime,
		start_time: startTime,
		traffic_percentage: trafficPercentage,
	} = test;
	const {
		winner = null,
		variants = [],
	} = results;

	const abTest = getTestsRegistry().get( testId );

	const hasEnded = endTime < Date.now();

	return (
		<StyledResults>
			<PanelRow>
				{ winner !== null && (
					<Notice>{ __( 'Your test is complete!', 'altis-analytics' ) }</Notice>
				) }
				{ hasEnded && winner === null && (
					<Notice>
						{ __( 'The test has ended without finding a statistically significant difference between the variants.', 'altis-analytics' ) }
					</Notice>
				) }
				<CenteredButton
					onClick={ () => resetTest() }
				>
					{ __( 'Start a new test', 'altis-analytics' ) }
				</CenteredButton>
			</PanelRow>
			<PanelRow>
				{ values.map( ( value, index ) => {
					// Get variant data.
					const variant = variants[ index ] || { rate: 0.0 };

					return (
						<Variant key={ index } highlight={ index === winner }>
							<h3>{ `${ __( 'Variant', 'altis-analytics' ) } ${ getLetter( index ) } ${ index === 0 ? __( '(original)', 'altis-analytics' ) : '' }` }</h3>
							<p>
								{ abTest.displayValue( value ) }
							</p>
							<PercentageChange>
								{ ( variant.rate * 100 ).toFixed( 2 ) }%
							</PercentageChange>
							{ winner === 0 && winner === index && (
								<p className="description">{ __( 'The original variant performed better than the others!', 'altis-analytics' ) }</p>
							) }
							{ winner !== 0 && winner === index && (
								<Fragment>
									<p className="description">{ __( 'This variant performed better than the others and is now persisted to this post!', 'altis-analytics' ) }</p>
									<Button
										isLink
										onClick={ () => revertValue() }
									>
										{ __( 'Revert to original variant', 'altis-analytics' ) }
									</Button>
								</Fragment>
							) }
						</Variant>
					);
				} ) }
			</PanelRow>
			<PanelRow>
				<h3>{ __( 'Traffic Percentage', 'altis-analytics' ) }</h3>
				<p>{ trafficPercentage }%</p>

				<h3>{ __( 'Start Date', 'altis-analytics' ) }</h3>
				<p>{ getDateString( startTime ) }</p>

				<h3>{ __( 'End Date', 'altis-analytics' ) }</h3>
				<p>{ getDateString( endTime ) }</p>

				<h3>{ __( 'Duration', 'altis-analytics' ) }</h3>
				<p>{ getDurationString( endTime - startTime ) }</p>
			</PanelRow>
		</StyledResults>
	);
};

export default withTestData( Results );
