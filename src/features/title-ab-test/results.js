import React, { Fragment } from 'react';

const { withSelect } = wp.data;
const { compose } = wp.compose;
const { __ } = wp.i18n;

export const Results = props => {
	const { endTime, goal, titles } = props;

	// Ensure titles and variants are present.
	if ( ! titles.length || goal.variants.length < 2 ) {
		return null;
	}

	// Check if test has ended or we have a winner.
	const hasEnded = endTime
		? parseInt( endTime, 10 ) >= Date.now()
		: goal.winner !== false;

	if ( ! hasEnded && ! goal.winner ) {
		return null;
	}

	const control = goal.variants[0];
	const winningVariant = goal.variants[goal.winner];
	const resultText = goal.winner && goal.winner > 0
		? (
			<Fragment>
				{__('Your title')}
				{' '}
				<em>“{titles[goal.winner - 1]}”</em>
				{' '}
				{__('performed better than the original by')}
				{' '}
				{((winningVariant.rate - control.rate) * 100).toFixed(2)}%
			</Fragment>
		)
		: __('You should keep the original post title.');

	return (
		<Fragment>
			<h3>{__('Results')}</h3>
			<p>{resultText}</p>
		</Fragment>
	);
};

export const ResultWithData = compose(
	withSelect(select => {
		return {
			titles: select('core/editor').getCurrentPostAttribute('meta')['_hm_analytics_ab_titles'] || [],
			goal: select('core/editor').getCurrentPostAttribute('_hm_analytics_test_titles_goal') || {},
			endTime: select('core/editor').getCurrentPostAttribute('_hm_analytics_test_titles_end_time'),
		};
	})
)(Results);

export default ResultWithData;
