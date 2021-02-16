import React, { Fragment } from 'react';

import withTestData from './data/with-test-data';
import {
	Button,
	CenteredButton,
	Notice,
	PanelRow,
	PercentageChange,
	StyledResults,
	Variant,
} from './components';
import {
	getLetter,
	getDateString,
	getDurationString,
} from './utils';

const { withDispatch } = wp.data;
const { compose } = wp.compose;
const { __ } = wp.i18n;

/**
 * A/B test results display component.
 *
 * @param {React.ComponentProps} props The results component props.
 * @returns {React.ReactNode} The test results display.
 */
export const Results = props => {
	const {
		test = {},
		titles = [],
		resetTest,
		revertTitle,
	} = props;
	const {
		results,
		end_time: endTime,
		start_time: startTime,
		traffic_percentage: trafficPercentage,
	} = test;
	const {
		winner = false,
		variants = [],
	} = results;

	const hasEnded = endTime < Date.now();

	return (
		<StyledResults>
			<PanelRow>
				{ winner !== false && (
					<Notice>{ __( 'Your test is complete!', 'altis-experiments' ) }</Notice>
				) }
				{ hasEnded && winner === false && (
					<Notice>
						{ __( 'The test has ended without finding a statistically significant difference between the variants.', 'altis-experiments' ) }
					</Notice>
				) }
				<CenteredButton
					onClick={ () => resetTest() }
				>
					{ __( 'Start a new test', 'altis-experiments' ) }
				</CenteredButton>
			</PanelRow>
			<PanelRow>
				{ titles.map( ( title, index ) => {
					// Get variant data.
					const variant = variants[ index ] || { rate: 0.0 };

					return (
						<Variant key={ index } highlight={ index === winner }>
							<h3>{ `${ __( 'Title', 'altis-experiments' ) } ${ getLetter( index ) } ${ index === 0 ? __( '(original)', 'altis-experiments' ) : '' }` }</h3>
							<p>{ title }</p>
							<PercentageChange>
								{ ( variant.rate * 100 ).toFixed( 2 ) }%
							</PercentageChange>
							{ winner === 0 && winner === index && (
								<p className="description">{ __( 'The original title performed better than the others!', 'altis-experiments' ) }</p>
							) }
							{ winner !== 0 && winner === index && (
								<Fragment>
									<p className="description">{ __( 'This title performed better than the others and is now the title of this post!', 'altis-experiments' ) }</p>
									<Button
										isLink
										onClick={ () => revertTitle() }
									>
										{ __( 'Revert to original title', 'altis-experiments' ) }
									</Button>
								</Fragment>
							) }
						</Variant>
					);
				} ) }
			</PanelRow>
			<PanelRow>
				<h3>{ __( 'Traffic Percentage', 'altis-experiments' ) }</h3>
				<p>{ trafficPercentage }%</p>

				<h3>{ __( 'Start Date', 'altis-experiments' ) }</h3>
				<p>{ getDateString( startTime ) }</p>

				<h3>{ __( 'End Date', 'altis-experiments' ) }</h3>
				<p>{ getDateString( endTime ) }</p>

				<h3>{ __( 'Duration', 'altis-experiments' ) }</h3>
				<p>{ getDurationString( endTime - startTime ) }</p>
			</PanelRow>
		</StyledResults>
	);
};

export const ResultsWithData = compose(
	withTestData,
	withDispatch( ( dispatch, props ) => {
		return {
			/**
			 * Resets the first title back to the original post title value.
			 */
			revertTitle: () => {
				dispatch( 'core/editor' ).editPost( {
					title: props.titles[ 0 ],
				} );
			},
		};
	} )
)( Results );

export default ResultsWithData;
